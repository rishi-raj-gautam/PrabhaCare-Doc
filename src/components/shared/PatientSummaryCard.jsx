import React from 'react'
import { Phone } from 'lucide-react'
import { bpStatus, hrStatus, spo2Status, glucoseStatus } from '../../lib/clinicalUtils'

export default function PatientSummaryCard({ patient }) {
  if (!patient) return null

  const bp = bpStatus(patient.vitals?.bpSys, patient.vitals?.bpDia)
  const hr = hrStatus(patient.vitals?.heartRate)
  const spo2 = spo2Status(patient.vitals?.spo2)
  const glucose = glucoseStatus(patient.vitals?.glucoseFasting)

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <div style={{ background: 'var(--surface-lowest)', padding: '24px', borderRadius: '16px', display: 'flex', gap: '24px', alignItems: 'center' }}>
          <div style={{ width: 100, height: 100, borderRadius: '16px', background: 'var(--surface-container)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px', fontWeight: 'bold' }}>
            {patient.name.substring(0, 2).toUpperCase()}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, gap: '16px' }}>
            <div>
              <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-h)' }}>{patient.name}</div>
              <div style={{ fontSize: '14px', color: 'var(--muted)', marginTop: '4px' }}>Patient ID: {patient._id || patient.id}</div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
              <div>
                <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Date of Birth</div>
              <div style={{ fontWeight: 700, color: 'var(--text-h)', marginTop: '4px' }}>{new Date().getFullYear() - patient.age} ({patient.age}y)</div>
            </div>
            <div>
              <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Blood Type</div>
              <div style={{ fontWeight: 700, color: 'var(--primary)', marginTop: '4px' }}>{patient.bloodGroup}</div>
            </div>
            <div>
              <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Occupation</div>
              <div style={{ fontWeight: 700, color: 'var(--text-h)', marginTop: '4px' }}>{patient.occupation || 'N/A'}</div>
            </div>
            <div>
              <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Last Visit</div>
              <div style={{ fontWeight: 700, color: 'var(--text-h)', marginTop: '4px' }}>{new Date(patient.updatedAt || Date.now()).toLocaleDateString()}</div>
            </div>
          </div>
        </div>
        </div>
        
        <div style={{ background: 'var(--surface-lowest)', padding: '24px', borderRadius: '16px' }}>
           <div style={{ fontWeight: 800, fontSize: '13px', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '16px', display: 'flex', justifyContent: 'space-between' }}>
             Chronic Conditions <span style={{ background: 'var(--surface-container-high)', padding: '2px 8px', borderRadius: '4px', fontSize: '10px' }}>Active Monitoring</span>
           </div>
           <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              {(patient.chronicDiseases || []).map(d => (
                <div key={d} style={{ background: 'var(--surface)', border: '1px solid var(--border)', padding: '12px 16px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ fontWeight: 700, color: 'var(--text-h)' }}>{d}</div>
                  <div style={{ fontSize: '11px', color: 'var(--muted)' }}>Diagnosed</div>
                </div>
              ))}
              {(patient.allergies || []).map(a => (
                <div key={a} style={{ background: 'var(--error-container)', border: '1px solid var(--error-container)', padding: '12px 16px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div>
                    <div style={{ fontWeight: 700, color: 'var(--error)' }}>{a}</div>
                    <div style={{ fontSize: '10px', color: 'var(--error)', textTransform: 'uppercase', fontWeight: 800, marginTop: '2px' }}>Severe Reaction</div>
                  </div>
                </div>
              ))}
              {!patient.chronicDiseases?.length && !patient.allergies?.length && <div style={{ color: 'var(--muted)' }}>No chronic conditions or allergies recorded.</div>}
           </div>
        </div>

        <div style={{ background: 'var(--surface-lowest)', padding: '24px', borderRadius: '16px' }}>
           <div style={{ fontWeight: 800, fontSize: '13px', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '24px' }}>Biometric Snapshot</div>
           <div style={{ display: 'flex', flexWrap: 'wrap', gap: '24px' }}>
             <div style={{ minWidth: '120px', flex: '1 1 120px' }}>
                <div style={{ fontSize: '12px', color: 'var(--muted)', fontWeight: 600 }}>Blood Pressure</div>
                <div style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-h)', margin: '4px 0 8px' }}>{patient.vitals?.bpSys ?? '—'}/{patient.vitals?.bpDia ?? '—'}</div>
                <div style={{ display: 'inline-block', background: bp.tone === 'success' ? 'var(--tertiary-fixed)' : 'var(--error-container)', color: bp.tone === 'success' ? 'var(--tertiary)' : 'var(--error)', padding: '4px 8px', borderRadius: '99px', fontSize: '11px', fontWeight: 700 }}>{bp.label}</div>
             </div>
             <div style={{ minWidth: '120px', flex: '1 1 120px' }}>
                <div style={{ fontSize: '12px', color: 'var(--muted)', fontWeight: 600 }}>Heart Rate</div>
                <div style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-h)', margin: '4px 0 8px' }}>{patient.vitals?.heartRate ?? '—'} <span style={{fontSize: '14px', color: 'var(--muted)', fontWeight: 600}}>bpm</span></div>
                <div style={{ display: 'inline-block', background: hr.tone === 'success' ? 'var(--tertiary-fixed)' : 'var(--error-container)', color: hr.tone === 'success' ? 'var(--tertiary)' : 'var(--error)', padding: '4px 8px', borderRadius: '99px', fontSize: '11px', fontWeight: 700 }}>{hr.label}</div>
             </div>
             <div style={{ minWidth: '120px', flex: '1 1 120px' }}>
                <div style={{ fontSize: '12px', color: 'var(--muted)', fontWeight: 600 }}>Glucose</div>
                <div style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-h)', margin: '4px 0 8px' }}>{patient.vitals?.glucoseFasting ?? '—'} <span style={{fontSize: '14px', color: 'var(--muted)', fontWeight: 600}}>mg/dL</span></div>
                <div style={{ display: 'inline-block', background: glucose.tone === 'success' ? 'var(--tertiary-fixed)' : 'var(--error-container)', color: glucose.tone === 'success' ? 'var(--tertiary)' : 'var(--error)', padding: '4px 8px', borderRadius: '99px', fontSize: '11px', fontWeight: 700 }}>{glucose.label}</div>
             </div>
             <div style={{ minWidth: '120px', flex: '1 1 120px' }}>
                <div style={{ fontSize: '12px', color: 'var(--muted)', fontWeight: 600 }}>SpO₂</div>
                <div style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-h)', margin: '4px 0 8px' }}>{patient.vitals?.spo2 ?? '—'}%</div>
                <div style={{ display: 'inline-block', background: spo2.tone === 'success' ? 'var(--tertiary-fixed)' : 'var(--error-container)', color: spo2.tone === 'success' ? 'var(--tertiary)' : 'var(--error)', padding: '4px 8px', borderRadius: '99px', fontSize: '11px', fontWeight: 700 }}>{spo2.label}</div>
             </div>
             {patient.vitals?.temperature && (
               <div style={{ minWidth: '120px', flex: '1 1 120px' }}>
                  <div style={{ fontSize: '12px', color: 'var(--muted)', fontWeight: 600 }}>Temperature</div>
                  <div style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-h)', margin: '4px 0 8px' }}>{patient.vitals.temperature}<span style={{fontSize: '14px', color: 'var(--muted)', fontWeight: 600}}>°F</span></div>
                  <div style={{ display: 'inline-block', background: patient.vitals.temperature >= 99.5 ? 'var(--error-container)' : 'var(--tertiary-fixed)', color: patient.vitals.temperature >= 99.5 ? 'var(--error)' : 'var(--tertiary)', padding: '4px 8px', borderRadius: '99px', fontSize: '11px', fontWeight: 700 }}>{patient.vitals.temperature >= 99.5 ? 'Fever' : 'Normal'}</div>
               </div>
             )}
             {patient.vitals?.respiratoryRate && (
               <div style={{ minWidth: '120px', flex: '1 1 120px' }}>
                  <div style={{ fontSize: '12px', color: 'var(--muted)', fontWeight: 600 }}>Resp. Rate</div>
                  <div style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-h)', margin: '4px 0 8px' }}>{patient.vitals.respiratoryRate} <span style={{fontSize: '14px', color: 'var(--muted)', fontWeight: 600}}>/min</span></div>
                  <div style={{ display: 'inline-block', background: (patient.vitals.respiratoryRate < 12 || patient.vitals.respiratoryRate > 20) ? 'var(--error-container)' : 'var(--tertiary-fixed)', color: (patient.vitals.respiratoryRate < 12 || patient.vitals.respiratoryRate > 20) ? 'var(--error)' : 'var(--tertiary)', padding: '4px 8px', borderRadius: '99px', fontSize: '11px', fontWeight: 700 }}>{(patient.vitals.respiratoryRate < 12 || patient.vitals.respiratoryRate > 20) ? 'Abnormal' : 'Normal'}</div>
               </div>
             )}
           </div>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
         <div style={{ background: 'var(--surface-container)', padding: '24px', borderRadius: '16px' }}>
           <div style={{ fontWeight: 800, fontSize: '12px', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
             <Phone size={14} /> Emergency Contact
           </div>
           <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-h)' }}>Contact Name</div>
           <div style={{ fontSize: '14px', color: 'var(--muted)', marginTop: '4px' }}>Relative</div>
           <div style={{ fontSize: '14px', color: 'var(--primary)', fontWeight: 600, marginTop: '8px' }}>{patient.emergencyContactPhone}</div>
         </div>
         
         <div style={{ background: 'var(--surface-container-low)', padding: '24px', borderRadius: '16px', flex: 1 }}>
           <div style={{ fontWeight: 800, fontSize: '12px', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '16px' }}>
             Current Meds
           </div>
           <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '12px' }}>
             {(patient.currentMedications || []).map(m => (
               <li key={m} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600, color: 'var(--text-h)' }}>
                 <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--primary)' }} /> {m}
               </li>
             ))}
             {!patient.currentMedications?.length && <li style={{ color: 'var(--muted)' }}>None recorded</li>}
           </ul>
           <div style={{ marginTop: '24px', fontSize: '11px', fontWeight: 800, color: 'var(--primary)', textTransform: 'uppercase', cursor: 'pointer' }}>View All Records →</div>
         </div>
      </div>
    </div>
  )
}

