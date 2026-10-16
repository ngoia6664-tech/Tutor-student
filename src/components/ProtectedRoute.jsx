import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext.jsx'
import Loading from './Loading.jsx'
import ErrorBox from './ErrorBox.jsx'
import Icon from './Icon.jsx'

// Chặn trang theo vai trò: sai vai trò thì chuyển về trang của mình
export default function ProtectedRoute({ role, children }) {
  const { session, profile, profileError, loading, signOut, reloadProfile } = useAuth()
  const location = useLocation()

  if (loading) return <Loading full text="Đang kiểm tra đăng nhập..." />
  if (!session) return <Navigate to="/login" replace state={{ from: location.pathname }} />
  if (profileError || !profile) {
    return (
      <div className="page narrow">
        <ErrorBox message={profileError || 'Không đọc được hồ sơ tài khoản.'} onRetry={reloadProfile}>
          <button type="button" className="btn btn-small btn-ghost" onClick={signOut}>
            <Icon name="logout" />
            Đăng xuất
          </button>
        </ErrorBox>
      </div>
    )
  }
  if (profile.role !== role) return <Navigate to={`/${profile.role}`} replace />
  return children
}
