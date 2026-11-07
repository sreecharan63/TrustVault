import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext.jsx'
import { ProtectedRoute, AdminRoute } from './components/ProtectedRoute.jsx'
import Navbar from './components/Navbar.jsx'
import LoginPage from './pages/LoginPage.jsx'
import RegisterPage from './pages/RegisterPage.jsx'
import ForgotPasswordPage from './pages/ForgotPasswordPage.jsx'
import DashboardPage from './pages/DashboardPage.jsx'
import MyDocumentsPage from './pages/MyDocumentsPage.jsx'
import SharedWithMePage from './pages/SharedWithMePage.jsx'
import SharedByMePage from './pages/SharedByMePage.jsx'
import AdminAuditPage from './pages/AdminAuditPage.jsx'
import ProfilePage from './pages/ProfilePage.jsx'
import RequestsPage from './pages/RequestsPage.jsx'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Navbar />
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
          <Route path="/documents" element={<ProtectedRoute><MyDocumentsPage /></ProtectedRoute>} />
          <Route path="/shared-with-me" element={<ProtectedRoute><SharedWithMePage /></ProtectedRoute>} />
          <Route path="/shared-by-me" element={<ProtectedRoute><SharedByMePage /></ProtectedRoute>} />
          <Route path="/requests" element={<ProtectedRoute><RequestsPage /></ProtectedRoute>} />
          <Route path="/admin/audit" element={<AdminRoute><AdminAuditPage /></AdminRoute>} />
          <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
