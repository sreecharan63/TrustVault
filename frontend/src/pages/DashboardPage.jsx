import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { getDashboardStats, getMyDocuments } from '../api/documents.js'
import { useAuth } from '../contexts/AuthContext.jsx'
import DocumentCard from '../components/DocumentCard.jsx'

export default function DashboardPage() {
  const { user } = useAuth()
  const [stats, setStats] = useState(null)
  const [recent, setRecent] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    (async () => {
      try {
        const [statsRes, docsRes] = await Promise.all([
          getDashboardStats(),
          getMyDocuments({ page: 0, size: 5 })
        ])
        setStats(statsRes.data)
        const docsData = docsRes.data
        setRecent(Array.isArray(docsData) ? docsData : docsData.content || [])
      } catch (err) {
        console.error('Dashboard load error:', err)
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  if (loading) return <div className="page"><div className="spinner" /></div>

  return (
    <div className="page">
      <h1 className="page-title">Welcome back, {user?.fullName || 'User'} 👋</h1>

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

      <div className="flex-between mb-1" style={{ marginTop: '2rem' }}>
        <h2 style={{ fontSize: '1.15rem', fontWeight: 600 }}>Recent Documents</h2>
        <Link to="/documents" className="btn btn-ghost btn-sm">View all →</Link>
      </div>

      {recent.length === 0 ? (
        <div className="empty-state">
          <p>No documents yet.</p>
          <Link to="/documents" className="btn btn-primary" style={{ marginTop: '1rem' }}>📤 Upload your first document</Link>
        </div>
      ) : (
        <div className="grid-2">
          {recent.map(doc => (
            <DocumentCard key={doc.id} doc={doc} actions={[]} />
          ))}
        </div>
      )}
    </div>
  )
}
