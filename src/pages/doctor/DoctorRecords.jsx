import React, { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../../context/AppContext'

function formatType(type) {
  if (type === 'LAB_REPORT') return 'Lab Report'
  if (type === 'IMAGING') return 'Imaging'
  if (type === 'CONSULTATION') return 'Consultation'
  if (type === 'PRESCRIPTION') return 'Prescription'
  return type
}

export default function DoctorRecords() {
  const nav = useNavigate()
  const { patients, records, currentDoctorId } = useApp()

  const [query, setQuery] = useState('')
  const [type, setType] = useState('all')
  const [doctorOnly, setDoctorOnly] = useState(true)
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    const from = fromDate ? new Date(fromDate).getTime() : null
    const to = toDate ? new Date(toDate).getTime() : null

    return records
      .filter((r) => {
          const docId = r.doctorId?._id || r.doctorId
          return (doctorOnly ? docId === currentDoctorId : true)
      })
      .filter((r) => (type === 'all' ? true : r.type === type.toUpperCase()))
      .filter((r) => {
        const t = new Date(r.createdAt).getTime()
        if (from && t < from) return false
        if (to && t > to) return false
        if (!q) return true
        const pid = r.patientId?._id || r.patientId
        const patientName = patients.find((p) => p._id === pid)?.name || ''
        const haystack = [
          r.doctorName || '',
          patientName,
          r.payload?.title || '',
          r.payload?.summary || '',
          ...(r.extracted?.diagnoses || []),
          ...(r.extracted?.medicines || []),
          ...(r.extracted?.keywords || []),
          ...(r.payload?.keywords || []),
        ]
          .join(' ')
          .toLowerCase()
        return haystack.includes(q)
      })
      .sort((a, b) => (new Date(a.createdAt) < new Date(b.createdAt) ? 1 : -1))
  }, [currentDoctorId, fromDate, patients, query, records, doctorOnly, toDate, type])

  return (
    <div className="co-page animate-fade-in-up">
      <div className="co-pageHeader">
        <div>
          <h1 className="co-h1">Records</h1>
          <div className="co-mutedSmall">Centralized medical history with smart search and structured data view.</div>
        </div>
      </div>

      <section className="co-card">
        <div className="co-formRow" style={{ alignItems: 'flex-end' }}>
          <label className="co-label" style={{ flex: 2 }}>
            Smart Search
            <input
              className="co-input"
              placeholder="Search by date, condition, doctor, keywords..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
          <label className="co-label">
            Type
            <select className="co-input" value={type} onChange={(e) => setType(e.target.value)}>
              <option value="all">All records</option>
              <option value="prescription">Prescriptions</option>
              <option value="lab_report">Lab Reports</option>
              <option value="imaging">Imaging</option>
              <option value="doctor_note">Doctor Notes</option>
            </select>
          </label>
          <label className="co-label">
            From
            <input className="co-input" type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
          </label>
          <label className="co-label">
            To
            <input className="co-input" type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
          </label>
        </div>

        <div className="co-formRow" style={{ marginTop: 10 }}>
          <label className="co-checkRow">
            <input type="checkbox" checked={doctorOnly} onChange={(e) => setDoctorOnly(e.target.checked)} />
            Doctor only
          </label>
          <div className="co-mutedSmall">ABHA integration ready (future upgrade).</div>
        </div>
      </section>

      <div style={{ height: 14 }} />

      <section className="co-card">
        <div className="co-pageHeader">
          <h2 className="co-h2">Timeline View</h2>
          <div className="co-mutedSmall">{filtered.length} results</div>
        </div>

        <div className="co-recordList">
          {filtered.length ? (
            filtered.slice(0, 80).map((r) => {
              const pid = r.patientId?._id || r.patientId
              const patientName = patients.find((p) => p._id === pid)?.name || r.patientId?.name || 'Patient'
              return (
                <div key={r._id || r.id} className="co-recordRow">
                  <div className="co-recordRowLeft">
                    <div className="co-recordType">{formatType(r.type)}</div>
                    <div className="co-mutedSmall">{new Date(r.createdAt).toLocaleString()}</div>
                    <div className="co-mutedSmall">
                      Patient: <b>{patientName}</b>
                    </div>
                  </div>
                  <div className="co-recordRowRight">
                    {r.type === 'PRESCRIPTION' ? (
                      <>
                        <div className="co-mutedSmall">
                          Diagnoses: <b>{r.payload?.diagnoses?.join(', ') || '-'}</b>
                        </div>
                        <div className="co-mutedSmall">
                          Medicines: <b>{r.payload?.medicines?.map(m => m.name).join(', ') || '-'}</b>
                        </div>
                        {r.pdfFileUrl ? (
                          <a className="co-btn co-btn--ghost" href={r.pdfFileUrl} download={`PrabhaCare_${patientName}_eRx.pdf`}>
                            Download PDF
                          </a>
                        ) : null}
                      </>
                    ) : (
                      <>
                        <div className="co-mutedSmall">{r.payload?.title || r.payload?.summary || '-'}</div>
                        {r.payload?.keywords?.length ? (
                          <div className="co-mutedSmall">
                            Keywords: <b>{r.payload.keywords.join(', ')}</b>
                          </div>
                        ) : null}
                      </>
                    )}
                    <button className="co-btn co-btn--ghost" type="button" onClick={() => nav(`/doctor/patients/${r.patientId?._id || r.patientId}`)}>
                      View Full History
                    </button>
                  </div>
                </div>
              )
            })
          ) : (
            <div className="co-mutedSmall">No records match your search.</div>
          )}
        </div>
      </section>
    </div>
  )
}

