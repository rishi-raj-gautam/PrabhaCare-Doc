import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'

const AppContext = createContext(null)

// Simple id helper for optimistic UI (not persisted to DB)
const makeId = () => Math.random().toString(36).slice(2, 10)

export function AppProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('co_token'))
  const [sessionUser, setSessionUser] = useState(null)

  const [patients, setPatients] = useState([])
  const [records, setRecords] = useState([])
  const [appointments, setAppointments] = useState([])
  const [isLoading, setIsLoading] = useState(false)

  // ─── Unified API Fetcher ──────────────────────────────────────────
  const fetchAPI = useCallback(async (endpoint, options = {}) => {
    const headers = { 'Content-Type': 'application/json' }
    if (token) headers['Authorization'] = `Bearer ${token}`
    const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api${endpoint}`, { ...options, headers })
    const data = await response.json()
    if (!response.ok) throw new Error(data.message || 'API request failed')
    return data
  }, [token])

  // ─── Load Doctor Data on token change ─────────────────────────────
  useEffect(() => {
    if (!token) return
    const loadDoctorData = async () => {
      try {
        setIsLoading(true)
        const base64Url = token.split('.')[1]
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
        const payload = decodeURIComponent(
          atob(base64).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join('')
        )
        const decoded = JSON.parse(payload)

        const doctorProfile = await fetchAPI(`/doctors/${decoded.id}`)
        setSessionUser({ ...doctorProfile, role: 'doctor', doctorId: doctorProfile._id, id: doctorProfile._id })

        const [patData, apptData] = await Promise.all([
          fetchAPI(`/doctors/${decoded.id}/patients`),
          fetchAPI(`/appointments/doctor/${decoded.id}`)
        ])
        setPatients(patData)
        setAppointments(apptData)

        // Fix #9: Load records for all patients under this doctor
        if (patData.length > 0) {
          const recordArrays = await Promise.all(
            patData.map(p => fetchAPI(`/patients/${p._id}/records`).catch(() => []))
          )
          const all = recordArrays.flat()
          const seen = new Set()
          setRecords(all.filter(r => { if (seen.has(r._id)) return false; seen.add(r._id); return true }))

          // Fetch latest vitals from Vital collection and merge into patient objects
          const vitalsArrays = await Promise.all(
            patData.map(p => fetchAPI(`/patients/${p._id}/vitals`).catch(() => []))
          )
          const patientsWithVitals = patData.map((p, i) => {
            const vitalsList = vitalsArrays[i]
            if (vitalsList && vitalsList.length > 0) {
              // vitalsList is sorted by recordedAt desc, so first entry is latest
              const latestVital = vitalsList[0]
              return { ...p, vitals: latestVital.metrics || {} }
            }
            return p
          })
          setPatients(patientsWithVitals)
        }
      } catch (err) {
        console.error('Failed to load doctor data:', err)
        logout()
      } finally {
        setIsLoading(false)
      }
    }
    loadDoctorData()
  }, [token]) // eslint-disable-line react-hooks/exhaustive-deps

  const isDoctor = sessionUser?.role === 'doctor'
  const isPatient = false
  const currentDoctorId = isDoctor ? sessionUser.id : null
  const currentPatientId = null

  // ─── Auth ─────────────────────────────────────────────────────────
  const login = async ({ email, password }) => {
    try {
      setIsLoading(true)
      const data = await fetchAPI('/auth/doctor/login', { method: 'POST', body: JSON.stringify({ email, password }) })
      setToken(data.token)
      localStorage.setItem('co_token', data.token)
      return { ok: true, user: data }
    } catch (err) {
      return { ok: false, error: err.message }
    } finally {
      setIsLoading(false)
    }
  }

  const signup = async ({ name, email, password, specialty, fee, avatarUrl }) => {
    try {
      setIsLoading(true)
      const data = await fetchAPI('/auth/doctor/register', { method: 'POST', body: JSON.stringify({ name, email, password, specialty, fee, avatarUrl }) })
      setToken(data.token)
      localStorage.setItem('co_token', data.token)
      return { ok: true, user: data }
    } catch (err) {
      return { ok: false, error: err.message }
    } finally {
      setIsLoading(false)
    }
  }

  const updateDoctor = async (doctorId, updates) => {
    try {
      setIsLoading(true)
      const updatedDoctor = await fetchAPI(`/doctors/${doctorId}`, { method: 'PUT', body: JSON.stringify(updates) })
      setSessionUser({ ...updatedDoctor, role: 'doctor', doctorId: updatedDoctor._id, id: updatedDoctor._id })
      return { ok: true, doctor: updatedDoctor }
    } catch (err) {
      return { ok: false, error: err.message }
    } finally {
      setIsLoading(false)
    }
  }

  const logout = () => {
    setToken(null)
    setSessionUser(null)
    localStorage.removeItem('co_token')
    setPatients([])
    setAppointments([])
    setRecords([])
  }

  // ─── Patient helpers ───────────────────────────────────────────────
  const getPatientById = (patientId) => patients.find(p => p._id === patientId) || null
  const getUserById = () => null // Deprecated
  const getRecordById = (recordId) => records.find(r => r._id === recordId) || null

  const addPatient = async (patientData) => {
    const data = await fetchAPI('/patients', { method: 'POST', body: JSON.stringify(patientData) })
    setPatients(prev => [data, ...prev])
    return data
  }

  const upsertPatient = async (patientId, updates) => {
    try {
      const updated = await fetchAPI(`/patients/${patientId}`, { method: 'PUT', body: JSON.stringify(updates) })
      setPatients(prev => prev.map(p => (p._id === patientId ? updated : p)))
    } catch (e) { console.error(e) }
  }

  // ─── Records ───────────────────────────────────────────────────────
  const addRecord = async (recordPayload) => {
    const newRecord = await fetchAPI('/records', {
      method: 'POST',
      body: JSON.stringify({ ...recordPayload, doctorId: currentDoctorId })
    })
    setRecords(prev => [newRecord, ...prev])
    return newRecord
  }

  const fetchPatientRecords = async (patientId) => {
    try {
      const res = await fetchAPI(`/patients/${patientId}/records`)
      setRecords(prev => {
        const ids = new Set(prev.map(r => r._id))
        return [...res.filter(r => !ids.has(r._id)), ...prev]
      })
      return res
    } catch (e) { console.error(e); return [] }
  }

  // ─── Appointments ──────────────────────────────────────────────────
  const addAppointment = async (appointmentPayload) => {
    const newAppt = await fetchAPI('/appointments', {
      method: 'POST',
      body: JSON.stringify({ ...appointmentPayload, doctorId: currentDoctorId })
    })
    setAppointments(prev => [newAppt, ...prev])
  }

  const updateAppointment = async (appointmentId, updates) => {
    try {
      const updated = await fetchAPI(`/appointments/${appointmentId}`, { method: 'PATCH', body: JSON.stringify(updates) })
      setAppointments(prev => prev.map(a => (a._id === appointmentId ? updated : a)))
    } catch (e) { console.error(e) }
  }

  const refreshAppointments = async () => {
    if (!currentDoctorId) return
    try {
      const apptData = await fetchAPI(`/appointments/doctor/${currentDoctorId}`)
      setAppointments(apptData)
    } catch (e) { console.error('Failed to refresh appointments:', e) }
  }

  const api = {
    isLoading, token,
    sessionUserId: currentDoctorId, sessionUser,
    isDoctor, isPatient,
    currentDoctorId, currentPatientId,
    patients, records, appointments,
    login, signup, updateDoctor, logout,
    addPatient, getPatientById, getUserById, getRecordById,
    upsertPatient, addRecord, fetchPatientRecords,
    addAppointment, updateAppointment, refreshAppointments,
    makeId,
    fetchAPI,
  }

  return <AppContext.Provider value={api}>{children}</AppContext.Provider>
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}
