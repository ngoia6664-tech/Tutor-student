import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext.jsx'
import Loading from './Loading.jsx'

// Trang gốc "/": chuyển theo vai trò
export default function RootRedirect() {
  const { session, profile, loading } = useAuth()
  if (loading) return <Loading full />
  if (!session || !profile) return <Navigate to="/login" replace />
  return <Navigate to={`/${profile.role}`} replace />
}
