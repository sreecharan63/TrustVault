import React, { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../contexts/AuthContext.jsx'
import { useNotifications } from '../contexts/NotificationContext.jsx'
import { getMyFileRequests, getAllFileRequests, resolveFileRequest } from '../api/requests.js'
import { downloadDocument } from '../api/documents.js'
import NewRequestModal from '../components/NewRequestModal.jsx'

export default function RequestsPage() {
  const { user, isAdmin } = useAuth()
  const { isItemUpdated, markSectionSeen, refreshCounts } = useNotifications()
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showNewModal, setShowNewModal] = useState(false)
  const [filterStatus, setFilterStatus] = useState('ALL')
  const [actionLoading, setActionLoading] = useState(null)

  // Resolution modal state for admin
  const [resolvingRequest, setResolvingRequest] = useState(null)
  const [resolutionAction, setResolutionAction] = useState('APPROVED') // or REJECTED
  const [adminResponseNote, setAdminResponseNote] = useState('')
  const [attachedFile, setAttachedFile] = useState(null)

  const fetchRequests = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = isAdmin ? await getAllFileRequests() : await getMyFileRequests()
      setRequests(Array.isArray(res.data) ? res.data : [])
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load file requests.')
    } finally {
      setLoading(false)
    }
  }, [isAdmin])

  useEffect(() => {
    fetchRequests()
  }, [fetchRequests])

  const handleOpenResolve = (req, action) => {
    setResolvingRequest(req)
    setResolutionAction(action)
    setAdminResponseNote('')
    setAttachedFile(null)
  }

  const handleConfirmResolve = async (e) => {
    e.preventDefault()
    if (!resolvingRequest) return
    setActionLoading(resolvingRequest.id)
    try {
      if (resolutionAction === 'APPROVED' && attachedFile) {
        const fd = new FormData()
        fd.append('status', 'APPROVED')
        fd.append('file', attachedFile)
        if (adminResponseNote) fd.append('adminResponse', adminResponseNote)
        await resolveFileRequest(resolvingRequest.id, fd)
      } else {
        await resolveFileRequest(resolvingRequest.id, {
          status: resolutionAction,
          adminResponse: adminResponseNote
        })
      }
      setResolvingRequest(null)
      fetchRequests()
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update request.')
    } finally {
      setActionLoading(null)
    }
  }

  const handleDownloadFulfilled = async (docId, filename) => {
    try {
      const res = await downloadDocument(docId)
      const url = URL.createObjectURL(res.data)
      const a = document.createElement('a')
      a.href = url
      a.download = filename || 'requested-document'
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to download fulfilled file.')
    }
  }

  const sortedRequests = [...filteredRequests].sort((a, b) => {
    const aUp = isItemUpdated('requests', a) ? 1 : 0
    const bUp = isItemUpdated('requests', b) ? 1 : 0
    if (aUp !== bUp) return bUp - aUp
    const tA = new Date(a.updatedAt || a.createdAt || a.requestedAt).getTime()
    const tB = new Date(b.updatedAt || b.createdAt || b.requestedAt).getTime()
    return tB - tA
  })

  const updatedCount = requests.filter(r => isItemUpdated('requests', r)).length

  const getStatusBadge = (status) => {
    switch (status) {
      case 'APPROVED':
        return <span className="badge badge-success">Approved</span>
      case 'REJECTED':
        return <span className="badge badge-danger">Rejected</span>
      case 'PENDING':
      default:
        return <span className="badge badge-warning">Pending</span>
    }
  }

  const getAccessBadge = (spec) => {
    switch (spec) {
      case 'FULL_ACCESS':
        return <span className="badge badge-admin">Full Access</span>
      case 'EDIT':
        return <span className="badge badge-warning">Edit</span>
      case 'READ':
      default:
        return <span className="badge badge-user">Read & Download</span>
    }
  }

  const fmtDate = (d) => d ? new Date(d).toLocaleString() : '-'

  return (
    <div className="page">
      <div className="flex-between mb-2">
        <div>
          <h1 className="page-title" style={{ margin: 0 }}>
            {isAdmin ? '🛡️ File Access Requests' : '📨 My File Requests'}
          </h1>
          <p className="text-muted" style={{ marginTop: '0.25rem' }}>
            {isAdmin
              ? 'Review and manage file access requests sent by users to the administrator'
              : 'Submit requests to administrators for files with custom access levels and descriptions'}
          </p>
        </div>
        {!isAdmin && (
          <button className="btn btn-primary" onClick={() => setShowNewModal(true)}>
            ➕ Request a File
          </button>
        )}
      </div>

      {updatedCount > 0 && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: 'rgba(16, 185, 129, 0.1)',
          border: '1px solid rgba(16, 185, 129, 0.3)',
          borderRadius: '8px',
          padding: '0.65rem 1rem',
          marginBottom: '1rem',
          color: '#34d399',
          fontSize: '0.875rem'
        }}>
          <span>
            ✨ <strong>{updatedCount}</strong> request{updatedCount > 1 ? 's' : ''} recently received or updated (placed at the top with green highlight).
          </span>
          <button
            className="btn btn-sm"
            style={{ background: '#10b981', color: '#fff', fontSize: '0.75rem', padding: '0.2rem 0.6rem' }}
            onClick={() => { markSectionSeen('requests'); refreshCounts() }}
          >
            ✓ Mark as viewed
          </button>
        </div>
      )}

      {isAdmin && (
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem' }}>
          {['ALL', 'PENDING', 'APPROVED', 'REJECTED'].map(st => (
            <button
              key={st}
              className={`btn btn-sm ${filterStatus === st ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setFilterStatus(st)}
            >
              {st} ({st === 'ALL' ? requests.length : requests.filter(r => r.status === st).length})
            </button>
          ))}
        </div>
      )}

      {error && <div className="error-box">{error}</div>}

      {loading ? (
        <div className="spinner" />
      ) : filteredRequests.length === 0 ? (
        <div className="empty-state">
          <p>{isAdmin ? 'No file requests found in this section.' : "You haven't submitted any file requests yet."}</p>
          {!isAdmin && (
            <button className="btn btn-primary" style={{ marginTop: '1rem' }} onClick={() => setShowNewModal(true)}>
              ➕ Request a File
            </button>
          )}
        </div>
      ) : (
        <div className="card" style={{ overflowX: 'auto' }}>
          <table>
            <thead>
              <tr>
                {isAdmin && <th>Requester</th>}
                <th>File Requested</th>
                <th>Access Level</th>
                <th>Description / Reason</th>
                <th>Status</th>
                <th>Delivered File / Response</th>
                <th>Submitted On</th>
                {isAdmin && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {sortedRequests.map(req => {
                const isUpdated = isItemUpdated('requests', req)
                return (
                  <tr
                    key={req.id}
                    style={isUpdated ? {
                      backgroundColor: 'rgba(16, 185, 129, 0.08)',
                      borderLeft: '4px solid #10b981'
                    } : {}}
                  >
                    {isAdmin && (
                      <td>
                        <div style={{ fontWeight: 600 }}>{req.requesterName}</div>
                        <div className="text-muted" style={{ fontSize: '0.75rem' }}>{req.requesterEmail}</div>
                      </td>
                    )}
                    <td style={{ fontWeight: 600 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <span>📄 {req.fileName}</span>
                        {isUpdated && (
                          <span style={{
                            background: '#10b981',
                            color: '#fff',
                            fontSize: '0.65rem',
                            fontWeight: 700,
                            padding: '0.1rem 0.4rem',
                            borderRadius: 9999
                          }}>
                            ✨ {req.status !== 'PENDING' ? 'UPDATED' : 'NEW'}
                          </span>
                        )}
                      </div>
                    </td>
                  <td>{getAccessBadge(req.accessSpecification)}</td>
                  <td style={{ maxWidth: 260 }}>
                    <div style={{ wordBreak: 'break-word' }}>{req.description}</div>
                  </td>
                  <td>{getStatusBadge(req.status)}</td>
                  <td style={{ maxWidth: 240 }}>
                    {req.fulfilledDocumentId && (
                      <div style={{ marginBottom: '0.4rem' }}>
                        <button
                          className="btn btn-sm btn-primary"
                          onClick={() => handleDownloadFulfilled(req.fulfilledDocumentId, req.fulfilledDocumentFilename || req.fileName)}
                          title="Download fulfilled file"
                        >
                          ⬇ Download File
                        </button>
                        <div className="text-muted" style={{ fontSize: '0.75rem', marginTop: '0.2rem' }}>
                          📎 {req.fulfilledDocumentFilename || req.fileName}
                        </div>
                      </div>
                    )}
                    {req.adminResponse ? (
                      <div>
                        <div>{req.adminResponse}</div>
                        {req.resolvedByName && (
                          <div className="text-muted" style={{ fontSize: '0.75rem' }}>by {req.resolvedByName}</div>
                        )}
                      </div>
                    ) : (
                      !req.fulfilledDocumentId && <span className="text-muted">—</span>
                    )}
                  </td>
                  <td>{fmtDate(req.createdAt)}</td>
                  {isAdmin && (
                    <td>
                      {req.status === 'PENDING' ? (
                        <div style={{ display: 'flex', gap: '0.4rem' }}>
                          <button
                            className="btn btn-sm btn-primary"
                            onClick={() => handleOpenResolve(req, 'APPROVED')}
                            disabled={actionLoading === req.id}
                            title="Accept request and send the file"
                          >
                            ✓ Accept & Send File
                          </button>
                          <button
                            className="btn btn-sm btn-danger"
                            onClick={() => handleOpenResolve(req, 'REJECTED')}
                            disabled={actionLoading === req.id}
                            title="Reject request"
                          >
                            ✕ Reject
                          </button>
                        </div>
                      ) : (
                        <span className="text-muted" style={{ fontSize: '0.8rem' }}>Resolved</span>
                      )}
                    </td>
                  )}
                </tr>
              )})}
            </tbody>
          </table>
        </div>
      )}

      {/* User Submission Modal */}
      {showNewModal && (
        <NewRequestModal
          onClose={() => setShowNewModal(false)}
          onSuccess={() => {
            setShowNewModal(false)
            fetchRequests()
          }}
        />
      )}

      {/* Admin Resolution & File Delivery Modal */}
      {resolvingRequest && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setResolvingRequest(null)}>
          <div className="modal">
            <div className="modal-title">
              {resolutionAction === 'APPROVED' ? '✅ Accept Request & Send File' : '❌ Reject File Request'}
              <button className="btn btn-ghost btn-sm" onClick={() => setResolvingRequest(null)}>✕</button>
            </div>

            <p className="mb-1">
              File Requested: <strong>{resolvingRequest.fileName}</strong>
            </p>
            <p className="text-muted mb-2">
              Requester: <strong>{resolvingRequest.requesterName}</strong> ({resolvingRequest.requesterEmail}) — Access: <em>{resolvingRequest.accessSpecification}</em>
            </p>

            <form onSubmit={handleConfirmResolve}>
              {resolutionAction === 'APPROVED' && (
                <div className="form-group" style={{ background: 'var(--bg3)', padding: '0.9rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
                  <label className="form-label" style={{ fontWeight: 600, color: 'var(--text)' }}>
                    📎 Attach & Send File *
                  </label>
                  <p className="text-muted" style={{ fontSize: '0.8rem', marginBottom: '0.5rem' }}>
                    Upload the requested file. It will be stored securely and automatically shared with <strong>{resolvingRequest.requesterName}</strong> according to their requested access level.
                  </p>
                  <input
                    type="file"
                    onChange={e => setAttachedFile(e.target.files[0])}
                    required
                  />
                </div>
              )}

              <div className="form-group" style={{ marginTop: '0.75rem' }}>
                <label className="form-label">
                  {resolutionAction === 'APPROVED' ? 'Admin Message / Note (Optional)' : 'Rejection Reason (Optional)'}
                </label>
                <textarea
                  value={adminResponseNote}
                  onChange={e => setAdminResponseNote(e.target.value)}
                  rows={2}
                  placeholder={resolutionAction === 'APPROVED' ? 'e.g. Here is the requested document. Access has been granted.' : 'e.g. Access denied due to compliance policy.'}
                />
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1.25rem' }}>
                <button type="button" className="btn btn-ghost" onClick={() => setResolvingRequest(null)}>Cancel</button>
                <button
                  type="submit"
                  className={`btn ${resolutionAction === 'APPROVED' ? 'btn-primary' : 'btn-danger'}`}
                  disabled={actionLoading === resolvingRequest.id}
                >
                  {resolutionAction === 'APPROVED' ? '📤 Accept & Send File' : 'Confirm Rejection'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
