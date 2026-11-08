import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Eye, EyeOff } from 'lucide-react'
import { register as registerApi, getMe } from '../api/auth.js'
import { useAuth } from '../contexts/AuthContext.jsx'

export default function RegisterPage() {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
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
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem',
      background: 'radial-gradient(ellipse at 50% 20%, rgba(229, 9, 20, 0.12) 0%, #141414 75%)'
    }}>
      <div className="card" style={{
        width: '100%',
        maxWidth: 440,
        background: '#181818',
        border: '1px solid #333333',
        borderRadius: '8px',
        padding: '2.25rem',
        boxShadow: '0 12px 40px rgba(0, 0, 0, 0.85)'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '0.4rem', textShadow: '0 0 16px rgba(229, 9, 20, 0.4)' }}>🔒</div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, letterSpacing: '0.02em', color: '#ffffff' }}>Create Account</h1>
          <p className="text-muted" style={{ fontSize: '0.875rem', marginTop: '0.25rem' }}>Join the TrustVault platform</p>
        </div>

        {error && <div className="error-box">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Full Name</label>
            <input value={fullName} onChange={e => setFullName(e.target.value)} placeholder="John Doe" required autoFocus />
          </div>
          <div className="form-group">
            <label className="form-label">Email Address</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" required />
          </div>
          <div className="form-group">
            <label className="form-label">Account Role</label>
            <select value={role} onChange={e => setRole(e.target.value)} style={{ width: '100%', padding: '0.65rem', borderRadius: 'var(--radius)', background: '#111111', color: 'var(--text)', border: '1px solid var(--border)' }}>
              <option value="DOCUMENT_OWNER">Document Owner (Upload, Version, Share & Manage)</option>
              <option value="VIEWER">Viewer (View & Download Shared Files, Request Files)</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Min 12 characters"
                required
                style={{ paddingRight: '2.5rem' }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(prev => !prev)}
                title={showPassword ? 'Hide password' : 'Show password'}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                style={{
                  position: 'absolute',
                  right: '0.75rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'transparent',
                  border: 'none',
                  color: showPassword ? 'var(--accent)' : 'var(--text-muted)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: 0,
                  cursor: 'pointer'
                }}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Confirm Password</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showConfirm ? 'text' : 'password'}
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                placeholder="Re-enter password"
                required
                style={{ paddingRight: '2.5rem' }}
              />
              <button
                type="button"
                onClick={() => setShowConfirm(prev => !prev)}
                title={showConfirm ? 'Hide password' : 'Show password'}
                aria-label={showConfirm ? 'Hide password' : 'Show password'}
                style={{
                  position: 'absolute',
                  right: '0.75rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'transparent',
                  border: 'none',
                  color: showConfirm ? 'var(--accent)' : 'var(--text-muted)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: 0,
                  cursor: 'pointer'
                }}
              >
                {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>
          <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: '100%', marginTop: '0.75rem', justifyContent: 'center', padding: '0.75rem' }}>
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
          Already have an account? <Link to="/login" style={{ color: '#ffffff', fontWeight: 600 }}>Sign in</Link>
        </p>
      </div>
    </div>
  )
}
