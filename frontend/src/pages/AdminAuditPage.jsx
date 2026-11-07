import React, { useState, useEffect } from 'react'
import { getAuditLogs } from '../api/admin.js'
import PermissionsModal from '../components/PermissionsModal.jsx'

export default function AdminAuditPage() {
  const [logs, setLogs] = useState([])
  const [totalPages, setTotalPages] = useState(0)
  const [page, setPage] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedDocForPerms, setSelectedDocForPerms] = useState(null)

  // Filters
  const [actorEmail, setActorEmail] = useState('')
  const [eventType, setEventType] = useState('')
  const [outcome, setOutcome] = useState('')
  const [resourceId, setResourceId] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  const eventTypes = [
    'DOCUMENT_UPLOAD', 'DOCUMENT_DOWNLOAD', 'DOCUMENT_EDIT', 'DOCUMENT_DELETE',
    'DOCUMENT_PREVIEW', 'DOCUMENT_VERSION_RESTORE',
    'PERMISSION_GRANT', 'PERMISSION_REVOKE', 'PERMISSION_UPDATE'
  ]

  const fetchLogs = async () => {
    setLoading(true); setError('')
    try {
      const params = { page, size: 20 }
      if (actorEmail) params.actorEmail = actorEmail
      if (eventType) params.eventType = eventType
      if (outcome) params.outcome = outcome
      if (resourceId) params.resourceId = resourceId
      if (startDate) params.startDate = startDate
      if (endDate) params.endDate = endDate
      const res = await getAuditLogs(params)
      const data = res.data
      if (data.content) {
        setLogs(data.content)
        setTotalPages(data.totalPages || 0)
      } else if (Array.isArray(data)) {
        setLogs(data)
        setTotalPages(1)
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load audit logs.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchLogs() }, [page])

  const handleFilter = (e) => {
    e.preventDefault()
    setPage(0)
    fetchLogs()
  }

  const clearFilters = () => {
    setActorEmail(''); setEventType(''); setOutcome('')
    setResourceId(''); setStartDate(''); setEndDate('')
    setPage(0)
    setTimeout(fetchLogs, 0)
  }

  const fmtDate = (d) => d ? new Date(d).toLocaleString() : '-'

  const formatEventBadge = (type, outcome) => {
    const isSuccess = outcome === 'SUCCESS'
    const colorClass = isSuccess ? 'badge-success' : 'badge-danger'

    const labels = {
      'PERMISSION_GRANT': '🔑 Granted Permission',
      'PERMISSION_UPDATE': '✏️ Updated Permission',
      'PERMISSION_REVOKE': '🚫 Revoked Permission',
      'DOCUMENT_UPLOAD': '📤 Uploaded Document',
      'DOCUMENT_DOWNLOAD': '⬇️ Downloaded Document',
      'DOCUMENT_PREVIEW': '👁️ Previewed Document',
      'DOCUMENT_UPDATE': '📝 Updated Metadata',
      'DOCUMENT_DELETE': '🗑️ Soft-Deleted',
      'VERSION_CREATE': '📦 Created Version',
      'VERSION_RESTORE': '⏪ Restored Version'
    }

    return (
      <span className={`badge ${colorClass}`} style={{ fontWeight: 600 }}>
        {labels[type] || type}
      </span>
    )
  }

  const renderAccessBadges = (details) => {
    if (!details || typeof details !== 'object') return null
    const hasPerms = details.canRead !== undefined || details.canEdit !== undefined || details.canDownload !== undefined
    if (!hasPerms) return null

    return (
      <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap', marginTop: '0.2rem' }}>
        {details.canRead && (
          <span className="badge badge-success" style={{ fontSize: '0.7rem', padding: '0.1rem 0.4rem' }}>
            👁️ Read
          </span>
        )}
        {details.canEdit && (
          <span className="badge badge-warning" style={{ fontSize: '0.7rem', padding: '0.1rem 0.4rem' }}>
            ✏️ Edit
          </span>
        )}
        {details.canDownload && (
          <span className="badge" style={{ background: '#3b82f6', color: '#fff', fontSize: '0.7rem', padding: '0.1rem 0.4rem', borderRadius: 9999 }}>
            ⬇️ Download
          </span>
        )}
      </div>
    )
  }

  return (
    <div className="page">
      <div className="flex-between mb-2">
        <div>
          <h1 className="page-title" style={{ margin: 0 }}>🛡️ Global Audit Trail</h1>
          <p className="text-muted" style={{ marginTop: '0.25rem' }}>
            Cryptographically sealed, append-only record of all document accesses, permission grants, modifications, and security denials.
          </p>
        </div>
      </div>

      <div className="card mb-2">
        <form onSubmit={handleFilter}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '0.75rem' }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Actor Email</label>
              <input value={actorEmail} onChange={e => setActorEmail(e.target.value)} placeholder="user@..." />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Event Type</label>
              <select value={eventType} onChange={e => setEventType(e.target.value)}>
                <option value="">All Events</option>
                {eventTypes.map(et => <option key={et} value={et}>{et}</option>)}
              </select>
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Outcome</label>
              <select value={outcome} onChange={e => setOutcome(e.target.value)}>
                <option value="">All</option>
                <option value="SUCCESS">SUCCESS</option>
                <option value="DENIED">DENIED</option>
              </select>
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Resource ID</label>
              <input value={resourceId} onChange={e => setResourceId(e.target.value)} placeholder="UUID..." />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Start Date</label>
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">End Date</label>
              <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
            <button type="submit" className="btn btn-primary">🔍 Filter</button>
            <button type="button" className="btn btn-ghost" onClick={clearFilters}>Clear</button>
          </div>
        </form>
      </div>

      {error && <div className="error-box">{error}</div>}

      {loading ? <div className="spinner" /> : (
        <div className="card" style={{ overflowX: 'auto' }}>
          {logs.length === 0 ? (
            <div className="empty-state">No audit logs found.</div>
          ) : (
            <>
              <table>
                <thead>
                  <tr>
                    <th>Timestamp</th>
                    <th>Action</th>
                    <th>Document</th>
                    <th>From ➔ To</th>
                    <th>Access Details</th>
                    <th>Outcome</th>
                    <th>Admin Action</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log, i) => {
                    const d = log.details || {}
                    const isPermEvent = log.eventType?.startsWith('PERMISSION_')
                    const isDocEvent = log.resourceType === 'DOCUMENT' && log.resourceId
                    const fileName = d.filename || (log.resourceId ? `File: ${log.resourceId.substring(0, 8)}...` : null)
                    const recipient = d.recipientName || d.recipientEmail

                    return (
                      <tr key={log.id || i}>
                        {/* Timestamp */}
                        <td style={{ whiteSpace: 'nowrap', fontSize: '0.8rem' }}>
                          {fmtDate(log.createdAt)}
                        </td>

                        {/* Action Event Badge */}
                        <td>
                          {formatEventBadge(log.eventType, log.outcome)}
                        </td>

                        {/* Document Name */}
                        <td>
                          {fileName ? (
                            <div>
                              <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>📄 {fileName}</div>
                              {log.resourceId && (
                                <div className="text-muted" style={{ fontSize: '0.7rem' }}>
                                  ID: {log.resourceId.substring(0, 8)}...
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-muted">—</span>
                          )}
                        </td>

                        {/* From ➔ To */}
                        <td>
                          <div style={{ fontSize: '0.85rem' }}>
                            <strong>From:</strong> <span style={{ color: 'var(--text)' }}>{log.actorEmail || 'System'}</span>
                          </div>
                          {recipient && (
                            <div style={{ marginTop: '0.25rem', fontSize: '0.85rem', color: '#60a5fa' }}>
                              <strong>➔ To:</strong> {recipient}
                            </div>
                          )}
                        </td>

                        {/* Access Details */}
                        <td>
                          {renderAccessBadges(d)}
                          {d.versionNumber && (
                            <span className="badge badge-neutral" style={{ fontSize: '0.7rem' }}>
                              v{d.versionNumber}
                            </span>
                          )}
                          {d.fileSize && (
                            <span className="text-muted" style={{ fontSize: '0.75rem', display: 'block', marginTop: '0.2rem' }}>
                              {(d.fileSize / 1024).toFixed(1)} KB
                            </span>
                          )}
                          {d.reason && (
                            <span style={{ color: '#f87171', fontWeight: 600, fontSize: '0.75rem', display: 'block' }}>
                              ⚠️ Denied: {d.reason}
                            </span>
                          )}
                          {!d.canRead && !d.canEdit && !d.canDownload && !d.reason && !d.versionNumber && !d.fileSize && (
                            <span className="text-muted" style={{ fontSize: '0.75rem' }}>Completed</span>
                          )}
                        </td>

                        {/* Outcome */}
                        <td>
                          <span className={`badge ${log.outcome === 'SUCCESS' ? 'badge-success' : 'badge-danger'}`}>
                            {log.outcome}
                          </span>
                        </td>

                        {/* Admin Action: Change Permission Right There */}
                        <td>
                          {isDocEvent ? (
                            <button
                              type="button"
                              className="btn btn-sm btn-primary"
                              style={{
                                fontSize: '0.75rem',
                                padding: '0.25rem 0.6rem',
                                whiteSpace: 'nowrap',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.3rem'
                              }}
                              onClick={() => setSelectedDocForPerms({
                                id: log.resourceId,
                                originalFilename: d.filename
                              })}
                              title="Modify active permissions for this document directly"
                            >
                              🔐 Change Perms
                            </button>
                          ) : (
                            <span className="text-muted" style={{ fontSize: '0.75rem' }}>—</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>

              {totalPages > 1 && (
                <div className="pagination">
                  <button className="btn btn-ghost btn-sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>← Prev</button>
                  <span className="text-muted">Page {page + 1} of {totalPages}</span>
                  <button className="btn btn-ghost btn-sm" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>Next →</button>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Admin Inline Permissions Modal */}
      {selectedDocForPerms && (
        <PermissionsModal
          doc={selectedDocForPerms}
          onClose={() => setSelectedDocForPerms(null)}
          onRefresh={fetchLogs}
        />
      )}
    </div>
  )
}
