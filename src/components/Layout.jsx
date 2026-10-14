import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { Suspense, useEffect } from 'react'
import { prefetchPages } from '../pages/registry.js'
import { useAuth } from '../contexts/AuthContext.jsx'
import Loading from './Loading.jsx'
import ErrorBoundary from './ErrorBoundary.jsx'
import ThemeToggle from './ThemeToggle.jsx'

const NAV = {
  tutor: [
    { to: '/tutor', label: 'Học sinh', end: true },
    { to: '/tutor/library', label: 'Thư viện' },
    { to: '/tutor/assignments', label: 'Bài tập' },
    { to: '/tutor/lessons', label: 'Bài giảng' },
    { to: '/tutor/import', label: 'Dán JSON' },
  ],
  student: [
    { to: '/student', label: 'Bài cần làm', end: true },
    { to: '/student/results', label: 'Kết quả' },
    { to: '/student/lessons', label: 'Bài giảng' },
  ],
}

export default function Layout() {
  const { profile, signOut } = useAuth()
  const items = NAV[profile.role] || []
  const { pathname } = useLocation()
  // Trong Thư viện, đổi chương chỉ đổi cột phải: giữ nguyên trang (không chạy lại hiệu ứng, không mất mục lục)
  const pageKey = pathname.startsWith('/tutor/library') ? '/tutor/library' : pathname

  useEffect(() => {
    prefetchPages(profile.role)
  }, [profile.role])
  // Đổi trang thì về đầu trang
  useEffect(() => {
    window.scrollTo({ top: 0 })
  }, [pathname])

  return (
    <div className="app">
      <header className="topbar">
        <div className="topbar-inner">
          <span className="brand">
            <span className="brand-mark">⚛</span> Study with Duy Anh
          </span>
          <div className="topbar-user">
            <span className="user-name" title={profile.full_name}>
              {profile.full_name || 'Tài khoản'}
            </span>
            <ThemeToggle />
            <button type="button" className="btn btn-small btn-ghost" onClick={signOut}>
              Đăng xuất
            </button>
          </div>
        </div>
        <nav className="nav">
          {items.map((it) => (
            <NavLink key={it.to} to={it.to} end={it.end} className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}>
              {it.label}
            </NavLink>
          ))}
        </nav>
      </header>
      <main className="page">
        {/* key theo đường dẫn: mỗi lần đổi trang chạy lại hiệu ứng hiện trang và xóa lỗi cũ */}
        <div key={pageKey} className="page-enter">
          <ErrorBoundary>
            <Suspense fallback={<Loading />}>
              <Outlet />
            </Suspense>
          </ErrorBoundary>
        </div>
      </main>
    </div>
  )
}
