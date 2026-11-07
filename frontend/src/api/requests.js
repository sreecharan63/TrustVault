import apiClient from './client.js'

export const createFileRequest = (data) =>
  apiClient.post('/api/requests', data)

export const getMyFileRequests = () =>
  apiClient.get('/api/requests/my')

export const getAllFileRequests = () =>
  apiClient.get('/api/requests')

export const resolveFileRequest = (id, data) =>
  apiClient.put(`/api/requests/${id}/resolve`, data)
