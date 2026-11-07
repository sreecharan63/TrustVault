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
    try {
      await updateSharing(doc.id, {
        recipientEmail: perm.recipientEmail,
        canRead: field === 'canRead' ? !perm.canRead : perm.canRead,
        canEdit: field === 'canEdit' ? !perm.canEdit : perm.canEdit,
        canDownload: field === 'canDownload' ? !perm.canDownload : perm.canDownload
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
        <p className="text-muted mb-2">{doc.originalFilename}</p>
        {error && <div className="error-box">{error}</div>}
        {loading ? <div className="spinner" /> : permissions.length === 0 ? (
          <div className="empty-state">No active permissions</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>User</th>
                <th style={{textAlign:'center'}}>Read</th>
                <th style={{textAlign:'center'}}>Edit</th>
                <th style={{textAlign:'center'}}>Download</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {permissions.map(p => (
                <tr key={p.recipientEmail}>
                  <td>{p.recipientEmail}</td>
                  <td style={{textAlign:'center'}}>
                    <input type="checkbox" checked={p.canRead} onChange={() => handleToggle(p, 'canRead')} disabled={!!actionLoading} />
                  </td>
                  <td style={{textAlign:'center'}}>
                    <input type="checkbox" checked={p.canEdit} onChange={() => handleToggle(p, 'canEdit')} disabled={!!actionLoading} />
                  </td>
                  <td style={{textAlign:'center'}}>
                    <input type="checkbox" checked={p.canDownload} onChange={() => handleToggle(p, 'canDownload')} disabled={!!actionLoading} />
                  </td>
                  <td>
                    <button className="btn btn-danger btn-sm" onClick={() => handleRevoke(p.recipientEmail)} disabled={actionLoading === p.recipientEmail}>
                      Revoke
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
