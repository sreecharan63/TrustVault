import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff } from 'lucide-react'
import { forgotPassword, resetPassword } from '../api/auth.js'

export default function ForgotPasswordPage() {
  const [step, setStep] = useState(1) // 1: Request, 2: Reset
  const [email, setEmail] = useState('')
  const [token, setToken] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const navigate = useNavigate()

  const handleRequestToken = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')
    try {
      const res = await forgotPassword(email)
      const data = res.data
      setSuccess(data.message || 'Reset token generated successfully.')
      if (data.resetToken) {
        setToken(data.resetToken)
      }
      setStep(2)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to process request.')
    } finally {
      setLoading(false)
    }
  }

  const handleResetPassword = async (e) => {
    e.preventDefault()
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }
    if (newPassword.length < 12) {
      setError('Password must contain at least 12 characters.')
      return
    }

    setLoading(true)
    setError('')
    setSuccess('')
    try {
      const res = await resetPassword(token, newPassword)
      setSuccess(res.data?.message || 'Password reset successfully!')
      setStep(3) // 3: Done
    } catch (err) {
      const msg = err.response?.data?.message ||
                  err.response?.data?.errors?.[0]?.defaultMessage ||
                  err.response?.data?.error ||
                  'Failed to reset password.'
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
          <div style={{ fontSize: '2.5rem', marginBottom: '0.4rem', textShadow: '0 0 16px rgba(229, 9, 20, 0.4)' }}>🔑</div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, letterSpacing: '0.02em', color: '#ffffff' }}>Reset Password</h1>
          <p className="text-muted" style={{ fontSize: '0.875rem', marginTop: '0.25rem' }}>Recover access to your TrustVault account</p>
        </div>

        {error && <div className="error-box" style={{ marginBottom: '1rem' }}>{error}</div>}
        {success && <div style={{ background: 'rgba(70, 211, 105, 0.15)', color: 'var(--success)', padding: '0.75rem', borderRadius: 'var(--radius)', border: '1px solid rgba(70, 211, 105, 0.35)', marginBottom: '1rem', fontSize: '0.9rem' }}>{success}</div>}

        {step === 1 && (
          <form onSubmit={handleRequestToken}>
            <p className="text-muted" style={{ fontSize: '0.875rem', marginBottom: '1rem' }}>
              Enter your registered email address. We will generate a secure one-time password reset token valid for 15 minutes.
            </p>
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                autoFocus
              />
            </div>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
              style={{ width: '100%', marginTop: '0.75rem', justifyContent: 'center', padding: '0.75rem' }}
            >
              {loading ? 'Generating...' : 'Request Reset Token'}
            </button>
            <p style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.875rem' }}>
              Remember your password? <Link to="/login" style={{ color: '#ffffff', fontWeight: 600 }}>Sign in</Link>
            </p>
          </form>
        )}

        {step === 2 && (
          <form onSubmit={handleResetPassword}>
            <div className="form-group">
              <label className="form-label">Reset Token</label>
              <input
                type="text"
                value={token}
                onChange={e => setToken(e.target.value)}
                placeholder="Paste reset token here"
                required
                style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}
              />
            </div>
            <div className="form-group">
              <label className="form-label">New Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="Min 12 characters"
                  required
                  autoFocus
                  style={{ paddingRight: '2.5rem' }}
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(prev => !prev)}
                  title={showNewPassword ? 'Hide password' : 'Show password'}
                  aria-label={showNewPassword ? 'Hide password' : 'Show password'}
                  style={{
                    position: 'absolute',
                    right: '0.75rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'transparent',
                    border: 'none',
                    color: showNewPassword ? 'var(--accent)' : 'var(--text-muted)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: 0,
                    cursor: 'pointer'
                  }}
                >
                  {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Confirm New Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter new password"
                  required
                  style={{ paddingRight: '2.5rem' }}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(prev => !prev)}
                  title={showConfirmPassword ? 'Hide password' : 'Show password'}
                  aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                  style={{
                    position: 'absolute',
                    right: '0.75rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'transparent',
                    border: 'none',
                    color: showConfirmPassword ? 'var(--accent)' : 'var(--text-muted)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: 0,
                    cursor: 'pointer'
                  }}
                >
                  {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
              style={{ width: '100%', marginTop: '0.75rem', justifyContent: 'center', padding: '0.75rem' }}
            >
              {loading ? 'Updating...' : 'Reset Password'}
            </button>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1.5rem', fontSize: '0.875rem' }}>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setStep(1)}>← Back</button>
              <Link to="/login" style={{ alignSelf: 'center', color: '#b3b3b3' }}>Cancel</Link>
            </div>
          </form>
        )}

        {step === 3 && (
          <div style={{ textAlign: 'center', padding: '1rem 0' }}>
            <p style={{ color: 'var(--text)', marginBottom: '1.5rem', fontSize: '0.95rem' }}>
              Your password has been securely updated in the database and recorded in the audit trail.
            </p>
            <button
              className="btn btn-primary"
              onClick={() => navigate('/login')}
              style={{ width: '100%', justifyContent: 'center', padding: '0.75rem' }}
            >
              Go to Sign In
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
