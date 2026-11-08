import React, { useState, useEffect } from 'react'
import { getSharedByMe } from '../api/documents.js'
import { useNotifications } from '../contexts/NotificationContext.jsx'
import DocumentCard from '../components/DocumentCard.jsx'
import PermissionsModal from '../components/PermissionsModal.jsx'
import ShareModal from '../components/ShareModal.jsx'

export default function SharedByMePage() {
  const { isItemUpdated, markSectionSeen, refreshCounts } = useNotifications()
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

  // Sort updated/newly shared documents directly to the top!
  const sortedDocs = [...docs].sort((a, b) => {
    const aUp = isItemUpdated('sharedByMe', a) ? 1 : 0
    const bUp = isItemUpdated('sharedByMe', b) ? 1 : 0
    if (aUp !== bUp) return bUp - aUp
    const tA = new Date(a.updatedAt || a.createdAt).getTime()
    const tB = new Date(b.updatedAt || b.createdAt).getTime()
    return tB - tA
  })

  const updatedCount = docs.filter(d => isItemUpdated('sharedByMe', d)).length

  return (
    <div className="page">
      <div className="flex-between mb-2">
        <h1 className="page-title" style={{ margin: 0 }}>Shared By Me</h1>
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
            ✨ <strong>{updatedCount}</strong> document{updatedCount > 1 ? 's' : ''} recently updated or shared (placed at the top with Netflix Red accent).
          </span>
          <button
            className="btn btn-sm"
            style={{ background: 'var(--accent)', color: '#fff', fontSize: '0.75rem', padding: '0.2rem 0.6rem' }}
            onClick={() => { markSectionSeen('sharedByMe'); refreshCounts() }}
          >
            ✓ Mark as viewed
          </button>
        </div>
      )}

      {error && <div className="error-box">{error}</div>}

      {loading ? <div className="spinner" /> : docs.length === 0 ? (
        <div className="empty-state">
          <p>You haven't shared any documents yet.</p>
        </div>
      ) : (
        <div className="grid-2">
          {sortedDocs.map(doc => (
            <DocumentCard
              key={doc.id}
              doc={doc}
              isUpdated={isItemUpdated('sharedByMe', doc)}
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
