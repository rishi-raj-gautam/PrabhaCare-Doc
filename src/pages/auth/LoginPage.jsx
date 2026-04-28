import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useApp } from '../../context/AppContext'

export default function LoginPage() {
  const nav = useNavigate()
  const { login } = useApp()

  const [email, setEmail] = useState('doctor@healthos.com')
  const [password, setPassword] = useState('password123')
  const [error, setError] = useState(null)

  const onSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    const res = await login({ email, password })
    if (!res.ok) {
      setError(res.error || 'Login failed.')
      return
    }
    nav('/doctor/dashboard')
  }

  return (
    <div className="co-authWrap">
      <div className="co-authCard">
        <div className="co-authBrand">CareOS</div>
        <h1 className="co-authTitle">Sign in</h1>
        <p className="co-mutedSmall">
          Demo accounts: <b>doctor@careos.demo</b> / <b>demo123</b> and <b>patient@careos.demo</b> / <b>demo123</b>
        </p>

        <form className="co-form" onSubmit={onSubmit}>
          <label className="co-label">
            Email
            <input className="co-input" value={email} onChange={(e) => setEmail(e.target.value)} type="email" />
          </label>

          <label className="co-label">
            Password
            <input
              className="co-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
            />
          </label>

          {error ? <div className="co-alert co-alert--danger">{error}</div> : null}

          <button className="co-btn co-btn--primary" type="submit">
            Login
          </button>

          <div className="co-authFooter">
            New to CareOS? <Link to="/auth/signup">Create account</Link>
          </div>
        </form>
      </div>
    </div>
  )
}

