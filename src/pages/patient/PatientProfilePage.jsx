import React, { useMemo, useState } from 'react'
import { useApp } from '../../context/AppContext'

function splitList(value) {
  return String(value || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
}

export default function PatientProfilePage() {
  const { currentPatientId, getPatientById, upsertPatient, records } = useApp()
  const patient = useMemo(() => getPatientById(currentPatientId), [currentPatientId, getPatientById])

  const [form, setForm] = useState(() => ({
    age: patient?.age ?? 30,
    bloodGroup: patient?.bloodGroup ?? 'O+',
    occupation: patient?.occupation ?? '',
    emergencyContactName: patient?.emergencyContactName ?? '',
    emergencyContactPhone: patient?.emergencyContactPhone ?? '',
    allergies: (patient?.allergies || []).join(', '),
    chronicDiseases: (patient?.chronicDiseases || []).join(', '),
    medications: (patient?.medications || []).join(', '),
    bpSys: patient?.vitals?.bpSys ?? 120,
    bpDia: patient?.vitals?.bpDia ?? 80,
    heartRate: patient?.vitals?.heartRate ?? 72,
    spo2: patient?.vitals?.spo2 ?? 98,
    glucoseFasting: patient?.vitals?.glucoseFasting ?? 95,
  }))

  if (!patient) return <div className="co-page">No patient profile found.</div>

  const lastPrescription = records
    .filter((r) => r.type === 'prescription' && r.patientId === patient.id)
    .sort((a, b) => (a.createdAtISO < b.createdAtISO ? 1 : -1))[0]

  const onSave = (e) => {
    e.preventDefault()
    upsertPatient(patient.id, {
      age: Number(form.age),
      bloodGroup: form.bloodGroup,
      occupation: form.occupation,
      emergencyContactName: form.emergencyContactName,
      emergencyContactPhone: form.emergencyContactPhone,
      allergies: splitList(form.allergies),
      chronicDiseases: splitList(form.chronicDiseases),
      medications: splitList(form.medications),
      vitals: {
        bpSys: Number(form.bpSys),
        bpDia: Number(form.bpDia),
        heartRate: Number(form.heartRate),
        spo2: Number(form.spo2),
        glucoseFasting: Number(form.glucoseFasting),
      },
      lastVisitISO: new Date().toISOString(),
    })
  }

  return (
    <div className="co-page">
      <h1 className="co-h1">Personal Health Profile</h1>

      <div className="co-grid2">
        <div className="co-card">
          <form className="co-form" onSubmit={onSave}>
            <div className="co-formRow">
              <label className="co-label">
                Age
                <input className="co-input" value={form.age} onChange={(e) => setForm((p) => ({ ...p, age: e.target.value }))} />
              </label>
              <label className="co-label">
                Blood Group
                <input
                  className="co-input"
                  value={form.bloodGroup}
                  onChange={(e) => setForm((p) => ({ ...p, bloodGroup: e.target.value }))}
                />
              </label>
            </div>

            <label className="co-label">
              Occupation
              <input className="co-input" value={form.occupation} onChange={(e) => setForm((p) => ({ ...p, occupation: e.target.value }))} />
            </label>

            <div className="co-formRow">
              <label className="co-label">
                Emergency Contact Name
                <input
                  className="co-input"
                  value={form.emergencyContactName}
                  onChange={(e) => setForm((p) => ({ ...p, emergencyContactName: e.target.value }))}
                />
              </label>
              <label className="co-label">
                Emergency Contact Phone
                <input
                  className="co-input"
                  value={form.emergencyContactPhone}
                  onChange={(e) => setForm((p) => ({ ...p, emergencyContactPhone: e.target.value }))}
                />
              </label>
            </div>

            <label className="co-label">
              Allergies (comma-separated)
              <textarea className="co-textarea" value={form.allergies} onChange={(e) => setForm((p) => ({ ...p, allergies: e.target.value }))} />
            </label>

            <label className="co-label">
              Chronic Diseases (comma-separated)
              <textarea className="co-textarea" value={form.chronicDiseases} onChange={(e) => setForm((p) => ({ ...p, chronicDiseases: e.target.value }))} />
            </label>

            <label className="co-label">
              Ongoing Medications (comma-separated)
              <textarea className="co-textarea" value={form.medications} onChange={(e) => setForm((p) => ({ ...p, medications: e.target.value }))} />
            </label>

            <div className="co-sectionTitle">Vitals</div>
            <div className="co-formRow">
              <label className="co-label">
                BP Systolic
                <input className="co-input" value={form.bpSys} onChange={(e) => setForm((p) => ({ ...p, bpSys: e.target.value }))} />
              </label>
              <label className="co-label">
                BP Diastolic
                <input className="co-input" value={form.bpDia} onChange={(e) => setForm((p) => ({ ...p, bpDia: e.target.value }))} />
              </label>
            </div>
            <div className="co-formRow">
              <label className="co-label">
                Heart Rate (BPM)
                <input className="co-input" value={form.heartRate} onChange={(e) => setForm((p) => ({ ...p, heartRate: e.target.value }))} />
              </label>
              <label className="co-label">
                SpO2 (%)
                <input className="co-input" value={form.spo2} onChange={(e) => setForm((p) => ({ ...p, spo2: e.target.value }))} />
              </label>
            </div>
            <label className="co-label">
              Glucose (Fasting, mg/dL)
              <input className="co-input" value={form.glucoseFasting} onChange={(e) => setForm((p) => ({ ...p, glucoseFasting: e.target.value }))} />
            </label>

            <div className="co-actions">
              <button type="submit" className="co-btn co-btn--primary">
                Save Profile
              </button>
            </div>
          </form>
        </div>

        <div className="co-card">
          <div className="co-sectionTitle">Quick Summary</div>
          <div className="co-muted">Last visit: {new Date(patient.lastVisitISO).toLocaleDateString()}</div>
          <div className="co-divider" />
          <div className="co-mutedSmall">Latest e-Prescription</div>
          {lastPrescription ? (
            <div className="co-infoRow">
              <div>
                <div className="co-strong">{new Date(lastPrescription.createdAtISO).toLocaleDateString()}</div>
                <div className="co-mutedSmall">Diagnoses: {lastPrescription.extracted?.diagnoses?.join(', ') || '-'}</div>
              </div>
              <a className="co-btn co-btn--ghost" href={lastPrescription.pdfDataUrl || '#'} onClick={(e)=>{ if(!lastPrescription.pdfDataUrl) e.preventDefault(); }} download>
                Download PDF
              </a>
            </div>
          ) : (
            <div className="co-mutedSmall">No prescriptions yet.</div>
          )}
          <div className="co-divider" />
          <div className="co-mutedSmall">Upcoming appointments</div>
          <div className="co-mutedSmall">Open <b>Schedules</b> in doctor console for booking (demo).</div>
        </div>
      </div>
    </div>
  )
}

