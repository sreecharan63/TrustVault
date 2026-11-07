import React, { useState } from 'react'
import { createFileRequest } from '../api/requests.js'

export default function NewRequestModal({ onClose, onSuccess }) {
  const [fileName, setFileName] = useState('')
  const [accessSpecification, setAccessSpecification] = useState('READ')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!fileName.trim()) { setError('File name is required.'); return }
    if (!description.trim()) { setError('Description is required.'); return }

    setLoading(true)
    setError('')
    try {
      await createFileRequest({
        fileName: fileName.trim(),
        accessSpecification,
        description: description.trim()
      })
      onSuccess()
    } catch (err) {
      setError(err.response?.data?.message || err.response?.data?.error || 'Failed to submit file request.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-title">
          📄 Request File Access from Admin
          <button className="btn btn-ghost btn-sm" onClick={onClose}>✕</button>
        </div>

        {error && <div className="error-box">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Requested File Name *</label>
            <input
              type="text"
              value={fileName}
              onChange={e => setFileName(e.target.value)}
              placeholder="e.g. Annual-Report-2025.pdf or Project-Specs.docx"
              required
              autoFocus
            />
          </div>

          <div className="form-group">
            <label className="form-label">Access Specification *</label>
            <select
              value={accessSpecification}
              onChange={e => setAccessSpecification(e.target.value)}
            >
              <option value="READ">Read (View & Download Access)</option>
              <option value="EDIT">Edit (Modify & Update Access)</option>
              <option value="FULL_ACCESS">Full Access (Read, Edit & Share)</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Description / Justification *</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={3}
              placeholder="Explain why you need access to this file..."
              required
            />
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1.25rem' }}>
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? '⏳ Submitting...' : '📨 Send Request to Admin'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
