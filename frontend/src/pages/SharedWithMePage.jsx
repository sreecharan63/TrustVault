import React, { useState, useEffect, useCallback } from 'react'
import { getSharedWithMe, downloadDocument } from '../api/documents.js'
import { useNotifications } from '../contexts/NotificationContext.jsx'
import DocumentCard from '../components/DocumentCard.jsx'
import EditDocumentModal from '../components/EditDocumentModal.jsx'
import ActivityModal from '../components/ActivityModal.jsx'
import VersionHistoryModal from '../components/VersionHistoryModal.jsx'

export default function SharedWithMePage() {
  const { isItemUpdated, markSectionSeen, refreshCounts } = useNotifications()
  const [docs, setDocs] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [error, setError] = useState('')
  const [editDoc, setEditDoc] = useState(null)
  const [activityDoc, setActivityDoc] = useState(null)
  const [versionsDoc, setVersionsDoc] = useState(null)

  const fetchDocs = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const params = {}
      if (search) params.search = search
      const res = await getSharedWithMe(params)
      const data = res.data
      setDocs(Array.isArray(data) ? data : data.content || [])
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load shared documents.')
    } finally {
      setLoading(false)
    }
  }, [search])

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
      alert(err.response?.data?.message || 'Download failed. You may not have download permission.')
    }
  }

  // Sort updated/newly received documents directly to the top!
  const sortedDocs = [...docs].sort((a, b) => {
    const aUp = isItemUpdated('sharedWithMe', a) ? 1 : 0
    const bUp = isItemUpdated('sharedWithMe', b) ? 1 : 0
    if (aUp !== bUp) return bUp - aUp
    const tA = new Date(a.updatedAt || a.createdAt).getTime()
    const tB = new Date(b.updatedAt || b.createdAt).getTime()
    return tB - tA
  })

  const updatedCount = docs.filter(d => isItemUpdated('sharedWithMe', d)).length

  return (
    <div className="page">
      <div className="flex-between mb-2">
        <h1 className="page-title" style={{ margin: 0 }}>Shared With Me</h1>
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
            ✨ <strong>{updatedCount}</strong> document{updatedCount > 1 ? 's' : ''} recently received or updated (placed at the top with green highlight).
          </span>
          <button
            className="btn btn-sm"
            style={{ background: '#10b981', color: '#fff', fontSize: '0.75rem', padding: '0.2rem 0.6rem' }}
            onClick={() => { markSectionSeen('sharedWithMe'); refreshCounts() }}
          >
            ✓ Mark as viewed
          </button>
        </div>
      )}

      <div className="search-bar">
        <input
          placeholder="🔍 Search shared documents..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {error && <div className="error-box">{error}</div>}

      {loading ? <div className="spinner" /> : docs.length === 0 ? (
        <div className="empty-state">
          <p>No documents have been shared with you yet.</p>
        </div>
      ) : (
        <div className="grid-2">
          {sortedDocs.map(doc => {
            const actions = []
            if (doc.canDownload) actions.push({ label: '⬇ Download', onClick: () => handleDownload(doc) })
            if (doc.canEdit) actions.push({ label: '✏️ Edit', onClick: () => setEditDoc(doc) })
            actions.push({ label: '📋 Versions', onClick: () => setVersionsDoc(doc) })
            actions.push({ label: '📊 Activity', onClick: () => setActivityDoc(doc) })
            return (
              <DocumentCard
                key={doc.id}
                doc={doc}
                isUpdated={isItemUpdated('sharedWithMe', doc)}
                actions={actions}
              />
            )
          })}
        </div>
      )}

      {editDoc && <EditDocumentModal doc={editDoc} onClose={() => setEditDoc(null)} onSuccess={() => { setEditDoc(null); fetchDocs() }} />}
      {activityDoc && <ActivityModal doc={activityDoc} onClose={() => setActivityDoc(null)} />}
      {versionsDoc && <VersionHistoryModal doc={versionsDoc} onClose={() => setVersionsDoc(null)} onRefresh={fetchDocs} />}
    </div>
  )
}
