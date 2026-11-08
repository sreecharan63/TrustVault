import React, { useState } from 'react'
import { createFileRequest } from '../api/requests.js'
import { FilePlus, X, Send, RefreshCw } from 'lucide-react'

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
        <div className="modal-title" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem' }}>
            <FilePlus size={18} strokeWidth={2} color="var(--accent)" /> Request File Access from Admin
          </span>
          <button className="btn btn-ghost btn-sm" onClick={onClose} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, padding: 0 }}>
            <X size={16} strokeWidth={2} />
          </button>
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
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
            >
              {loading ? (
                <>
                  <RefreshCw size={13} className="spin" /> Submitting...
                </>
              ) : (
                <>
                  <Send size={14} strokeWidth={2} /> Send Request to Admin
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
