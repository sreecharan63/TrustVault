import React, { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../contexts/AuthContext.jsx'
import { getMyFileRequests, getAllFileRequests, resolveFileRequest } from '../api/requests.js'
import NewRequestModal from '../components/NewRequestModal.jsx'

export default function RequestsPage() {
  const { user, isAdmin } = useAuth()
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
  }

  const handleConfirmResolve = async (e) => {
    e.preventDefault()
    if (!resolvingRequest) return
    setActionLoading(resolvingRequest.id)
    try {
      await resolveFileRequest(resolvingRequest.id, {
        status: resolutionAction,
        adminResponse: adminResponseNote
      })
      setResolvingRequest(null)
      fetchRequests()
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update request.')
    } finally {
      setActionLoading(null)
    }
  }

  const filteredRequests = requests.filter(r => {
    if (filterStatus === 'ALL') return true
    return r.status === filterStatus
  })

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
                <th>File Name</th>
                <th>Access Level</th>
                <th>Description / Reason</th>
                <th>Status</th>
                <th>Admin Response</th>
                <th>Submitted On</th>
                {isAdmin && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {filteredRequests.map(req => (
                <tr key={req.id}>
                  {isAdmin && (
                    <td>
                      <div style={{ fontWeight: 600 }}>{req.requesterName}</div>
                      <div className="text-muted" style={{ fontSize: '0.75rem' }}>{req.requesterEmail}</div>
                    </td>
                  )}
                  <td style={{ fontWeight: 600 }}>
                    📄 {req.fileName}
                  </td>
                  <td>{getAccessBadge(req.accessSpecification)}</td>
                  <td style={{ maxWidth: 260 }}>
                    <div style={{ wordBreak: 'break-word' }}>{req.description}</div>
                  </td>
                  <td>{getStatusBadge(req.status)}</td>
                  <td style={{ maxWidth: 200 }}>
                    {req.adminResponse ? (
                      <div>
                        <div>{req.adminResponse}</div>
                        {req.resolvedByName && (
                          <div className="text-muted" style={{ fontSize: '0.75rem' }}>by {req.resolvedByName}</div>
                        )}
                      </div>
                    ) : (
                      <span className="text-muted">—</span>
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
                          >
                            ✓ Approve
                          </button>
                          <button
                            className="btn btn-sm btn-danger"
                            onClick={() => handleOpenResolve(req, 'REJECTED')}
                            disabled={actionLoading === req.id}
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
              ))}
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

      {/* Admin Resolution Modal */}
      {resolvingRequest && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setResolvingRequest(null)}>
          <div className="modal">
            <div className="modal-title">
              {resolutionAction === 'APPROVED' ? '✅ Approve File Request' : '❌ Reject File Request'}
              <button className="btn btn-ghost btn-sm" onClick={() => setResolvingRequest(null)}>✕</button>
            </div>

            <p className="mb-1">
              File: <strong>{resolvingRequest.fileName}</strong>
            </p>
            <p className="text-muted mb-2">
              Requester: {resolvingRequest.requesterName} ({resolvingRequest.requesterEmail})
            </p>

            <form onSubmit={handleConfirmResolve}>
              <div className="form-group">
                <label className="form-label">
                  {resolutionAction === 'APPROVED' ? 'Approval Note (Optional)' : 'Rejection Reason (Optional)'}
                </label>
                <textarea
                  value={adminResponseNote}
                  onChange={e => setAdminResponseNote(e.target.value)}
                  rows={3}
                  placeholder={resolutionAction === 'APPROVED' ? 'e.g. Access granted. File is now available in your shared documents.' : 'e.g. Access denied due to compliance policy.'}
                />
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1.25rem' }}>
                <button type="button" className="btn btn-ghost" onClick={() => setResolvingRequest(null)}>Cancel</button>
                <button
                  type="submit"
                  className={`btn ${resolutionAction === 'APPROVED' ? 'btn-primary' : 'btn-danger'}`}
                  disabled={actionLoading === resolvingRequest.id}
                >
                  {resolutionAction === 'APPROVED' ? 'Confirm Approval' : 'Confirm Rejection'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
