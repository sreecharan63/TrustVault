import React, { useState, useEffect } from 'react'
import { downloadDocument, previewDocument, deleteDocument, getDocumentPermissions } from '../api/documents.js'
import { useAuth } from '../contexts/AuthContext.jsx'

export default function DocDetailModal({
  doc,
  onClose,
  onRefresh,
  onOpenEdit,
  onOpenShare,
  onOpenPerms,
  onOpenVersions,
  onOpenActivity
}) {
  const { user, isAdmin } = useAuth()
  const [collaborators, setCollaborators] = useState([])
  const [loadingAction, setLoadingAction] = useState('')
  const [error, setError] = useState('')

  if (!doc) return null

  const isOwner = doc.isOwner || (user?.email && doc.ownerEmail === user?.email)
  const hasFullRights = isOwner || isAdmin
  const canRead = hasFullRights || !!doc.canRead
  const canEdit = hasFullRights || !!doc.canEdit
  const canDownload = hasFullRights || !!doc.canDownload || !!doc.canRead

  useEffect(() => {
    if (hasFullRights) {
      (async () => {
        try {
          const res = await getDocumentPermissions(doc.id)
          setCollaborators(Array.isArray(res.data) ? res.data : [])
        } catch {
          // Non-critical collaborator fetch
        }
      })()
    }
  }, [doc.id, hasFullRights])

  const fmtSize = (bytes) => {
    if (!bytes) return '-'
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / 1048576).toFixed(2) + ' MB'
  }

  const fmtDate = (d) => d ? new Date(d).toLocaleString() : '-'

  const handleDownload = async () => {
    setLoadingAction('download')
    setError('')
    try {
      const res = await downloadDocument(doc.id)
      const url = URL.createObjectURL(res.data)
      const a = document.createElement('a')
      a.href = url
      a.download = doc.originalFilename || 'document'
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      setError(err.response?.data?.message || 'Download failed. Access denied.')
    } finally {
      setLoadingAction('')
    }
  }

  const handlePreview = async () => {
    setLoadingAction('preview')
    setError('')
    try {
      const res = await previewDocument(doc.id)
      const url = URL.createObjectURL(res.data)
      window.open(url, '_blank')
    } catch (err) {
      setError(err.response?.data?.message || 'Preview failed. Access denied.')
    } finally {
      setLoadingAction('')
    }
  }

  const handleDelete = async () => {
    if (!window.confirm(`Are you sure you want to delete "${doc.originalFilename}"?`)) return
    setLoadingAction('delete')
    setError('')
    try {
      await deleteDocument(doc.id)
      onClose()
      if (onRefresh) onRefresh()
    } catch (err) {
      setError(err.response?.data?.message || 'Delete failed.')
      setLoadingAction('')
    }
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 620, padding: '2rem' }}>
        {/* Header */}
        <div className="modal-title" style={{ marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <span style={{ fontSize: '1.5rem' }}>📄</span>
            <div>
              <div style={{ fontWeight: 800, fontSize: '1.15rem', color: '#ffffff' }}>
                {doc.originalFilename}
              </div>
              <div className="text-muted" style={{ fontSize: '0.8rem', fontWeight: 400 }}>
                {fmtSize(doc.fileSize)} • Version {doc.currentVersionNumber || 1} • {fmtDate(doc.createdAt)}
              </div>
            </div>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={onClose} style={{ borderRadius: '50%', width: 32, height: 32, padding: 0 }}>✕</button>
        </div>

        {error && <div className="error-box" style={{ marginBottom: '1.25rem' }}>{error}</div>}

        {/* Document Metadata Badges */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.45rem', marginBottom: '1.25rem' }}>
          {doc.category && <span className="badge badge-neutral">📁 {doc.category}</span>}
          {doc.tags && doc.tags.split(',').map(t => t.trim()).filter(Boolean).map(t => (
            <span key={t} className="badge badge-neutral">#{t}</span>
          ))}
          {doc.ownerEmail && (
            <span className="badge badge-neutral" style={{ marginLeft: 'auto' }}>
              👤 Owner: {doc.ownerName || doc.ownerEmail}
            </span>
          )}
        </div>

        {/* Section 1: Effective Permissions Box */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.03)',
          border: '1px solid #2e2e2e',
          borderRadius: 'var(--radius)',
          padding: '1.15rem',
          marginBottom: '1.5rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem' }}>
            <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#ffffff', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              🔐 Active Access Permissions
            </div>
            {hasFullRights && (
              <span className="badge" style={{ background: 'rgba(229, 9, 20, 0.18)', color: 'var(--accent)', border: '1px solid rgba(229, 9, 20, 0.4)' }}>
                {isAdmin ? '🛡️ Administrator Control' : '👑 Document Owner'}
              </span>
            )}
          </div>

          {/* 3 Status Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.65rem' }}>
            {/* Read */}
            <div style={{
              background: canRead ? 'rgba(70, 211, 105, 0.12)' : 'rgba(255, 255, 255, 0.02)',
              border: canRead ? '1px solid rgba(70, 211, 105, 0.35)' : '1px solid #2e2e2e',
              borderRadius: '6px',
              padding: '0.75rem',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '1.2rem', marginBottom: '0.2rem' }}>{canRead ? '✅' : '🚫'}</div>
              <div style={{ fontWeight: 700, fontSize: '0.8rem', color: canRead ? '#46d369' : 'var(--text-muted)' }}>
                Read Access
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                {canRead ? 'Can view & read' : 'No read access'}
              </div>
            </div>

            {/* Edit */}
            <div style={{
              background: canEdit ? 'rgba(229, 160, 13, 0.12)' : 'rgba(255, 255, 255, 0.02)',
              border: canEdit ? '1px solid rgba(229, 160, 13, 0.35)' : '1px solid #2e2e2e',
              borderRadius: '6px',
              padding: '0.75rem',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '1.2rem', marginBottom: '0.2rem' }}>{canEdit ? '✅' : '🚫'}</div>
              <div style={{ fontWeight: 700, fontSize: '0.8rem', color: canEdit ? '#e5a00d' : 'var(--text-muted)' }}>
                Edit Access
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                {canEdit ? 'Can modify file' : 'Read-only mode'}
              </div>
            </div>

            {/* Download */}
            <div style={{
              background: canDownload ? 'rgba(70, 211, 105, 0.12)' : 'rgba(255, 255, 255, 0.02)',
              border: canDownload ? '1px solid rgba(70, 211, 105, 0.35)' : '1px solid #2e2e2e',
              borderRadius: '6px',
              padding: '0.75rem',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '1.2rem', marginBottom: '0.2rem' }}>{canDownload ? '✅' : '🚫'}</div>
              <div style={{ fontWeight: 700, fontSize: '0.8rem', color: canDownload ? '#46d369' : 'var(--text-muted)' }}>
                Download Access
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                {canDownload ? 'Can download bytes' : 'Download restricted'}
              </div>
            </div>
          </div>

          {/* Active Collaborators Count for Owner/Admin */}
          {hasFullRights && collaborators.length > 0 && (
            <div style={{ marginTop: '0.75rem', fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span>👥 <strong>{collaborators.length}</strong> collaborator{collaborators.length > 1 ? 's' : ''} have active shared access.</span>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem' }}
                onClick={() => { onClose(); onOpenPerms(doc); }}
              >
                🔐 Manage Collaborators →
              </button>
            </div>
          )}
        </div>

        {/* Section 2: Choose What You Want To Do (Actions Hub) */}
        <div>
          <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#ffffff', marginBottom: '0.75rem' }}>
            ⚡ Choose what you want to do:
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem' }}>
            {/* Download Button */}
            <button
              type="button"
              className="btn btn-primary"
              disabled={!canDownload || !!loadingAction}
              onClick={handleDownload}
              style={{ justifyContent: 'center', padding: '0.75rem' }}
            >
              {loadingAction === 'download' ? '⏳ Downloading...' : '⬇️ Download Document'}
            </button>

            {/* Preview Button */}
            <button
              type="button"
              className="btn btn-ghost"
              disabled={!canRead || !!loadingAction}
              onClick={handlePreview}
              style={{ justifyContent: 'center', padding: '0.75rem' }}
            >
              {loadingAction === 'preview' ? '⏳ Opening...' : '👁️ Preview / Open'}
            </button>

            {/* Edit / New Version Button */}
            <button
              type="button"
              className="btn btn-ghost"
              disabled={!canEdit || !!loadingAction}
              onClick={() => { onClose(); onOpenEdit(doc); }}
              style={{ justifyContent: 'center', padding: '0.75rem' }}
            >
              ✏️ Edit & New Version
            </button>

            {/* Share Button */}
            <button
              type="button"
              className="btn btn-ghost"
              disabled={!hasFullRights || !!loadingAction}
              onClick={() => { onClose(); onOpenShare(doc); }}
              style={{ justifyContent: 'center', padding: '0.75rem' }}
            >
              🔗 Share with Others
            </button>

            {/* Manage Permissions */}
            <button
              type="button"
              className="btn btn-ghost"
              disabled={!hasFullRights || !!loadingAction}
              onClick={() => { onClose(); onOpenPerms(doc); }}
              style={{ justifyContent: 'center', padding: '0.75rem' }}
            >
              🔐 Manage Permissions
            </button>

            {/* Version History */}
            <button
              type="button"
              className="btn btn-ghost"
              disabled={!canRead || !!loadingAction}
              onClick={() => { onClose(); onOpenVersions(doc); }}
              style={{ justifyContent: 'center', padding: '0.75rem' }}
            >
              📋 Version History
            </button>

            {/* Audit Trail */}
            <button
              type="button"
              className="btn btn-ghost"
              disabled={!hasFullRights && !canRead}
              onClick={() => { onClose(); onOpenActivity(doc); }}
              style={{ justifyContent: 'center', padding: '0.75rem' }}
            >
              📊 Audit Activity Trail
            </button>

            {/* Delete Document */}
            {hasFullRights && (
              <button
                type="button"
                className="btn btn-danger"
                disabled={!!loadingAction}
                onClick={handleDelete}
                style={{ justifyContent: 'center', padding: '0.75rem' }}
              >
                {loadingAction === 'delete' ? '⏳ Deleting...' : '🗑️ Delete Document'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
