import React, { useState, useEffect, useCallback } from 'react'
import { getMyDocuments, downloadDocument, deleteDocument } from '../api/documents.js'
import DocumentCard from '../components/DocumentCard.jsx'
import UploadModal from '../components/UploadModal.jsx'
import EditDocumentModal from '../components/EditDocumentModal.jsx'
import ShareModal from '../components/ShareModal.jsx'
import PermissionsModal from '../components/PermissionsModal.jsx'
import VersionHistoryModal from '../components/VersionHistoryModal.jsx'
import ActivityModal from '../components/ActivityModal.jsx'

export default function MyDocumentsPage() {
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
      alert(err.response?.data?.message || 'Download failed.')
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

  return (
    <div className="page">
      <div className="flex-between mb-2">
        <h1 className="page-title" style={{ margin: 0 }}>My Documents</h1>
        <button className="btn btn-primary" onClick={() => setShowUpload(true)}>📤 Upload</button>
      </div>

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
          <button className="btn btn-primary" style={{ marginTop: '1rem' }} onClick={() => setShowUpload(true)}>📤 Upload your first document</button>
        </div>
      ) : (
        <div className="grid-2">
          {docs.map(doc => (
            <DocumentCard
              key={doc.id}
              doc={doc}
              actions={[
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
    </div>
  )
}
