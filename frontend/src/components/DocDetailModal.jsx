import React, { useState, useEffect } from 'react'
import { downloadDocument, previewDocument, deleteDocument, getDocumentPermissions } from '../api/documents.js'
import { useAuth } from '../contexts/AuthContext.jsx'
import PreviewModal from './PreviewModal.jsx'
import FileIcon from './FileIcon.jsx'
import {
  X,
  Folder,
  User,
  Lock,
  Shield,
  ShieldCheck,
  Check,
  Users,
  Sparkles,
  Download,
  Eye,
  Edit3,
  Share2,
  History,
  Activity,
  Trash2
} from 'lucide-react'

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
  const [previewData, setPreviewData] = useState(null)

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
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      setTimeout(() => URL.revokeObjectURL(url), 60000)
    } catch (err) {
      let msg = 'Download failed. Access denied or file unavailable.'
      if (err.response?.data instanceof Blob) {
        try {
          const raw = await err.response.data.text()
          const parsed = JSON.parse(raw)
          if (parsed.message) msg = parsed.message
        } catch {
          // ignore json parse error
        }
      } else if (err.response?.data?.message) {
        msg = err.response.data.message
      } else if (err.message) {
        msg = err.message
      }
      setError(msg)
    } finally {
      setLoadingAction('')
    }
  }

  const handlePreview = async () => {
    setLoadingAction('preview')
    setError('')
    try {
      const res = await previewDocument(doc.id)
      const mimeType = doc.contentType || res.headers?.['content-type'] || 'application/octet-stream'
      const blob = new Blob([res.data], { type: mimeType })
      const blobUrl = URL.createObjectURL(blob)

      let textContent = null
      const ext = (doc.originalFilename || '').split('.').pop().toLowerCase()
      const isText = mimeType.startsWith('text/') ||
        mimeType.includes('json') ||
        mimeType.includes('javascript') ||
        mimeType.includes('xml') ||
        ['txt', 'csv', 'json', 'js', 'ts', 'jsx', 'tsx', 'html', 'css', 'md', 'xml', 'yaml', 'yml', 'log', 'sql'].includes(ext)

      if (isText) {
        try {
          textContent = await blob.text()
        } catch {
          // Fallback
        }
      }

      setPreviewData({
        doc,
        blobUrl,
        contentType: mimeType,
        textContent
      })
    } catch (err) {
      let msg = 'Preview failed. Document cannot be loaded.'
      if (err.response?.data instanceof Blob) {
        try {
          const raw = await err.response.data.text()
          const parsed = JSON.parse(raw)
          if (parsed.message) msg = parsed.message
        } catch {
          // ignore json parse error
        }
      } else if (err.response?.data?.message) {
        msg = err.response.data.message
      } else if (err.message) {
        msg = err.message
      }
      setError(msg)
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              width: 44,
              height: 44,
              borderRadius: 8,
              background: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid #2e2e2e',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              <FileIcon contentType={doc.contentType} filename={doc.originalFilename} size={24} />
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: '1.15rem', color: '#ffffff' }}>
                {doc.originalFilename}
              </div>
              <div className="text-muted" style={{ fontSize: '0.8rem', fontWeight: 400 }}>
                {fmtSize(doc.fileSize)} • Version {doc.currentVersionNumber || 1} • {fmtDate(doc.createdAt)}
              </div>
            </div>
          </div>
          <button
            className="btn btn-ghost btn-sm"
            onClick={onClose}
            style={{ borderRadius: '50%', width: 32, height: 32, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            title="Close"
          >
            <X size={16} />
          </button>
        </div>

        {error && <div className="error-box" style={{ marginBottom: '1.25rem' }}>{error}</div>}

        {/* Document Metadata Badges */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.45rem', marginBottom: '1.25rem', alignItems: 'center' }}>
          {doc.category && (
            <span className="badge badge-neutral" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
              <Folder size={12} strokeWidth={2} /> {doc.category}
            </span>
          )}
          {doc.tags && doc.tags.split(',').map(t => t.trim()).filter(Boolean).map(t => (
            <span key={t} className="badge badge-neutral">#{t}</span>
          ))}
          {doc.ownerEmail && (
            <span className="badge badge-neutral" style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
              <User size={12} strokeWidth={2} /> Owner: {doc.ownerName || doc.ownerEmail}
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
            <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#ffffff', display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
              <Lock size={15} strokeWidth={2} color="var(--accent)" /> Active Access Permissions
            </div>
            {hasFullRights && (
              <span className="badge" style={{
                background: 'rgba(229, 9, 20, 0.18)',
                color: 'var(--accent)',
                border: '1px solid rgba(229, 9, 20, 0.4)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem'
              }}>
                {isAdmin ? <Shield size={12} strokeWidth={2.2} /> : <ShieldCheck size={12} strokeWidth={2.2} />}
                {isAdmin ? 'Administrator Control' : 'Document Owner'}
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
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.35rem' }}>
                {canRead ? <Check size={18} strokeWidth={2.5} color="#46d369" /> : <X size={18} strokeWidth={2.5} color="#666666" />}
              </div>
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
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.35rem' }}>
                {canEdit ? <Check size={18} strokeWidth={2.5} color="#e5a00d" /> : <X size={18} strokeWidth={2.5} color="#666666" />}
              </div>
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
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.35rem' }}>
                {canDownload ? <Check size={18} strokeWidth={2.5} color="#46d369" /> : <X size={18} strokeWidth={2.5} color="#666666" />}
              </div>
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
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                <Users size={13} strokeWidth={2} /> <strong>{collaborators.length}</strong> collaborator{collaborators.length > 1 ? 's' : ''} have active shared access.
              </span>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
                onClick={() => { onClose(); onOpenPerms(doc); }}
              >
                <Lock size={12} strokeWidth={2} /> Manage Collaborators →
              </button>
            </div>
          )}
        </div>

        {/* Section 2: Choose What You Want To Do (Actions Hub) */}
        <div>
          <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#ffffff', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Sparkles size={14} strokeWidth={2} color="var(--accent)" /> Available Actions:
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem' }}>
            {/* Download Button */}
            <button
              type="button"
              className="btn btn-primary"
              disabled={!canDownload || !!loadingAction}
              onClick={handleDownload}
              style={{ justifyContent: 'center', padding: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '0.45rem' }}
            >
              <Download size={15} strokeWidth={2} />
              {loadingAction === 'download' ? 'Downloading...' : 'Download Document'}
            </button>

            {/* Preview Button */}
            <button
              type="button"
              className="btn btn-ghost"
              disabled={!canRead || !!loadingAction}
              onClick={handlePreview}
              style={{ justifyContent: 'center', padding: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '0.45rem' }}
            >
              <Eye size={15} strokeWidth={2} />
              {loadingAction === 'preview' ? 'Opening...' : 'Preview / Open'}
            </button>

            {/* Edit / New Version Button */}
            <button
              type="button"
              className="btn btn-ghost"
              disabled={!canEdit || !!loadingAction}
              onClick={() => { onClose(); onOpenEdit(doc); }}
              style={{ justifyContent: 'center', padding: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '0.45rem' }}
            >
              <Edit3 size={15} strokeWidth={2} />
              Edit & New Version
            </button>

            {/* Share Button */}
            <button
              type="button"
              className="btn btn-ghost"
              disabled={!hasFullRights || !!loadingAction}
              onClick={() => { onClose(); onOpenShare(doc); }}
              style={{ justifyContent: 'center', padding: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '0.45rem' }}
            >
              <Share2 size={15} strokeWidth={2} />
              Share with Others
            </button>

            {/* Manage Permissions */}
            <button
              type="button"
              className="btn btn-ghost"
              disabled={!hasFullRights || !!loadingAction}
              onClick={() => { onClose(); onOpenPerms(doc); }}
              style={{ justifyContent: 'center', padding: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '0.45rem' }}
            >
              <Lock size={15} strokeWidth={2} />
              Manage Permissions
            </button>

            {/* Version History */}
            <button
              type="button"
              className="btn btn-ghost"
              disabled={!canRead || !!loadingAction}
              onClick={() => { onClose(); onOpenVersions(doc); }}
              style={{ justifyContent: 'center', padding: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '0.45rem' }}
            >
              <History size={15} strokeWidth={2} />
              Version History
            </button>

            {/* Audit Trail */}
            <button
              type="button"
              className="btn btn-ghost"
              disabled={!hasFullRights && !canRead}
              onClick={() => { onClose(); onOpenActivity(doc); }}
              style={{ justifyContent: 'center', padding: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '0.45rem' }}
            >
              <Activity size={15} strokeWidth={2} />
              Audit Activity Trail
            </button>

            {/* Delete Document */}
            {hasFullRights && (
              <button
                type="button"
                className="btn btn-danger"
                disabled={!!loadingAction}
                onClick={handleDelete}
                style={{ justifyContent: 'center', padding: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '0.45rem' }}
              >
                <Trash2 size={15} strokeWidth={2} />
                {loadingAction === 'delete' ? 'Deleting...' : 'Delete Document'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* In-App Document Preview Modal / Lightbox */}
      {previewData && (
        <PreviewModal
          doc={previewData.doc}
          blobUrl={previewData.blobUrl}
          contentType={previewData.contentType}
          textContent={previewData.textContent}
          onClose={() => {
            if (previewData.blobUrl) URL.revokeObjectURL(previewData.blobUrl)
            setPreviewData(null)
          }}
        />
      )}
    </div>
  )
}
