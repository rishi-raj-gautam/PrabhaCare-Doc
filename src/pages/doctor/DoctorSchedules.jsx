import React, { useMemo, useState } from 'react'
import { addDays, format, startOfWeek } from 'date-fns'
import { useApp } from '../../context/AppContext'
import { useNavigate } from 'react-router-dom'

function parseTimeToMinutes(t) {
  const [hh, mm] = String(t).split(':').map(Number)
  return hh * 60 + mm
}

function formatTimeFromMinutes(mins) {
  const hh = Math.floor(mins / 60)
  const mm = mins % 60
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`
}

function formatToAmPm(mins) {
  const hh = Math.floor(mins / 60)
  const mm = mins % 60
  const ampm = hh >= 12 ? 'PM' : 'AM'
  let h12 = hh % 12
  if (h12 === 0) h12 = 12
  return `${String(h12).padStart(2, '0')}:${String(mm).padStart(2, '0')} ${ampm}`
}

function overlaps(aStart, aEnd, slotStart, slotEnd) {
  const s1 = new Date(aStart).getTime()
  const e1 = new Date(aEnd).getTime()
  const s2 = slotStart.getTime()
  const e2 = slotEnd.getTime()
  return s1 < e2 && s2 < e1
}

export default function DoctorSchedules() {
  const nav = useNavigate()
  const { sessionUser, currentDoctorId, appointments, patients, addAppointment, updateAppointment, updateDoctor } = useApp()

  const [view, setView] = useState('week') // day/week/month (month placeholder)
  const [selectedDate, setSelectedDate] = useState(() => new Date())

  const prefs = {
    shiftStart: '09:00',
    shiftEnd: '17:00',
    breakStart: '13:00',
    breakEnd: '14:00',
    blockedDatesISO: [],
  }

  const [shiftStart, setShiftStart] = useState(prefs.shiftStart)
  const [shiftEnd, setShiftEnd] = useState(prefs.shiftEnd)
  const [breakStart, setBreakStart] = useState(prefs.breakStart)
  const [breakEnd, setBreakEnd] = useState(prefs.breakEnd)

  const weekStart = useMemo(() => startOfWeek(selectedDate, { weekStartsOn: 1 }), [selectedDate])
  const days = useMemo(() => Array.from({ length: 7 }).map((_, i) => addDays(weekStart, i)), [weekStart])

  const timeslots = useMemo(() => {
    const startM = parseTimeToMinutes(shiftStart)
    const endM = parseTimeToMinutes(shiftEnd)
    const breakS = parseTimeToMinutes(breakStart)
    const breakE = parseTimeToMinutes(breakEnd)

    const slots = []
    for (let m = startM; m < endM; m += 60) {
      const isBreak = m >= breakS && m < breakE
      slots.push({ startMin: m, endMin: m + 60, isBreak })
    }
    return slots
  }, [shiftStart, shiftEnd, breakStart, breakEnd])

  const isBlockedDate = (d) => {
    const iso = new Date(d).toISOString().slice(0, 10)
    return (prefs.blockedDatesISO || []).some((x) => String(x).slice(0, 10) === iso)
  }

  const slotAppointments = useMemo(() => {
    return (slotStart, slotEnd) =>
      appointments
        .filter((a) => {
            const docId = a.doctorId?._id || a.doctorId
            return docId === currentDoctorId && a.status !== 'CANCELLED'
        })
        .filter((a) => overlaps(a.startTime, a.endTime, slotStart, slotEnd))
  }, [appointments, currentDoctorId])

  const handleSaveAvailability = async () => {
    const startM = parseTimeToMinutes(shiftStart)
    const endM = parseTimeToMinutes(shiftEnd)
    const breakS = parseTimeToMinutes(breakStart)
    const breakE = parseTimeToMinutes(breakEnd)

    const morning = []
    const afternoon = []

    // Generate 30-minute slots
    for (let m = startM; m < endM; m += 30) {
      if (m >= breakS && m < breakE) continue; // Skip break
      
      const timeStr = formatToAmPm(m)
      if (m < 12 * 60) {
        morning.push(timeStr)
      } else {
        afternoon.push(timeStr)
      }
    }

    try {
      await updateDoctor(currentDoctorId, { slots: { morning, afternoon } })
      window.alert('Availability slots generated and saved successfully!')
    } catch(err) {
      console.error(err)
      window.alert('Failed to save availability')
    }
  }

  const completeAppointment = (id) => {
    updateAppointment(id, { status: 'COMPLETED' })
  }

  const suggestFollowUp = (appt) => {
    const start = new Date(appt.startTime)
    start.setDate(start.getDate() + 14)
    const end = new Date(appt.endTime)
    end.setDate(end.getDate() + 14)
    addAppointment({
      patientId: appt.patientId?._id || appt.patientId,
      doctorId: currentDoctorId,
      startTime: start.toISOString(),
      endTime: end.toISOString(),
      type: appt.type,
      status: 'BOOKED',
      priority: 'FOLLOW_UP',
      roomType: appt.roomType,
      notes: 'Auto-suggested follow-up (demo)',
    })
  }

  const calendarTitle = view === 'day' ? format(selectedDate, 'EEE, MMM d, yyyy') : 'Week'

  return (
    <div className="co-page animate-fade-in-up">
      <div className="co-pageHeader">
        <div>
          <h1 className="co-h1">Schedule Management</h1>
          <div className="co-mutedSmall">Optimize clinical hours and manage appointments with pricing-ready structure (demo).</div>
        </div>
        <div className="co-pageHeaderActions">
          <button className={`co-seg ${view === 'day' ? 'co-seg--active' : ''}`} onClick={() => setView('day')} type="button">
            Day
          </button>
          <button className={`co-seg ${view === 'week' ? 'co-seg--active' : ''}`} onClick={() => setView('week')} type="button">
            Week
          </button>
          <button className={`co-seg ${view === 'month' ? 'co-seg--active' : ''}`} onClick={() => setView('month')} type="button">
            Month
          </button>
        </div>
      </div>

      <div className="co-grid2">
        <aside className="co-card">
          <div className="co-inlineTitle">Availability Control</div>
          <div className="co-mutedSmall">Set working hours, break time, and block dates (demo).</div>

          <div style={{ height: 10 }} />

          <div className="co-formRow">
            <label className="co-label">
              Shift Start
              <input className="co-input" value={shiftStart} onChange={(e) => setShiftStart(e.target.value)} />
            </label>
            <label className="co-label">
              Shift End
              <input className="co-input" value={shiftEnd} onChange={(e) => setShiftEnd(e.target.value)} />
            </label>
          </div>
          <div className="co-formRow">
            <label className="co-label">
              Break Start
              <input className="co-input" value={breakStart} onChange={(e) => setBreakStart(e.target.value)} />
            </label>
            <label className="co-label">
              Break End
              <input className="co-input" value={breakEnd} onChange={(e) => setBreakEnd(e.target.value)} />
            </label>
          </div>

          <div className="co-actions">
            <button
              type="button"
              className="co-btn co-btn--primary"
              onClick={handleSaveAvailability}
            >
              Save Availability
            </button>
          </div>

          <div className="co-divider" />

          <div className="co-inlineTitle">Status Legend</div>
          <div className="co-legendRow">
            <span className="co-legendDot co-legendDot--booked" /> Booked
          </div>
          <div className="co-legendRow">
            <span className="co-legendDot co-legendDot--completed" /> Completed
          </div>
          <div className="co-legendRow">
            <span className="co-legendDot co-legendDot--cancelled" /> Cancelled
          </div>
          <div className="co-legendRow">
            <span className="co-legendDot co-legendDot--noshow" /> No-show
          </div>
        </aside>

        <section className="co-card">
          <div className="co-pageHeader">
            <h2 className="co-h2">{calendarTitle}</h2>
            <div className="co-pageHeaderActions">
              <button
                type="button"
                className="co-btn co-btn--ghost"
                onClick={() => setSelectedDate((d) => addDays(d, -7))}
              >
                Prev
              </button>
              <button type="button" className="co-btn co-btn--ghost" onClick={() => setSelectedDate(new Date())}>
                Today
              </button>
              <button
                type="button"
                className="co-btn co-btn--ghost"
                onClick={() => setSelectedDate((d) => addDays(d, 7))}
              >
                Next
              </button>
            </div>
          </div>

          {view === 'month' ? (
            <div className="co-mutedSmall">Month view is a placeholder in this MVP.</div>
          ) : null}

          <div className="co-calendar">
            <div className="co-calHeader">
              {(view === 'day' ? days.slice(0, 1) : days).map((d) => (
                <div key={String(d)} className="co-calDayHeader">
                  <div className="co-calDayName">{format(d, 'EEE')}</div>
                  <div className="co-calDayDate">{format(d, 'd')}</div>
                </div>
              ))}
            </div>

            <div className="co-calGrid">
              {(view === 'day' ? days.slice(0, 1) : days).map((d) => (
                <div key={String(d)} className="co-calColumn">
                  {timeslots.map((slot) => {
                    if (slot.isBreak) {
                      return (
                        <div key={slot.startMin} className="co-slot co-slot--break">
                          {formatTimeFromMinutes(slot.startMin)}
                        </div>
                      )
                    }

                    if (isBlockedDate(d)) {
                      return (
                        <div key={slot.startMin} className="co-slot co-slot--blocked">
                          {formatTimeFromMinutes(slot.startMin)}
                        </div>
                      )
                    }

                    const slotStart = new Date(d)
                    slotStart.setHours(Math.floor(slot.startMin / 60), slot.startMin % 60, 0, 0)
                    const slotEnd = new Date(slotStart)
                    slotEnd.setMinutes(slotEnd.getMinutes() + 60)
                    const slotAppts = slotAppointments(slotStart, slotEnd)
                    const appt = slotAppts[0] || null
                    const patient = appt ? (appt.patientId?.name ? appt.patientId : patients.find((p) => p._id === (appt.patientId?._id || appt.patientId))) : null

                    const isOccupied = Boolean(appt)
                    const statusClass =
                      appt?.status === 'COMPLETED'
                        ? 'co-slot--completed'
                        : appt?.status === 'CANCELLED'
                          ? 'co-slot--cancelled'
                          : appt?.status === 'NO_SHOW'
                            ? 'co-slot--noshow'
                            : 'co-slot--booked'

                    return (
                      <div
                        key={slot.startMin}
                        className={`co-slot ${isOccupied ? statusClass : 'co-slot--free'}`}
                        aria-disabled={false}
                      >
                        <div className="co-slotTime">{formatTimeFromMinutes(slot.startMin)}</div>
                        {appt ? (
                          <div className="co-slotContent">
                            <div className="co-slotPatient">{patient?.name || 'Patient'}</div>
                            <div className="co-slotSub">{appt.type === 'video' ? 'Video' : 'In-person'} • {appt.priority}</div>
                          </div>
                        ) : (
                          <div className="co-slotContent">
                            <div className="co-mutedSmall">Open Slot</div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>



      <section className="co-card" style={{ marginTop: 16 }}>
        <div className="co-pageHeader">
          <h2 className="co-h2">Appointment List (Doctor)</h2>
        </div>
        <div className="co-recordList">
          {appointments
            .filter((a) => (a.doctorId?._id || a.doctorId) === currentDoctorId)
            .sort((a, b) => (new Date(a.startTime) < new Date(b.startTime) ? 1 : -1))
            .slice(0, 14)
            .map((a) => {
              const pId = a.patientId?._id || a.patientId
              const patient = patients.find((p) => p._id === pId)
              return (
                <div key={a._id || a.id} className="co-recordRow">
                  <div className="co-recordRowLeft">
                    <div className="co-recordType">
                      {a.type === 'VIDEO' ? 'Video' : 'In-person'} • {a.status}
                    </div>
                    <div className="co-mutedSmall">{new Date(a.startTime).toLocaleString()}</div>
                  </div>
                  <div className="co-recordRowRight">
                    <div className="co-mutedSmall">
                      Patient: <b>{patient?.name || '-'}</b> • Priority: <b>{a.priority || '-'}</b>
                    </div>
                    {a.status === 'BOOKED' ? (
                      <>
                        {a.type === 'VIDEO' ? (
                          <button className="co-btn co-btn--ghost" type="button" onClick={() => nav(`/telehealth/${a._id || a.id}`)}>
                            Join Video
                          </button>
                        ) : null}
                        <button className="co-btn co-btn--ghost" type="button" onClick={() => completeAppointment(a._id || a.id)}>
                          Mark Completed
                        </button>
                      </>
                    ) : null}
                    {a.status === 'COMPLETED' ? (
                      <button className="co-btn co-btn--ghost" type="button" onClick={() => suggestFollowUp(a)}>
                        Suggest Follow-up
                      </button>
                    ) : null}
                  </div>
                </div>
              )
            })}
        </div>
      </section>
    </div>
  )
}

