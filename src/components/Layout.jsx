import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { Suspense, useEffect } from 'react'
import { prefetchPages } from '../pages/registry.js'
import { useAuth } from '../contexts/AuthContext.jsx'
import Loading from './Loading.jsx'
import ErrorBoundary from './ErrorBoundary.jsx'
import ThemeToggle from './ThemeToggle.jsx'
import Icon from './Icon.jsx'
import NotificationBell from './NotificationBell.jsx'
import { NotificationsProvider } from '../contexts/NotificationsContext.jsx'

const NAV = {
  tutor: [
    { to: '/tutor', label: 'Học sinh', icon: 'users', end: true, also: /^\/tutor\/students\// },
    { to: '/tutor/library', label: 'Thư viện', icon: 'library' },
    { to: '/tutor/assignments', label: 'Bài tập', icon: 'assignment' },
    { to: '/tutor/lessons', label: 'Bài giảng', icon: 'lesson' },
    { to: '/tutor/import', label: 'Dán JSON', icon: 'import' },
    { to: '/tutor/draw', label: 'Vẽ hình', icon: 'shapes' },
  ],
  student: [
    { to: '/student', label: 'Bài cần làm', icon: 'todo', end: true },
    { to: '/student/results', label: 'Kết quả', icon: 'results' },
    { to: '/student/library', label: 'Thư viện', icon: 'library' },
    { to: '/student/draw', label: 'Vẽ hình', icon: 'shapes' },
  ],
}

export default function Layout() {
  const { profile, signOut } = useAuth()
  const items = NAV[profile.role] || []
  const { pathname } = useLocation()
  // Trong Thư viện, đổi chương chỉ đổi cột phải: giữ nguyên trang (không chạy lại hiệu ứng, không mất mục lục)
  const pageKey = pathname.match(/^\/(tutor|student)\/library/)?.[0] ?? pathname

  useEffect(() => {
    prefetchPages(profile.role)
  }, [profile.role])
  // Đổi trang thì về đầu trang
  useEffect(() => {
    window.scrollTo({ top: 0 })
  }, [pathname])

  const content = (
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
            <NotificationBell />
            <ThemeToggle />
            <button type="button" className="btn btn-small btn-ghost btn-logout" onClick={signOut} aria-label="Đăng xuất" title="Đăng xuất">
              <Icon name="logout" />
              <span className="btn-text">Đăng xuất</span>
            </button>
          </div>
        </div>
        <nav className="nav">
          {items.map((it) => (
            <NavLink key={it.to} to={it.to} end={it.end} className={({ isActive }) => (isActive || it.also?.test(pathname) ? 'nav-link active' : 'nav-link')}>
              <Icon name={it.icon} size={17} />
              <span>{it.label}</span>
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
  // Học sinh: thông báo bài mới (chuông + thông báo nổi)
  return profile.role === 'student' ? <NotificationsProvider>{content}</NotificationsProvider> : content
}
