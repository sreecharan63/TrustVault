import React from 'react'
import FileIcon from './FileIcon.jsx'
import { Sparkles } from 'lucide-react'

export default function DocumentCard({ doc, actions, isUpdated, onClick }) {
  const fmtDate = (d) => d ? new Date(d).toLocaleDateString() : '-'
  const fmtTime = (d) => d ? new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''
  const fmtSize = (bytes) => {
    if (!bytes) return '-'
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / 1048576).toFixed(2) + ' MB'
  }

  const isNew = doc.createdAt === doc.updatedAt || doc.currentVersionNumber === 1

  return (
    <div
      className="card document-card"
      onClick={onClick}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem',
        position: 'relative',
        cursor: onClick ? 'pointer' : 'default',
        ...(isUpdated ? {
          border: '1.5px solid var(--accent)',
          background: 'linear-gradient(135deg, rgba(229, 9, 20, 0.12) 0%, rgba(24, 24, 24, 0.98) 100%)',
          boxShadow: '0 0 16px rgba(229, 9, 20, 0.35)'
        } : {})
      }}
    >
      {/* Visual Color Indication Badge for New/Updated Documents */}
      {isUpdated && (
        <div style={{
          position: 'absolute',
          top: '-10px',
          right: '12px',
          display: 'flex',
          alignItems: 'center',
          gap: '0.35rem',
          zIndex: 2
        }}>
          <span style={{
            background: 'var(--accent)',
            color: '#ffffff',
            fontSize: '0.7rem',
            fontWeight: 800,
            letterSpacing: '0.04em',
            padding: '0.2rem 0.6rem',
            borderRadius: '9999px',
            boxShadow: '0 2px 8px rgba(229, 9, 20, 0.6)',
            textTransform: 'uppercase',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.3rem'
          }}>
            <Sparkles size={11} strokeWidth={2.4} /> {isNew ? 'New' : 'Updated'}
          </span>
        </div>
      )}

      <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
        <div style={{
          width: 44,
          height: 44,
          borderRadius: 8,
          background: 'rgba(255, 255, 255, 0.04)',
          border: '1px solid #2a2a2a',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0
        }}>
          <FileIcon contentType={doc.contentType} filename={doc.originalFilename} size={22} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: '0.95rem', wordBreak: 'break-word', color: '#ffffff' }}>
            {doc.originalFilename}
          </div>
          {doc.description && <div className="text-muted" style={{ marginTop: '0.2rem', fontSize: '0.825rem' }}>{doc.description}</div>}
          <div className="text-muted" style={{ marginTop: '0.35rem', display: 'flex', flexWrap: 'wrap', gap: '0.75rem', fontSize: '0.8rem' }}>
            <span>{fmtSize(doc.fileSize)}</span>
            <span>Created {fmtDate(doc.createdAt)}</span>
            {doc.updatedAt && doc.updatedAt !== doc.createdAt && (
              <span style={{ color: isUpdated ? '#ff6b6b' : 'inherit', fontWeight: isUpdated ? 600 : 'normal' }}>
                Updated {fmtDate(doc.updatedAt)} {fmtTime(doc.updatedAt)}
              </span>
            )}
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

      {doc.ownerEmail && (
        <div className="text-muted text-sm">
          Owner: {doc.ownerName || doc.ownerEmail}
          {doc.isOwner && <span className="badge badge-neutral" style={{ marginLeft: '0.4rem', fontSize: '0.75rem' }}>You</span>}
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
            <button
              key={i}
              className={`btn btn-sm ${a.variant || 'btn-ghost'}`}
              onClick={(e) => {
                e.stopPropagation()
                a.onClick(e)
              }}
              title={a.title || a.label}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
            >
              {a.icon}
              {a.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
