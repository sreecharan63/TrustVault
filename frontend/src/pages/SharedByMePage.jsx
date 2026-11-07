import React, { useState, useEffect } from 'react'
import { getSharedByMe } from '../api/documents.js'
import DocumentCard from '../components/DocumentCard.jsx'
import PermissionsModal from '../components/PermissionsModal.jsx'
import ShareModal from '../components/ShareModal.jsx'

export default function SharedByMePage() {
  const [docs, setDocs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [permsDoc, setPermsDoc] = useState(null)
  const [shareDoc, setShareDoc] = useState(null)

  const fetchDocs = async () => {
    setLoading(true); setError('')
    try {
      const res = await getSharedByMe()
      const data = res.data
      setDocs(Array.isArray(data) ? data : [])
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load shared-by-me data.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchDocs() }, [])

  return (
    <div className="page">
      <h1 className="page-title">Shared By Me</h1>
      {error && <div className="error-box">{error}</div>}

      {loading ? <div className="spinner" /> : docs.length === 0 ? (
        <div className="empty-state">
          <p>You haven't shared any documents yet.</p>
        </div>
      ) : (
        <div className="grid-2">
          {docs.map(doc => (
            <DocumentCard
              key={doc.id}
              doc={doc}
              actions={[
                { label: '🔐 Manage Permissions', onClick: () => setPermsDoc(doc) },
                { label: '🔗 Share More', onClick: () => setShareDoc(doc) },
              ]}
            />
          ))}
        </div>
      )}

      {permsDoc && <PermissionsModal doc={permsDoc} onClose={() => setPermsDoc(null)} onRefresh={fetchDocs} />}
      {shareDoc && <ShareModal doc={shareDoc} onClose={() => setShareDoc(null)} onSuccess={() => { setShareDoc(null); fetchDocs() }} />}
    </div>
  )
}
