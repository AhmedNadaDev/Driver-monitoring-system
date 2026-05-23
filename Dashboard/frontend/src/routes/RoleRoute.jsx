import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext.jsx'

const RoleRoute = ({ roles }) => {
  const { admin, loading } = useAuth()

  if (loading) return null

  if (!admin || !roles.includes(admin.role)) {
    return <Navigate to="/" replace />
  }

  return <Outlet />
}

export default RoleRoute
