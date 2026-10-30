import { NavLink, Outlet, useLocation, useSearchParams } from 'react-router-dom'
import { lazy, Suspense, useCallback, useEffect, useState } from 'react'
import { prefetchPages } from '../pages/registry.js'
import { useAuth } from '../contexts/AuthContext.jsx'
import Loading from './Loading.jsx'
import ErrorBoundary from './ErrorBoundary.jsx'
import ThemeToggle from './ThemeToggle.jsx'
import Icon from './Icon.jsx'
import NotificationBell from './NotificationBell.jsx'
import InstallBanner from './InstallBanner.jsx'
import { mascotSay } from '../lib/celebrate.js'
import { useSettings } from '../lib/settings.js'
import { TELESCOPE_LOCKED, useStudying } from '../lib/studyLock.js'
import { openExplorerSound } from '../lib/spaceSound.js'

// Chế độ ngắm vũ trụ: chỉ tải khi bấm mở, không làm nặng app
const SpaceExplorer = lazy(() => import('./SpaceExplorer.jsx'))
// Bảng Cài đặt (nút bánh răng): bảng nổi, không đổi trang
const SettingsPanel = lazy(() => import('./SettingsPanel.jsx'))
// Gấu trúc (hình vẽ nặng): tải sau khi trang đã hiện; tắt linh vật trong Cài đặt thì không tải
const Mascot = lazy(() => import('./Mascot.jsx'))
import { NotificationsProvider } from '../contexts/NotificationsContext.jsx'
import { countOpenReports, REPORTS_CHANGED } from '../lib/reports.js'
import { countUnseenFeedback, FEEDBACK_CHANGED } from '../lib/feedback.js'
import FeedbackButton from './FeedbackButton.jsx'
import DialogHost from './DialogHost.jsx'
import ScrollJump from './ScrollJump.jsx'
import { askConfirm } from '../lib/dialog.js'
import { PandaShopProvider } from '../contexts/PandaShopContext.jsx'
import PandaDock from './PandaDock.jsx'
import StreakFlame from './StreakFlame.jsx'
import ScrollMemory from './ScrollMemory.jsx'
import { RESTORE } from './ListLink.jsx'
import { listUrl, rememberList } from '../lib/navMemory.js'

// Tham số URL của Kính thiên văn (địa điểm đang xem)
const PLACE_PARAM = 'vu-tru'

// Lời gấu khi hỏi đăng xuất (chọn ngẫu nhiên)
const BYE = ['Bạn muốn đăng xuất ư? Tôi sẽ nhớ bạn lắm đó 🥺', 'Đi thật hả? Nhớ quay lại học tiếp với tôi nha!', 'Về nghỉ ngơi à? Hẹn gặp lại bạn sớm nhé 🐼']

const NAV = {
  tutor: [
    { to: '/tutor', label: 'Học sinh', icon: 'users', end: true, also: /^\/tutor\/students\// },
    { to: '/tutor/library', label: 'Thư viện', icon: 'library' },
    { to: '/tutor/assignments', label: 'Bài tập', icon: 'assignment' },
    { to: '/tutor/lessons', label: 'Bài giảng', icon: 'lesson' },
    { to: '/tutor/import', label: 'Dán JSON', icon: 'import' },
    { to: '/tutor/reports', label: 'Báo lỗi đề', icon: 'flag', badge: 'reports' },
    { to: '/tutor/feedback', label: 'Góp ý', icon: 'chat', badge: 'feedback' },
  ],
  student: [
    { to: '/student', label: 'Bài cần làm', icon: 'todo', end: true },
    { to: '/student/lessons', label: 'Bài giảng', icon: 'lesson' },
    { to: '/student/results', label: 'Kết quả', icon: 'results' },
    { to: '/student/mistakes', label: 'Ôn tập', icon: 'refresh' },
    { to: '/student/library', label: 'Thư viện', icon: 'library' },
  ],
}

export default function Layout() {
  const { profile, signOut } = useAuth()
  const items = NAV[profile.role] || []
  const { pathname, search } = useLocation()
  // Trang danh sách: nhớ URL (chương, bộ lọc) cho tab menu của nó — bấm lại tab là về đúng chỗ cũ
  rememberList(pathname, search)
  // Trong Thư viện, đổi chương chỉ đổi cột phải: giữ nguyên trang (không chạy lại hiệu ứng, không mất mục lục)
  const pageKey = pathname.match(/^\/(tutor|student)\/library/)?.[0] ?? pathname

  const isTutor = profile.role === 'tutor'

  async function confirmSignOut() {
    const ok = await askConfirm({
      title: 'Đăng xuất?',
      say: BYE[Math.floor(Math.random() * BYE.length)],
      scene: 'logout',
      confirmText: 'Đăng xuất',
      cancelText: 'Ở lại',
    })
    if (ok) signOut()
  }
  const badges = {
    reports: useLiveCount(isTutor, pathname, countOpenReports, REPORTS_CHANGED),
    feedback: useLiveCount(isTutor, pathname, countUnseenFeedback, FEEDBACK_CHANGED),
  }

  useEffect(() => {
    prefetchPages(profile.role)
  }, [profile.role])
  // Header trong suốt ở đầu trang, đậm lên khi cuộn (chỉ đổi class khi vượt ngưỡng, không làm mờ nền)
  const [scrolled, setScrolled] = useState(false)
  const [exploring, setExploring] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const studying = useStudying()
  const showMascot = useSettings().mascot
  // Kính thiên văn ghi địa điểm đang xem lên URL (?vu-tru=<id>): tải lại trang thì mở lại đúng chỗ.
  // Địa điểm trong URL chỉ là lời xin — SpaceExplorer vẫn kiểm placeAccess (lib/telescope.js) trước khi cho vào.
  const [params, setParams] = useSearchParams()
  const askedPlace = params.get(PLACE_PARAM)
  const setPlaceParam = useCallback(
    (id) =>
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev)
          if (id) next.set(PLACE_PARAM, id)
          else next.delete(PLACE_PARAM)
          return next
        },
        { replace: true }
      ),
    [setParams]
  )
  useEffect(() => {
    if (!askedPlace || exploring) return
    if (studying) {
      setPlaceParam(null)
      mascotSay(TELESCOPE_LOCKED)
    } else setExploring(true)
    // Chỉ chạy khi tham số URL đổi (mở link / tải lại trang); không theo exploring để lúc đóng không tự mở lại
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [askedPlace])
  const closeExplorer = useCallback(() => {
    setExploring(false)
    setPlaceParam(null)
  }, [setPlaceParam])
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const content = (
    <div className="app">
      <header className={`topbar ${scrolled ? 'is-scrolled' : ''}`}>
        <div className="topbar-inner">
          <span className="brand">
            <span className="brand-mark">⚛</span> <span className="brand-text">Study with Duy Anh</span>
          </span>
          <div className="topbar-user">
            <span className="user-name" title={profile.full_name}>
              {profile.full_name || 'Tài khoản'}
            </span>
            <NotificationBell />
            <button
              type="button"
              className={`btn btn-ghost theme-toggle telescope-btn ${studying ? 'is-locked' : ''}`}
              onClick={() => {
                if (studying) return mascotSay(TELESCOPE_LOCKED)
                // Đã chọn bật nhạc trong phiên này: phát ngay trong cú bấm (iPhone chặn nếu đợi tải xong trang ngắm vũ trụ).
                // Lần đầu chưa chọn: SpaceExplorer hỏi người dùng
                openExplorerSound()
                setExploring(true)
              }}
              aria-label={studying ? 'Ngắm vũ trụ (mở sau khi nộp bài)' : 'Ngắm vũ trụ'}
              title={studying ? 'Nộp bài xong để mở khóa' : 'Ngắm vũ trụ'}
            >
              <Icon name="telescope" />
              {studying && (
                <span className="telescope-lock">
                  <Icon name="lock" size={11} />
                </span>
              )}
            </button>
            <ThemeToggle />
            <button type="button" className="btn btn-ghost theme-toggle" onClick={() => setSettingsOpen(true)} aria-label="Cài đặt" title="Cài đặt">
              <Icon name="settings" />
            </button>
            <button type="button" className="btn btn-small btn-ghost btn-logout" onClick={confirmSignOut} aria-label="Đăng xuất" title="Đăng xuất">
              <Icon name="logout" />
              <span className="btn-text">Đăng xuất</span>
            </button>
          </div>
        </div>
        <nav className="nav">
          {items.map((it) => (
            <NavLink key={it.to} to={listUrl(it.to)} state={RESTORE} end={it.end} className={({ isActive }) => (isActive || it.also?.test(pathname) ? 'nav-link active' : 'nav-link')}>
              <Icon name={it.icon} size={17} />
              <span>{it.label}</span>
              {it.badge && badges[it.badge] > 0 && (
                <span className="nav-badge" aria-label={`${badges[it.badge]} ${it.badge === 'reports' ? 'câu chờ xem' : 'góp ý chưa xem'}`}>
                  {badges[it.badge]}
                </span>
              )}
            </NavLink>
          ))}
        </nav>
      </header>
      <main className="page">
        <InstallBanner />
        {/* key theo đường dẫn: mỗi lần đổi trang chạy lại hiệu ứng hiện trang và xóa lỗi cũ */}
        <div key={pageKey} className="page-enter">
          <ErrorBoundary>
            <Suspense fallback={<Loading />}>
              <Outlet />
            </Suspense>
          </ErrorBoundary>
        </div>
      </main>
      {showMascot && (
        <Suspense fallback={null}>
          <Mascot />
        </Suspense>
      )}
      {/* Đổi trang thì lên đầu; Back / Forward / mở lại tab thì về đúng chỗ cũ */}
      <ScrollMemory />
      <ScrollJump />
      <PandaDock />
      {profile.role === 'student' && <StreakFlame />}
      <DialogHost />
      {profile.role === 'student' && <FeedbackButton />}
      {exploring && (
        <Suspense fallback={null}>
          <SpaceExplorer onClose={closeExplorer} initialPlace={askedPlace} onPlaceChange={setPlaceParam} />
        </Suspense>
      )}
      {settingsOpen && (
        <Suspense fallback={null}>
          <SettingsPanel onClose={() => setSettingsOpen(false)} />
        </Suspense>
      )}
    </div>
  )
  // Chuông + thông báo nổi + gấu nói: học sinh = bài mới được giao, gia sư = học sinh vừa nộp bài
  return <NotificationsProvider><PandaShopProvider>{content}</PandaShopProvider></NotificationsProvider>
}

// Gia sư: số đếm trên menu (câu bị báo lỗi đang chờ, góp ý chưa xem).
// Cập nhật khi đổi trang, khi trang phát sự kiện eventName (xử lý xong), khi quay lại tab
function useLiveCount(enabled, pathname, countFn, eventName) {
  const [count, setCount] = useState(0)
  useEffect(() => {
    if (!enabled) return
    let alive = true
    const load = () => countFn().then((n) => alive && setCount(n))
    load()
    const onVisible = () => document.visibilityState === 'visible' && load()
    window.addEventListener(eventName, load)
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      alive = false
      window.removeEventListener(eventName, load)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [enabled, pathname, countFn, eventName])
  return count
}
