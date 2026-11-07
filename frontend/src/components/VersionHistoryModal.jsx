import React, { useState, useEffect } from 'react'
import { getDocumentVersions, downloadVersion, restoreVersion } from '../api/documents.js'

export default function VersionHistoryModal({ doc, onClose, onRefresh }) {
  const [versions, setVersions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [actionLoading, setActionLoading] = useState(null)

  useEffect(() => {
    (async () => {
      try {
        const res = await getDocumentVersions(doc.id)
        setVersions(Array.isArray(res.data) ? res.data : [])
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load versions.')
      } finally {
        setLoading(false)
      }
    })()
  }, [doc.id])

  const handleDownload = async (vn) => {
    setActionLoading('dl-' + vn)
    try {
      const res = await downloadVersion(doc.id, vn)
      const url = URL.createObjectURL(res.data)
      const a = document.createElement('a')
      a.href = url
      a.download = doc.originalFilename || 'file'
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      setError('Download failed.')
    } finally {
      setActionLoading(null)
    }
  }

  const handleRestore = async (vn) => {
    if (!confirm(`Restore version ${vn}? This will create a new version with the restored content.`)) return
    setActionLoading('rs-' + vn)
    try {
      await restoreVersion(doc.id, vn)
      if (onRefresh) onRefresh()
      onClose()
    } catch (err) {
      setError(err.response?.data?.message || 'Restore failed.')
    } finally {
      setActionLoading(null)
    }
  }

  const fmtDate = (d) => d ? new Date(d).toLocaleString() : '-'
  const fmtSize = (bytes) => {
    if (!bytes) return '-'
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / 1048576).toFixed(2) + ' MB'
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 680 }}>
        <div className="modal-title">
          📋 Version History
          <button className="btn btn-ghost btn-sm" onClick={onClose}>✕</button>
        </div>
        <p className="text-muted mb-2">{doc.originalFilename}</p>
        {error && <div className="error-box">{error}</div>}
        {loading ? <div className="spinner" /> : versions.length === 0 ? (
          <div className="empty-state">No previous versions</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Ver</th>
                <th>Size</th>
                <th>Checksum</th>
                <th>Created</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {versions.map(v => (
                <tr key={v.versionNumber}>
                  <td><strong>v{v.versionNumber}</strong></td>
                  <td>{fmtSize(v.fileSize)}</td>
                  <td style={{fontSize:'0.75rem', maxWidth:120, overflow:'hidden', textOverflow:'ellipsis'}} title={v.checksum}>{v.checksum?.substring(0, 12)}…</td>
                  <td>{fmtDate(v.createdAt)}</td>
                  <td style={{ display: 'flex', gap: '0.4rem' }}>
                    <button className="btn btn-ghost btn-sm" onClick={() => handleDownload(v.versionNumber)} disabled={!!actionLoading}>⬇</button>
                    <button className="btn btn-primary btn-sm" onClick={() => handleRestore(v.versionNumber)} disabled={!!actionLoading}>↩ Restore</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
