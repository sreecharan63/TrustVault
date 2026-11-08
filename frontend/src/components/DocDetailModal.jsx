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
      <div className="modal" style={{ maxWidth: 490, width: '92%', padding: '1.25rem' }}>
        {/* Header */}
        <div className="modal-title" style={{ marginBottom: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', minWidth: 0 }}>
            <div style={{
              width: 36,
              height: 36,
              borderRadius: 7,
              background: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid #2e2e2e',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              <FileIcon contentType={doc.contentType} filename={doc.originalFilename} size={18} />
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{
                fontWeight: 700,
                fontSize: '1rem',
                color: '#ffffff',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                maxWidth: '340px'
              }} title={doc.originalFilename}>
                {doc.originalFilename}
              </div>
              <div className="text-muted" style={{ fontSize: '0.74rem', fontWeight: 400 }}>
                {fmtSize(doc.fileSize)} • v{doc.currentVersionNumber || 1} • {fmtDate(doc.createdAt)}
              </div>
            </div>
          </div>
          <button
            className="btn btn-ghost btn-sm"
            onClick={onClose}
            style={{ borderRadius: '50%', width: 28, height: 28, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            title="Close"
          >
            <X size={15} />
          </button>
        </div>

        {error && <div className="error-box" style={{ marginBottom: '0.75rem', fontSize: '0.78rem', padding: '0.5rem 0.75rem' }}>{error}</div>}

        {/* Document Metadata Badges */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginBottom: '0.75rem', alignItems: 'center', fontSize: '0.72rem' }}>
          {doc.category && (
            <span className="badge badge-neutral" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.7rem', padding: '0.15rem 0.45rem' }}>
              <Folder size={11} strokeWidth={2} /> {doc.category}
            </span>
          )}
          {doc.tags && doc.tags.split(',').map(t => t.trim()).filter(Boolean).map(t => (
            <span key={t} className="badge badge-neutral" style={{ fontSize: '0.7rem', padding: '0.15rem 0.45rem' }}>#{t}</span>
          ))}
          {doc.ownerEmail && (
            <span className="badge badge-neutral" style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.7rem', padding: '0.15rem 0.45rem' }}>
              <User size={11} strokeWidth={2} /> {doc.ownerName || doc.ownerEmail}
            </span>
          )}
        </div>

        {/* Section 1: Effective Permissions Box */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.03)',
          border: '1px solid #2e2e2e',
          borderRadius: '8px',
          padding: '0.7rem 0.8rem',
          marginBottom: '0.85rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <div style={{ fontWeight: 700, fontSize: '0.82rem', color: '#ffffff', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <Lock size={13} strokeWidth={2} color="var(--accent)" /> Active Access Permissions
            </div>
            {hasFullRights && (
              <span className="badge" style={{
                background: 'rgba(229, 9, 20, 0.18)',
                color: 'var(--accent)',
                border: '1px solid rgba(229, 9, 20, 0.4)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.25rem',
                fontSize: '0.68rem',
                padding: '0.15rem 0.45rem'
              }}>
                {isAdmin ? <Shield size={11} strokeWidth={2.2} /> : <ShieldCheck size={11} strokeWidth={2.2} />}
                {isAdmin ? 'Admin Control' : 'Owner'}
              </span>
            )}
          </div>

          {/* 3 Status Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.45rem' }}>
            {/* Read */}
            <div style={{
              background: canRead ? 'rgba(70, 211, 105, 0.12)' : 'rgba(255, 255, 255, 0.02)',
              border: canRead ? '1px solid rgba(70, 211, 105, 0.35)' : '1px solid #2e2e2e',
              borderRadius: '6px',
              padding: '0.4rem 0.35rem',
              textAlign: 'center'
            }}>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.15rem' }}>
                {canRead ? <Check size={14} strokeWidth={2.5} color="#46d369" /> : <X size={14} strokeWidth={2.5} color="#666666" />}
              </div>
              <div style={{ fontWeight: 700, fontSize: '0.74rem', color: canRead ? '#46d369' : 'var(--text-muted)' }}>
                Read Access
              </div>
              <div style={{ fontSize: '0.64rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>
                {canRead ? 'View & read' : 'Restricted'}
              </div>
            </div>

            {/* Edit */}
            <div style={{
              background: canEdit ? 'rgba(229, 160, 13, 0.12)' : 'rgba(255, 255, 255, 0.02)',
              border: canEdit ? '1px solid rgba(229, 160, 13, 0.35)' : '1px solid #2e2e2e',
              borderRadius: '6px',
              padding: '0.4rem 0.35rem',
              textAlign: 'center'
            }}>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.15rem' }}>
                {canEdit ? <Check size={14} strokeWidth={2.5} color="#e5a00d" /> : <X size={14} strokeWidth={2.5} color="#666666" />}
              </div>
              <div style={{ fontWeight: 700, fontSize: '0.74rem', color: canEdit ? '#e5a00d' : 'var(--text-muted)' }}>
                Edit Access
              </div>
              <div style={{ fontSize: '0.64rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>
                {canEdit ? 'Can modify' : 'Read-only'}
              </div>
            </div>

            {/* Download */}
            <div style={{
              background: canDownload ? 'rgba(70, 211, 105, 0.12)' : 'rgba(255, 255, 255, 0.02)',
              border: canDownload ? '1px solid rgba(70, 211, 105, 0.35)' : '1px solid #2e2e2e',
              borderRadius: '6px',
              padding: '0.4rem 0.35rem',
              textAlign: 'center'
            }}>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.15rem' }}>
                {canDownload ? <Check size={14} strokeWidth={2.5} color="#46d369" /> : <X size={14} strokeWidth={2.5} color="#666666" />}
              </div>
              <div style={{ fontWeight: 700, fontSize: '0.74rem', color: canDownload ? '#46d369' : 'var(--text-muted)' }}>
                Download
              </div>
              <div style={{ fontSize: '0.64rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>
                {canDownload ? 'Allowed' : 'Restricted'}
              </div>
            </div>
          </div>

          {/* Active Collaborators Count for Owner/Admin */}
          {hasFullRights && collaborators.length > 0 && (
            <div style={{ marginTop: '0.5rem', fontSize: '0.72rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                <Users size={12} strokeWidth={2} /> <strong>{collaborators.length}</strong> collaborator{collaborators.length > 1 ? 's' : ''} with active access.
              </span>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                style={{ fontSize: '0.7rem', padding: '0.15rem 0.45rem', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
                onClick={() => { onClose(); onOpenPerms(doc); }}
              >
                <Lock size={11} strokeWidth={2} /> Manage Collaborators →
              </button>
            </div>
          )}
        </div>

        {/* Section 2: Choose What You Want To Do (Actions Hub) */}
        <div>
          <div style={{ fontWeight: 700, fontSize: '0.82rem', color: '#ffffff', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <Sparkles size={13} strokeWidth={2} color="var(--accent)" /> Available Actions:
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.45rem' }}>
            {/* Download Button */}
            <button
              type="button"
              className="btn btn-primary"
              disabled={!canDownload || !!loadingAction}
              onClick={handleDownload}
              style={{ justifyContent: 'center', padding: '0.45rem 0.65rem', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
            >
              <Download size={13} strokeWidth={2} />
              {loadingAction === 'download' ? 'Downloading...' : 'Download Document'}
            </button>

            {/* Preview Button */}
            <button
              type="button"
              className="btn btn-ghost"
              disabled={!canRead || !!loadingAction}
              onClick={handlePreview}
              style={{ justifyContent: 'center', padding: '0.45rem 0.65rem', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
            >
              <Eye size={13} strokeWidth={2} />
              {loadingAction === 'preview' ? 'Opening...' : 'Preview / Open'}
            </button>

            {/* Edit / New Version Button */}
            <button
              type="button"
              className="btn btn-ghost"
              disabled={!canEdit || !!loadingAction}
              onClick={() => { onClose(); onOpenEdit(doc); }}
              style={{ justifyContent: 'center', padding: '0.45rem 0.65rem', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
            >
              <Edit3 size={13} strokeWidth={2} />
              Edit & New Version
            </button>

            {/* Share Button */}
            <button
              type="button"
              className="btn btn-ghost"
              disabled={!hasFullRights || !!loadingAction}
              onClick={() => { onClose(); onOpenShare(doc); }}
              style={{ justifyContent: 'center', padding: '0.45rem 0.65rem', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
            >
              <Share2 size={13} strokeWidth={2} />
              Share with Others
            </button>

            {/* Manage Permissions */}
            <button
              type="button"
              className="btn btn-ghost"
              disabled={!hasFullRights || !!loadingAction}
              onClick={() => { onClose(); onOpenPerms(doc); }}
              style={{ justifyContent: 'center', padding: '0.45rem 0.65rem', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
            >
              <Lock size={13} strokeWidth={2} />
              Manage Permissions
            </button>

            {/* Version History */}
            <button
              type="button"
              className="btn btn-ghost"
              disabled={!canRead || !!loadingAction}
              onClick={() => { onClose(); onOpenVersions(doc); }}
              style={{ justifyContent: 'center', padding: '0.45rem 0.65rem', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
            >
              <History size={13} strokeWidth={2} />
              Version History
            </button>

            {/* Audit Trail */}
            <button
              type="button"
              className="btn btn-ghost"
              disabled={!hasFullRights && !canRead}
              onClick={() => { onClose(); onOpenActivity(doc); }}
              style={{ justifyContent: 'center', padding: '0.45rem 0.65rem', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
            >
              <Activity size={13} strokeWidth={2} />
              Audit Activity Trail
            </button>

            {/* Delete Document */}
            {hasFullRights && (
              <button
                type="button"
                className="btn btn-danger"
                disabled={!!loadingAction}
                onClick={handleDelete}
                style={{ justifyContent: 'center', padding: '0.45rem 0.65rem', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
              >
                <Trash2 size={13} strokeWidth={2} />
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
