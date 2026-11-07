import React, { useState, useEffect } from 'react'
import { getDocumentActivity } from '../api/documents.js'

export default function ActivityModal({ doc, onClose }) {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    (async () => {
      try {
        const res = await getDocumentActivity(doc.id)
        setLogs(Array.isArray(res.data) ? res.data : [])
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load activity.')
      } finally {
        setLoading(false)
      }
    })()
  }, [doc.id])

  const fmtDate = (d) => d ? new Date(d).toLocaleString() : '-'

  const eventLabel = (type) => {
    const labels = {
      'PERMISSION_GRANT': '🔑 Granted Permission',
      'PERMISSION_UPDATE': '✏️ Updated Permission',
      'PERMISSION_REVOKE': '🚫 Revoked Permission',
      'DOCUMENT_UPLOAD': '📤 Uploaded File',
      'DOCUMENT_DOWNLOAD': '⬇️ Downloaded File',
      'DOCUMENT_PREVIEW': '👁️ Previewed File',
      'DOCUMENT_UPDATE': '📝 Updated Metadata',
      'DOCUMENT_DELETE': '🗑️ Soft-Deleted',
      'VERSION_CREATE': '📦 New Version Created',
      'VERSION_RESTORE': '⏪ Version Restored'
    }
    return labels[type] || type
  }

  const eventColor = (type, outcome) => {
    if (outcome === 'DENIED' || type?.includes('DELETE') || type?.includes('REVOKE')) return 'badge-danger'
    if (type?.includes('GRANT') || type?.includes('UPLOAD') || outcome === 'SUCCESS') return 'badge-success'
    return 'badge-neutral'
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 720 }}>
        <div className="modal-title">
          📊 Document Activity History
          <button className="btn btn-ghost btn-sm" onClick={onClose}>✕</button>
        </div>
        <p className="text-muted mb-2">📄 <strong>{doc.originalFilename}</strong></p>
        {error && <div className="error-box">{error}</div>}
        {loading ? <div className="spinner" /> : logs.length === 0 ? (
          <div className="empty-state">No activity recorded for this document</div>
        ) : (
          <div style={{ maxHeight: 440, overflowY: 'auto' }}>
            <table>
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Action</th>
                  <th>Actor / Recipient</th>
                  <th>Details</th>
                  <th>Outcome</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log, i) => {
                  const d = log.details || {}
                  const recipient = d.recipientName || d.recipientEmail

                  return (
                    <tr key={log.id || i}>
                      <td style={{ fontSize: '0.78rem', whiteSpace: 'nowrap' }}>{fmtDate(log.createdAt)}</td>
                      <td>
                        <span className={`badge ${eventColor(log.eventType, log.outcome)}`}>
                          {eventLabel(log.eventType)}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.8rem' }}>
                        <div><strong>By:</strong> {log.actorEmail || 'System'}</div>
                        {recipient && (
                          <div style={{ color: '#60a5fa', marginTop: '0.2rem' }}>
                            <strong>➔ To:</strong> {recipient}
                          </div>
                        )}
                      </td>
                      <td style={{ fontSize: '0.75rem' }}>
                        {(d.canRead || d.canEdit || d.canDownload) && (
                          <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap' }}>
                            {d.canRead && <span className="badge badge-success" style={{ fontSize: '0.65rem' }}>Read</span>}
                            {d.canEdit && <span className="badge badge-warning" style={{ fontSize: '0.65rem' }}>Edit</span>}
                            {d.canDownload && <span className="badge" style={{ background: '#3b82f6', color: '#fff', fontSize: '0.65rem', padding: '0.1rem 0.35rem', borderRadius: 9999 }}>Download</span>}
                          </div>
                        )}
                        {d.versionNumber && <div style={{ color: '#93c5fd', fontWeight: 600 }}>v{d.versionNumber}</div>}
                        {d.reason && <div style={{ color: '#f87171', fontWeight: 600 }}>⚠️ {d.reason}</div>}
                        {!d.canRead && !d.canEdit && !d.canDownload && !d.versionNumber && !d.reason && <span className="text-muted">—</span>}
                      </td>
                      <td>
                        <span className={`badge ${log.outcome === 'SUCCESS' ? 'badge-success' : 'badge-danger'}`}>
                          {log.outcome}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
