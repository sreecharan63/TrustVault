import React, { useState, useEffect } from 'react'
import { getDocumentPermissions, updateSharing, revokeSharing } from '../api/documents.js'

export default function PermissionsModal({ doc, onClose, onRefresh }) {
  const [permissions, setPermissions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [actionLoading, setActionLoading] = useState(null)

  const fetchPermissions = async () => {
    setLoading(true)
    try {
      const res = await getDocumentPermissions(doc.id)
      setPermissions(Array.isArray(res.data) ? res.data : [])
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load permissions.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchPermissions() }, [])

  const handleRevoke = async (email) => {
    if (!confirm(`Revoke access for ${email}?`)) return
    setActionLoading(email)
    try {
      await revokeSharing(doc.id, email)
      await fetchPermissions()
      if (onRefresh) onRefresh()
    } catch (err) {
      setError(err.response?.data?.message || 'Revoke failed.')
    } finally {
      setActionLoading(null)
    }
  }

  const handleToggle = async (perm, field) => {
    setActionLoading(perm.recipientEmail + field)
    const newCanRead = field === 'canRead' ? !perm.canRead : perm.canRead
    let newCanDownload = field === 'canDownload' ? !perm.canDownload : perm.canDownload
    if (newCanRead) {
      newCanDownload = true
    }

    try {
      await updateSharing(doc.id, {
        recipientEmail: perm.recipientEmail,
        canRead: newCanRead,
        canEdit: field === 'canEdit' ? !perm.canEdit : perm.canEdit,
        canDownload: newCanDownload
      })
      await fetchPermissions()
      if (onRefresh) onRefresh()
    } catch (err) {
      setError(err.response?.data?.message || 'Update failed.')
    } finally {
      setActionLoading(null)
    }
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 640 }}>
        <div className="modal-title">
          🔐 Permissions
          <button className="btn btn-ghost btn-sm" onClick={onClose}>✕</button>
        </div>
        <p className="text-muted mb-2">
          {doc.originalFilename ? <span>📄 <strong>{doc.originalFilename}</strong></span> : <span>Document ID: <code>{doc.id}</code></span>}
        </p>
        {error && <div className="error-box">{error}</div>}
        {loading ? <div className="spinner" /> : permissions.length === 0 ? (
          <div className="empty-state">No active permissions for this document.</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Granted To</th>
                <th style={{textAlign:'center'}}>Read Access</th>
                <th style={{textAlign:'center'}}>Edit Access</th>
                <th style={{textAlign:'center'}}>Download Access</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {permissions.map(p => (
                <tr key={p.recipientEmail}>
                  <td>
                    <div style={{ fontWeight: 600 }}>{p.recipientName || p.recipientEmail}</div>
                    <div className="text-muted" style={{ fontSize: '0.75rem' }}>{p.recipientEmail}</div>
                  </td>
                  <td style={{textAlign:'center'}}>
                    <button
                      type="button"
                      onClick={() => handleToggle(p, 'canRead')}
                      disabled={!!actionLoading}
                      style={{
                        background: p.canRead ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                        color: p.canRead ? '#34d399' : 'var(--text-muted)',
                        border: p.canRead ? '1px solid #10b981' : '1px solid var(--border)',
                        borderRadius: '6px',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        padding: '0.3rem 0.65rem',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                      title="Click button to toggle Read permission"
                    >
                      {p.canRead ? '👁️ Read: ON' : '✕ OFF'}
                    </button>
                  </td>
                  <td style={{textAlign:'center'}}>
                    <button
                      type="button"
                      onClick={() => handleToggle(p, 'canEdit')}
                      disabled={!!actionLoading}
                      style={{
                        background: p.canEdit ? 'rgba(245, 158, 11, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                        color: p.canEdit ? '#fbbf24' : 'var(--text-muted)',
                        border: p.canEdit ? '1px solid #f59e0b' : '1px solid var(--border)',
                        borderRadius: '6px',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        padding: '0.3rem 0.65rem',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                      title="Click button to toggle Edit permission"
                    >
                      {p.canEdit ? '✏️ Edit: ON' : '✕ OFF'}
                    </button>
                  </td>
                  <td style={{textAlign:'center'}}>
                    <button
                      type="button"
                      onClick={() => handleToggle(p, 'canDownload')}
                      disabled={!!actionLoading}
                      style={{
                        background: p.canDownload ? 'rgba(59, 130, 246, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                        color: p.canDownload ? '#60a5fa' : 'var(--text-muted)',
                        border: p.canDownload ? '1px solid #3b82f6' : '1px solid var(--border)',
                        borderRadius: '6px',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        padding: '0.3rem 0.65rem',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                      title="Click button to toggle Download permission"
                    >
                      {p.canDownload ? '⬇️ Download: ON' : '✕ OFF'}
                    </button>
                  </td>
                  <td>
                    <button
                      className="btn btn-danger btn-sm"
                      onClick={() => handleRevoke(p.recipientEmail)}
                      disabled={actionLoading === p.recipientEmail}
                    >
                      🚫 Revoke
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
