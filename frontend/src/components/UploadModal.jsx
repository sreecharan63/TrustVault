import React, { useState } from 'react'
import { uploadDocument } from '../api/documents.js'

export default function UploadModal({ onClose, onSuccess }) {
  const [file, setFile] = useState(null)
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('')
  const [tags, setTags] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!file) { setError('Please select a file.'); return }
    setLoading(true); setError('')
    try {
      const fd = new FormData()
      fd.append('file', file)
      if (description) fd.append('description', description)
      if (category) fd.append('category', category)
      if (tags) fd.append('tags', tags)
      const res = await uploadDocument(fd)
      onSuccess(res?.data)
    } catch (err) {
      setError(err.response?.data?.message || 'Upload failed.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-title">
          📤 Upload Document
          <button className="btn btn-ghost btn-sm" onClick={onClose}>✕</button>
        </div>
        {error && <div className="error-box">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">File *</label>
            <input type="file" onChange={e => setFile(e.target.files[0])} accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg,.gif,.xlsx,.xls,.csv" required />
          </div>
          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} placeholder="Optional description..." />
          </div>
          <div className="form-group">
            <label className="form-label">Category</label>
            <input value={category} onChange={e => setCategory(e.target.value)} placeholder="e.g. Finance, Legal, HR" />
          </div>
          <div className="form-group">
            <label className="form-label">Tags</label>
            <input value={tags} onChange={e => setTags(e.target.value)} placeholder="comma-separated: invoice, 2025, q1" />
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1.25rem' }}>
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? '⏳ Uploading...' : '📤 Upload'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
