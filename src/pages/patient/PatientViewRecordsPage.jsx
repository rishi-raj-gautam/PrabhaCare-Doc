import React, { useMemo } from 'react'
import { useParams } from 'react-router-dom'
import { useApp } from '../../context/AppContext'
import PatientSummaryCard from '../../components/shared/PatientSummaryCard'

function formatType(type) {
  if (type === 'lab_report') return 'Lab Report'
  if (type === 'imaging') return 'Imaging'
  if (type === 'doctor_note') return 'Doctor Notes'
  if (type === 'prescription') return 'e-Prescription'
  return type
}

export default function PatientViewRecordsPage() {
  const { patientId } = useParams()
  const { getPatientById, records } = useApp()

  const patient = useMemo(() => getPatientById(patientId), [patientId, getPatientById])

  const timeline = useMemo(() => {
    return records
      .filter((r) => (r.patientId?._id || r.patientId) === patientId)
      .sort((a, b) => (new Date(b.createdAt) - new Date(a.createdAt)))
  }, [records, patientId])

  if (!patient) return <div className="co-page">Patient not found.</div>

  return (
    <div className="co-page">
      <PatientSummaryCard patient={patient} />

      <div style={{ height: 18 }} />

      <section className="co-card">
        <div className="co-pageHeader" style={{ marginBottom: 8 }}>
          <h2 className="co-h2">Patient Records</h2>
          <div className="co-mutedSmall">{timeline.length} items</div>
        </div>
        <div className="co-recordList">
          {timeline.length ? (
            timeline.slice(0, 30).map((r) => (
              <div key={r._id || r.id} className="co-recordRow">
                <div className="co-recordRowLeft">
                  <div className="co-recordType">{formatType(r.type)}</div>
                  <div className="co-mutedSmall">{new Date(r.createdAt).toLocaleString()}</div>
                </div>
                <div className="co-recordRowRight">
                  {r.type === 'PRESCRIPTION' ? (
                    <div className="co-mutedSmall">
                      Dx: <b>{r.payload?.diagnoses?.join(', ') || '-'}</b>
                    </div>
                  ) : (
                    <div className="co-mutedSmall">{r.payload?.title || r.payload?.summary || '-'}</div>
                  )}
                  {r.type === 'PRESCRIPTION' && (
                    <button 
                      className="co-btn co-btn--ghost" 
                      onClick={() => {
                        if (r.pdfFileUrl || r.pdfDataUrl) {
                          window.open(r.pdfFileUrl || r.pdfDataUrl, '_blank')
                        } else {
                          const win = window.open('', '_blank');
                          win.document.write(`
                            <html>
                              <body style="font-family: sans-serif; padding: 40px;">
                                <h2>Prescription for ${patient.name}</h2>
                                <p style="color: #666;">Date: ${new Date(r.createdAt).toLocaleString()}</p>
                                <hr style="border: 1px solid #eee; margin: 20px 0;" />
                                ${r.payload?.diagnoses?.length ? `<h3>Diagnoses</h3><p>${r.payload.diagnoses.join(', ')}</p>` : ''}
                                <h3>Medicines</h3>
                                <ul>
                                  ${(r.payload?.medicines || []).map(m => `<li><b>${m.name}</b> - ${m.dosage} (${m.frequency}) x ${m.duration} days<br/><small>${m.instructions}</small></li>`).join('')}
                                </ul>
                                ${r.payload?.notes ? `<h3>Notes</h3><p>${r.payload.notes}</p>` : ''}
                                <script>window.print();</script>
                              </body>
                            </html>
                          `);
                          win.document.close();
                        }
                      }}
                    >
                      Download Rx
                    </button>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="co-mutedSmall">No records yet.</div>
          )}
        </div>
      </section>
    </div>
  )
}

