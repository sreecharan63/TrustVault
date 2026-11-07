import apiClient from './client.js'

export const login = (email, password) =>
  apiClient.post('/api/auth/login', { email, password })

export const register = (fullName, email, password) =>
  apiClient.post('/api/auth/register', { fullName, email, password })

export const getMe = () =>
  apiClient.get('/api/auth/me')
