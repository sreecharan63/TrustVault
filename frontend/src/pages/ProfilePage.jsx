import React from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext.jsx'

export default function ProfilePage() {
  const { user, logout, isAdmin } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="page">
      <h1 className="page-title">Profile</h1>
      <div className="card" style={{ maxWidth: 480 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', marginBottom: '1.5rem' }}>
          <div style={{
            width: 64, height: 64, borderRadius: '50%',
            background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '1.75rem', fontWeight: 700, color: '#fff'
          }}>
            {user?.fullName?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase()}
          </div>
          <div>
            <div style={{ fontSize: '1.2rem', fontWeight: 600 }}>{user?.fullName}</div>
            <div className="text-muted">{user?.email}</div>
            <span className={`badge ${isAdmin ? 'badge-admin' : 'badge-user'}`} style={{ marginTop: '0.35rem' }}>
              {user?.role}
            </span>
          </div>
        </div>

        <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1.25rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '0.75rem', fontSize: '0.9rem' }}>
            <span className="text-muted">User ID</span>
            <span style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{user?.id}</span>
            <span className="text-muted">Full Name</span>
            <span>{user?.fullName}</span>
            <span className="text-muted">Email</span>
            <span>{user?.email}</span>
            <span className="text-muted">Role</span>
            <span>{user?.role}</span>
          </div>
        </div>

        <button className="btn btn-danger" style={{ marginTop: '1.5rem', width: '100%', justifyContent: 'center' }} onClick={handleLogout}>
          🚪 Sign Out
        </button>
      </div>
    </div>
  )
}
