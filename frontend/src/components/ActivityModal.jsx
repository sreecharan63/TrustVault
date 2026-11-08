import React, { useState, useEffect } from 'react'
import { getDocumentActivity } from '../api/documents.js'
import FileIcon from './FileIcon.jsx'
import {
  Activity,
  X,
  Key,
  Edit3,
  Lock,
  Upload,
  Download,
  Eye,
  Trash2,
  History,
  RotateCcw,
  AlertTriangle,
  ArrowRight
} from 'lucide-react'

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

  const renderEventLabel = (type) => {
    switch (type) {
      case 'PERMISSION_GRANT':
        return <><Key size={12} strokeWidth={2} /> Granted Permission</>
      case 'PERMISSION_UPDATE':
        return <><Edit3 size={12} strokeWidth={2} /> Updated Permission</>
      case 'PERMISSION_REVOKE':
        return <><Lock size={12} strokeWidth={2} /> Revoked Permission</>
      case 'DOCUMENT_UPLOAD':
        return <><Upload size={12} strokeWidth={2} /> Uploaded File</>
      case 'DOCUMENT_DOWNLOAD':
        return <><Download size={12} strokeWidth={2} /> Downloaded File</>
      case 'DOCUMENT_PREVIEW':
        return <><Eye size={12} strokeWidth={2} /> Previewed File</>
      case 'DOCUMENT_UPDATE':
        return <><Edit3 size={12} strokeWidth={2} /> Updated Metadata</>
      case 'DOCUMENT_DELETE':
        return <><Trash2 size={12} strokeWidth={2} /> Soft-Deleted</>
      case 'VERSION_CREATE':
        return <><History size={12} strokeWidth={2} /> New Version Created</>
      case 'VERSION_RESTORE':
        return <><RotateCcw size={12} strokeWidth={2} /> Version Restored</>
      default:
        return type
    }
  }

  const eventColor = (type, outcome) => {
    if (outcome === 'DENIED' || type?.includes('DELETE') || type?.includes('REVOKE')) return 'badge-danger'
    if (type?.includes('GRANT') || type?.includes('UPLOAD') || outcome === 'SUCCESS') return 'badge-success'
    return 'badge-neutral'
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 720 }}>
        <div className="modal-title" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
            <Activity size={18} strokeWidth={2} color="var(--accent)" /> Document Activity History
          </span>
          <button className="btn btn-ghost btn-sm" onClick={onClose} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, padding: 0 }}>
            <X size={16} strokeWidth={2} />
          </button>
        </div>
        <p className="text-muted mb-2" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem' }}>
          <FileIcon contentType={doc.contentType} filename={doc.originalFilename} size={15} />
          <strong>{doc.originalFilename}</strong>
        </p>
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
                        <span
                          className={`badge ${eventColor(log.eventType, log.outcome)}`}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                        >
                          {renderEventLabel(log.eventType)}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.8rem' }}>
                        <div><strong>By:</strong> {log.actorEmail || 'System'}</div>
                        {recipient && (
                          <div style={{ color: '#60a5fa', marginTop: '0.2rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                            <ArrowRight size={11} strokeWidth={2.5} /> <strong>To:</strong> {recipient}
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
                        {d.reason && (
                          <div style={{ color: '#f87171', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                            <AlertTriangle size={12} strokeWidth={2} /> {d.reason}
                          </div>
                        )}
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
        <div className="modal-actions" style={{ marginTop: '1.25rem' }}>
          <button className="btn btn-ghost" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  )
}
