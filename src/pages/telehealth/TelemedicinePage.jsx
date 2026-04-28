import React, { useMemo, useRef, useState, useEffect, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useApp } from '../../context/AppContext'
import useAgora from '../../lib/useAgora'
import useAgoraChat from '../../lib/useAgoraChat'

/* ─── Tiny component: plays a remote user's video into a div ───── */
function RemoteVideoPlayer({ user }) {
  const ref = useRef(null)
  useEffect(() => {
    if (user.videoTrack && ref.current) {
      user.videoTrack.play(ref.current)
    }
    return () => { user.videoTrack?.stop() }
  }, [user.videoTrack])

  useEffect(() => {
    if (user.audioTrack) user.audioTrack.play()
    return () => { user.audioTrack?.stop() }
  }, [user.audioTrack])

  return <div ref={ref} className="co-agora-remote" />
}

/* ─── Tiny component: plays local video into a div ─────────────── */
function LocalVideoPlayer({ track }) {
  const ref = useRef(null)
  useEffect(() => {
    if (track && ref.current) track.play(ref.current)
    return () => { track?.stop() }
  }, [track])
  return <div ref={ref} className="co-agora-local" />
}

export default function TelemedicinePage() {
  const nav = useNavigate()
  const { appointmentId } = useParams()
  const {
    isDoctor,
    isPatient,
    currentDoctorId,
    currentPatientId,
    appointments,
    patients,
    sessionUser,
    fetchAPI,
    updateAppointment,
  } = useApp()

  // Agora hooks
  const agora = useAgora()
  const chat = useAgoraChat()

  const [joining, setJoining] = useState(false)
  const [inCall, setInCall] = useState(false)
  const [chatInput, setChatInput] = useState('')
  const chatEndRef = useRef(null)

  // Scroll chat to bottom on new message
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chat.messages])

  const appointment = useMemo(() => {
    if (!appointmentId) return null
    return appointments.find((a) => (a._id || a.id) === appointmentId) || null
  }, [appointmentId, appointments])

  const patient = useMemo(() => {
    const pid = appointment?.patientId || currentPatientId
    return patients.find((p) => (p._id || p.id) === pid) || null
  }, [appointment?.patientId, currentPatientId, patients])

  const list = useMemo(() => {
    const relevant = appointments.filter(
      (a) => (a.type === 'VIDEO' || a.type === 'video') && (a.status === 'BOOKED' || a.status === 'booked')
    )
    if (isDoctor) return relevant.filter((a) => a.doctorId === currentDoctorId)
    if (isPatient) return relevant.filter((a) => a.patientId === currentPatientId)
    return []
  }, [appointments, currentDoctorId, currentPatientId, isDoctor, isPatient])

  /* ─── Join the Agora call ──────────────────────── */
  const handleJoinCall = useCallback(async () => {
    if (!appointmentId) return
    setJoining(true)
    try {
      // Fetch Agora config from backend
      const { appId } = await fetchAPI('/agora/config')

      // Use a numeric UID derived from the user id
      const uid = Math.abs(hashCode(sessionUser?._id || sessionUser?.id || 'doc')) % 100000

      // Fetch tokens
      const [{ token: rtcToken }, { token: rtmToken }] = await Promise.all([
        fetchAPI(`/agora/token?channelName=${appointmentId}&uid=${uid}`),
        fetchAPI(`/agora/rtm-token?uid=doc_${uid}`)
      ]);

      // Channel name = appointment ID (deterministic for both sides)
      await agora.join(appId, appointmentId, rtcToken, uid);

      // Join RTM chat on the same channel
      const chatUid = `doc_${uid}`;
      await chat.login(appId, chatUid, rtmToken, sessionUser?.name || 'Doctor');
      await chat.joinChannel(`chat_${appointmentId}`)

      setInCall(true)
    } catch (err) {
      console.error('Failed to join call:', err)
    } finally {
      setJoining(false)
    }
  }, [appointmentId, fetchAPI, sessionUser, agora, chat])

  /* ─── Leave the call ───────────────────────────── */
  const handleLeaveCall = useCallback(async () => {
    try {
      if (inCall) {
        await chat.logout()
        await agora.leave()
        setInCall(false)
      }
    } catch (err) {
      console.error(err)
    }
  }, [inCall, agora, chat])

  const handleCompleteConsultation = async () => {
    try {
      await handleLeaveCall()
      if (appointmentId) {
        await updateAppointment(appointmentId, { status: 'COMPLETED' })
      }
      nav('/doctor/schedules')
    } catch (err) {
      console.error(err)
      alert('Failed to complete consultation')
    }
  }

  /* ─── Send chat message ────────────────────────── */
  const handleSendChat = useCallback((e) => {
    e.preventDefault()
    if (!chatInput.trim()) return
    chat.sendMessage(chatInput)
    setChatInput('')
  }, [chatInput, chat])

  // ───────────────── APPOINTMENT VIEW (in-call / pre-call) ──────
  if (appointmentId && appointment) {
    return (
      <div className="co-page">
        {/* Header */}
        <div className="co-pageHeader">
          <div>
            <h1 className="co-h1">Telehealth Session</h1>
            <div className="co-mutedSmall" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {inCall && (
                <span className="co-agora-live-dot" />
              )}
              {inCall ? 'Session Live' : 'Ready to connect'} • {new Date(appointment.startTime || appointment.startAtISO).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>
          <div className="co-pageHeaderActions">
            <button
              className="co-btn co-btn--ghost"
              type="button"
              onClick={() => {
                if (inCall) handleLeaveCall()
                nav('/doctor/schedules')
              }}
            >
              Back to Schedules
            </button>
          </div>
        </div>

        <div className="co-agora-layout">
          {/* ─── Video Area ───────────────────────────── */}
          <section className="co-agora-video-section">
            <div className="co-agora-video-stage">
              {/* Remote video (main) */}
              {agora.remoteUsers.length > 0 ? (
                agora.remoteUsers.map((user) => (
                  <RemoteVideoPlayer key={user.uid} user={user} />
                ))
              ) : (
                <div className="co-agora-waiting">
                  {inCall ? (
                    <>
                      <div className="co-agora-waiting-spinner" />
                      <div className="co-agora-waiting-text">Waiting for patient to join…</div>
                    </>
                  ) : (
                    <>
                      <div className="co-agora-waiting-icon">
                        <span className="material-symbols-outlined" style={{ fontSize: 56 }}>videocam</span>
                      </div>
                      <div className="co-agora-waiting-text">Start the session to begin video consultation</div>
                    </>
                  )}
                </div>
              )}

              {/* Local video (PiP) */}
              {agora.localVideoTrack && (
                <div className="co-agora-pip">
                  <LocalVideoPlayer track={agora.localVideoTrack} />
                  <div className="co-agora-pip-label">You</div>
                </div>
              )}
            </div>

            {/* Controls bar */}
            <div className="co-agora-controls">
              {!inCall ? (
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button
                    className="co-agora-ctrl co-agora-ctrl--join"
                    onClick={handleJoinCall}
                    disabled={joining}
                  >
                    {joining ? (
                      <><span className="co-agora-ctrl-spinner" /> Connecting…</>
                    ) : (
                      <><span className="material-symbols-outlined" style={{ marginRight: 8, fontSize: 20 }}>call</span> Start Session</>
                    )}
                  </button>
                  <button
                    className="co-agora-ctrl co-agora-ctrl--end"
                    style={{ padding: '0 24px', borderRadius: '24px', color: '#fff', fontSize: '15px', fontWeight: '600', width: 'auto' }}
                    onClick={handleCompleteConsultation}
                  >
                    <span className="material-symbols-outlined" style={{ marginRight: 8, fontSize: 20 }}>check_circle</span>
                    Complete Consultation
                  </button>
                </div>
              ) : (
                <>
                  <button
                    className={`co-agora-ctrl ${agora.isMuted ? 'co-agora-ctrl--active' : ''}`}
                    onClick={agora.toggleMic}
                    title={agora.isMuted ? 'Unmute' : 'Mute'}
                  >
                    <span className="material-symbols-outlined">{agora.isMuted ? 'mic_off' : 'mic'}</span>
                  </button>
                  <button
                    className={`co-agora-ctrl ${agora.isCameraOff ? 'co-agora-ctrl--active' : ''}`}
                    onClick={agora.toggleCamera}
                    title={agora.isCameraOff ? 'Turn on camera' : 'Turn off camera'}
                  >
                    <span className="material-symbols-outlined">{agora.isCameraOff ? 'videocam_off' : 'videocam'}</span>
                  </button>
                  <button
                    className="co-agora-ctrl co-agora-ctrl--end"
                    onClick={handleLeaveCall}
                    title="End Call"
                  >
                    <span className="material-symbols-outlined">call_end</span>
                  </button>
                </>
              )}
            </div>

            {/* Error / Connection info */}
            {agora.error && (
              <div className="co-alert co-alert--danger" style={{ marginTop: 12 }}>
                {agora.error}
              </div>
            )}
            {agora.connectionState === 'RECONNECTING' && (
              <div className="co-alert co-alert--warning" style={{ marginTop: 12 }}>
                Reconnecting…
              </div>
            )}
          </section>

          {/* ─── Sidebar: Chat + Patient info ─────────── */}
          <aside className="co-agora-sidebar">
            {/* In-call Chat */}
            <div className="co-card co-agora-chat-card">
              <div className="co-inlineTitle">
                Live Chat
                {chat.isConnected && <span className="co-agora-chat-badge">Connected</span>}
              </div>

              <div className="co-agora-chat-messages">
                {chat.messages.length === 0 && (
                  <div className="co-mutedSmall" style={{ textAlign: 'center', padding: '20px 0' }}>
                    {inCall ? 'No messages yet. Start the conversation!' : 'Join the call to start chatting'}
                  </div>
                )}
                {chat.messages.map((msg, i) => (
                  <div
                    key={i}
                    className={`co-agora-chat-msg ${msg.from === 'me' ? 'co-agora-chat-msg--mine' : ''} ${msg.from === 'system' ? 'co-agora-chat-msg--system' : ''}`}
                  >
                    {msg.from !== 'me' && msg.from !== 'system' && (
                      <div className="co-agora-chat-sender">{msg.displayName}</div>
                    )}
                    <div className="co-agora-chat-text">{msg.text}</div>
                    <div className="co-agora-chat-time">{msg.time}</div>
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>

              {inCall && (
                <form className="co-agora-chat-form" onSubmit={handleSendChat}>
                  <input
                    className="co-input"
                    placeholder="Type a message…"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    style={{ borderRadius: 999, flex: 1 }}
                  />
                  <button className="co-btn co-btn--primary co-btn--sm" type="submit" style={{ borderRadius: 999 }}>
                    Send
                  </button>
                </form>
              )}
            </div>

            {/* Patient Health Record */}
            {patient && (
              <div className="co-card">
                <div className="co-inlineTitle">Patient Record</div>
                <div className="co-mutedSmall" style={{ lineHeight: 1.8 }}>
                  <b>{patient.name}</b>
                  <br />
                  Age: <b>{patient.age || '—'}</b> • Gender: <b>{patient.gender || '—'}</b>
                  <br />
                  Blood Group: <b>{patient.bloodGroup || '—'}</b>
                  <br />
                  Latest diagnosis: <b>{patient.chronicDiseases?.[0] || '—'}</b>
                  <br />
                  Active prescription: <b>{patient.medications?.[0] || '—'}</b>
                </div>
              </div>
            )}

            {/* Consultation Notes */}
            <div className="co-card">
              <div className="co-inlineTitle">Consultation Notes</div>
              <textarea
                className="co-textarea"
                placeholder="Start typing clinical notes…"
                style={{ minHeight: 100, marginTop: 8 }}
              />
            </div>
          </aside>
        </div>
      </div>
    )
  }

  // ───────────────── LIST VIEW (no appointment selected) ────────
  return (
    <div className="co-page">
      <div className="co-pageHeader">
        <div>
          <h1 className="co-h1">Telemedicine</h1>
          <div className="co-mutedSmall">Join video consultations or manage scheduling from the Schedules page.</div>
        </div>
      </div>

      <section className="co-card">
        <div className="co-pageHeader">
          <h2 className="co-h2">Upcoming Video Consultations</h2>
          <div className="co-mutedSmall">{list.length} items</div>
        </div>

        <div className="co-recordList">
          {list.length ? (
            list
              .sort((a, b) => new Date(a.startTime || a.startAtISO) - new Date(b.startTime || b.startAtISO))
              .slice(0, 12)
              .map((a) => {
                const p = patients.find((pp) => (pp._id || pp.id) === a.patientId)
                return (
                  <div key={a._id || a.id} className="co-recordRow">
                    <div className="co-recordRowLeft">
                      <div className="co-recordType">Video • {a.priority || 'follow-up'}</div>
                      <div className="co-mutedSmall">{new Date(a.startTime || a.startAtISO).toLocaleString()}</div>
                    </div>
                    <div className="co-recordRowRight">
                      <div className="co-mutedSmall">
                        Patient: <b>{p?.name || '-'}</b>
                      </div>
                      <button
                        className="co-btn co-btn--primary"
                        type="button"
                        onClick={() => nav(`/telehealth/${a._id || a.id}`)}
                      >
                        Join
                      </button>
                    </div>
                  </div>
                )
              })
          ) : (
            <div className="co-mutedSmall">No upcoming video appointments. Book one in Schedules.</div>
          )}
        </div>
      </section>
    </div>
  )
}

// Simple hash function to convert string IDs to numeric UIDs for Agora
function hashCode(str) {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash |= 0
  }
  return hash
}
