import React, { useState } from 'react'
import { shareDocument } from '../api/documents.js'

export default function ShareModal({ doc, onClose, onSuccess }) {
  const [recipientEmail, setRecipientEmail] = useState('')
  const [canRead, setCanRead] = useState(true)
  const [canEdit, setCanEdit] = useState(false)
  const [canDownload, setCanDownload] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!recipientEmail) { setError('Email is required.'); return }
    setLoading(true); setError('')
    try {
      await shareDocument(doc.id, { recipientEmail, canRead, canEdit, canDownload })
      onSuccess()
    } catch (err) {
      setError(err.response?.data?.message || err.response?.data?.error || 'Share failed.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-title">
          🔗 Share Document
          <button className="btn btn-ghost btn-sm" onClick={onClose}>✕</button>
        </div>
        <p className="text-muted mb-2">Sharing: {doc.originalFilename}</p>
        {error && <div className="error-box">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Recipient Email *</label>
            <input type="email" value={recipientEmail} onChange={e => setRecipientEmail(e.target.value)} placeholder="user@example.com" required />
          </div>
          <div className="form-group">
            <label className="form-label">Permissions</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginTop: '0.4rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem' }}>
                <input type="checkbox" checked={canRead} onChange={e => setCanRead(e.target.checked)} />
                Can Read (view document metadata)
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem' }}>
                <input type="checkbox" checked={canEdit} onChange={e => setCanEdit(e.target.checked)} />
                Can Edit (modify document)
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem' }}>
                <input type="checkbox" checked={canDownload} onChange={e => setCanDownload(e.target.checked)} />
                Can Download (download file)
              </label>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1.25rem' }}>
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? '⏳ Sharing...' : '🔗 Share'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
