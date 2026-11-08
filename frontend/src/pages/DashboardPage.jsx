import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { getDashboardStats } from '../api/documents.js'
import { useAuth } from '../contexts/AuthContext.jsx'
import DocumentCard from '../components/DocumentCard.jsx'
import DocDetailModal from '../components/DocDetailModal.jsx'
import EditDocumentModal from '../components/EditDocumentModal.jsx'
import ShareModal from '../components/ShareModal.jsx'
import PermissionsModal from '../components/PermissionsModal.jsx'
import VersionHistoryModal from '../components/VersionHistoryModal.jsx'
import ActivityModal from '../components/ActivityModal.jsx'
import { RefreshCw, Upload, Shield, ArrowRight } from 'lucide-react'

export default function DashboardPage() {
  const { user } = useAuth()
  const [stats, setStats] = useState(null)
  const [recent, setRecent] = useState([])
  const [loading, setLoading] = useState(true)

  // Interactive document modals
  const [selectedDoc, setSelectedDoc] = useState(null)
  const [editDoc, setEditDoc] = useState(null)
  const [shareDoc, setShareDoc] = useState(null)
  const [permsDoc, setPermsDoc] = useState(null)
  const [versionsDoc, setVersionsDoc] = useState(null)
  const [activityDoc, setActivityDoc] = useState(null)

  const fetchDashboardData = async () => {
    try {
      const statsRes = await getDashboardStats()
      setStats(statsRes.data)
      setRecent(statsRes.data?.recentDocuments || [])
    } catch (err) {
      console.error('Dashboard load error:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDashboardData()
  }, [])

  if (loading) return <div className="page"><div className="spinner" /></div>

  return (
    <div className="page">
      <h1 className="page-title">Welcome back, {user?.fullName || 'User'}</h1>

      {stats && (
        <div className="grid-4 mb-2">
          <div className="stat-card">
            <div className="stat-num">{stats.totalDocuments ?? 0}</div>
            <div className="stat-label">My Documents</div>
          </div>
          <div className="stat-card">
            <div className="stat-num">{stats.sharedWithMeCount ?? 0}</div>
            <div className="stat-label">Shared With Me</div>
          </div>
          <div className="stat-card">
            <div className="stat-num">{stats.sharedByMeCount ?? 0}</div>
            <div className="stat-label">Shared By Me</div>
          </div>
          <div className="stat-card">
            <div className="stat-num">{Array.isArray(stats.categories) ? stats.categories.length : 0}</div>
            <div className="stat-label">Categories</div>
          </div>
        </div>
      )}

      <div className="flex-between mb-1" style={{ marginTop: '2.5rem' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#ffffff', margin: 0 }}>
            Recent Documents
          </h2>
          <p className="text-muted" style={{ fontSize: '0.85rem', marginTop: '0.2rem' }}>
            Click any document to inspect active permissions and choose an action.
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <button
            className="btn btn-ghost btn-sm"
            onClick={fetchDashboardData}
            title="Refresh recent documents"
            style={{ fontSize: '0.8rem', padding: '0.35rem 0.65rem', border: '1px solid #333', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
          >
            <RefreshCw size={13} strokeWidth={2} /> Refresh
          </button>
          <Link to="/documents" className="btn btn-ghost btn-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
            View all <ArrowRight size={13} strokeWidth={2} />
          </Link>
        </div>
      </div>

      {recent.length === 0 ? (
        <div className="empty-state">
          <p>No documents yet.</p>
          <Link to="/documents" className="btn btn-primary" style={{ marginTop: '1rem', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
            <Upload size={14} strokeWidth={2} /> Upload your first document
          </Link>
        </div>
      ) : (
        <div className="grid-2">
          {recent.map(doc => (
            <DocumentCard
              key={doc.id}
              doc={doc}
              onClick={() => setSelectedDoc(doc)}
              actions={[
                {
                  icon: <Shield size={13} strokeWidth={2} />,
                  label: 'Permissions & Actions',
                  onClick: () => setSelectedDoc(doc),
                  variant: 'btn-primary'
                }
              ]}
            />
          ))}
        </div>
      )}

      {/* Document Permissions & Action Hub Modal */}
      {selectedDoc && (
        <DocDetailModal
          doc={selectedDoc}
          onClose={() => setSelectedDoc(null)}
          onRefresh={fetchDashboardData}
          onOpenEdit={(d) => setEditDoc(d)}
          onOpenShare={(d) => setShareDoc(d)}
          onOpenPerms={(d) => setPermsDoc(d)}
          onOpenVersions={(d) => setVersionsDoc(d)}
          onOpenActivity={(d) => setActivityDoc(d)}
        />
      )}

      {/* Action Modals invoked from the Hub */}
      {editDoc && (
        <EditDocumentModal
          doc={editDoc}
          onClose={() => setEditDoc(null)}
          onSuccess={() => { setEditDoc(null); fetchDashboardData(); }}
        />
      )}

      {shareDoc && (
        <ShareModal
          doc={shareDoc}
          onClose={() => setShareDoc(null)}
          onSuccess={() => { setShareDoc(null); fetchDashboardData(); }}
        />
      )}

      {permsDoc && (
        <PermissionsModal
          doc={permsDoc}
          onClose={() => setPermsDoc(null)}
          onRefresh={fetchDashboardData}
        />
      )}

      {versionsDoc && (
        <VersionHistoryModal
          doc={versionsDoc}
          onClose={() => setVersionsDoc(null)}
          onRefresh={fetchDashboardData}
        />
      )}

      {activityDoc && (
        <ActivityModal
          doc={activityDoc}
          onClose={() => setActivityDoc(null)}
        />
      )}
    </div>
  )
}
