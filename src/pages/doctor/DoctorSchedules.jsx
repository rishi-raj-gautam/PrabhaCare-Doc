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

function overlaps(aStart, aEnd, slotStart, slotEnd) {
  const s1 = new Date(aStart).getTime()
  const e1 = new Date(aEnd).getTime()
  const s2 = slotStart.getTime()
  const e2 = slotEnd.getTime()
  return s1 < e2 && s2 < e1
}

export default function DoctorSchedules() {
  const nav = useNavigate()
  const { sessionUser, currentDoctorId, appointments, patients, addAppointment, updateAppointment } = useApp()

  const [view, setView] = useState('week') // day/week/month (month placeholder)
  const [selectedDate, setSelectedDate] = useState(() => new Date())

  const prefs = {
    shiftStart: '08:00',
    shiftEnd: '17:00',
    breakStart: '13:00',
    breakEnd: '14:00',
    blockedDatesISO: [],
  }

  const [shiftStart, setShiftStart] = useState(prefs.shiftStart)
  const [shiftEnd, setShiftEnd] = useState(prefs.shiftEnd)
  const [breakStart, setBreakStart] = useState(prefs.breakStart)
  const [breakEnd, setBreakEnd] = useState(prefs.breakEnd)

  const [bookingModal, setBookingModal] = useState(null) // { slotStartISO, slotEndISO, dateLabel, conflict }
  const [bookingType, setBookingType] = useState('in_person')
  const [bookingPriority, setBookingPriority] = useState('FOLLOW_UP')
  const [bookingEmergencyOverride, setBookingEmergencyOverride] = useState(false)
  const [bookingPatientId, setBookingPatientId] = useState(patients[0]?._id || '')

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

  const openBookingForSlot = (day, slotStartMin) => {
    const dateLabel = format(day, 'EEE, MMM d')
    const slotStart = new Date(day)
    slotStart.setHours(Math.floor(slotStartMin / 60), slotStartMin % 60, 0, 0)
    const slotEnd = new Date(slotStart)
    slotEnd.setMinutes(slotEnd.getMinutes() + 60)

    const conflicts = slotAppointments(slotStart, slotEnd)
    setBookingModal({
      slotStartISO: slotStart.toISOString(),
      slotEndISO: slotEnd.toISOString(),
      dateLabel,
      conflict: conflicts[0] || null,
    })
    setBookingEmergencyOverride(Boolean(conflicts[0]))
    setBookingType('video')
    setBookingPriority(conflicts[0]?.priority || 'FOLLOW_UP')
    setBookingPatientId(patients[0]?._id || '')
  }

  const saveAppointment = () => {
    if (!bookingModal) return
    const conflicts = bookingModal.conflict

    if (conflicts && !bookingEmergencyOverride) {
      window.alert('This slot is already booked. Enable Emergency override to overbook (demo).')
      return
    }

    const appointment = {
      patientId: bookingPatientId,
      doctorId: currentDoctorId,
      startTime: bookingModal.slotStartISO,
      endTime: bookingModal.slotEndISO,
      type: bookingType === 'video' ? 'VIDEO' : 'IN_PERSON',
      status: 'BOOKED',
      priority: bookingPriority,
      roomType: bookingType === 'video' ? 'webrtc-loopback' : 'in_person',
      notes: bookingEmergencyOverride ? 'Emergency override booking' : 'Scheduled appointment',
    }

    addAppointment(appointment)
    setBookingModal(null)
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
              onClick={() => window.alert('Availability saved for demo session.')}
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
                        role="button"
                        tabIndex={0}
                        onClick={() => openBookingForSlot(d, slot.startMin)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') openBookingForSlot(d, slot.startMin)
                        }}
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

      {bookingModal ? (
        <div className="co-modalOverlay" onClick={() => setBookingModal(null)}>
          <div className="co-modal" onClick={(e) => e.stopPropagation()}>
            <div className="co-modalHeader">
              <div className="co-modalTitle">Book appointment</div>
              <button className="co-btn co-btn--ghost" type="button" onClick={() => setBookingModal(null)}>
                Close
              </button>
            </div>

            <div className="co-mutedSmall">
              Slot: <b>{bookingModal.dateLabel}</b> • <b>{new Date(bookingModal.slotStartISO).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</b>
            </div>

            {bookingModal.conflict ? (
              <div style={{ marginTop: 10 }} className="co-alert co-alert--warning">
                This slot is occupied by another appointment (demo).
              </div>
            ) : null}

            <div style={{ height: 12 }} />

            <div className="co-form">
              <label className="co-label">
                Patient
                <select className="co-input" value={bookingPatientId} onChange={(e) => setBookingPatientId(e.target.value)}>
                  {patients.map((p) => (
                    <option key={p._id || p.id} value={p._id || p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </label>

              <div className="co-formRow">
                <label className="co-label">
                  Appointment type
                  <select className="co-input" value={bookingType} onChange={(e) => setBookingType(e.target.value)}>
                    <option value="in_person">In-person</option>
                    <option value="video">Video consultation</option>
                  </select>
                </label>
                <label className="co-label">
                  Priority
                  <select className="co-input" value={bookingPriority} onChange={(e) => setBookingPriority(e.target.value)}>
                    <option value="URGENT">Urgent</option>
                    <option value="FOLLOW_UP">Follow-up</option>
                    <option value="ROUTINE">Routine</option>
                  </select>
                </label>
              </div>

              {bookingModal.conflict ? (
                <label className="co-checkRow" style={{ marginTop: 8 }}>
                  <input
                    type="checkbox"
                    checked={bookingEmergencyOverride}
                    onChange={(e) => setBookingEmergencyOverride(e.target.checked)}
                  />
                  Emergency booking override
                </label>
              ) : null}

              <div className="co-actions">
                <button className="co-btn co-btn--primary" type="button" onClick={saveAppointment}>
                  Confirm Booking
                </button>
              </div>

              <div className="co-mutedSmall">
                If booked as video, join via <b>Telemedicine</b> route (loopback demo).
              </div>
            </div>
          </div>
        </div>
      ) : null}

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

