import React, { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../../context/AppContext'
import { storePatientFile } from '../../lib/patientFileStore'

export default function PatientUploadPage() {
  const nav = useNavigate()
  const { currentPatientId, getPatientById, addRecord, makeId } = useApp()
  const patient = useMemo(() => getPatientById(currentPatientId), [currentPatientId, getPatientById])

  const [recordType, setRecordType] = useState('lab_report')
  const [title, setTitle] = useState('Lab Report Upload')
  const [summary, setSummary] = useState('')
  const [keywords, setKeywords] = useState('')
  const [files, setFiles] = useState([])
  const [error, setError] = useState(null)

  if (!patient) return <div className="co-page">No patient profile found.</div>

  const onFileChange = (e) => {
    const list = Array.from(e.target.files || [])
    setFiles(list)
  }

  const onSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    if (!files.length) {
      setError('Please select at least one file.')
      return
    }

    const recordId = makeId('rec')
    const storedFiles = []
    for (const file of files) {
      const fileId = makeId('file')
      const meta = await storePatientFile({ patientId: patient.id, recordId, file, fileId })
      storedFiles.push(meta)
    }

    addRecord({
      id: recordId,
      type: recordType,
      patientId: patient.id,
      doctorId: null,
      doctorName: null,
      createdAtISO: new Date().toISOString(),
      payload: {
        title,
        summary,
        keywords: keywords ? keywords.split(',').map((s) => s.trim()).filter(Boolean) : [],
        files: storedFiles,
      },
      extracted: {
        diagnoses: [],
        medicines: [],
        keywords: keywords ? keywords.split(',').map((s) => s.trim()).filter(Boolean) : [],
      },
      pdfDataUrl: null,
    })

    nav('/patient/timeline')
  }

  return (
    <div className="co-page">
      <h1 className="co-h1">Upload Reports</h1>
      <div className="co-card">
        <form className="co-form" onSubmit={onSubmit}>
          <div className="co-formRow">
            <label className="co-label">
              Record Type
              <select className="co-input" value={recordType} onChange={(e) => setRecordType(e.target.value)}>
                <option value="lab_report">Lab Reports</option>
                <option value="imaging">Imaging (X-ray/MRI)</option>
                <option value="doctor_note">Doctor Notes</option>
              </select>
            </label>
            <label className="co-label">
              Title
              <input className="co-input" value={title} onChange={(e) => setTitle(e.target.value)} />
            </label>
          </div>

          <label className="co-label">
            Summary (optional)
            <textarea className="co-textarea" value={summary} onChange={(e) => setSummary(e.target.value)} placeholder="Add a short note about the report..." />
          </label>

          <label className="co-label">
            Keywords / Condition (comma-separated)
            <input
              className="co-input"
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
              placeholder="e.g., LDL, Diabetes, ECG"
            />
          </label>

          <label className="co-label">
            Select files (PDF / images)
            <input className="co-input" type="file" accept="application/pdf,image/*" multiple onChange={onFileChange} />
          </label>

          {error ? <div className="co-alert co-alert--danger">{error}</div> : null}

          <div className="co-actions">
            <button className="co-btn co-btn--primary" type="submit">
              Upload & Save
            </button>
            <button className="co-btn co-btn--ghost" type="button" onClick={() => nav('/patient/timeline')}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

