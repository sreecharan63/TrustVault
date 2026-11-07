import apiClient from './client.js'

export const getAuditLogs = (params) =>
  apiClient.get('/api/admin/audit-logs', { params })
