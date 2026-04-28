import React, { useState } from 'react'
import { useApp } from '../../context/AppContext'
import { UserCircle2, Briefcase, FileText, Bell, Shield, LogOut, CheckCircle2 } from 'lucide-react'

const SETTINGS_NAV = [
  { id: 'profile', icon: <UserCircle2 size={18} />, label: 'Personal Information' },
  { id: 'professional', icon: <Briefcase size={18} />, label: 'Professional Profile' },
  { id: 'notifications', icon: <Bell size={18} />, label: 'Notifications' },
  { id: 'security', icon: <Shield size={18} />, label: 'Security & Privacy' },
]

export default function DoctorSettingsPage() {
  const { sessionUser, updateDoctor, isLoading, logout } = useApp()

  const [activeSection, setActiveSection] = useState('profile')
  const [saved, setSaved] = useState(false)
  const [errorMsg, setErrorMsg] = useState(null)

  // -- Profile Form State
  const [form, setForm] = useState({
    name: sessionUser?.name || '',
    email: sessionUser?.email || '',
    phone: sessionUser?.phone || '',
    avatarUrl: sessionUser?.avatarUrl || '',
    hospital: sessionUser?.hospital || '',
    bio: sessionUser?.bio || '',
    // Professional
    specialty: sessionUser?.specialty || '',
    qualifications: sessionUser?.qualifications || '',
    experienceYears: sessionUser?.experienceYears || '',
    fee: sessionUser?.fee || ''
  })

  const [isUploading, setIsUploading] = useState(false)

  const updateField = (field, value) => setForm(f => ({ ...f, [field]: value }))

  const handleAvatarChange = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    // Client-side validation
    const MAX_SIZE = 5 * 1024 * 1024 // 5 MB
    const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']

    if (!ALLOWED_TYPES.includes(file.type)) {
      setErrorMsg('Only JPG, PNG, and WebP images are allowed')
      e.target.value = ''
      return
    }
    if (file.size > MAX_SIZE) {
      setErrorMsg(`File is too large (${(file.size / (1024 * 1024)).toFixed(1)}MB). Maximum size is 5MB`)
      e.target.value = ''
      return
    }
    
    setIsUploading(true)
    setErrorMsg(null)
    try {
      const formData = new FormData()
      formData.append('avatar', file)
      
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/upload/avatar`, {
        method: 'POST',
        body: formData
      })
      const data = await res.json()
      
      if (!res.ok) throw new Error(data.message || 'Upload failed')
      updateField('avatarUrl', data.avatarUrl)
      
      // Auto-save the profile when avatar is uploaded
      const payload = { ...form, avatarUrl: data.avatarUrl }
      if (payload.fee) payload.fee = Number(payload.fee)
      if (payload.experienceYears) payload.experienceYears = Number(payload.experienceYears)
      await updateDoctor(sessionUser._id, payload)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (err) {
      setErrorMsg(err.message)
    } finally {
      setIsUploading(false)
    }
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setErrorMsg(null)
    setSaved(false)

    const payload = { ...form }
    if (payload.fee) payload.fee = Number(payload.fee)
    if (payload.experienceYears) payload.experienceYears = Number(payload.experienceYears)

    const res = await updateDoctor(sessionUser._id, payload)
    if (res.ok) {
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } else {
      setErrorMsg(res.error || 'Failed to update profile.')
    }
  }

  // Temporary mocked components for settings that don't need backend wiring right away
  const NotificationsView = () => (
    <div className="co-card animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
      <h2 className="co-h2" style={{ marginBottom: 24 }}>Notification Preferences</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {[
          { label: 'New Appointment Alerts', desc: 'Get notified when a patient books a new slot', checked: true },
          { label: 'Telehealth Reminders', desc: 'Ding 5 minutes before video consultations', checked: true },
          { label: 'Daily Schedule Digest', desc: 'Receive an email every morning with your schedule', checked: false },
        ].map((item, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 0', borderBottom: '1px solid var(--border)' }}>
            <div>
              <div style={{ fontWeight: 800, color: 'var(--text-h)' }}>{item.label}</div>
              <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>{item.desc}</div>
            </div>
            <label style={{ position: 'relative', display: 'inline-block', width: 44, height: 24 }}>
              <input type="checkbox" defaultChecked={item.checked} style={{ display: 'none' }} />
              <span style={{
                display: 'block', width: 44, height: 24, borderRadius: 14,
                background: item.checked ? 'var(--primary)' : 'var(--outline-variant)',
                cursor: 'pointer', position: 'relative', transition: 'all 0.3s'
              }}>
                <span style={{
                  position: 'absolute', top: 3, left: item.checked ? 23 : 3,
                  width: 18, height: 18, borderRadius: '50%', background: 'white',
                  transition: 'all 0.3s', boxShadow: '0 2px 4px rgba(0,0,0,0.15)'
                }} />
              </span>
            </label>
          </div>
        ))}
      </div>
    </div>
  )

  const SecurityView = () => (
    <div className="co-card animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
      <h2 className="co-h2" style={{ marginBottom: 24 }}>Security & Privacy</h2>
      <div style={{ background: 'var(--surface-container-low)', padding: 24, borderRadius: 12, marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
           <div style={{ fontWeight: 800, color: 'var(--text-h)' }}>Change Password</div>
           <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>It's a good idea to rotate your passwords periodically.</div>
        </div>
        <button className="co-btn co-btn--ghost" style={{ border: '1px solid var(--outline-variant)' }}>Update</button>
      </div>
      <div style={{ background: 'var(--error-container)', padding: 24, borderRadius: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
           <div style={{ fontWeight: 800, color: 'var(--error)' }}>Account Deletion</div>
           <div style={{ fontSize: 13, color: 'var(--error)', opacity: 0.8, marginTop: 4 }}>Permanently delete your account and all associated data.</div>
        </div>
        <button className="co-btn" style={{ background: 'var(--error)', color: 'white' }}>Delete Account</button>
      </div>
    </div>
  )

  return (
    <div className="co-page animate-fade-in-up">
      <div className="co-pageHeader" style={{ borderBottom: '1px solid var(--border)', paddingBottom: 24, marginBottom: 32 }}>
        <div>
          <h1 className="co-h1">Account Settings</h1>
          <p className="co-muted" style={{ marginTop: 8 }}>Manage your profile, preferences, and security settings.</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: 32, alignItems: 'start' }}>
        
        {/* Sidebar Nav */}
        <aside style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {SETTINGS_NAV.map(item => (
            <button
              key={item.id}
              onClick={() => setActiveSection(item.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px',
                borderRadius: 'var(--radius-lg)', cursor: 'pointer', border: 'none',
                background: activeSection === item.id ? 'var(--surface-container-high)' : 'transparent',
                color: activeSection === item.id ? 'var(--primary)' : 'var(--text-h)',
                fontWeight: activeSection === item.id ? 800 : 600,
                textAlign: 'left', transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => { 
                if (activeSection !== item.id) e.currentTarget.style.background = 'var(--surface-container-low)' 
              }}
              onMouseLeave={(e) => { 
                if (activeSection !== item.id) e.currentTarget.style.background = 'transparent' 
              }}
            >
              <div style={{ opacity: activeSection === item.id ? 1 : 0.6 }}>{item.icon}</div>
              {item.label}
            </button>
          ))}

          <div style={{ height: 1, background: 'var(--border)', margin: '16px 0' }} />

          <button
            onClick={() => { logout(); window.location.href = '/auth/login' }}
            style={{
              display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px',
              borderRadius: 'var(--radius-lg)', cursor: 'pointer', border: 'none',
              background: 'rgba(239, 68, 68, 0.08)', color: 'var(--error)',
              fontWeight: 800, textAlign: 'left', transition: 'all 0.2s'
            }}
          >
            <LogOut size={18} />
            Sign Out
          </button>
        </aside>

        {/* Main Content Area */}
        <main>
          {activeSection === 'profile' && (
            <div className="co-card animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
              <h2 className="co-h2" style={{ marginBottom: 24 }}>Personal Information</h2>
              <form className="co-form" onSubmit={handleSave}>
                <div style={{ display: 'flex', gap: 24, alignItems: 'center', marginBottom: 24, paddingBottom: 24, borderBottom: '1px dotted var(--border)' }}>
                  <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'linear-gradient(135deg, var(--primary), var(--primary-container))', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, fontWeight: 900, overflow: 'hidden' }}>
                    {form.avatarUrl ? <img src={form.avatarUrl} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (form.name ? form.name.charAt(0) : 'D')}
                  </div>
                  <div>
                    <label className="co-btn co-btn--ghost" style={{ border: '1px solid var(--border)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                      {isUploading ? 'Uploading...' : 'Upload Photo'}
                      <input type="file" accept="image/*" onChange={handleAvatarChange} disabled={isUploading} style={{ display: 'none' }} />
                    </label>
                    <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 8 }}>JPG or PNG under 5MB</div>
                  </div>
                </div>

                <div className="co-formGrid">
                  <label className="co-label">
                    Full Name
                    <input className="co-input" value={form.name} onChange={e => updateField('name', e.target.value)} required />
                  </label>
                  <label className="co-label">
                    Phone Number
                    <input className="co-input" type="tel" value={form.phone} onChange={e => updateField('phone', e.target.value)} placeholder="e.g. +91 9876543210" />
                  </label>
                </div>
                
                <label className="co-label">
                  Email Address
                  <input className="co-input" type="email" value={form.email} onChange={e => updateField('email', e.target.value)} required />
                </label>

                <label className="co-label">
                  Current Hospital / Clinic
                  <input className="co-input" value={form.hospital} onChange={e => updateField('hospital', e.target.value)} placeholder="e.g. Apollo Apollo Hospitals" />
                </label>

                <label className="co-label">
                  Biography / About Me
                  <textarea className="co-textarea" value={form.bio} onChange={e => updateField('bio', e.target.value)} placeholder="Tell patients a bit about yourself..." style={{ minHeight: 100 }} />
                </label>

                {errorMsg && <div className="co-alert co-alert--danger">{errorMsg}</div>}
                <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 16 }}>
                  <button className="co-btn co-btn--primary" type="submit" disabled={isLoading}>
                    {isLoading ? 'Saving...' : 'Save Profile Details'}
                  </button>
                  {saved && <span className="co-muted" style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--tertiary)', fontWeight: 800 }}><CheckCircle2 size={18} /> Changes saved</span>}
                </div>
              </form>
            </div>
          )}

          {activeSection === 'professional' && (
            <div className="co-card animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
              <h2 className="co-h2" style={{ marginBottom: 24 }}>Professional Profile</h2>
              <form className="co-form" onSubmit={handleSave}>
                <div className="co-formGrid">
                  <label className="co-label">
                    Medical Specialty
                    <input className="co-input" value={form.specialty} onChange={e => updateField('specialty', e.target.value)} placeholder="e.g. Cardiology" required />
                  </label>
                  <label className="co-label">
                    Total Experience (Years)
                    <input className="co-input" type="number" min="0" value={form.experienceYears} onChange={e => updateField('experienceYears', e.target.value)} placeholder="e.g. 15" />
                  </label>
                </div>

                <label className="co-label">
                  Qualifications (Comma separated)
                  <input className="co-input" value={form.qualifications} onChange={e => updateField('qualifications', e.target.value)} placeholder="e.g. MBBS, MD - General Medicine" />
                </label>

                <label className="co-label">
                  Standard Consultation Fee (₹)
                  <input className="co-input" type="number" step="10" min="0" value={form.fee} onChange={e => updateField('fee', e.target.value)} required />
                </label>

                {errorMsg && <div className="co-alert co-alert--danger">{errorMsg}</div>}
                <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 16 }}>
                  <button className="co-btn co-btn--primary" type="submit" disabled={isLoading}>
                    {isLoading ? 'Saving...' : 'Update Professional Details'}
                  </button>
                  {saved && <span className="co-muted" style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--tertiary)', fontWeight: 800 }}><CheckCircle2 size={18} /> Changes saved</span>}
                </div>
              </form>
            </div>
          )}

          {activeSection === 'notifications' && <NotificationsView />}
          {activeSection === 'security' && <SecurityView />}
        </main>
      </div>
    </div>
  )
}
