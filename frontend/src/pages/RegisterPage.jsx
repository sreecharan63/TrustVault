import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { register as registerApi, getMe } from '../api/auth.js'
import { useAuth } from '../contexts/AuthContext.jsx'

export default function RegisterPage() {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [role, setRole] = useState('DOCUMENT_OWNER')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()
  const { login } = useAuth()

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (password !== confirm) { setError('Passwords do not match.'); return }
    if (password.length < 12) { setError('Password must be at least 12 characters.'); return }
    setLoading(true); setError('')
    try {
      const res = await registerApi(fullName, email, password, role)
      const { accessToken } = res.data
      localStorage.setItem('trustvault_token', accessToken)

      const meRes = await getMe()
      login(accessToken, meRes.data)
      navigate('/')
    } catch (err) {
      const msg = err.response?.data?.message ||
                  err.response?.data?.errors?.[0]?.defaultMessage ||
                  err.response?.data?.error ||
                  'Registration failed.'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
      <div className="card" style={{ width: '100%', maxWidth: 400 }}>
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🔒</div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Create Account</h1>
          <p className="text-muted">Join TrustVault</p>
        </div>

        {error && <div className="error-box">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Full Name</label>
            <input value={fullName} onChange={e => setFullName(e.target.value)} placeholder="John Doe" required autoFocus />
          </div>
          <div className="form-group">
            <label className="form-label">Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" required />
          </div>
          <div className="form-group">
            <label className="form-label">Account Role</label>
            <select value={role} onChange={e => setRole(e.target.value)} style={{ width: '100%', padding: '0.6rem', borderRadius: 'var(--radius)', background: 'var(--bg3)', color: 'var(--text)', border: '1px solid var(--border)' }}>
              <option value="DOCUMENT_OWNER">Document Owner (Upload, Version, Share & Manage)</option>
              <option value="VIEWER">Viewer (View & Download Shared Files, Request Files)</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Min 12 characters" required />
          </div>
          <div className="form-group">
            <label className="form-label">Confirm Password</label>
            <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="Re-enter password" required />
          </div>
          <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: '100%', marginTop: '0.5rem', justifyContent: 'center' }}>
            {loading ? '⏳ Creating...' : '✨ Create Account'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: '1.25rem', fontSize: '0.9rem' }}>
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </div>
    </div>
  )
}
