import React from 'react'
import { BrowserRouter, Navigate, Outlet, Route, Routes } from 'react-router-dom'
import './App.css'

import { AppProvider, useApp } from './context/AppContext'
import AppLayout from './components/Layout/AppLayout'

import LoginPage from './pages/auth/LoginPage'
import SignupPage from './pages/auth/SignupPage'
import DoctorDashboard from './pages/doctor/DoctorDashboard'
import DoctorNewConsultation from './pages/doctor/DoctorNewConsultation'
import DoctorRecords from './pages/doctor/DoctorRecords'
import DoctorSchedules from './pages/doctor/DoctorSchedules'
import DoctorPatientsPage from './pages/doctor/DoctorPatientsPage'
import TelemedicinePage from './pages/telehealth/TelemedicinePage'

import PatientProfilePage from './pages/patient/PatientProfilePage'
import PatientUploadPage from './pages/patient/PatientUploadPage'
import PatientTimelinePage from './pages/patient/PatientTimelinePage'
import PatientViewRecordsPage from './pages/patient/PatientViewRecordsPage'
import DoctorSettingsPage from './pages/doctor/DoctorSettingsPage'

function RequireAuth() {
  const { sessionUser } = useApp()
  if (!sessionUser) return <Navigate to="/auth/login" replace />
  return <AppLayout />
}

function RequireRole({ role }) {
  const { sessionUser } = useApp()
  if (!sessionUser) return <Navigate to="/auth/login" replace />
  if (sessionUser.role !== role) return <Navigate to="/" replace />
  return <Outlet />
}

function RootRedirect() {
  const { sessionUser } = useApp()
  if (!sessionUser) return <Navigate to="/auth/login" replace />
  if (sessionUser.role === 'doctor') return <Navigate to="/doctor/dashboard" replace />
  if (sessionUser.role === 'patient') return <Navigate to="/patient/profile" replace />
  return <Navigate to="/auth/login" replace />
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<RootRedirect />} />
      <Route path="/auth/login" element={<LoginPage />} />
      <Route path="/auth/signup" element={<SignupPage />} />

      <Route
        element={<RequireAuth />}
      >
        <Route path="/doctor/*" element={<RequireRole role="doctor" />}>
          <Route path="dashboard" element={<DoctorDashboard />} />
          <Route path="new-consultation" element={<DoctorNewConsultation />} />
          <Route path="records" element={<DoctorRecords />} />
          <Route path="schedules" element={<DoctorSchedules />} />
          <Route path="patients" element={<DoctorPatientsPage />} />
          <Route path="settings" element={<DoctorSettingsPage />} />
          <Route path="patients/:patientId" element={<PatientViewRecordsPage />} />
        </Route>

        <Route path="/patient/*" element={<RequireRole role="patient" />}>
          <Route path="profile" element={<PatientProfilePage />} />
          <Route path="upload" element={<PatientUploadPage />} />
          <Route path="timeline" element={<PatientTimelinePage />} />
        </Route>

        <Route path="/telehealth" element={<TelemedicinePage />} />
        <Route path="/telehealth/:appointmentId" element={<TelemedicinePage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AppProvider>
  )
}
