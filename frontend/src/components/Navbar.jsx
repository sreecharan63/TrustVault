import React from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext.jsx'
import { useNotifications } from '../contexts/NotificationContext.jsx'
import TrustVaultLogo from './TrustVaultLogo.jsx'

export default function Navbar() {
  const { user, logout, isAdmin } = useAuth()
  const { unreadCounts } = useNotifications()
  const navigate = useNavigate()
  const location = useLocation()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  if (!user) return null

  return (
    <nav style={{
      background: '#000000',
      borderBottom: '1px solid #222222',
      padding: '0 2rem',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      height: '60px',
      position: 'sticky',
      top: 0,
      zIndex: 100,
      boxShadow: '0 4px 16px rgba(0, 0, 0, 0.8)'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
        <Link to="/" style={{ textDecoration: 'none' }}>
          <TrustVaultLogo size={28} showText={true} subtitle="DIGITAL PROTECTION" />
        </Link>
        <div style={{ display: 'flex', gap: '0.4rem' }}>
          <NavLink to="/" label="Dashboard" location={location} />
          <NavLink to="/documents" label="My Docs" count={unreadCounts?.documents || 0} location={location} />
          <NavLink to="/shared-with-me" label="Shared With Me" count={unreadCounts?.sharedWithMe || 0} location={location} />
          <NavLink to="/shared-by-me" label="Shared By Me" count={unreadCounts?.sharedByMe || 0} location={location} />
          <NavLink to="/requests" label="Requests" count={unreadCounts?.requests || 0} location={location} />
          {isAdmin && <NavLink to="/admin/audit" label="Audit Logs" location={location} />}
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <Link to="/profile" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', textDecoration: 'none', color: '#ffffff' }}>
          <div style={{
            width: 34, height: 34, borderRadius: '4px',
            background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '0.85rem', fontWeight: 800, color: '#ffffff',
            boxShadow: '0 2px 8px rgba(229, 9, 20, 0.4)'
          }}>
            {user.fullName?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase()}
          </div>
          <span style={{ fontSize: '0.875rem', fontWeight: 500, maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {user.fullName || user.email}
          </span>
          {user.role === 'ADMIN' && <span className="badge badge-admin">Admin</span>}
          {(user.role === 'DOCUMENT_OWNER' || user.role === 'USER') && (
            <span className="badge" style={{ background: 'rgba(70, 211, 105, 0.18)', color: '#46d369', border: '1px solid rgba(70, 211, 105, 0.4)' }}>
              Owner
            </span>
          )}
          {user.role === 'VIEWER' && (
            <span className="badge" style={{ background: 'rgba(255, 255, 255, 0.1)', color: '#e5e5e5', border: '1px solid rgba(255, 255, 255, 0.2)' }}>
              Viewer
            </span>
          )}
        </Link>
        <button className="btn btn-ghost btn-sm" onClick={handleLogout} style={{ borderRadius: '4px', padding: '0.35rem 0.8rem' }}>
          Sign Out
        </button>
      </div>
    </nav>
  )
}

function NavLink({ to, label, location, count }) {
  const active = location.pathname === to
  return (
    <Link to={to} style={{
      padding: '0.45rem 0.85rem',
      borderRadius: '4px',
      fontSize: '0.875rem',
      fontWeight: active ? 700 : 500,
      color: active ? '#ffffff' : '#b3b3b3',
      background: active ? 'rgba(229, 9, 20, 0.16)' : 'transparent',
      borderBottom: active ? '2px solid var(--accent)' : '2px solid transparent',
      textDecoration: 'none',
      transition: 'all 0.15s ease',
      position: 'relative',
      display: 'inline-flex',
      alignItems: 'center',
      gap: '0.4rem'
    }}>
      {label}
      {count > 0 && (
        <span style={{
          backgroundColor: 'var(--accent)',
          color: '#ffffff',
          fontSize: '0.7rem',
          fontWeight: 800,
          lineHeight: '1',
          padding: '0.15rem 0.45rem',
          borderRadius: '9999px',
          boxShadow: '0 0 8px rgba(229, 9, 20, 0.7)',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          {count > 99 ? '99+' : count}
        </span>
      )}
    </Link>
  )
}
