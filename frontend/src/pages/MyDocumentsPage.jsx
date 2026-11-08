import React, { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../contexts/AuthContext.jsx'
import { useNotifications } from '../contexts/NotificationContext.jsx'
import { getMyDocuments, downloadDocument, previewDocument, deleteDocument } from '../api/documents.js'
import DocumentCard from '../components/DocumentCard.jsx'
import UploadModal from '../components/UploadModal.jsx'
import EditDocumentModal from '../components/EditDocumentModal.jsx'
import ShareModal from '../components/ShareModal.jsx'
import PermissionsModal from '../components/PermissionsModal.jsx'
import VersionHistoryModal from '../components/VersionHistoryModal.jsx'
import ActivityModal from '../components/ActivityModal.jsx'
import PreviewModal from '../components/PreviewModal.jsx'

export default function MyDocumentsPage() {
  const { user, isAdmin } = useAuth()
  const { isItemUpdated, markSectionSeen, refreshCounts } = useNotifications()
  const [docs, setDocs] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const [error, setError] = useState('')

  // Modals
  const [showUpload, setShowUpload] = useState(false)
  const [editDoc, setEditDoc] = useState(null)
  const [shareDoc, setShareDoc] = useState(null)
  const [permsDoc, setPermsDoc] = useState(null)
  const [versionsDoc, setVersionsDoc] = useState(null)
  const [activityDoc, setActivityDoc] = useState(null)
  const [previewData, setPreviewData] = useState(null)

  const fetchDocs = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const params = {}
      if (search) params.search = search
      if (category) params.category = category
      const res = await getMyDocuments(params)
      const data = res.data
      setDocs(Array.isArray(data) ? data : data.content || [])
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load documents.')
    } finally {
      setLoading(false)
    }
  }, [search, category])

  useEffect(() => { fetchDocs() }, [fetchDocs])

  const handleDownload = async (doc) => {
    try {
      const res = await downloadDocument(doc.id)
      const url = URL.createObjectURL(res.data)
      const a = document.createElement('a')
      a.href = url
      a.download = doc.originalFilename || 'file'
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      let msg = 'Download failed.'
      if (err.response?.data instanceof Blob) {
        try {
          const raw = await err.response.data.text()
          const parsed = JSON.parse(raw)
          if (parsed.message) msg = parsed.message
        } catch {}
      } else if (err.response?.data?.message) {
        msg = err.response.data.message
      }
      alert(msg)
    }
  }

  const handlePreview = async (doc) => {
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
        } catch {}
      }

      setPreviewData({
        doc,
        blobUrl,
        contentType: mimeType,
        textContent
      })
    } catch (err) {
      let msg = 'Preview failed. Access denied or file unavailable.'
      if (err.response?.data instanceof Blob) {
        try {
          const raw = await err.response.data.text()
          const parsed = JSON.parse(raw)
          if (parsed.message) msg = parsed.message
        } catch {}
      } else if (err.response?.data?.message) {
        msg = err.response.data.message
      }
      alert(msg)
    }
  }

  const handleDelete = async (doc) => {
    if (!confirm(`Delete "${doc.originalFilename}"? This action cannot be undone.`)) return
    try {
      await deleteDocument(doc.id)
      fetchDocs()
    } catch (err) {
      alert(err.response?.data?.message || 'Delete failed.')
    }
  }

  const categories = [...new Set(docs.map(d => d.category).filter(Boolean))]
  const isViewer = user?.role === 'VIEWER'

  // Sort updated/new documents directly to the top!
  const sortedDocs = [...docs].sort((a, b) => {
    const aUp = isItemUpdated('documents', a) ? 1 : 0
    const bUp = isItemUpdated('documents', b) ? 1 : 0
    if (aUp !== bUp) return bUp - aUp
    const tA = new Date(a.updatedAt || a.createdAt).getTime()
    const tB = new Date(b.updatedAt || b.createdAt).getTime()
    return tB - tA
  })

  const updatedCount = docs.filter(d => isItemUpdated('documents', d)).length

  return (
    <div className="page">
      <div className="flex-between mb-2">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <h1 className="page-title" style={{ margin: 0 }}>
            {isAdmin ? 'Document Vault (All Documents)' : 'My Documents'}
          </h1>
          {isAdmin && (
            <span className="badge badge-primary" style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem' }}>
              Full Admin Control
            </span>
          )}
        </div>
        {!isViewer && (
          <button className="btn btn-primary" onClick={() => setShowUpload(true)}>📤 Upload</button>
        )}
      </div>

      {updatedCount > 0 && (
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
            ✨ <strong>{updatedCount}</strong> document{updatedCount > 1 ? 's' : ''} recently received or updated (placed at the top with Netflix Red accent).
          </span>
          <button
            className="btn btn-sm"
            style={{ background: 'var(--accent)', color: '#fff', fontSize: '0.75rem', padding: '0.2rem 0.6rem' }}
            onClick={() => { markSectionSeen('documents'); refreshCounts() }}
          >
            ✓ Mark as viewed
          </button>
        </div>
      )}

      {isViewer && (
        <div style={{
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          border: '1px solid rgba(59, 130, 246, 0.3)',
          borderRadius: '8px',
          padding: '0.85rem 1.25rem',
          marginBottom: '1.25rem',
          color: '#93c5fd',
          fontSize: '0.9rem'
        }}>
          ℹ️ <strong>Logged in as Viewer:</strong> You have read-only privileges. Check <em>"Shared With Me"</em> in the navigation bar to access documents granted to you. Document uploading is reserved for <strong>Document Owners</strong>.
        </div>
      )}

      <div className="search-bar">
        <input
          placeholder="🔍 Search by filename, description, tags..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <select value={category} onChange={e => setCategory(e.target.value)}>
          <option value="">All Categories</option>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {error && <div className="error-box">{error}</div>}

      {loading ? <div className="spinner" /> : docs.length === 0 ? (
        <div className="empty-state">
          <p>No documents found.</p>
          {!isViewer && (
            <button className="btn btn-primary" style={{ marginTop: '1rem' }} onClick={() => setShowUpload(true)}>📤 Upload your first document</button>
          )}
        </div>
      ) : (
        <div className="grid-2">
          {sortedDocs.map(doc => (
            <DocumentCard
              key={doc.id}
              doc={doc}
              isUpdated={isItemUpdated('documents', doc)}
              actions={[
                { label: '👁️ Preview', onClick: () => handlePreview(doc) },
                { label: '⬇ Download', onClick: () => handleDownload(doc) },
                { label: '✏️ Edit', onClick: () => setEditDoc(doc) },
                { label: '🔗 Share', onClick: () => setShareDoc(doc) },
                { label: '🔐 Perms', onClick: () => setPermsDoc(doc) },
                { label: '📋 Versions', onClick: () => setVersionsDoc(doc) },
                { label: '📊 Activity', onClick: () => setActivityDoc(doc) },
                { label: '🗑 Delete', onClick: () => handleDelete(doc), variant: 'btn-danger' },
              ]}
            />
          ))}
        </div>
      )}

      {showUpload && <UploadModal onClose={() => setShowUpload(false)} onSuccess={() => { setShowUpload(false); fetchDocs() }} />}
      {editDoc && <EditDocumentModal doc={editDoc} onClose={() => setEditDoc(null)} onSuccess={() => { setEditDoc(null); fetchDocs() }} />}
      {shareDoc && <ShareModal doc={shareDoc} onClose={() => setShareDoc(null)} onSuccess={() => { setShareDoc(null); fetchDocs() }} />}
      {permsDoc && <PermissionsModal doc={permsDoc} onClose={() => setPermsDoc(null)} onRefresh={fetchDocs} />}
      {versionsDoc && <VersionHistoryModal doc={versionsDoc} onClose={() => setVersionsDoc(null)} onRefresh={fetchDocs} />}
      {activityDoc && <ActivityModal doc={activityDoc} onClose={() => setActivityDoc(null)} />}

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
