import React from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext.jsx'

export default function Navbar() {
  const { user, logout, isAdmin } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const isActive = (path) => location.pathname === path ? 'nav-link active' : 'nav-link'

  if (!user) return null

  return (
    <nav style={{
      background: 'var(--bg2)',
      borderBottom: '1px solid var(--border)',
      padding: '0 2rem',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      height: '56px',
      position: 'sticky',
      top: 0,
      zIndex: 100
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
        <Link to="/" style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--accent)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          🔒 TrustVault
        </Link>
        <div style={{ display: 'flex', gap: '0.25rem' }}>
          <NavLink to="/" label="Dashboard" location={location} />
          <NavLink to="/documents" label="My Docs" location={location} />
          <NavLink to="/shared-with-me" label="Shared With Me" location={location} />
          <NavLink to="/shared-by-me" label="Shared By Me" location={location} />
          {isAdmin && <NavLink to="/admin/audit" label="Audit Logs" location={location} />}
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <Link to="/profile" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none', color: 'var(--text)' }}>
          <div style={{
            width: 32, height: 32, borderRadius: '50%',
            background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '0.85rem', fontWeight: 700, color: '#fff'
          }}>
            {user.fullName?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase()}
          </div>
          <span style={{ fontSize: '0.875rem', maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.fullName || user.email}</span>
          {isAdmin && <span className="badge badge-admin">Admin</span>}
        </Link>
        <button className="btn btn-ghost btn-sm" onClick={handleLogout}>Logout</button>
      </div>
    </nav>
  )
}

function NavLink({ to, label, location }) {
  const active = location.pathname === to
  return (
    <Link to={to} style={{
      padding: '0.4rem 0.75rem',
      borderRadius: 'var(--radius)',
      fontSize: '0.875rem',
      color: active ? 'var(--accent)' : 'var(--text-muted)',
      background: active ? 'rgba(91,141,238,0.12)' : 'transparent',
      textDecoration: 'none',
      transition: 'all 0.15s'
    }}>
      {label}
    </Link>
  )
}
