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
  const [downloading, setDownloading] = useState(false)

  // Filters
  const [actorEmail, setActorEmail] = useState('')
  const [eventType, setEventType] = useState('')
  const [outcome, setOutcome] = useState('')
  const [resourceId, setResourceId] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  // New Audits Tracking
  const getAuditLastSeen = () => {
    const val = localStorage.getItem('tv_last_seen_audit')
    if (!val) {
      // Default to 1 hour ago on first load so recent events are highlighted
      const defaultTime = new Date(Date.now() - 60 * 60 * 1000).toISOString()
      localStorage.setItem('tv_last_seen_audit', defaultTime)
      return new Date(defaultTime).getTime()
    }
    return new Date(val).getTime()
  }

  const [lastSeenTime, setLastSeenTime] = useState(getAuditLastSeen)

  const isNewAudit = (log) => {
    if (!log.createdAt) return false
    return new Date(log.createdAt).getTime() > lastSeenTime
  }

  const markAuditsAsViewed = () => {
    const now = new Date().toISOString()
    localStorage.setItem('tv_last_seen_audit', now)
    setLastSeenTime(new Date(now).getTime())
  }

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
          <span className="badge" style={{ background: 'rgba(255, 255, 255, 0.12)', color: '#fff', fontSize: '0.7rem', padding: '0.1rem 0.4rem', borderRadius: 'var(--radius)', border: '1px solid rgba(255, 255, 255, 0.25)' }}>
            ⬇️ Download
          </span>
        )}
      </div>
    )
  }

  // Audit Log Export Functions (CSV & JSON)
  const handleExportCSV = async () => {
    setDownloading(true)
    try {
      const params = { page: 0, size: 100 }
      if (actorEmail) params.actorEmail = actorEmail
      if (eventType) params.eventType = eventType
      if (outcome) params.outcome = outcome
      if (resourceId) params.resourceId = resourceId
      if (startDate) params.startDate = startDate
      if (endDate) params.endDate = endDate

      const res = await getAuditLogs(params)
      const dataToExport = res.data?.content || logs

      const headers = ['Timestamp', 'Event Type', 'Outcome', 'Actor Email', 'Document Name', 'Recipient', 'Resource Type', 'Resource ID', 'Access Details', 'IP Address']
      
      const rows = dataToExport.map(log => {
        const d = log.details || {}
        const fileName = d.filename || (log.resourceId ? `ID:${log.resourceId}` : '')
        const recipient = d.recipientName || d.recipientEmail || ''
        const access = [
          d.canRead ? 'Read' : '',
          d.canEdit ? 'Edit' : '',
          d.canDownload ? 'Download' : '',
          d.versionNumber ? `v${d.versionNumber}` : '',
          d.reason ? `Denied: ${d.reason}` : ''
        ].filter(Boolean).join('; ')

        return [
          log.createdAt || '',
          log.eventType || '',
          log.outcome || '',
          log.actorEmail || 'System',
          fileName,
          recipient,
          log.resourceType || '',
          log.resourceId || '',
          access,
          log.ipAddress || ''
        ].map(val => `"${String(val).replace(/"/g, '""')}"`).join(',')
      })

      const csvContent = [headers.join(','), ...rows].join('\n')
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `trustvault-audit-trail-${new Date().toISOString().slice(0, 10)}.csv`
      link.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      alert('Failed to export CSV: ' + (err.message || 'Unknown error'))
    } finally {
      setDownloading(false)
    }
  }

  const handleExportJSON = async () => {
    setDownloading(true)
    try {
      const params = { page: 0, size: 100 }
      if (actorEmail) params.actorEmail = actorEmail
      if (eventType) params.eventType = eventType
      if (outcome) params.outcome = outcome
      if (resourceId) params.resourceId = resourceId
      if (startDate) params.startDate = startDate
      if (endDate) params.endDate = endDate

      const res = await getAuditLogs(params)
      const dataToExport = res.data?.content || logs

      const jsonStr = JSON.stringify(dataToExport, null, 2)
      const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `trustvault-audit-trail-${new Date().toISOString().slice(0, 10)}.json`
      link.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      alert('Failed to export JSON: ' + (err.message || 'Unknown error'))
    } finally {
      setDownloading(false)
    }
  }

  const newCount = logs.filter(isNewAudit).length

  return (
    <div className="page">
      <div className="flex-between mb-2" style={{ flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="page-title" style={{ margin: 0 }}>🛡️ Global Audit Trail</h1>
          <p className="text-muted" style={{ marginTop: '0.25rem' }}>
            Cryptographically sealed, append-only record of all document accesses, permission grants, modifications, and security denials.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <button
            className="btn btn-ghost btn-sm"
            onClick={handleExportJSON}
            disabled={downloading}
            title="Download current filtered logs as JSON"
          >
            📥 Export JSON
          </button>
          <button
            className="btn btn-primary btn-sm"
            onClick={handleExportCSV}
            disabled={downloading}
            title="Download current filtered logs as CSV"
          >
            {downloading ? '⏳ Exporting...' : '📥 Download Audit CSV'}
          </button>
        </div>
      </div>

      {/* New Audits Notification Banner */}
      {newCount > 0 && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: 'rgba(229, 9, 20, 0.12)',
          border: '1px solid rgba(229, 9, 20, 0.35)',
          borderRadius: 'var(--radius)',
          padding: '0.65rem 1rem',
          marginBottom: '1rem',
          color: '#ffffff',
          fontSize: '0.875rem'
        }}>
          <span>
            ✨ <strong>{newCount}</strong> newly recorded audit event{newCount > 1 ? 's' : ''} (highlighted below with Netflix Red border and NEW tag).
          </span>
          <button
            className="btn btn-sm"
            style={{ background: 'var(--accent)', color: '#fff', fontSize: '0.75rem', padding: '0.2rem 0.6rem' }}
            onClick={markAuditsAsViewed}
          >
            ✓ Mark as viewed
          </button>
        </div>
      )}

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
                    const isNew = isNewAudit(log)

                    return (
                      <tr
                        key={log.id || i}
                        style={isNew ? {
                          borderLeft: '4px solid var(--accent)',
                          background: 'linear-gradient(90deg, rgba(229, 9, 20, 0.14) 0%, rgba(24, 24, 24, 0.95) 100%)',
                          boxShadow: 'inset 0 0 10px rgba(229, 9, 20, 0.12)'
                        } : {}}
                      >
                        {/* Timestamp with NEW badge if unviewed */}
                        <td style={{ whiteSpace: 'nowrap', fontSize: '0.8rem' }}>
                          {isNew && (
                            <span style={{
                              background: 'var(--accent)',
                              color: '#ffffff',
                              fontSize: '0.62rem',
                              fontWeight: 800,
                              letterSpacing: '0.04em',
                              padding: '0.15rem 0.45rem',
                              borderRadius: '9999px',
                              boxShadow: '0 0 8px rgba(229, 9, 20, 0.7)',
                              marginRight: '0.45rem',
                              display: 'inline-block'
                            }}>
                              NEW
                            </span>
                          )}
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
