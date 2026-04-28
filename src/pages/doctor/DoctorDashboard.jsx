import React, { useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../../context/AppContext'
import { Stethoscope, CalendarDays, FileText } from 'lucide-react'

function isSameDayISO(dateISO, now = new Date()) {
  const d = new Date(dateISO)
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate()
}

export default function DoctorDashboard() {
  const nav = useNavigate()
  const { currentDoctorId, patients, appointments, records, sessionUser, refreshAppointments } = useApp()

  // Auto-refresh appointments when the dashboard loads
  useEffect(() => {
    refreshAppointments()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const doctorAppointments = useMemo(() => {
    return appointments
      .filter((a) => {
        const docId = a.doctorId?._id || a.doctorId
        return docId === currentDoctorId
      })
      .sort((a, b) => (a.startTime > b.startTime ? 1 : -1))
  }, [appointments, currentDoctorId])

  const completedCount = doctorAppointments.filter((a) => a.status === 'COMPLETED').length
  const pendingCount = doctorAppointments.filter((a) => a.status === 'BOOKED').length
  const totalCount = doctorAppointments.length

  const queue = useMemo(() => {
    return appointments
      .filter((a) => {
        const docId = a.doctorId?._id || a.doctorId
        return docId === currentDoctorId && a.status === 'BOOKED'
      })
      .sort((a, b) => new Date(a.startTime) - new Date(b.startTime))
      .slice(0, 6)
  }, [appointments, currentDoctorId])

  const patientQueue = useMemo(() => {
    return queue.map((a) => {
      // patientId is populated by backend
      const patient = a.patientId; 
      return { appt: a, patient: patient };
    }).filter((x) => x.patient)
  }, [queue])

  const totalPatientsTreatedYTD = useMemo(() => {
    const startOfYear = new Date(new Date().getFullYear(), 0, 1).toISOString()
    const completed = appointments.filter((a) => {
        const docId = a.doctorId?._id || a.doctorId
        const pid = a.patientId?._id || a.patientId
        return docId === currentDoctorId && a.status === 'COMPLETED' && a.startTime >= startOfYear
    })
    return new Set(completed.map((a) => a.patientId?._id || a.patientId)).size
  }, [appointments, currentDoctorId])

  const mostCommonConditions = useMemo(() => {
    const counts = new Map()
    for (const r of records) {
      if (r.type !== 'PRESCRIPTION') continue
      const docId = r.doctorId?._id || r.doctorId
      if (docId !== currentDoctorId) continue
      for (const d of r.payload?.diagnoses || []) {
        counts.set(d, (counts.get(d) || 0) + 1)
      }
    }
    const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3)
    return sorted.length ? sorted : [['Hypertension', 3]]
  }, [records, currentDoctorId])

  const prescriptionTrend = useMemo(() => {
    const now = new Date()
    const weeks = [3, 2, 1, 0].map((k) => {
      const d = new Date(now)
      d.setDate(d.getDate() - k * 7)
      return d
    })

    const buckets = weeks.map((w, idx) => {
      const start = new Date(w)
      const end = new Date(w)
      end.setDate(end.getDate() + 7)
      const count = records.filter((r) => {
        if (r.type !== 'PRESCRIPTION') return false
        const docId = r.doctorId?._id || r.doctorId
        if (docId !== currentDoctorId) return false
        const t = new Date(r.createdAt).getTime()
        return t >= start.getTime() && t < end.getTime()
      }).length
      return { idx, label: `WK${idx + 1}`, count }
    })
    return buckets
  }, [records, currentDoctorId])

  const notifications = useMemo(() => {
    const now = Date.now()
    const recentLab = records.find((r) => {
        const docId = r.doctorId?._id || r.doctorId
        return r.type === 'LAB_REPORT' && docId === currentDoctorId && now - new Date(r.createdAt).getTime() < 60 * 60 * 1000
    })
    return [
      { id: 'n1', title: 'New Lab Reports', sub: recentLab ? `Patient ${recentLab.patientId?.name || ''} has a new report.` : 'No recent lab updates.' },
      { id: 'n2', title: 'Daily Schedule', sub: doctorAppointments.length ? `You have ${doctorAppointments.length} appointments.` : 'Your schedule is clear for today.' },
      { id: 'n3', title: 'HealthOS Sync', sub: 'Clinical records are now syncing with the MongoDB backend.' },
    ]
  }, [records, doctorAppointments.length])

  return (
    <div className="co-page animate-fade-in-up">
      <div className="co-dashboardHero" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <h1 className="co-h1" style={{ color: 'var(--text-h)', fontWeight: '800' }}>Jai Hind, {sessionUser?.name || 'Dr. Sharma'}</h1>
          <div className="co-muted" style={{ fontSize: '16px', marginTop: '8px' }}>
            {totalCount ? `You have ${totalCount} consultations scheduled for today.` : 'No appointments scheduled today.'}
          </div>
        </div>
        <button className="co-btn co-btn--primary" style={{ padding: '12px 24px', borderRadius: '12px' }} onClick={() => nav('/doctor/new-consultation')}>
          <Stethoscope size={18} style={{ marginRight: '8px' }}/> Quick Start Consultation
        </button>
      </div>

      <div className="co-grid4" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '24px', marginBottom: '40px' }}>
        <div className="co-statCard" style={{ background: 'var(--surface-lowest)', padding: '24px', borderRadius: '16px' }}>
          <div style={{ width: 48, height: 48, borderRadius: '12px', background: 'var(--primary-fixed)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
            <CalendarDays size={24} color="var(--primary)" />
          </div>
          <div className="co-statTitle">Total Appointments</div>
          <div className="co-statValue" style={{ fontSize: '32px' }}>{totalCount}</div>
        </div>
        <div className="co-statCard" style={{ background: 'var(--surface-lowest)', padding: '24px', borderRadius: '16px' }}>
          <div style={{ width: 48, height: 48, borderRadius: '12px', background: 'var(--tertiary-fixed)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
            <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--tertiary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✓</div>
          </div>
          <div className="co-statTitle">Completed</div>
          <div className="co-statValue" style={{ fontSize: '32px' }}>{completedCount}</div>
        </div>
        <div className="co-statCard" style={{ background: 'var(--surface-lowest)', padding: '24px', borderRadius: '16px' }}>
          <div style={{ width: 48, height: 48, borderRadius: '12px', background: 'var(--error-container)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
            <FileText size={24} color="var(--error)" />
          </div>
          <div className="co-statTitle">Pending</div>
          <div className="co-statValue" style={{ fontSize: '32px' }}>{pendingCount < 10 ? '0' + pendingCount : pendingCount}</div>
        </div>
        <div className="co-statCard" style={{ background: 'var(--surface-lowest)', padding: '24px', borderRadius: '16px' }}>
          <div style={{ width: 48, height: 48, borderRadius: '12px', background: 'var(--surface-container)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
            <b style={{ color: 'var(--on-surface-variant)', fontSize: '20px' }}>$</b>
          </div>
          <div className="co-statTitle">Daily Revenue</div>
          <div className="co-statValue" style={{ fontSize: '32px' }}>$2,450</div>
        </div>
      </div>

      <div className="co-grid2">
        <section className="co-card">
          <div className="co-pageHeader">
            <h2 className="co-h2">Patient Queue</h2>
            <button className="co-btn co-btn--ghost" onClick={() => nav('/doctor/new-consultation')}>
              View All
            </button>
          </div>

          <div className="co-queueList">
            {patientQueue.length ? (
              patientQueue.map(({ appt, patient }) => (
                <div key={appt._id || appt.id} className="co-queueItem">
                  <div className="co-queueAvatar">{patient.name.slice(0, 2).toUpperCase()}</div>
                  <div className="co-queueBody">
                    <div className="co-queueTop">
                      <div className="co-queueName">{patient.name}</div>
                      <div className={`co-priority co-priority--${appt.priority === 'urgent' ? 'urgent' : 'followup'}`}>
                        {appt.priority || 'follow-up'}
                      </div>
                    </div>
                    <div className="co-mutedSmall">
                      ID: #{patient._id || patient.id} • {new Date(appt.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                    <div className="co-mutedSmall">{appt.notes || ''}</div>
                  </div>
                  <div className="co-queueActions" style={{ display: 'flex', gap: '8px' }}>
                    {appt.type === 'VIDEO' && (
                      <button className="co-btn co-btn--primary" style={{ padding: '6px 12px', fontSize: '12px' }} onClick={() => nav(`/telehealth/${appt._id || appt.id}`)}>
                        Start Call
                      </button>
                    )}
                    <button className="co-btn co-btn--ghost" onClick={() => nav(`/doctor/patients/${patient._id || patient.id}`)}>
                      View History
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="co-mutedSmall">No upcoming patients in queue.</div>
            )}
          </div>
        </section>

        <aside className="co-card">
          <div className="co-pageHeader">
            <h2 className="co-h2">Notifications</h2>
            <button className="co-btn co-btn--ghost" type="button" onClick={() => window.alert('Weekly performance summary (demo).')}>
              Weekly Summary
            </button>
          </div>
          <div className="co-notifList">
            {notifications.map((n) => (
              <div key={n._id || n.id} className="co-notifItem">
                <div className="co-notifTitle">{n.title}</div>
                <div className="co-mutedSmall">{n.sub}</div>
              </div>
            ))}
          </div>

          <div style={{ height: 12 }} />

          <div className="co-aiPlaceholder" style={{ margin: 0 }}>
            <div className="co-aiTitle">Weekly performance summary</div>
            <div className="co-mutedSmall">
              Patients treated: <b>{totalPatientsTreatedYTD}</b> • Top condition: <b>{mostCommonConditions[0]?.[0]}</b>
            </div>
          </div>
        </aside>
      </div>

      <div className="co-grid3">
        <section className="co-card">
          <div className="co-pageHeader">
            <h2 className="co-h2">Most Common Conditions</h2>
          </div>
          <div className="co-conditionList">
            {mostCommonConditions.map(([cond, count]) => (
              <div key={cond} className="co-conditionRow">
                <div className="co-conditionName">{cond}</div>
                <div className="co-conditionBar">
                  <div className="co-conditionFill" style={{ width: `${Math.min(100, count * 22)}%` }} />
                </div>
                <div className="co-conditionCount">{count}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="co-card">
          <div className="co-pageHeader">
            <h2 className="co-h2">Prescription Trends</h2>
          </div>
          <div className="co-bars">
            {prescriptionTrend.map((b) => (
              <div key={b.label} className="co-barCol">
                <div className="co-bar" style={{ height: `${Math.min(140, b.count * 22)}px` }} />
                <div className="co-mutedSmall">{b.label}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="co-card co-tilesBlue">
          <div className="co-tilesBlueTitle">Total Patients Treated</div>
          <div className="co-tilesBlueValue">{totalPatientsTreatedYTD}</div>
          <div className="co-mutedSmall">Year-to-date performance</div>
          <div className="co-mutedSmall">
            +12% from last year (demo)
          </div>
        </section>
      </div>

      {/* Recently Viewed Patients */}
      <section className="co-card" style={{ marginTop: '16px' }}>
        <div className="co-pageHeader">
          <h2 className="co-h2">Recently Viewed Patients</h2>
          <button className="co-btn co-btn--ghost" onClick={() => nav('/doctor/patients')}>
            View All
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px', marginTop: '8px' }}>
          {patients.slice(0, 4).map((p) => (
            <div
              key={p._id || p.id}
              onClick={() => nav(`/doctor/patients/${p._id || p.id}`)}
              style={{
                background: 'var(--surface-lowest)', borderRadius: '14px', padding: '20px',
                cursor: 'pointer', transition: 'transform 0.15s, box-shadow 0.15s',
                display: 'flex', flexDirection: 'column', gap: '14px',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = 'var(--shadow-md)' }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{
                  width: 44, height: 44, borderRadius: '12px', background: 'var(--surface-container)',
                  color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '16px', fontWeight: 'bold',
                }}>
                  {p.name.slice(0, 2).toUpperCase()}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 800, color: 'var(--text-h)', fontSize: '15px' }}>{p.name}</div>
                  <div className="co-mutedSmall">{p.age}y • {p.bloodGroup} • {p.occupation || 'Patient'}</div>
                </div>
              </div>

              {/* Mini vitals */}
              {p.vitals && (
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                  {p.vitals.bpSys && (
                    <div style={{ fontSize: '12px', color: 'var(--muted)' }}>
                      BP <span style={{ fontWeight: 700, color: 'var(--text-h)' }}>{p.vitals.bpSys}/{p.vitals.bpDia}</span>
                    </div>
                  )}
                  {p.vitals.heartRate && (
                    <div style={{ fontSize: '12px', color: 'var(--muted)' }}>
                      HR <span style={{ fontWeight: 700, color: 'var(--text-h)' }}>{p.vitals.heartRate}</span>
                    </div>
                  )}
                  {p.vitals.spo2 && (
                    <div style={{ fontSize: '12px', color: 'var(--muted)' }}>
                      SpO₂ <span style={{ fontWeight: 700, color: 'var(--text-h)' }}>{p.vitals.spo2}%</span>
                    </div>
                  )}
                  {p.vitals.glucoseFasting && (
                    <div style={{ fontSize: '12px', color: 'var(--muted)' }}>
                      Glucose <span style={{ fontWeight: 700, color: 'var(--text-h)' }}>{p.vitals.glucoseFasting}</span>
                    </div>
                  )}
                </div>
              )}

              <div style={{ fontSize: '11px', color: 'var(--muted)' }}>
                Last visit: {new Date(p.updatedAt || p.createdAt || Date.now()).toLocaleDateString()}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}

