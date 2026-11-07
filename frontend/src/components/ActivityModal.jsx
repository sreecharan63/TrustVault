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

  const eventColor = (type) => {
    if (type?.includes('DENIED') || type?.includes('DELETE')) return 'badge-danger'
    if (type?.includes('GRANT') || type?.includes('UPLOAD')) return 'badge-success'
    if (type?.includes('REVOKE') || type?.includes('EDIT')) return 'badge-warning'
    return 'badge-neutral'
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 640 }}>
        <div className="modal-title">
          📊 Document Activity
          <button className="btn btn-ghost btn-sm" onClick={onClose}>✕</button>
        </div>
        <p className="text-muted mb-2">{doc.originalFilename}</p>
        {error && <div className="error-box">{error}</div>}
        {loading ? <div className="spinner" /> : logs.length === 0 ? (
          <div className="empty-state">No activity recorded</div>
        ) : (
          <div style={{ maxHeight: 420, overflowY: 'auto' }}>
            <table>
              <thead>
                <tr>
                  <th>Event</th>
                  <th>Actor</th>
                  <th>Outcome</th>
                  <th>Time</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log, i) => (
                  <tr key={log.id || i}>
                    <td><span className={`badge ${eventColor(log.eventType)}`}>{log.eventType}</span></td>
                    <td>{log.actorEmail || '-'}</td>
                    <td><span className={`badge ${log.outcome === 'SUCCESS' ? 'badge-success' : 'badge-danger'}`}>{log.outcome}</span></td>
                    <td>{fmtDate(log.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
