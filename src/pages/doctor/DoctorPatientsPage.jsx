import React, { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../../context/AppContext'
import { Clock, FileText, Phone, UserPlus, X } from 'lucide-react'

export default function DoctorPatientsPage() {
  const nav = useNavigate()
  const { currentDoctorId, patients, records, getPatientById, addPatient, addRecord } = useApp()
  const [selectedPatient, setSelectedPatient] = useState(null)
  const [showAddModal, setShowAddModal] = useState(false)

  // ─── Add Patient Form State ────────────────────────
  const [newPat, setNewPat] = useState({
    name: '', age: '', bloodGroup: 'O+', occupation: '',
    emergencyContactName: '', emergencyContactPhone: '',
    allergiesText: '', chronicText: '',
  })
  const updateField = (k, v) => setNewPat((p) => ({ ...p, [k]: v }))

  const handleAddPatient = async () => {
    if (!newPat.name.trim()) return
    try {
      const created = await addPatient({
        name: newPat.name.trim(),
        age: newPat.age,
        bloodGroup: newPat.bloodGroup,
        occupation: newPat.occupation,
        emergencyContactName: newPat.emergencyContactName,
        emergencyContactPhone: newPat.emergencyContactPhone,
        allergies: newPat.allergiesText ? newPat.allergiesText.split(',').map((s) => s.trim()).filter(Boolean) : [],
        chronicDiseases: newPat.chronicText ? newPat.chronicText.split(',').map((s) => s.trim()).filter(Boolean) : [],
      })
      
      // Create a record so this patient shows up under "my patients"
      await addRecord({
        type: 'CONSULTATION_NOTE',
        patientId: created._id,
        title: 'Patient Registration',
        payload: { notes: 'New patient added manually via management console.' }
      })
      
      setNewPat({ name: '', age: '', bloodGroup: 'O+', occupation: '', emergencyContactName: '', emergencyContactPhone: '', allergiesText: '', chronicText: '' })
      setShowAddModal(false)
    } catch (err) {
      console.error(err);
      alert("Failed to add patient: " + err.message);
    }
  }

  // Get all unique patients diagnosed by this doctor
  const diagnosedPatients = useMemo(() => {
    const patientIds = new Set()
    
    // Get all records created by this doctor, collect unique patient IDs
    records.forEach((record) => {
      const docId = record.doctorId?._id || record.doctorId
      const patId = record.patientId?._id || record.patientId
      if (docId === currentDoctorId && patId) {
        patientIds.add(patId)
      }
    })

    // Get patient details for each unique patient ID
    const patientsList = Array.from(patientIds)
      .map((patientId) => {
        const patient = getPatientById(patientId)
        if (!patient) return null

        // Get latest appointment and records for this patient
        return patient
      })
      .filter(Boolean)
      .sort((a, b) => a.name.localeCompare(b.name))

    return patientsList
  }, [records, currentDoctorId, getPatientById])

  // Get patient history (all records for a selected patient)
  const patientHistory = useMemo(() => {
    if (!selectedPatient) return []
    return records
      .filter((r) => {
          const patId = r.patientId?._id || r.patientId
          const docId = r.doctorId?._id || r.doctorId
          return patId === selectedPatient._id && docId === currentDoctorId
      })
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
  }, [selectedPatient, records, currentDoctorId])

  const totalPatients = diagnosedPatients.length

  return (
    <div className="co-page animate-fade-in-up">
      <div className="co-pageHeader">
        <div>
          <div className="co-pageKicker">Patient Management</div>
          <h1 className="co-h1">My Patients</h1>
          <div className="co-mutedSmall">{totalPatients} patients under your care</div>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="co-btn" onClick={() => setShowAddModal(true)} style={{ gap: '8px' }}>
            <UserPlus size={16} /> Add Patient
          </button>
          <button className="co-btn co-btn--primary" onClick={() => nav('/doctor/new-consultation')}>
            New Consultation
          </button>
        </div>
      </div>

      {/* ─── Add Patient Modal ──────────────────────────── */}
      {showAddModal && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 2000,
          background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px',
        }} onClick={() => setShowAddModal(false)}>
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'var(--surface-lowest)', borderRadius: '20px', padding: '32px',
              width: '520px', maxWidth: '100%', maxHeight: '85vh', overflowY: 'auto',
              boxShadow: 'var(--shadow-ambient)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <div>
                <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-h)' }}>Add New Patient</div>
                <div className="co-mutedSmall">Enter basic patient information</div>
              </div>
              <button onClick={() => setShowAddModal(false)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-h)' }}>
                <X size={22} />
              </button>
            </div>

            <div className="co-form">
              <div className="co-formRow">
                <label className="co-label" style={{ flex: 2 }}>
                  Full Name *
                  <input className="co-input" placeholder="e.g., Priya Sharma" value={newPat.name} onChange={(e) => updateField('name', e.target.value)} />
                </label>
                <label className="co-label" style={{ flex: 1 }}>
                  Age
                  <input className="co-input" type="number" placeholder="30" value={newPat.age} onChange={(e) => updateField('age', e.target.value)} />
                </label>
              </div>

              <div className="co-formRow">
                <label className="co-label" style={{ flex: 1 }}>
                  Blood Group
                  <select className="co-input" value={newPat.bloodGroup} onChange={(e) => updateField('bloodGroup', e.target.value)}>
                    {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((bg) => (
                      <option key={bg} value={bg}>{bg}</option>
                    ))}
                  </select>
                </label>
                <label className="co-label" style={{ flex: 1 }}>
                  Occupation
                  <input className="co-input" placeholder="e.g., Engineer" value={newPat.occupation} onChange={(e) => updateField('occupation', e.target.value)} />
                </label>
              </div>

              <div style={{ height: '4px' }} />
              <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-h)' }}>Emergency Contact</div>

              <div className="co-formRow">
                <label className="co-label" style={{ flex: 1 }}>
                  Contact Name
                  <input className="co-input" placeholder="e.g., Ravi Sharma" value={newPat.emergencyContactName} onChange={(e) => updateField('emergencyContactName', e.target.value)} />
                </label>
                <label className="co-label" style={{ flex: 1 }}>
                  Phone
                  <input className="co-input" placeholder="+91 98765 43210" value={newPat.emergencyContactPhone} onChange={(e) => updateField('emergencyContactPhone', e.target.value)} />
                </label>
              </div>

              <div style={{ height: '4px' }} />
              <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-h)' }}>Medical History</div>

              <label className="co-label">
                Known Allergies <span style={{ fontWeight: 400, color: 'var(--muted)' }}>(comma-separated)</span>
                <input className="co-input" placeholder="e.g., Penicillin, Aspirin" value={newPat.allergiesText} onChange={(e) => updateField('allergiesText', e.target.value)} />
              </label>
              <label className="co-label">
                Chronic Conditions <span style={{ fontWeight: 400, color: 'var(--muted)' }}>(comma-separated)</span>
                <input className="co-input" placeholder="e.g., Hypertension, Diabetes" value={newPat.chronicText} onChange={(e) => updateField('chronicText', e.target.value)} />
              </label>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '12px' }}>
                <button className="co-btn" onClick={() => setShowAddModal(false)}>Cancel</button>
                <button className="co-btn co-btn--primary" disabled={!newPat.name.trim()} onClick={handleAddPatient}>
                  <UserPlus size={16} /> Add Patient
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="co-grid2">
        {/* Patients List */}
        <section className="co-card">
          <div className="co-pageHeader">
            <h2 className="co-h2">Patients List</h2>
          </div>

          {diagnosedPatients.length > 0 ? (
            <div className="co-queueList">
              {diagnosedPatients.map((patient) => (
                <div
                  key={patient._id}
                  className="co-queueItem"
                  style={{ cursor: 'pointer' }}
                  onClick={() => setSelectedPatient(patient)}
                >
                  <div className="co-queueAvatar">{patient.name.slice(0, 2).toUpperCase()}</div>
                  <div className="co-queueBody">
                    <div className="co-queueTop">
                      <div className="co-queueName">{patient.name}</div>
                      <div style={{ fontSize: '12px', color: 'rgba(107, 99, 117, 0.95)' }}>
                        {patient.bloodGroup} • {patient.age} yrs
                      </div>
                    </div>
                    <div className="co-mutedSmall">{patient.occupation}</div>
                    <div className="co-mutedSmall">Last visit: {new Date(patient.updatedAt || Date.now()).toLocaleDateString()}</div>
                  </div>
                  <button
                    className="co-btn co-btn--ghost co-btn--sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      setSelectedPatient(patient)
                    }}
                  >
                    View
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="co-empty">No patients yet. Start a consultation to add patients.</div>
          )}
        </section>

        {/* Patient History */}
        <section className="co-card">
          {selectedPatient ? (
            <>
              <div className="co-pageHeader">
                <div>
                  <h2 className="co-h2">{selectedPatient.name}</h2>
                  <div className="co-mutedSmall">{selectedPatient.occupation}</div>
                </div>
                <button
                  className="co-btn co-btn--ghost co-btn--sm"
                  onClick={() => nav(`/doctor/patients/${selectedPatient._id}`)}
                >
                  Full Profile
                </button>
              </div>

              <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '10px',
                    padding: '12px',
                    background: 'rgba(246, 248, 252, 0.6)',
                    borderRadius: '12px',
                  }}
                >
                  <div>
                    <div style={{ fontSize: '12px', fontWeight: '700', color: 'rgba(107, 99, 117, 0.95)' }}>
                      Age
                    </div>
                    <div style={{ fontSize: '16px', fontWeight: '900', marginTop: '4px' }}>
                      {selectedPatient.age} years
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '12px', fontWeight: '700', color: 'rgba(107, 99, 117, 0.95)' }}>
                      Blood Group
                    </div>
                    <div style={{ fontSize: '16px', fontWeight: '900', marginTop: '4px' }}>
                      {selectedPatient.bloodGroup}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '12px', fontWeight: '700', color: 'rgba(107, 99, 117, 0.95)' }}>
                      Phone
                    </div>
                    <div style={{ fontSize: '13px', marginTop: '4px' }}>
                      <a href={`tel:${selectedPatient.emergencyContactPhone}`} style={{ textDecoration: 'none', color: 'var(--accent)' }}>
                        <Phone size={14} style={{ display: 'inline', marginRight: '6px' }} />
                        {selectedPatient.emergencyContactPhone}
                      </a>
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '12px', fontWeight: '700', color: 'rgba(107, 99, 117, 0.95)' }}>
                      Last Visit
                    </div>
                    <div style={{ fontSize: '13px', marginTop: '4px' }}>
                      {new Date(selectedPatient.updatedAt || selectedPatient.createdAt || Date.now()).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ marginTop: '16px' }}>
                <h3 className="co-h2" style={{ marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Clock size={18} />
                  Patient History
                </h3>

                {patientHistory.length > 0 ? (
                  <div className="co-timeline">
                    {patientHistory.map((record) => (
                      <div key={record._id} className="co-timelineItem">
                        <div className="co-timelineDot" />
                        <div className="co-timelineBody">
                          <div className="co-timelineTop">
                            <div style={{ fontWeight: '900', color: 'var(--text-h)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <FileText size={16} />
                              {record.type === 'PRESCRIPTION'
                                ? 'Prescription'
                                : record.type === 'LAB_REPORT'
                                ? 'Lab Report'
                                : record.type === 'CONSULTATION'
                                ? 'Consultation'
                                : 'Record'}
                            </div>
                            <span style={{ fontSize: '12px', color: 'rgba(107, 99, 117, 0.95)' }}>
                              {new Date(record.createdAt).toLocaleDateString()}
                            </span>
                          </div>

                          {record.type === 'PRESCRIPTION' && (
                            <div style={{ marginTop: '8px' }}>
                              <div style={{ fontSize: '13px', fontWeight: '700', marginBottom: '4px' }}>
                                Diagnoses:
                              </div>
                              <div style={{ fontSize: '13px', color: 'rgba(107, 99, 117, 0.95)' }}>
                                {record.payload?.diagnoses?.join(', ') || 'N/A'}
                              </div>
                              {record.notes && (
                                <div style={{ marginTop: '6px', fontSize: '13px', color: 'rgba(107, 99, 117, 0.95)' }}>
                                  {record.notes}
                                </div>
                              )}
                            </div>
                          )}

                          {record.type === 'LAB_REPORT' && (
                            <div style={{ marginTop: '8px' }}>
                              <div style={{ fontSize: '13px', fontWeight: '700', marginBottom: '4px' }}>
                                {record.title || 'Lab Report'}
                              </div>
                              <div style={{ fontSize: '12px', color: 'rgba(107, 99, 117, 0.95)' }}>
                                {record.notes || 'No summary available'}
                              </div>
                            </div>
                          )}

                          {record.type === 'CONSULTATION' && (
                            <div style={{ marginTop: '8px' }}>
                              <div style={{ fontSize: '13px', fontWeight: '700', marginBottom: '4px' }}>
                                {record.title || 'Clinical Consultation'}
                              </div>
                              <div style={{ fontSize: '12px', color: 'rgba(107, 99, 117, 0.95)' }}>
                                {record.notes || 'Clinical notes provided.'}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="co-empty">No history records found for this patient.</div>
                )}
              </div>
            </>
          ) : (
            <div className="co-empty">Select a patient from the list to view their history</div>
          )}
        </section>
      </div>
    </div>
  )
}
