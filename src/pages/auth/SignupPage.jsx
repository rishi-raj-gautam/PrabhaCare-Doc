import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useApp } from '../../context/AppContext'

export default function SignupPage() {
  const nav = useNavigate()
  const { signup } = useApp()

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [specialty, setSpecialty] = useState('')
  const [fee, setFee] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState(null)

  const handleAvatarChange = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    const MAX_SIZE = 5 * 1024 * 1024
    const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']

    if (!ALLOWED_TYPES.includes(file.type)) {
      setError('Only JPG, PNG, and WebP images are allowed')
      e.target.value = ''
      return
    }
    if (file.size > MAX_SIZE) {
      setError(`File is too large (${(file.size / (1024 * 1024)).toFixed(1)}MB). Maximum size is 5MB`)
      e.target.value = ''
      return
    }
    
    setIsUploading(true)
    setError(null)
    try {
      const formData = new FormData()
      formData.append('avatar', file)
      
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/upload/avatar`, {
        method: 'POST',
        body: formData
      })
      const data = await res.json()
      
      if (!res.ok) throw new Error(data.message || 'Upload failed')
      setAvatarUrl(data.avatarUrl)
    } catch (err) {
      setError(err.message)
    } finally {
      setIsUploading(false)
    }
  }

  const onSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    const numericFee = fee ? Number(fee) : 0
    const res = await signup({ name, email, password, specialty, fee: numericFee, avatarUrl })
    if (!res.ok) {
      setError(res.error || 'Signup failed.')
      return
    }
    nav('/doctor/dashboard')
  }

  return (
    <div className="co-authWrap">
      <div className="co-authCard">
        <div className="co-authBrand">CareOS</div>
        <h1 className="co-authTitle">Create Doctor Account</h1>

        <form className="co-form" onSubmit={onSubmit}>
          <label className="co-label">
            Full Name
            <input className="co-input" value={name} onChange={(e) => setName(e.target.value)} required />
          </label>

          <label className="co-label">
            Profile Picture (Optional)
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '0.5rem' }}>
              {avatarUrl && (
                <img src={avatarUrl} alt="Preview" style={{ width: 50, height: 50, borderRadius: '50%', objectFit: 'cover' }} />
              )}
              <input
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                disabled={isUploading}
                style={{ fontSize: 14 }}
              />
              {isUploading && <span style={{ fontSize: 12, color: 'var(--muted)' }}>Uploading...</span>}
            </div>
          </label>

          <label className="co-label">
            Specialty
            <input className="co-input" placeholder="e.g. Cardiologist" value={specialty} onChange={(e) => setSpecialty(e.target.value)} required />
          </label>

          <label className="co-label">
            Consultation Fee (₹)
            <input className="co-input" type="number" placeholder="500" value={fee} onChange={(e) => setFee(e.target.value)} required />
          </label>

          <label className="co-label">
            Email
            <input
              className="co-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              required
            />
          </label>

          <label className="co-label">
            Password
            <input
              className="co-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              minLength={6}
              required
            />
          </label>

          {error ? <div className="co-alert co-alert--danger">{error}</div> : null}

          <button className="co-btn co-btn--primary" type="submit">
            Create account
          </button>

          <div className="co-authFooter">
            Already have an account? <Link to="/auth/login">Sign in</Link>
          </div>
        </form>
      </div>
    </div>
  )
}
