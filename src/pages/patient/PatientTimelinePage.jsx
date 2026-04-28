import React, { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../../context/AppContext'
import { getPatientFile } from '../../lib/patientFileStore'

function formatType(type) {
  if (type === 'lab_report') return 'Lab Report'
  if (type === 'imaging') return 'Imaging'
  if (type === 'doctor_note') return 'Doctor Notes'
  if (type === 'prescription') return 'e-Prescription'
  return type
}

function useSortedTimeline(records) {
  return useMemo(() => {
    return [...records].sort((a, b) => (a.createdAtISO < b.createdAtISO ? 1 : -1))
  }, [records])
}

export default function PatientTimelinePage() {
  const nav = useNavigate()
  const { currentPatientId, getPatientById, records } = useApp()
  const patient = useMemo(() => getPatientById(currentPatientId), [currentPatientId, getPatientById])

  const timeline = useSortedTimeline(
    records.filter((r) => r.patientId === currentPatientId && (r.type === 'prescription' || r.type === 'lab_report' || r.type === 'imaging' || r.type === 'doctor_note'))
  )

  const [openFile, setOpenFile] = useState(null) // { name, mimeType, dataUrl }

  if (!patient) return <div className="co-page">No patient profile found.</div>

  return (
    <div className="co-page">
      <div className="co-pageHeader">
        <h1 className="co-h1">Health Timeline</h1>
        <div className="co-pageHeaderActions">
          <button className="co-btn co-btn--ghost" type="button" onClick={() => nav('/patient/upload')}>
            Upload Reports
          </button>
        </div>
      </div>

      <div className="co-timeline">
        {timeline.length ? (
          timeline.map((r) => (
            <div key={r.id} className="co-timelineItem">
              <div className="co-timelineDot" />
              <div className="co-timelineBody">
                <div className="co-timelineTop">
                  <div className="co-timelineTitle">{formatType(r.type)} • {new Date(r.createdAtISO).toLocaleString()}</div>
                  <div className="co-mutedSmall">{r.payload?.title || r.extracted?.keywords?.[0] || ''}</div>
                </div>

                {r.type === 'prescription' ? (
                  <div className="co-recordMeta">
                    <div className="co-mutedSmall">
                      Diagnoses: <b>{r.extracted?.diagnoses?.join(', ') || '-'}</b>
                    </div>
                    <div className="co-mutedSmall">
                      Medicines: <b>{r.extracted?.medicines?.join(', ') || '-'}</b>
                    </div>
                    {r.pdfDataUrl ? (
                      <a className="co-btn co-btn--primary" href={r.pdfDataUrl} download={`CareOS_${patient.name}_Prescription.pdf`}>
                        Download PDF
                      </a>
                    ) : (
                      <div className="co-mutedSmall">PDF not available for this record.</div>
                    )}
                  </div>
                ) : null}

                {r.payload?.files?.length ? (
                  <div className="co-fileRow">
                    {r.payload.files.map((f) => (
                      <div key={f.fileKey} className="co-fileChip">
                        <div className="co-fileName">{f.name}</div>
                        <div className="co-fileActions">
                          <button
                            type="button"
                            className="co-btn co-btn--ghost"
                            onClick={async () => {
                              const file = await getPatientFile(f.fileKey)
                              setOpenFile({ name: f.name, mimeType: file?.mimeType || f.mimeType, dataUrl: file?.dataUrl })
                            }}
                          >
                            View
                          </button>
                          <a
                            className="co-btn co-btn--ghost"
                            href={openFile?.dataUrl || '#'}
                            style={{ display: 'none' }}
                          >
                            hidden
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : null}

                {r.payload?.summary ? <div className="co-mutedSmall co-summaryText">{r.payload.summary}</div> : null}
              </div>
            </div>
          ))
        ) : (
          <div className="co-empty">No records yet. Upload reports or wait for an e-prescription.</div>
        )}
      </div>

      {openFile?.dataUrl ? (
        <div className="co-modalOverlay" onClick={() => setOpenFile(null)}>
          <div className="co-modal" onClick={(e) => e.stopPropagation()}>
            <div className="co-modalHeader">
              <div className="co-modalTitle">File preview: {openFile.name}</div>
              <button type="button" className="co-btn co-btn--ghost" onClick={() => setOpenFile(null)}>
                Close
              </button>
            </div>
            {openFile.mimeType === 'application/pdf' ? (
              <iframe title="PDF preview" className="co-pdfFrame" src={openFile.dataUrl} />
            ) : (
              <img className="co-imgPreview" alt={openFile.name} src={openFile.dataUrl} />
            )}
          </div>
        </div>
      ) : null}
    </div>
  )
}

