import apiClient from './client.js'

export const createFileRequest = (data) =>
  apiClient.post('/api/requests', data)

export const getMyFileRequests = () =>
  apiClient.get('/api/requests/my')

export const getAllFileRequests = () =>
  apiClient.get('/api/requests')

export const resolveFileRequest = (id, data) => {
  if (data instanceof FormData) {
    return apiClient.put(`/api/requests/${id}/resolve`, data, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
  }
  return apiClient.put(`/api/requests/${id}/resolve`, data)
}
