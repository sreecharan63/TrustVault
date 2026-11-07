import apiClient from './client.js'

export const login = (email, password) =>
  apiClient.post('/api/auth/login', { email, password })

export const register = (fullName, email, password, role = 'DOCUMENT_OWNER') =>
  apiClient.post('/api/auth/register', { fullName, email, password, role })

export const getMe = () =>
  apiClient.get('/api/auth/me')

export const getShareableUsers = () =>
  apiClient.get('/api/auth/users')

export const forgotPassword = (email) =>
  apiClient.post('/api/auth/forgot-password', { email })

export const resetPassword = (token, newPassword) =>
  apiClient.post('/api/auth/reset-password', { token, newPassword })
