import React, { useState, useEffect } from 'react'
import { shareDocument, getDocumentPermissions } from '../api/documents.js'
import { getShareableUsers } from '../api/auth.js'
import { useAuth } from '../contexts/AuthContext.jsx'

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
        <div className="modal-title">
          🔗 Share Document
          <button className="btn btn-ghost btn-sm" onClick={onClose}>✕</button>
        </div>
        <p className="text-muted mb-2">Sharing: <strong>{doc.originalFilename}</strong></p>

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
              <small style={{ color: 'var(--danger)', display: 'block', marginTop: '0.3rem' }}>
                ⚠️ You cannot share a document with yourself.
              </small>
            )}
            {isAlreadyShared && (
              <small style={{ color: 'var(--warning)', display: 'block', marginTop: '0.3rem' }}>
                ℹ️ Already shared with this user. Manage their access via the "Perms" button on the card.
              </small>
            )}
          </div>

          <div className="form-group">
            <label className="form-label">Permissions</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginTop: '0.4rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={canRead}
                  onChange={e => {
                    const checked = e.target.checked
                    setCanRead(checked)
                    if (checked) setCanDownload(true)
                  }}
                />
                Can Read (includes Download access)
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={canEdit}
                  onChange={e => setCanEdit(e.target.checked)}
                />
                Can Edit (modify document)
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', cursor: canRead ? 'not-allowed' : 'pointer' }}>
                <input
                  type="checkbox"
                  checked={canDownload || canRead}
                  disabled={canRead}
                  onChange={e => setCanDownload(e.target.checked)}
                />
                Can Download {canRead && <span className="text-muted">(included with Read)</span>}
              </label>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1.25rem' }}>
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading || isSelf || isAlreadyShared}
            >
              {loading ? '⏳ Sharing...' : '🔗 Share'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
