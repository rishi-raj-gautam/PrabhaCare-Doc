import React, { useState, useEffect } from 'react'
import { Link, NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom'
import {
  LayoutGrid,
  Pill,
  FileText,
  CalendarDays,
  Stethoscope,
  UserCircle2,
  LogOut,
  Phone,
  Video,
  Search,
  Bell,
  Users,
  Menu,
  X,
  Moon,
  Sun,
} from 'lucide-react'
import { useApp } from '../../context/AppContext'

function NavItem({ to, icon, label }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) => `co-navItem ${isActive ? 'co-navItem--active' : ''}`}
    >
      <span className="co-navIcon">{icon}</span>
      <span className="co-navLabel">{label}</span>
    </NavLink>
  )
}

export default function AppLayout() {
  const nav = useNavigate()
  const loc = useLocation()
  const { sessionUser, isDoctor, isPatient, logout } = useApp()
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [isDark, setIsDark] = useState(() => {
    if (typeof localStorage !== 'undefined') {
      return localStorage.getItem('careos-theme') === 'dark'
    }
    return false
  })

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light')
    document.body.style.background = isDark ? '#111318' : '#f9f9ff'
    try { localStorage.setItem('careos-theme', isDark ? 'dark' : 'light') } catch {}
  }, [isDark])

  // Auto-close sidebar on mobile when navigating
  useEffect(() => {
    setIsSidebarOpen(false)
  }, [loc.pathname])

  return (
    <div className="co-shell">
      <div 
        className={`co-sidebarOverlay ${isSidebarOpen ? 'co-sidebarOverlay--open' : ''}`} 
        onClick={() => setIsSidebarOpen(false)} 
      />
      <aside className={`co-sidebar ${isSidebarOpen ? 'co-sidebar--open' : ''}`}>
        {isSidebarOpen && (
          <button className="co-closeSidebarBtn" onClick={() => setIsSidebarOpen(false)}>
            <X size={24} />
          </button>
        )}
        <div className="co-brand" style={{ padding: '0 8px 32px' }}>
          {/* User Profile in sidebar top */}
          {sessionUser && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--primary-container)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', overflow: 'hidden', flexShrink: 0 }}>
                {sessionUser.avatarUrl
                  ? <img src={sessionUser.avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : sessionUser.name.charAt(0)}
              </div>
              <div>
                <div style={{ fontWeight: 800, color: 'var(--text-h)', fontSize: '14px' }}>{sessionUser.name}</div>
                <div style={{ fontSize: '12px', color: 'var(--muted)' }}>{isDoctor ? (sessionUser.specialty || 'Doctor') : 'Patient'}</div>
              </div>
            </div>
          )}
        </div>

        <nav className="co-nav">
          {isDoctor ? (
            <>
              <NavItem to="/doctor/dashboard" icon={<LayoutGrid size={18} />} label="Dashboard" />
              <NavItem to="/doctor/new-consultation" icon={<Stethoscope size={18} />} label="Consultation" />
              <NavItem to="/doctor/patients" icon={<Users size={18} />} label="Patients" />
              <NavItem to="/doctor/records" icon={<FileText size={18} />} label="Records" />
              <NavItem to="/doctor/schedules" icon={<CalendarDays size={18} />} label="Schedules" />
              <NavItem to="/doctor/settings" icon={<UserCircle2 size={18} />} label="Profile & Settings" />
            </>
          ) : isPatient ? (
            <>
              <NavItem to="/patient/profile" icon={<UserCircle2 size={18} />} label="Profile" />
              <NavItem to="/patient/upload" icon={<Pill size={18} />} label="Upload" />
              <NavItem to="/patient/timeline" icon={<FileText size={18} />} label="Timeline" />
            </>
          ) : null}
            <NavItem to="/telehealth" icon={<Video size={18} />} label="Telehealth" />
        </nav>

        <div className="co-sidebarFooter" style={{ marginTop: 'auto', gap: '8px' }}>
          {isDoctor && (
             <Link to="/telehealth" className="co-btn co-btn--primary" style={{ width: '100%', justifyContent: 'center', background: 'var(--error)', borderColor: 'var(--error)' }}>
               Emergency Queue
             </Link>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '16px' }}>
            {/* Dark Mode Toggle */}
            <div
              onClick={() => setIsDark((d) => !d)}
              style={{
                display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 12px',
                borderRadius: 'var(--radius-md)', cursor: 'pointer', transition: 'background 0.2s',
                background: 'transparent',
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'var(--surface-container)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            >
              <span className="co-navIcon">{isDark ? <Sun size={18} /> : <Moon size={18} />}</span>
              <span className="co-navLabel" style={{ fontWeight: 600, flex: 1 }}>{isDark ? 'Light Mode' : 'Dark Mode'}</span>
              <div style={{
                width: '36px', height: '20px', borderRadius: '10px', padding: '2px',
                background: isDark ? 'var(--primary)' : 'var(--outline-variant)',
                transition: 'background 0.2s', display: 'flex', alignItems: 'center',
              }}>
                <div style={{
                  width: '16px', height: '16px', borderRadius: '50%', background: '#fff',
                  transition: 'transform 0.2s', transform: isDark ? 'translateX(16px)' : 'translateX(0)',
                }} />
              </div>
            </div>

            <button className="co-logoutBtn co-navItem" onClick={() => logout()} style={{ border: 'none', background: 'transparent', width: '100%', textAlign: 'left' }}>
               <span className="co-navIcon"><LogOut size={18} /></span>
               <span className="co-navLabel" style={{ fontWeight: 600 }}>Sign Out</span>
            </button>
          </div>
        </div>
      </aside>

      <main className="co-main">
        <header className="co-topbar">
          <div className="co-topbarLeft" style={{ gap: '20px' }}>
            <button className="co-mobileMenuBtn" onClick={() => setIsSidebarOpen(true)}>
              <Menu size={24} color="var(--text-h)" />
            </button>
            <div className="co-topbarTitle" style={{ fontSize: '20px', letterSpacing: '-0.5px' }}>
              <span style={{ fontWeight: 800, color: 'var(--text-h)' }}>Prabha</span><span style={{ color: 'var(--primary)' }}>Care</span>
            </div>
            <div className="co-search" style={{ background: 'var(--surface-container-low)', border: 'none', borderRadius: '8px', marginLeft: '12px' }}>
              <Search size={16} color="var(--muted)" />
              <input className="co-searchInput" placeholder="Search patient, ID, or report..." style={{ fontSize: '14px' }}/>
            </div>
          </div>
          <div className="co-topbarRight" style={{ gap: '24px' }}>
            {isDoctor && (
                <div style={{ display: 'flex', gap: '16px', fontWeight: 600, fontSize: '14px' }}>
                  <NavLink to="/doctor/new-consultation" style={({isActive}) => ({ color: isActive ? 'var(--primary)' : 'var(--text)', textDecoration: 'none', borderBottom: isActive ? '2px solid var(--primary)' : 'none', paddingBottom: '4px' })}>Consultation</NavLink>
                  <span style={{ color: 'var(--text)', cursor: 'pointer' }}>Analytics</span>
                </div>
            )}
            <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
              <Bell size={20} color="var(--text-h)" style={{ cursor: 'pointer' }} />
              {sessionUser?.avatarUrl
                ? <img src={sessionUser.avatarUrl} alt="" style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover', cursor: 'pointer', border: '2px solid var(--outline-variant)' }} onClick={() => nav('/doctor/settings')} />
                : <UserCircle2 size={24} color="var(--text-h)" style={{ cursor: 'pointer' }} onClick={() => nav('/doctor/settings')} />}
            </div>
          </div>
        </header>

        <div className="co-content">
          <Outlet />
        </div>
      </main>
    </div>
  )
}

