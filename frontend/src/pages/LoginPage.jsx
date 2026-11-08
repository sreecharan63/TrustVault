import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { login as loginApi } from '../api/auth.js'
import { getMe } from '../api/auth.js'
import { useAuth } from '../contexts/AuthContext.jsx'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()
  const { login } = useAuth()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true); setError('')
    try {
      const res = await loginApi(email, password)
      const { accessToken } = res.data
      localStorage.setItem('trustvault_token', accessToken)

      const meRes = await getMe()
      login(accessToken, meRes.data)
      navigate('/')
    } catch (err) {
      setError(err.response?.data?.message || err.response?.data?.error || 'Login failed. Check your credentials.')
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
        maxWidth: 420,
        background: '#181818',
        border: '1px solid #333333',
        borderRadius: '8px',
        padding: '2.25rem',
        boxShadow: '0 12px 40px rgba(0, 0, 0, 0.85)'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '0.4rem', textShadow: '0 0 16px rgba(229, 9, 20, 0.4)' }}>🔒</div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, letterSpacing: '0.02em', color: '#ffffff' }}>TRUSTVAULT</h1>
          <p className="text-muted" style={{ fontSize: '0.875rem', marginTop: '0.25rem' }}>Secure Document Management</p>
        </div>

        {error && <div className="error-box">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Email Address</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="name@example.com" required autoFocus />
          </div>
          <div className="form-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label className="form-label" style={{ marginBottom: 0 }}>Password</label>
              <Link to="/forgot-password" style={{ fontSize: '0.8rem', color: '#b3b3b3' }}>Forgot password?</Link>
            </div>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required style={{ marginTop: '0.4rem' }} />
          </div>
          <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: '100%', marginTop: '0.75rem', justifyContent: 'center', padding: '0.75rem' }}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
          New to TrustVault? <Link to="/register" style={{ color: '#ffffff', fontWeight: 600 }}>Sign up now</Link>
        </p>
      </div>
    </div>
  )
}
