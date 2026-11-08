import React, { useState } from 'react'
import { editDocument } from '../api/documents.js'
import { Edit3, X, Save, RefreshCw } from 'lucide-react'

export default function EditDocumentModal({ doc, onClose, onSuccess }) {
  const [file, setFile] = useState(null)
  const [description, setDescription] = useState(doc.description || '')
  const [category, setCategory] = useState(doc.category || '')
  const [tags, setTags] = useState(doc.tags || '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true); setError('')
    try {
      const fd = new FormData()
      if (file) fd.append('file', file)
      fd.append('description', description)
      fd.append('category', category)
      fd.append('tags', tags)
      await editDocument(doc.id, fd)
      onSuccess()
    } catch (err) {
      setError(err.response?.data?.message || err.response?.data?.error || 'Edit failed.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-title" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem' }}>
            <Edit3 size={18} strokeWidth={2} color="var(--accent)" /> Edit Document
          </span>
          <button className="btn btn-ghost btn-sm" onClick={onClose} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, padding: 0 }}>
            <X size={16} strokeWidth={2} />
          </button>
        </div>
        <p className="text-muted mb-2">Editing: {doc.originalFilename}</p>
        {error && <div className="error-box">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Replace file (optional)</label>
            <input type="file" onChange={e => setFile(e.target.files[0])} />
          </div>
          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} />
          </div>
          <div className="form-group">
            <label className="form-label">Category</label>
            <input value={category} onChange={e => setCategory(e.target.value)} placeholder="e.g. Finance, Legal" />
          </div>
          <div className="form-group">
            <label className="form-label">Tags</label>
            <input value={tags} onChange={e => setTags(e.target.value)} placeholder="comma-separated" />
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1.25rem' }}>
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
            >
              {loading ? (
                <>
                  <RefreshCw size={13} className="spin" /> Saving...
                </>
              ) : (
                <>
                  <Save size={14} strokeWidth={2} /> Save Changes
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
