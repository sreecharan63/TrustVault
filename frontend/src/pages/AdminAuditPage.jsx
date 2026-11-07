import React, { useState, useEffect } from 'react'
import { getAuditLogs } from '../api/admin.js'

export default function AdminAuditPage() {
  const [logs, setLogs] = useState([])
  const [totalPages, setTotalPages] = useState(0)
  const [page, setPage] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

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

  return (
    <div className="page">
      <h1 className="page-title">🛡️ Audit Logs</h1>

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
                    <th>Event</th>
                    <th>Actor</th>
                    <th>Outcome</th>
                    <th>Resource ID</th>
                    <th>Timestamp</th>
                    <th>Details</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log, i) => (
                    <tr key={log.id || i}>
                      <td><span className={`badge ${log.outcome === 'SUCCESS' ? 'badge-success' : 'badge-danger'}`}>{log.eventType}</span></td>
                      <td>{log.actorEmail || '-'}</td>
                      <td><span className={`badge ${log.outcome === 'SUCCESS' ? 'badge-success' : 'badge-danger'}`}>{log.outcome}</span></td>
                      <td style={{ fontSize: '0.75rem', maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis' }} title={log.resourceId}>{log.resourceId?.substring(0, 8) || '-'}</td>
                      <td>{fmtDate(log.createdAt)}</td>
                      <td style={{ fontSize: '0.75rem', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}>{typeof log.details === 'object' ? JSON.stringify(log.details) : (log.details || '-')}</td>
                    </tr>
                  ))}
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
    </div>
  )
}
