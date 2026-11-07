import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { getMe } from '../api/auth.js'

const TOKEN_KEY = 'trustvault_token'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY))
  const [loading, setLoading] = useState(true)

  const fetchUser = useCallback(async () => {
    if (!localStorage.getItem(TOKEN_KEY)) { setLoading(false); return }
    try {
      const res = await getMe()
      setUser(res.data)
    } catch {
      localStorage.removeItem(TOKEN_KEY)
      setToken(null)
      setUser(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchUser() }, [fetchUser])

  const login = useCallback((accessToken, userData) => {
    localStorage.setItem(TOKEN_KEY, accessToken)
    setToken(accessToken)
    setUser(userData)
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY)
    setToken(null)
    setUser(null)
  }, [])

  const isAdmin = user?.role === 'ADMIN'

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, isAdmin }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
