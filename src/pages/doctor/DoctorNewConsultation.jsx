import React, { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../../context/AppContext'
import { DIAGNOSES, DURATION_PRESETS, MEDICINES, SYMPTOMS, TESTS } from '../../lib/medicalData'
import VoiceToText from '../../components/shared/VoiceToText'
import { generatePrescriptionPdf } from '../../lib/prescriptionPdf'
import { Phone, FileText } from 'lucide-react'

function clampText(s, max = 260) {
  const t = String(s || '')
  if (t.length <= max) return t
  return `${t.slice(0, max)}...`
}

export default function DoctorNewConsultation() {
  const nav = useNavigate()
  const {
    patients,
    records,
    currentDoctorId,
    sessionUser,
    makeId,
    addRecord,
    upsertPatient,
    fetchAPI,
  } = useApp()

  const [step, setStep] = useState(1)
  const [patientId, setPatientId] = useState(patients[0]?._id || null)

  const patient = useMemo(() => patients.find((p) => p._id === patientId) || null, [patients, patientId])

  const doctor = useMemo(() => sessionUser, [sessionUser])

  const lastPrescription = useMemo(() => {
    if (!patientId) return null
    return records
      .filter((r) => r.type === 'PRESCRIPTION' && (r.patientId?._id || r.patientId) === patientId && (r.doctorId?._id || r.doctorId) === currentDoctorId)
      .sort((a, b) => (new Date(a.createdAt) < new Date(b.createdAt) ? 1 : -1))[0]
  }, [records, patientId, currentDoctorId])

  const [intakeSymptomsInput, setIntakeSymptomsInput] = useState('')
  const [intakeSymptoms, setIntakeSymptoms] = useState([])
  const [durationPreset, setDurationPreset] = useState(DURATION_PRESETS[0])
  const [intakeFreeText, setIntakeFreeText] = useState('')

  const [diagnoses, setDiagnoses] = useState([])
  const [diagnosisNotes, setDiagnosisNotes] = useState('')
  const [icdCode, setIcdCode] = useState('')

  const [medicines, setMedicines] = useState([])
  const [specialInstructions, setSpecialInstructions] = useState('')

  const [testRecommendations, setTestRecommendations] = useState([])

  const [generated, setGenerated] = useState(null) // { pdfDataUrl, recordId }
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  // ─── Vitals State ────────────────────────────────────────────────
  const [vitals, setVitals] = useState({
    bpSys: '',
    bpDia: '',
    heartRate: '',
    spo2: '',
    glucoseFasting: '',
    temperature: '',
    respiratoryRate: '',
  })

  const updateVital = (key, val) => setVitals((v) => ({ ...v, [key]: val }))

  const saveVitals = async () => {
    if (!patientId) return
    const parsed = {}
    if (vitals.bpSys !== '') parsed.bpSys = Number(vitals.bpSys)
    if (vitals.bpDia !== '') parsed.bpDia = Number(vitals.bpDia)
    if (vitals.heartRate !== '') parsed.heartRate = Number(vitals.heartRate)
    if (vitals.spo2 !== '') parsed.spo2 = Number(vitals.spo2)
    if (vitals.glucoseFasting !== '') parsed.glucoseFasting = Number(vitals.glucoseFasting)
    if (vitals.temperature !== '') parsed.temperature = Number(vitals.temperature)
    if (vitals.respiratoryRate !== '') parsed.respiratoryRate = Number(vitals.respiratoryRate)
    if (Object.keys(parsed).length === 0) return
    // Save to Patient document for quick access
    upsertPatient(patientId, { vitals: { ...(patient?.vitals || {}), ...parsed } })
    // Also persist to Vital collection for historical tracking
    try {
      await fetchAPI('/records/vitals', {
        method: 'POST',
        body: JSON.stringify({ patientId, metrics: parsed })
      })
    } catch (err) {
      console.error('Failed to save vitals to Vital collection:', err)
    }
  }

  const suggestedSymptoms = useMemo(() => {
    const q = intakeSymptomsInput.trim().toLowerCase()
    if (!q) return SYMPTOMS.slice(0, 6)
    return SYMPTOMS.filter((s) => s.toLowerCase().includes(q)).slice(0, 7)
  }, [intakeSymptomsInput])

  const [diagnosisInput, setDiagnosisInput] = useState('')
  const suggestedDiagnosisChips = useMemo(() => {
    const q = diagnosisInput.trim().toLowerCase()
    if (!q) return DIAGNOSES.slice(0, 7)
    return DIAGNOSES.filter((d) => d.toLowerCase().includes(q)).slice(0, 8)
  }, [diagnosisInput])

  const [medicineInput, setMedicineInput] = useState('')
  const suggestedMedicineChips = useMemo(() => {
    const q = medicineInput.trim().toLowerCase()
    if (!q) return MEDICINES.slice(0, 8)
    return MEDICINES.filter((m) => m.toLowerCase().includes(q)).slice(0, 10)
  }, [medicineInput])

  const [newMedicine, setNewMedicine] = useState({
    name: '',
    dosage: '',
    frequency: '',
    duration: '',
    instructions: '',
  })

  const [testInput, setTestInput] = useState('')
  const suggestedTests = useMemo(() => {
    const q = testInput.trim().toLowerCase()
    if (!q) return TESTS.slice(0, 6)
    return TESTS.filter((t) => t.name.toLowerCase().includes(q)).slice(0, 7)
  }, [testInput])

  const addIntakeSymptom = (sym) => {
    if (!sym) return
    setIntakeSymptoms((prev) => (prev.includes(sym) ? prev : [...prev, sym]))
    setIntakeSymptomsInput('')
  }

  const removeChip = (arr, setArr, val) => {
    setArr(arr.filter((x) => x !== val))
  }

  const addDiagnosisChip = (d) => {
    if (!d) return
    setDiagnoses((prev) => (prev.includes(d) ? prev : [...prev, d]))
    setDiagnosisInput('')
  }

  const removeDiagnosisChip = (d) => removeChip(diagnoses, setDiagnoses, d)

  const applyRepeatLastPrescription = () => {
    if (!lastPrescription) return
    const payload = lastPrescription.payload || {}
    setDiagnoses(payload.diagnoses || [])
    setDiagnosisNotes(payload.notes || '')
    setMedicines(payload.medicines || [])
    setSpecialInstructions(payload.specialInstructions || '')
    setTestRecommendations(payload.testRecommendations || [])
    setGenerated(null)
    setError(null)
    setStep(3)
  }

  const addMedicineFromNewMedicine = () => {
    if (!newMedicine.name.trim()) return
    setMedicines((prev) => {
      const key = newMedicine.name.trim()
      const exists = prev.some((m) => m.name.toLowerCase() === key.toLowerCase() && m.dosage === newMedicine.dosage)
      if (exists) return prev
      return [
        ...prev,
        {
          name: newMedicine.name.trim(),
          dosage: newMedicine.dosage.trim(),
          frequency: newMedicine.frequency.trim(),
          duration: newMedicine.duration.trim(),
          instructions: newMedicine.instructions.trim(),
        },
      ]
    })
    setNewMedicine({ name: '', dosage: '', frequency: '', duration: '', instructions: '' })
    setMedicineInput('')
  }

  const removeMedicine = (name) => {
    setMedicines((prev) => prev.filter((m) => m.name !== name))
  }

  const addTest = (tName) => {
    const base = TESTS.find((t) => t.name === tName)
    const urgency = 'ROUTINE'
    setTestRecommendations((prev) => {
      if (prev.some((t) => t.name === tName)) return prev
      return [...prev, { name: tName, urgency }]
    })
    setTestInput('')
  }

  const removeTest = (tName) => setTestRecommendations((prev) => prev.filter((t) => t.name !== tName))

  const updateTestUrgency = (tName, urgency) => {
    setTestRecommendations((prev) => prev.map((t) => (t.name === tName ? { ...t, urgency } : t)))
  }

  const canGenerate = useMemo(() => {
    if (!patient) return false
    const hasData = diagnoses.length > 0 || medicines.length > 0 || !!diagnosisNotes || !!specialInstructions || !!intakeFreeText
    if (!hasData) return false
    if (medicines.length) {
      const ok = medicines.every((m) => m.name && m.dosage && m.frequency && m.duration)
      if (!ok) return false
    }
    return true
  }, [patient, diagnoses, medicines, diagnosisNotes, specialInstructions, intakeFreeText])

  const onGenerate = async () => {
    if (!patient || !doctor) return
    setError(null)
    setGenerated(null)
    setSaving(true)
    try {
      const payload = {
        diagnoses: diagnoses.length ? diagnoses : [],
        icdCode: icdCode || null,
        notes: diagnosisNotes || '',
        medicines: medicines || [],
        specialInstructions: specialInstructions || '',
        testRecommendations: testRecommendations || [],
      }

      const consult = { diagnoses: payload.diagnoses, medicines: payload.medicines, notes: payload.notes, specialInstructions: payload.specialInstructions, testRecommendations: payload.testRecommendations }
      const pdfDataUrl = generatePrescriptionPdf({ patient, doctor, consult })

      const newRecord = await addRecord({
        patientId: patient._id || patient.id,
        type: 'PRESCRIPTION',
        title: 'Clinical Consultation',
        pdfFileUrl: pdfDataUrl,
        payload: {
          diagnoses: payload.diagnoses,
          medicines: payload.medicines,
          notes: payload.notes,
          testRecommendations: payload.testRecommendations
        }
      });
      
      upsertPatient(patient._id || patient.id, { lastVisitISO: new Date().toISOString() })

      setGenerated({ pdfDataUrl, recordId: newRecord._id })
      setSaving(false)
      setStep(5)
    } catch (e) {
      setSaving(false)
      setError(e?.message || 'Failed to generate PDF.')
    }
  }

  const shareMessage = useMemo(() => {
    const dx = diagnoses.length ? diagnoses.join(', ') : '—'
    const meds = medicines.length ? medicines.map((m) => `${m.name} ${m.dosage}`).join('; ') : '—'
    return `CareOS e-Prescription\nPatient: ${patient?.name || '-'}\nDiagnoses: ${dx}\nMedicines: ${meds}\nNotes: ${clampText(diagnosisNotes || specialInstructions || '', 160)}`
  }, [diagnosisNotes, diagnoses, medicines, patient?.name, specialInstructions])

  const whatsappLink = (() => {
    const phone = patient?.emergencyContactPhone ? patient.emergencyContactPhone.replaceAll(' ', '') : ''
    if (!phone) return null
    const text = encodeURIComponent(shareMessage)
    const digits = phone.replace(/\D/g, '')
    return `https://wa.me/${digits}?text=${text}`
  })()

  return (
    <div className="co-page animate-fade-in-up">
      <div className="co-pageHeader" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <div className="co-muted" style={{ fontWeight: 600, fontSize: '13px', marginBottom: '8px' }}>
            Patients &gt; {patient?.name || 'Select Patient'} (PID-{patient?._id || patient?.id || '---'})
          </div>
          <h1 className="co-h1" style={{ fontSize: '32px' }}>New Consultation</h1>
          <div className="co-muted" style={{ fontSize: '15px', marginTop: '4px' }}>
            Ref. #CONS-2023-1102 • Follow-up Visit
          </div>
        </div>

        <div className="co-stepper" style={{ display: 'flex', gap: '8px', background: 'transparent' }}>
          {['Intake', 'Diagnosis', 'Prescription', 'Labs', 'Generate'].map((lbl, idx) => {
            const s = idx + 1;
            const isActive = step === s;
            const isDone = step > s;
            return (
              <div 
                key={s} 
                style={{ 
                  display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', borderRadius: '99px',
                  background: isActive ? 'var(--primary-container)' : isDone ? 'var(--surface-container)' : 'transparent',
                  color: isActive ? '#fff' : 'var(--text-h)',
                  fontWeight: 600, fontSize: '13px'
                }}>
                <div style={{ 
                  width: '20px', height: '20px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: isActive ? 'var(--primary)' : isDone ? 'var(--outline-variant)' : 'var(--surface-container)',
                  color: isActive ? '#fff' : 'var(--text-h)', fontSize: '11px'
                }}>
                  {s}
                </div>
                {lbl}
              </div>
            );
          })}
        </div>
      </div>

      <div className="co-grid2">
        <section className="co-card">
          <div className="co-sectionTitle">
            {step === 1 ? 'Step 1: Patient Intake' : step === 2 ? 'Step 2: Diagnosis' : step === 3 ? 'Step 3: Prescription' : step === 4 ? 'Step 4: Tests (optional)' : 'Step 5: Generate Output'}
          </div>

          {step === 1 ? (
            <>
              <div className="co-formRow">
                <label className="co-label">
                  Patient
                  <select className="co-input" value={patientId || ''} onChange={(e) => setPatientId(e.target.value)}>
                    {patients.map((p) => (
                      <option key={p._id || p.id} value={p._id || p.id}>
                        {p.name} (#{p._id || p.id})
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="co-twoCol">
                <div>
                  <div className="co-inlineTitle">Symptoms search</div>
                  <input
                    className="co-input"
                    value={intakeSymptomsInput}
                    onChange={(e) => setIntakeSymptomsInput(e.target.value)}
                    placeholder="Start typing symptoms (e.g., Shortness of breath...)"
                  />

                  <div className="co-chipRow">
                    {suggestedSymptoms.map((s) => (
                      <button key={s} type="button" className="co-chip" onClick={() => addIntakeSymptom(s)}>
                        {s}
                      </button>
                    ))}
                  </div>

                  <div style={{ height: 10 }} />

                  <div className="co-inlineTitle">Selected symptoms</div>
                  <div className="co-chipRow">
                    {intakeSymptoms.length ? (
                      intakeSymptoms.map((s) => (
                        <span key={s} className="co-chip co-chip--selected">
                          {s}{' '}
                          <button type="button" className="co-chipX" onClick={() => removeChip(intakeSymptoms, setIntakeSymptoms, s)}>
                            ×
                          </button>
                        </span>
                      ))
                    ) : (
                      <span className="co-mutedSmall">No symptoms selected</span>
                    )}
                  </div>
                </div>

                <div>
                  <div className="co-inlineTitle">Past history (auto-loaded)</div>
                  <div className="co-mutedSmall">
                    Allergies: <b>{patient?.allergies?.length ? patient.allergies.join(', ') : 'None recorded'}</b>
                    <br />
                    Chronic: <b>{patient?.chronicDiseases?.length ? patient.chronicDiseases.join(', ') : 'None recorded'}</b>
                    <br />
                    Medications: <b>{patient?.medications?.length ? patient.medications.join(', ') : 'None recorded'}</b>
                    <br />
                    Last visit: <b>{patient ? new Date(patient.updatedAt || patient.createdAt || Date.now()).toLocaleDateString() : '-'}</b>
                  </div>
                </div>
              </div>

              <div style={{ height: 12 }} />

              <div className="co-formRow">
                <label className="co-label">
                  Onset duration
                  <select className="co-input" value={durationPreset} onChange={(e) => setDurationPreset(e.target.value)}>
                    {DURATION_PRESETS.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <label className="co-label">
                Additional clinical observations (free text)
                <div className="co-textareaRow">
                  <textarea
                    className="co-textarea"
                    value={intakeFreeText}
                    onChange={(e) => setIntakeFreeText(e.target.value)}
                    placeholder="Type observations or use voice-to-text..."
                  />
                  <div className="co-textareaTools">
                    <VoiceToText
                      disabled={!patientId}
                      onResult={(t) => {
                        setIntakeFreeText((prev) => (prev ? `${prev} ${t}` : t))
                      }}
                    />
                  </div>
                </div>
              </label>

              {/* ─── Vitals Capture ──────────────────────────────────── */}
              <div style={{ marginTop: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                  <div className="co-inlineTitle" style={{ fontSize: '15px', marginBottom: 0 }}>📊 Record Vitals</div>
                  <button
                    type="button"
                    className="co-btn co-btn--primary co-btn--sm"
                    disabled={!patientId}
                    onClick={saveVitals}
                  >
                    Save &amp; Update Patient
                  </button>
                </div>

                {/* Last recorded vitals */}
                {patient?.vitals && (
                  <div style={{ background: 'var(--surface-lowest)', borderRadius: '12px', padding: '12px 16px', marginBottom: '16px', display: 'flex', flexWrap: 'wrap', gap: '16px' }}>
                    <span className="co-mutedSmall" style={{ width: '100%', fontWeight: 700 }}>Last recorded:</span>
                    {patient.vitals.bpSys && <span className="co-mutedSmall">BP: <b>{patient.vitals.bpSys}/{patient.vitals.bpDia} mmHg</b></span>}
                    {patient.vitals.heartRate && <span className="co-mutedSmall">HR: <b>{patient.vitals.heartRate} bpm</b></span>}
                    {patient.vitals.spo2 && <span className="co-mutedSmall">SpO₂: <b>{patient.vitals.spo2}%</b></span>}
                    {patient.vitals.glucoseFasting && <span className="co-mutedSmall">Glucose: <b>{patient.vitals.glucoseFasting} mg/dL</b></span>}
                    {patient.vitals.temperature && <span className="co-mutedSmall">Temp: <b>{patient.vitals.temperature}°F</b></span>}
                    {patient.vitals.respiratoryRate && <span className="co-mutedSmall">RR: <b>{patient.vitals.respiratoryRate} /min</b></span>}
                  </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '12px' }}>
                  {/* BP */}
                  <div style={{ background: 'var(--surface-lowest)', borderRadius: '12px', padding: '14px 16px' }}>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '10px' }}>🩸 Blood Pressure</div>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <input
                        type="number" className="co-input" placeholder="SYS"
                        value={vitals.bpSys} onChange={(e) => updateVital('bpSys', e.target.value)}
                        style={{ padding: '8px', textAlign: 'center' }}
                      />
                      <span style={{ color: 'var(--muted)', fontWeight: 700 }}>/</span>
                      <input
                        type="number" className="co-input" placeholder="DIA"
                        value={vitals.bpDia} onChange={(e) => updateVital('bpDia', e.target.value)}
                        style={{ padding: '8px', textAlign: 'center' }}
                      />
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '6px' }}>mmHg</div>
                  </div>

                  {/* Heart Rate */}
                  <div style={{ background: 'var(--surface-lowest)', borderRadius: '12px', padding: '14px 16px' }}>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '10px' }}>❤️ Heart Rate</div>
                    <input
                      type="number" className="co-input" placeholder="72"
                      value={vitals.heartRate} onChange={(e) => updateVital('heartRate', e.target.value)}
                      style={{ padding: '8px', textAlign: 'center' }}
                    />
                    <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '6px' }}>beats / min</div>
                  </div>

                  {/* SpO2 */}
                  <div style={{ background: 'var(--surface-lowest)', borderRadius: '12px', padding: '14px 16px' }}>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '10px' }}>🫁 SpO₂</div>
                    <input
                      type="number" className="co-input" placeholder="98" min="0" max="100"
                      value={vitals.spo2} onChange={(e) => updateVital('spo2', e.target.value)}
                      style={{ padding: '8px', textAlign: 'center' }}
                    />
                    <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '6px' }}>percent %</div>
                  </div>

                  {/* Glucose */}
                  <div style={{ background: 'var(--surface-lowest)', borderRadius: '12px', padding: '14px 16px' }}>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '10px' }}>🩺 Glucose (Fasting)</div>
                    <input
                      type="number" className="co-input" placeholder="95"
                      value={vitals.glucoseFasting} onChange={(e) => updateVital('glucoseFasting', e.target.value)}
                      style={{ padding: '8px', textAlign: 'center' }}
                    />
                    <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '6px' }}>mg / dL</div>
                  </div>

                  {/* Temperature */}
                  <div style={{ background: 'var(--surface-lowest)', borderRadius: '12px', padding: '14px 16px' }}>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '10px' }}>🌡️ Temperature</div>
                    <input
                      type="number" className="co-input" placeholder="98.6"
                      value={vitals.temperature} onChange={(e) => updateVital('temperature', e.target.value)}
                      style={{ padding: '8px', textAlign: 'center' }}
                    />
                    <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '6px' }}>°F</div>
                  </div>

                  {/* Respiratory Rate */}
                  <div style={{ background: 'var(--surface-lowest)', borderRadius: '12px', padding: '14px 16px' }}>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '10px' }}>💨 Respiratory Rate</div>
                    <input
                      type="number" className="co-input" placeholder="16"
                      value={vitals.respiratoryRate} onChange={(e) => updateVital('respiratoryRate', e.target.value)}
                      style={{ padding: '8px', textAlign: 'center' }}
                    />
                    <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '6px' }}>breaths / min</div>
                  </div>
                </div>
              </div>
            </>
          ) : null}

          {step === 2 ? (
            <>
              <div className="co-twoCol">
                <div>
                  <div className="co-inlineTitle">Diagnosis search (ICD optional)</div>
                  <div className="co-formRow" style={{ alignItems: 'flex-start' }}>
                    <label className="co-label" style={{ flex: 1 }}>
                      ICD code (optional)
                      <input className="co-input" value={icdCode} onChange={(e) => setIcdCode(e.target.value)} placeholder="e.g., I10" />
                    </label>
                    <label className="co-label" style={{ flex: 2 }}>
                      Add diagnosis
                      <input
                        className="co-input"
                        value={diagnosisInput}
                        onChange={(e) => setDiagnosisInput(e.target.value)}
                        placeholder="Start typing (e.g., Hypertension)..."
                      />
                    </label>
                  </div>

                  <div className="co-chipRow">
                    {suggestedDiagnosisChips.map((d) => (
                      <button key={d} type="button" className="co-chip" onClick={() => addDiagnosisChip(d)}>
                        {d}
                      </button>
                    ))}
                  </div>

                  <div style={{ height: 10 }} />

                  <div className="co-inlineTitle">Selected diagnoses</div>
                  <div className="co-chipRow">
                    {diagnoses.length ? (
                      diagnoses.map((d) => (
                        <span key={d} className="co-chip co-chip--selected">
                          {d}{' '}
                          <button type="button" className="co-chipX" onClick={() => removeDiagnosisChip(d)}>
                            ×
                          </button>
                        </span>
                      ))
                    ) : (
                      <span className="co-mutedSmall">No diagnosis added</span>
                    )}
                  </div>
                </div>

                <div>
                  <div className="co-inlineTitle">Clinical notes & diagnosis</div>
                  <div className="co-textareaRow">
                    <textarea
                      className="co-textarea"
                      value={diagnosisNotes}
                      onChange={(e) => setDiagnosisNotes(e.target.value)}
                      placeholder="Start typing clinical observations..."
                    />
                    <div className="co-textareaTools">
                      <VoiceToText onResult={(t) => setDiagnosisNotes((prev) => (prev ? `${prev} ${t}` : t))} />
                    </div>
                  </div>
                </div>
              </div>
            </>
          ) : null}

          {step === 3 ? (
            <>
              <div className="co-twoCol">
                <div>
                  <div className="co-inlineTitle">Medicine name (auto-suggest)</div>
                  <input
                    className="co-input"
                    value={medicineInput}
                    onChange={(e) => setMedicineInput(e.target.value)}
                    placeholder="Type medicine (e.g., Lisinopril)..."
                  />
                  <div className="co-chipRow">
                    {suggestedMedicineChips.map((m) => (
                      <button
                        key={m}
                        type="button"
                        className="co-chip"
                        onClick={() => {
                          setNewMedicine((prev) => ({ ...prev, name: m }))
                          setMedicineInput('')
                        }}
                      >
                        {m}
                      </button>
                    ))}
                  </div>

                  <div style={{ height: 10 }} />

                  <div className="co-inlineTitle">Add medicine details</div>
                  <div className="co-formGrid">
                    <label className="co-label">
                      Name
                      <input
                        className="co-input"
                        value={newMedicine.name}
                        onChange={(e) => setNewMedicine((prev) => ({ ...prev, name: e.target.value }))}
                      />
                    </label>
                    <label className="co-label">
                      Dosage
                      <input
                        className="co-input"
                        value={newMedicine.dosage}
                        onChange={(e) => setNewMedicine((prev) => ({ ...prev, dosage: e.target.value }))}
                        placeholder="e.g., 10mg"
                      />
                    </label>
                    <label className="co-label">
                      Frequency
                      <input
                        className="co-input"
                        value={newMedicine.frequency}
                        onChange={(e) => setNewMedicine((prev) => ({ ...prev, frequency: e.target.value }))}
                        placeholder="e.g., Once daily"
                      />
                    </label>
                    <label className="co-label">
                      Duration
                      <input
                        className="co-input"
                        value={newMedicine.duration}
                        onChange={(e) => setNewMedicine((prev) => ({ ...prev, duration: e.target.value }))}
                        placeholder="e.g., 30 days"
                      />
                    </label>
                    <label className="co-label" style={{ gridColumn: '1 / -1' }}>
                      Special instructions
                      <input
                        className="co-input"
                        value={newMedicine.instructions}
                        onChange={(e) => setNewMedicine((prev) => ({ ...prev, instructions: e.target.value }))}
                        placeholder="e.g., Take with meals"
                      />
                    </label>
                  </div>

                  <div className="co-actions">
                    <button type="button" className="co-btn co-btn--primary" onClick={addMedicineFromNewMedicine}>
                      Add medicine
                    </button>
                  </div>
                </div>

                <div>
                  <div className="co-inlineTitle">Current medicines</div>
                  <div className="co-medicineList">
                    {medicines.length ? (
                      medicines.map((m, idx) => (
                        <div key={`${m.name}_${idx}`} className="co-medicineRow">
                          <div>
                            <div className="co-strong">{m.name}</div>
                            <div className="co-mutedSmall">
                              {m.dosage} • {m.frequency} • {m.duration}
                            </div>
                            {m.instructions ? <div className="co-mutedSmall">Note: {m.instructions}</div> : null}
                          </div>
                          <button type="button" className="co-btn co-btn--ghost" onClick={() => removeMedicine(m.name)}>
                            Remove
                          </button>
                        </div>
                      ))
                    ) : (
                      <div className="co-mutedSmall">No medicines added yet.</div>
                    )}
                  </div>

                  <div style={{ height: 12 }} />
                  <label className="co-label">
                    Overall special instructions
                    <div className="co-textareaRow">
                      <textarea
                        className="co-textarea"
                        value={specialInstructions}
                        onChange={(e) => setSpecialInstructions(e.target.value)}
                        placeholder="Additional notes for the patient..."
                      />
                      <div className="co-textareaTools">
                        <VoiceToText onResult={(t) => setSpecialInstructions((prev) => (prev ? `${prev} ${t}` : t))} />
                      </div>
                    </div>
                  </label>
                </div>
              </div>
            </>
          ) : null}

          {step === 4 ? (
            <>
              <div className="co-twoCol">
                <div>
                  <div className="co-inlineTitle">Recommend lab tests (optional)</div>
                  <input className="co-input" value={testInput} onChange={(e) => setTestInput(e.target.value)} placeholder="Search tests (e.g., ECG, HbA1c)..." />
                  <div className="co-chipRow">
                    {suggestedTests.map((t) => (
                      <button key={t.name} type="button" className="co-chip" onClick={() => addTest(t.name)}>
                        {t.name}
                      </button>
                    ))}
                  </div>

                  <div style={{ height: 10 }} />
                  <div className="co-mutedSmall">You can mark urgency per test.</div>
                </div>
                <div>
                  <div className="co-inlineTitle">Selected tests</div>
                  <div className="co-testList">
                    {testRecommendations.length ? (
                      testRecommendations.map((t) => (
                        <div key={t.name} className="co-testRow">
                          <div>
                            <div className="co-strong">{t.name}</div>
                            <div className="co-mutedSmall">Urgency</div>
                          </div>
                          <label className="co-label" style={{ margin: 0 }}>
                            <select className="co-input" value={t.urgency} onChange={(e) => updateTestUrgency(t.name, e.target.value)}>
                              <option value="ROUTINE">Routine</option>
                              <option value="FOLLOW_UP">Follow-up</option>
                              <option value="URGENT">Urgent</option>
                            </select>
                          </label>
                          <button className="co-btn co-btn--ghost" type="button" onClick={() => removeTest(t.name)}>
                            Remove
                          </button>
                        </div>
                      ))
                    ) : (
                      <div className="co-mutedSmall">No tests recommended.</div>
                    )}
                  </div>
                </div>
              </div>
            </>
          ) : null}

          {step === 5 ? (
            <>
              <div className="co-summaryGrid">
                <div className="co-summaryBlock">
                  <div className="co-inlineTitle">Prescription Summary</div>
                  <div className="co-mutedSmall">
                    Patient: <b>{patient?.name || '-'}</b>
                    <br />
                    Diagnoses: <b>{diagnoses.length ? diagnoses.join(', ') : '-'}</b>
                    <br />
                    Medicines: <b>{medicines.length ? medicines.map((m) => m.name).join(', ') : '-'}</b>
                  </div>
                  <div className="co-divider" />
                  <div className="co-mutedSmall">Notes: {diagnosisNotes ? clampText(diagnosisNotes, 220) : '—'}</div>
                  {specialInstructions ? <div className="co-mutedSmall">Instructions: {clampText(specialInstructions, 220)}</div> : null}
                  {testRecommendations.length ? (
                    <div className="co-mutedSmall">
                      Tests: <b>{testRecommendations.map((t) => t.name).join(', ')}</b>
                    </div>
                  ) : null}
                </div>

                <div className="co-summaryBlock">
                  <div className="co-inlineTitle">Generate Output</div>
                  <div className="co-mutedSmall">Auto-generates a PDF e-prescription and saves it to patient records.</div>
                  {error ? <div className="co-alert co-alert--danger" style={{ marginTop: 10 }}>{error}</div> : null}
                  <div className="co-actions">
                    {!canGenerate && (
                      <div style={{ color: 'var(--error)', fontSize: '13px', marginBottom: '8px' }}>
                        * To generate, please provide at least one diagnosis, medicine, or clinical note. If providing medicines, ensure dosage/frequency/duration are complete.
                      </div>
                    )}
                    <button type="button" className="co-btn co-btn--primary" onClick={onGenerate} disabled={!canGenerate || saving}>
                      {saving ? 'Generating...' : 'Generate & Save PDF'}
                    </button>
                    <button
                      type="button"
                      className="co-btn co-btn--ghost"
                      onClick={() => nav(`/doctor/patients/${patientId}`)}
                      disabled={!patientId}
                    >
                      View Patient History
                    </button>
                  </div>

                  {generated?.pdfDataUrl ? (
                    <div style={{ marginTop: 10 }}>
                      <a className="co-btn co-btn--ghost" href={generated.pdfDataUrl} download={`CareOS_${patient?.name}_eRx.pdf`}>
                        Download PDF
                      </a>
                      {whatsappLink ? (
                        <a className="co-btn co-btn--ghost" href={whatsappLink} target="_blank" rel="noreferrer">
                          Share WhatsApp
                        </a>
                      ) : null}
                      <a
                        className="co-btn co-btn--ghost"
                        href={`mailto:?subject=${encodeURIComponent('CareOS e-Prescription')}&body=${encodeURIComponent(shareMessage)}`}
                      >
                        Share Email
                      </a>
                    </div>
                  ) : null}
                </div>
              </div>
            </>
          ) : null}
        </section>

        <aside className="co-sideSticky">
          <div className="co-card" style={{ background: 'var(--primary-fixed)', border: '1px solid var(--primary-fixed-dim)', borderRadius: '16px', padding: '24px' }}>
            <div style={{ color: 'var(--primary)', fontWeight: 800, fontSize: '13px', letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: '16px' }}>Active Patient</div>
            {patient ? (
              <>
                <div style={{ display: 'flex', gap: '16px', alignItems: 'center', marginBottom: '16px' }}>
                   <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', fontWeight: 'bold' }}>
                     {patient.name.charAt(0)}
                   </div>
                   <div>
                     <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-h)' }}>{patient.name}</div>
                     <div style={{ fontSize: '14px', color: 'var(--muted)', marginTop: '4px' }}>{patient.age} Years • {patient.gender || 'Male'} • {patient.bloodGroup}</div>
                   </div>
                </div>
                
                <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', flexWrap: 'wrap' }}>
                  {(patient.chronicDiseases || []).map(cd => (
                    <span key={cd} style={{ background: 'var(--error-container)', color: 'var(--error)', padding: '4px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase' }}>
                      {cd}
                    </span>
                  ))}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', fontSize: '13px' }}>
                  <span style={{ color: 'var(--muted)', fontWeight: 600 }}>Last BP</span>
                  <span style={{ fontWeight: 700, color: 'var(--text-h)' }}>{patient.vitals?.bpSys}/{patient.vitals?.bpDia} mmHg</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', fontSize: '13px' }}>
                  <span style={{ color: 'var(--muted)', fontWeight: 600 }}>Weight</span>
                  <span style={{ fontWeight: 700, color: 'var(--text-h)' }}>78.5 kg</span>
                </div>
                
                <div style={{ height: '1px', background: 'var(--primary-fixed-dim)', margin: '16px 0' }} />
                
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                  <span style={{ color: 'var(--error)', fontWeight: 600 }}>Allergies</span>
                  <span style={{ fontWeight: 700, color: 'var(--error)' }}>{patient.allergies?.length ? patient.allergies.join(', ') : 'None'}</span>
                </div>
              </>
            ) : (
              <div className="co-mutedSmall">Select a patient to begin.</div>
            )}
          </div>

          <div style={{ height: 24 }} />

          <div className="co-card" style={{ padding: '24px', borderRadius: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
               <div style={{ fontWeight: 800, fontSize: '14px', letterSpacing: '0.5px', textTransform: 'uppercase', color: 'var(--muted)' }}>Recent Records</div>
               <span style={{ color: 'var(--primary)', fontWeight: 700, fontSize: '12px', cursor: 'pointer' }}>VIEW ALL</span>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
               <div style={{ background: 'var(--surface)', padding: '16px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                 <FileText size={20} color="var(--text)" />
                 <div style={{ flex: 1 }}>
                   <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text-h)' }}>ECG Report - Oct 2023</div>
                   <div style={{ fontSize: '12px', color: 'var(--muted)' }}>Normal Sinus Rhythm</div>
                 </div>
               </div>
               <div style={{ background: 'var(--surface)', padding: '16px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                 <FileText size={20} color="var(--text)" />
                 <div style={{ flex: 1 }}>
                   <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text-h)' }}>Lipid Profile</div>
                   <div style={{ fontSize: '12px', color: 'var(--muted)' }}>Borderline Cholesterol</div>
                 </div>
               </div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '24px' }}>
             {lastPrescription && (
               <button 
                 type="button" 
                 onClick={applyRepeatLastPrescription}
                 style={{ background: 'var(--surface-container)', color: 'var(--text-h)', fontWeight: 700, border: 'none', padding: '16px', borderRadius: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                 Repeat Last Prescription
               </button>
             )}
             <button 
               type="button"
               style={{ background: 'var(--tertiary-fixed)', color: 'var(--tertiary)', fontWeight: 700, border: 'none', padding: '16px', borderRadius: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
               Risk Assessment Tool
             </button>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '32px', borderTop: '1px solid var(--border)', paddingTop: '24px' }}>
             <button style={{ background: 'transparent', border: 'none', color: 'var(--text-h)', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }} onClick={() => nav('/doctor/dashboard')}>
               ✕ Discard Session
             </button>
             <div style={{ display: 'flex', gap: '12px' }}>
               <button style={{ background: 'var(--surface-container)', color: 'var(--text-h)', border: 'none', padding: '12px 24px', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }} onClick={() => setStep((s) => Math.max(1, s - 1))} disabled={step === 1}>
                 {step === 1 ? 'Save Draft' : 'Back'}
               </button>
               {step < 5 ? (
                 <button style={{ background: 'var(--primary)', color: '#fff', border: 'none', padding: '12px 24px', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }} onClick={() => setStep((s) => Math.min(5, s + 1))}>
                   Continue →
                 </button>
               ) : (
                 <button style={{ background: 'var(--primary)', color: '#fff', border: 'none', padding: '12px 24px', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }} onClick={() => nav('/doctor/dashboard')}>
                   Finish
                 </button>
               )}
             </div>
          </div>
        </aside>
      </div>
    </div>
  )
}

