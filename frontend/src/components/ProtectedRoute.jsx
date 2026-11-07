import React from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext.jsx'

export function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) return <div className="spinner" style={{ marginTop: '8rem' }} />
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />
  return children
}

export function AdminRoute({ children }) {
  const { user, isAdmin, loading } = useAuth()
  const location = useLocation()

  if (loading) return <div className="spinner" style={{ marginTop: '8rem' }} />
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />
  if (!isAdmin) return <Navigate to="/" replace />
  return children
}
