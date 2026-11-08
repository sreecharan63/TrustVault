import React, { useState, useEffect } from 'react'
import { shareDocument, getDocumentPermissions } from '../api/documents.js'
import { getShareableUsers } from '../api/auth.js'
import { useAuth } from '../contexts/AuthContext.jsx'
import FileIcon from './FileIcon.jsx'
import {
  Share2,
  X,
  Check,
  Eye,
  Edit3,
  Download,
  AlertTriangle,
  Info,
  RefreshCw
} from 'lucide-react'

export default function ShareModal({ doc, onClose, onSuccess }) {
  const { user: currentUser } = useAuth()
  const [users, setUsers] = useState([])
  const [existingShares, setExistingShares] = useState([])
  const [recipientEmail, setRecipientEmail] = useState('')
  const [canRead, setCanRead] = useState(true)
  const [canEdit, setCanEdit] = useState(false)
  const [canDownload, setCanDownload] = useState(false)
  const [loading, setLoading] = useState(false)
  const [fetchingUsers, setFetchingUsers] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let isMounted = true
    const loadData = async () => {
      try {
        const [usersRes, permsRes] = await Promise.allSettled([
          getShareableUsers(),
          getDocumentPermissions(doc.id)
        ])

        if (isMounted) {
          if (usersRes.status === 'fulfilled' && Array.isArray(usersRes.value.data)) {
            setUsers(usersRes.value.data)
          }
          if (permsRes.status === 'fulfilled' && Array.isArray(permsRes.value.data)) {
            setExistingShares(permsRes.value.data)
          }
        }
      } catch (err) {
        console.error('Failed to load share candidates:', err)
      } finally {
        if (isMounted) setFetchingUsers(false)
      }
    }
    loadData()
    return () => { isMounted = false }
  }, [doc.id])

  const existingShareEmails = new Set(
    existingShares.map(s => s.recipientEmail?.toLowerCase())
  )

  const isSelf = currentUser?.email && recipientEmail.trim().toLowerCase() === currentUser.email.toLowerCase()
  const isAlreadyShared = existingShareEmails.has(recipientEmail.trim().toLowerCase())

  const handleSubmit = async (e) => {
    e.preventDefault()
    const trimmedEmail = recipientEmail.trim()
    if (!trimmedEmail) {
      setError('Recipient email is required.')
      return
    }
    if (isSelf) {
      setError('You cannot share a document with yourself.')
      return
    }
    if (isAlreadyShared) {
      setError('Document is already shared with this user. Use the "Perms" button to update permissions.')
      return
    }
    if (!canRead && !canEdit && !canDownload) {
      setError('At least one permission (Read, Edit, or Download) must be selected.')
      return
    }

    setLoading(true)
    setError('')
    try {
      await shareDocument(doc.id, {
        recipientEmail: trimmedEmail,
        canRead,
        canEdit,
        canDownload
      })
      onSuccess()
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data?.error || 'Share failed.'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  const handleUserSelect = (email) => {
    setRecipientEmail(email)
    setError('')
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-title" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem' }}>
            <Share2 size={18} strokeWidth={2} color="var(--accent)" /> Share Document
          </span>
          <button className="btn btn-ghost btn-sm" onClick={onClose} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, padding: 0 }}>
            <X size={16} strokeWidth={2} />
          </button>
        </div>
        <p className="text-muted mb-2" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
          <FileIcon contentType={doc.contentType} filename={doc.originalFilename} size={15} />
          <span>Sharing: <strong>{doc.originalFilename}</strong></span>
        </p>

        {error && <div className="error-box">{error}</div>}

        <form onSubmit={handleSubmit}>
          {/* Dropdown with existing users */}
          <div className="form-group">
            <label className="form-label">
              Select Existing User {fetchingUsers && <span className="text-muted">(loading...)</span>}
            </label>
            <select
              value={users.some(u => u.email.toLowerCase() === recipientEmail.toLowerCase()) ? recipientEmail : ''}
              onChange={e => handleUserSelect(e.target.value)}
              disabled={fetchingUsers}
            >
              <option value="">-- Choose from existing users --</option>
              {users.map(u => {
                const alreadyShared = existingShareEmails.has(u.email.toLowerCase())
                return (
                  <option key={u.id} value={u.email} disabled={alreadyShared}>
                    {u.fullName} ({u.email}){alreadyShared ? ' — Already shared' : ''}
                  </option>
                )
              })}
            </select>
          </div>

          {/* Autocomplete email input with datalist */}
          <div className="form-group">
            <label className="form-label">Recipient Email *</label>
            <input
              type="email"
              list="user-suggestions"
              value={recipientEmail}
              onChange={e => { setRecipientEmail(e.target.value); setError('') }}
              placeholder="Or type an email address..."
              required
            />
            <datalist id="user-suggestions">
              {users.map(u => (
                <option key={u.id} value={u.email}>
                  {u.fullName} ({u.role})
                </option>
              ))}
            </datalist>
            {isSelf && (
              <small style={{ color: 'var(--danger)', display: 'inline-flex', alignItems: 'center', gap: '0.3rem', marginTop: '0.3rem' }}>
                <AlertTriangle size={12} strokeWidth={2} /> You cannot share a document with yourself.
              </small>
            )}
            {isAlreadyShared && (
              <small style={{ color: 'var(--warning)', display: 'inline-flex', alignItems: 'center', gap: '0.3rem', marginTop: '0.3rem' }}>
                <Info size={12} strokeWidth={2} /> Already shared with this user. Manage their access via the "Perms" button on the card.
              </small>
            )}
          </div>

          <div className="form-group">
            <label className="form-label">Permission Access Levels (Click buttons to toggle)</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.65rem', marginTop: '0.5rem' }}>
              
              {/* Can Read Button Card */}
              <button
                type="button"
                onClick={() => {
                  const next = !canRead
                  setCanRead(next)
                  if (next) setCanDownload(true)
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.6rem',
                  padding: '0.65rem 0.85rem',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  textAlign: 'left',
                  border: canRead ? '1.5px solid #10b981' : '1px solid var(--border)',
                  background: canRead ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                  color: canRead ? '#34d399' : 'var(--text-muted)',
                  transition: 'all 0.2s ease'
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 22, height: 22 }}>
                  {canRead ? (
                    <Check size={18} strokeWidth={2.5} color="#34d399" />
                  ) : (
                    <div style={{ width: 14, height: 14, borderRadius: '50%', border: '1.5px solid #555' }} />
                  )}
                </span>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <Eye size={13} strokeWidth={2} /> Can Read
                  </div>
                  <div style={{ fontSize: '0.72rem', opacity: 0.85 }}>Includes file download</div>
                </div>
              </button>

              {/* Can Edit Button Card */}
              <button
                type="button"
                onClick={() => setCanEdit(prev => !prev)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.6rem',
                  padding: '0.65rem 0.85rem',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  textAlign: 'left',
                  border: canEdit ? '1.5px solid #f59e0b' : '1px solid var(--border)',
                  background: canEdit ? 'rgba(245, 158, 11, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                  color: canEdit ? '#fbbf24' : 'var(--text-muted)',
                  transition: 'all 0.2s ease'
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 22, height: 22 }}>
                  {canEdit ? (
                    <Check size={18} strokeWidth={2.5} color="#fbbf24" />
                  ) : (
                    <div style={{ width: 14, height: 14, borderRadius: '50%', border: '1.5px solid #555' }} />
                  )}
                </span>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <Edit3 size={13} strokeWidth={2} /> Can Edit
                  </div>
                  <div style={{ fontSize: '0.72rem', opacity: 0.85 }}>Modify & new versions</div>
                </div>
              </button>

              {/* Can Download Button Card */}
              <button
                type="button"
                disabled={canRead}
                onClick={() => setCanDownload(prev => !prev)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.6rem',
                  padding: '0.65rem 0.85rem',
                  borderRadius: '8px',
                  cursor: canRead ? 'default' : 'pointer',
                  textAlign: 'left',
                  border: (canDownload || canRead) ? '1.5px solid #3b82f6' : '1px solid var(--border)',
                  background: (canDownload || canRead) ? 'rgba(59, 130, 246, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                  color: (canDownload || canRead) ? '#60a5fa' : 'var(--text-muted)',
                  opacity: canRead ? 0.9 : 1,
                  transition: 'all 0.2s ease'
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 22, height: 22 }}>
                  {(canDownload || canRead) ? (
                    <Check size={18} strokeWidth={2.5} color="#60a5fa" />
                  ) : (
                    <div style={{ width: 14, height: 14, borderRadius: '50%', border: '1.5px solid #555' }} />
                  )}
                </span>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <Download size={13} strokeWidth={2} /> Can Download
                  </div>
                  <div style={{ fontSize: '0.72rem', opacity: 0.85 }}>{canRead ? 'Active via Read grant' : 'Download file directly'}</div>
                </div>
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1.25rem' }}>
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading || isSelf || isAlreadyShared}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
            >
              {loading ? (
                <>
                  <RefreshCw size={13} className="spin" /> Sharing...
                </>
              ) : (
                <>
                  <Share2 size={14} strokeWidth={2} /> Share Document
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
