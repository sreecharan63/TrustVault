import React, { useState, useEffect, useCallback } from 'react'
import { getSharedWithMe, downloadDocument } from '../api/documents.js'
import DocumentCard from '../components/DocumentCard.jsx'
import EditDocumentModal from '../components/EditDocumentModal.jsx'
import ActivityModal from '../components/ActivityModal.jsx'
import VersionHistoryModal from '../components/VersionHistoryModal.jsx'

export default function SharedWithMePage() {
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

  return (
    <div className="page">
      <h1 className="page-title">Shared With Me</h1>

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
          {docs.map(doc => {
            const actions = []
            if (doc.canDownload) actions.push({ label: '⬇ Download', onClick: () => handleDownload(doc) })
            if (doc.canEdit) actions.push({ label: '✏️ Edit', onClick: () => setEditDoc(doc) })
            actions.push({ label: '📋 Versions', onClick: () => setVersionsDoc(doc) })
            actions.push({ label: '📊 Activity', onClick: () => setActivityDoc(doc) })
            return <DocumentCard key={doc.id} doc={doc} actions={actions} />
          })}
        </div>
      )}

      {editDoc && <EditDocumentModal doc={editDoc} onClose={() => setEditDoc(null)} onSuccess={() => { setEditDoc(null); fetchDocs() }} />}
      {activityDoc && <ActivityModal doc={activityDoc} onClose={() => setActivityDoc(null)} />}
      {versionsDoc && <VersionHistoryModal doc={versionsDoc} onClose={() => setVersionsDoc(null)} onRefresh={fetchDocs} />}
    </div>
  )
}
