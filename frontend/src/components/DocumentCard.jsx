import React from 'react'

export default function DocumentCard({ doc, actions }) {
  const fmtDate = (d) => d ? new Date(d).toLocaleDateString() : '-'
  const fmtSize = (bytes) => {
    if (!bytes) return '-'
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / 1048576).toFixed(2) + ' MB'
  }

  const typeIcon = (ct) => {
    if (!ct) return '📄'
    if (ct.includes('pdf')) return '📕'
    if (ct.includes('image')) return '🖼️'
    if (ct.includes('spreadsheet') || ct.includes('excel') || ct.includes('csv')) return '📊'
    if (ct.includes('word') || ct.includes('document')) return '📘'
    if (ct.includes('text')) return '📝'
    return '📄'
  }

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
        <span style={{ fontSize: '2rem' }}>{typeIcon(doc.contentType)}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: '0.95rem', wordBreak: 'break-word' }}>
            {doc.originalFilename}
          </div>
          {doc.description && <div className="text-muted" style={{ marginTop: '0.2rem' }}>{doc.description}</div>}
          <div className="text-muted" style={{ marginTop: '0.35rem', display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
            <span>{fmtSize(doc.fileSize)}</span>
            <span>{fmtDate(doc.createdAt)}</span>
            {doc.currentVersionNumber > 1 && <span>v{doc.currentVersionNumber}</span>}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
        {doc.category && <span className="badge badge-neutral">{doc.category}</span>}
        {doc.tags && doc.tags.split(',').map(t => t.trim()).filter(Boolean).map(t => (
          <span key={t} className="badge badge-neutral">#{t}</span>
        ))}
      </div>

      {doc.ownerEmail && !doc.isOwner && (
        <div className="text-muted text-sm">
          Owner: {doc.ownerName || doc.ownerEmail}
          <span style={{ marginLeft: '0.75rem', display: 'inline-flex', gap: '0.35rem' }}>
            {doc.canRead && <span className="badge badge-success">Read</span>}
            {doc.canEdit && <span className="badge badge-warning">Edit</span>}
            {doc.canDownload && <span className="badge badge-success">Download</span>}
          </span>
        </div>
      )}

      {actions && actions.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginTop: 'auto', paddingTop: '0.5rem', borderTop: '1px solid var(--border)' }}>
          {actions.map((a, i) => (
            <button key={i} className={`btn btn-sm ${a.variant || 'btn-ghost'}`} onClick={a.onClick} title={a.title || a.label}>
              {a.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
