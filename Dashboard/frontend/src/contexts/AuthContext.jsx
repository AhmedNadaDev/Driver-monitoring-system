import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import * as authApi from '../services/authApi.js'

const AuthContext = createContext(null)

export const ROLES = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  ADMIN: 'ADMIN',
}

export const AuthProvider = ({ children }) => {
  const [admin, setAdmin] = useState(null)
  const [loading, setLoading] = useState(true)

  const loadSession = useCallback(async () => {
    try {
      await authApi.initAuth()
      const me = await authApi.getMe()
      setAdmin(me)
    } catch {
      setAdmin(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadSession()
  }, [loadSession])

  useEffect(() => {
    const onExpired = () => {
      setAdmin(null)
      window.location.href = '/login'
    }
    window.addEventListener('auth:session-expired', onExpired)
    return () => window.removeEventListener('auth:session-expired', onExpired)
  }, [])

  const login = async (identifier, password) => {
    await authApi.initAuth()
    const data = await authApi.login(identifier, password)
    setAdmin(data.admin)
    return data.admin
  }

  const logout = async () => {
    try {
      await authApi.logout()
    } finally {
      setAdmin(null)
    }
  }

  const refreshAdmin = async () => {
    const me = await authApi.getMe()
    setAdmin(me)
    return me
  }

  const value = useMemo(
    () => ({
      admin,
      loading,
      isAuthenticated: !!admin,
      isSuperAdmin: admin?.role === ROLES.SUPER_ADMIN,
      login,
      logout,
      refreshAdmin,
    }),
    [admin, loading]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
