import apiClient from './client.js'

export const getDashboardStats = () =>
  apiClient.get('/api/documents/dashboard-stats')

export const getMyDocuments = (params) =>
  apiClient.get('/api/documents', { params })

export const getSharedWithMe = (params) =>
  apiClient.get('/api/documents/shared-with-me', { params })

export const getSharedByMe = () =>
  apiClient.get('/api/documents/shared-by-me')

export const uploadDocument = (formData) =>
  apiClient.post('/api/documents/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  })

export const downloadDocument = (documentId) =>
  apiClient.get(`/api/documents/${documentId}/download`, { responseType: 'blob' })

export const previewDocument = (documentId) =>
  apiClient.get(`/api/documents/${documentId}/preview`, { responseType: 'blob' })

export const editDocument = (documentId, formData) =>
  apiClient.put(`/api/documents/${documentId}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  })

export const deleteDocument = (documentId) =>
  apiClient.delete(`/api/documents/${documentId}`)

export const shareDocument = (documentId, data) =>
  apiClient.post(`/api/documents/${documentId}/share`, data)

export const updateSharing = (documentId, data) =>
  apiClient.put(`/api/documents/${documentId}/share`, data)

export const revokeSharing = (documentId, recipientEmail) =>
  apiClient.delete(`/api/documents/${documentId}/share`, { params: { recipientEmail } })

export const getDocumentPermissions = (documentId) =>
  apiClient.get(`/api/documents/${documentId}/permissions`)

export const getDocumentVersions = (documentId) =>
  apiClient.get(`/api/documents/${documentId}/versions`)

export const downloadVersion = (documentId, versionNumber) =>
  apiClient.get(`/api/documents/${documentId}/versions/${versionNumber}/download`, { responseType: 'blob' })

export const restoreVersion = (documentId, versionNumber) =>
  apiClient.post(`/api/documents/${documentId}/versions/${versionNumber}/restore`)

export const getDocumentActivity = (documentId) =>
  apiClient.get(`/api/documents/${documentId}/activity`)
