import React, { useState, useEffect } from 'react'
import { ZoomIn, ZoomOut, X, ExternalLink, Download, Copy, Check, ShieldCheck } from 'lucide-react'
import FileIcon from './FileIcon.jsx'

export default function PreviewModal({
  doc,
  blobUrl,
  contentType,
  textContent,
  onClose
}) {
  const [zoom, setZoom] = useState(1)
  const [wrapLines, setWrapLines] = useState(true)
  const [copied, setCopied] = useState(false)

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  if (!doc || !blobUrl) return null

  const filename = doc.originalFilename || 'document'
  const ext = filename.split('.').pop().toLowerCase()
  const mime = (contentType || doc.contentType || '').toLowerCase()

  const isImage = mime.startsWith('image/') || ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp', 'ico'].includes(ext)
  const isPdf = mime.includes('pdf') || ext === 'pdf'
  const isVideo = mime.startsWith('video/') || ['mp4', 'webm', 'ogg', 'mov'].includes(ext)
  const isAudio = mime.startsWith('audio/') || ['mp3', 'wav', 'ogg', 'm4a', 'aac'].includes(ext)
  const isText = Boolean(textContent !== null && textContent !== undefined) ||
    mime.startsWith('text/') ||
    mime.includes('json') ||
    mime.includes('javascript') ||
    mime.includes('xml') ||
    ['txt', 'csv', 'json', 'js', 'ts', 'jsx', 'tsx', 'html', 'css', 'md', 'xml', 'yaml', 'yml', 'log', 'sql'].includes(ext)

  const fmtSize = (bytes) => {
    if (!bytes) return '-'
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / 1048576).toFixed(2) + ' MB'
  }

  const handleCopyText = async () => {
    if (!textContent) return
    try {
      await navigator.clipboard.writeText(textContent)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback
    }
  }

  return (
    <div
      className="modal-overlay"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      style={{
        zIndex: 1100,
        backgroundColor: 'rgba(0, 0, 0, 0.88)',
        backdropFilter: 'blur(8px)',
        padding: '1rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}
    >
      <div
        className="modal"
        style={{
          width: '94vw',
          maxWidth: isPdf ? '1100px' : isImage ? '950px' : '900px',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          padding: 0,
          background: '#141414',
          border: '1px solid #2e2e2e',
          borderRadius: '12px',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.8), 0 0 1px rgba(229, 9, 20, 0.3)',
          overflow: 'hidden'
        }}
      >
        {/* Top Header Bar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0.85rem 1.25rem',
            borderBottom: '1px solid #262626',
            background: '#181818',
            gap: '1rem'
          }}
        >
          {/* Filename and Info */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', minWidth: 0 }}>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: '8px',
                background: '#222222',
                border: '1px solid #2e2e2e',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}
            >
              <FileIcon contentType={mime} filename={filename} size={20} />
            </div>
            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  fontWeight: 700,
                  fontSize: '0.98rem',
                  color: '#ffffff',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  maxWidth: '380px'
                }}
                title={filename}
              >
                {filename}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', color: '#8c8c8c' }}>
                <span>{fmtSize(doc.fileSize)}</span>
                <span>•</span>
                <span style={{ textTransform: 'uppercase', letterSpacing: '0.04em' }}>{ext || 'FILE'}</span>
                <span>•</span>
                <span>Version {doc.currentVersionNumber || 1}</span>
              </div>
            </div>
          </div>

          {/* Action Toolbar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
            {/* Direct Open in New Tab (Never blocked by popup blockers because user clicked this explicit link) */}
            <a
              href={blobUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-ghost btn-sm"
              title="Open document in a dedicated browser tab"
              style={{
                fontSize: '0.8rem',
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                padding: '0.35rem 0.65rem',
                border: '1px solid #333'
              }}
            >
              <ExternalLink size={13} strokeWidth={2} /> Open New Tab
            </a>

            {/* Direct Download */}
            <a
              href={blobUrl}
              download={filename}
              className="btn btn-primary btn-sm"
              title="Download file to device"
              style={{
                fontSize: '0.8rem',
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                padding: '0.35rem 0.75rem'
              }}
            >
              <Download size={13} strokeWidth={2} /> Download
            </a>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="btn btn-ghost btn-sm"
              style={{
                borderRadius: '50%',
                width: 32,
                height: 32,
                padding: 0,
                fontSize: '1rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#aaaaaa'
              }}
              title="Close Preview (Esc)"
            >
              <X size={16} strokeWidth={2} />
            </button>
          </div>
        </div>

        {/* Subheader Controls (Zoom for images, Wrap for text) */}
        {isImage && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.75rem',
              padding: '0.45rem 1rem',
              background: '#111111',
              borderBottom: '1px solid #222222',
              fontSize: '0.8rem',
              color: '#cccccc'
            }}
          >
            <button
              className="btn btn-ghost btn-sm"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', padding: '0.2rem 0.55rem', fontSize: '0.75rem' }}
              onClick={() => setZoom(z => Math.max(0.5, +(z - 0.25).toFixed(2)))}
            >
              <ZoomOut size={13} strokeWidth={2} /> Zoom Out
            </button>
            <span style={{ minWidth: '45px', textAlign: 'center', fontWeight: 600, color: 'var(--accent)' }}>
              {Math.round(zoom * 100)}%
            </span>
            <button
              className="btn btn-ghost btn-sm"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', padding: '0.2rem 0.55rem', fontSize: '0.75rem' }}
              onClick={() => setZoom(z => Math.min(3, +(z + 0.25).toFixed(2)))}
            >
              <ZoomIn size={13} strokeWidth={2} /> Zoom In
            </button>
            <button
              className="btn btn-ghost btn-sm"
              style={{ padding: '0.2rem 0.55rem', fontSize: '0.75rem' }}
              onClick={() => setZoom(1)}
            >
              Reset (100%)
            </button>
          </div>
        )}

        {isText && textContent !== null && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0.45rem 1.25rem',
              background: '#111111',
              borderBottom: '1px solid #222222',
              fontSize: '0.8rem',
              color: '#cccccc'
            }}
          >
            <span style={{ color: '#888' }}>
              Lines: {textContent.split('\n').length} • Characters: {textContent.length.toLocaleString()}
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', cursor: 'pointer', fontSize: '0.75rem' }}>
                <input
                  type="checkbox"
                  checked={wrapLines}
                  onChange={e => setWrapLines(e.target.checked)}
                />
                Wrap Lines
              </label>
              <button
                className="btn btn-ghost btn-sm"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', padding: '0.2rem 0.55rem', fontSize: '0.75rem' }}
                onClick={handleCopyText}
              >
                {copied ? (
                  <>
                    <Check size={12} strokeWidth={2.5} color="#46d369" /> Copied
                  </>
                ) : (
                  <>
                    <Copy size={12} strokeWidth={2} /> Copy Text
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Viewer Content Area */}
        <div
          style={{
            flex: 1,
            overflow: 'auto',
            background: '#0d0d0d',
            display: 'flex',
            alignItems: isPdf ? 'stretch' : 'center',
            justifyContent: isPdf ? 'stretch' : 'center',
            minHeight: '400px',
            maxHeight: 'calc(92vh - 120px)',
            position: 'relative'
          }}
        >
          {/* 1. PDF Viewer */}
          {isPdf && (
            <div style={{ width: '100%', height: '76vh', display: 'flex', flexDirection: 'column' }}>
              <iframe
                src={`${blobUrl}#toolbar=1&navpanes=0`}
                title={filename}
                style={{
                  width: '100%',
                  height: '100%',
                  border: 'none',
                  background: '#1e1e1e'
                }}
              />
            </div>
          )}

          {/* 2. Image Viewer */}
          {isImage && (
            <div
              style={{
                width: '100%',
                height: '100%',
                minHeight: '400px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'auto',
                padding: '1.5rem'
              }}
            >
              <img
                src={blobUrl}
                alt={filename}
                style={{
                  transform: `scale(${zoom})`,
                  transformOrigin: 'center center',
                  transition: 'transform 0.15s ease-out',
                  maxWidth: zoom <= 1 ? '100%' : 'none',
                  maxHeight: zoom <= 1 ? '70vh' : 'none',
                  objectFit: 'contain',
                  borderRadius: '6px',
                  boxShadow: '0 8px 30px rgba(0, 0, 0, 0.6)'
                }}
              />
            </div>
          )}

          {/* 3. Text / Code / CSV Viewer */}
          {isText && textContent !== null && (
            <div style={{ width: '100%', height: '100%', padding: '1.25rem', overflow: 'auto' }}>
              <pre
                style={{
                  margin: 0,
                  fontFamily: 'Consolas, Monaco, "Courier New", monospace',
                  fontSize: '0.85rem',
                  lineHeight: 1.6,
                  color: '#e6e6e6',
                  whiteSpace: wrapLines ? 'pre-wrap' : 'pre',
                  wordBreak: wrapLines ? 'break-word' : 'normal'
                }}
              >
                {textContent}
              </pre>
            </div>
          )}

          {/* 4. Video Viewer */}
          {isVideo && (
            <div style={{ padding: '1.5rem', width: '100%', display: 'flex', justifyContent: 'center' }}>
              <video
                controls
                src={blobUrl}
                style={{ maxWidth: '100%', maxHeight: '70vh', borderRadius: '8px', background: '#000' }}
              />
            </div>
          )}

          {/* 5. Audio Viewer */}
          {isAudio && (
            <div style={{ padding: '3rem 2rem', textAlign: 'center' }}>
              <div style={{ marginBottom: '1.25rem', display: 'flex', justifyContent: 'center' }}>
                <div
                  style={{
                    width: 72,
                    height: 72,
                    borderRadius: '16px',
                    background: '#222222',
                    border: '1px solid #333333',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <FileIcon contentType={mime} filename={filename} size={36} />
                </div>
              </div>
              <div style={{ color: '#ffffff', fontWeight: 600, marginBottom: '1.5rem' }}>{filename}</div>
              <audio controls src={blobUrl} style={{ width: '380px', maxWidth: '100%' }} />
            </div>
          )}

          {/* 6. Fallback for Office docs, archives, binary files */}
          {!isPdf && !isImage && !isVideo && !isAudio && (!isText || textContent === null) && (
            <div
              style={{
                textAlign: 'center',
                padding: '3rem 2rem',
                maxWidth: '480px',
                margin: '0 auto'
              }}
            >
              <div
                style={{
                  width: '80px',
                  height: '80px',
                  borderRadius: '16px',
                  background: 'rgba(229, 9, 20, 0.12)',
                  border: '1.5px solid rgba(229, 9, 20, 0.35)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 1.5rem auto'
                }}
              >
                <FileIcon contentType={mime} filename={filename} size={38} />
              </div>
              <h3 style={{ color: '#ffffff', fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem' }}>
                Preview Not Supported In-Browser
              </h3>
              <p style={{ color: '#999999', fontSize: '0.875rem', lineHeight: 1.6, marginBottom: '1.75rem' }}>
                The file <strong>{filename}</strong> ({mime || ext.toUpperCase()}) cannot be natively rendered inside the browser viewport.
                You can download the original file to view it with your local software or try opening it in a dedicated tab.
              </p>
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
                <a
                  href={blobUrl}
                  download={filename}
                  className="btn btn-primary"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.65rem 1.25rem', textDecoration: 'none' }}
                >
                  <Download size={15} strokeWidth={2} /> Download File
                </a>
                <a
                  href={blobUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-ghost"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.65rem 1.25rem', textDecoration: 'none', border: '1px solid #333' }}
                >
                  <ExternalLink size={15} strokeWidth={2} /> Open in New Tab
                </a>
              </div>
            </div>
          )}
        </div>

        {/* Footer info tip */}
        <div
          style={{
            padding: '0.6rem 1.25rem',
            background: '#141414',
            borderTop: '1px solid #222222',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '0.75rem',
            color: '#666666'
          }}
        >
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
            <ShieldCheck size={13} strokeWidth={2} color="#46d369" /> End-to-End Vault Access Verified
          </span>
          <span>Tip: Press <strong>Esc</strong> to close viewer</span>
        </div>
      </div>
    </div>
  )
}
