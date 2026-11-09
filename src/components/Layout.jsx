import { NavLink, Outlet, useLocation, useSearchParams } from 'react-router-dom'
import { lazy, Suspense, useCallback, useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react'
import { prefetchPages } from '../pages/registry.js'
import { useAuth } from '../contexts/AuthContext.jsx'
import Loading from './Loading.jsx'
import ErrorBoundary from './ErrorBoundary.jsx'
import ThemeToggle from './ThemeToggle.jsx'
import Icon from './Icon.jsx'
import NotificationBell from './NotificationBell.jsx'
import InstallBanner from './InstallBanner.jsx'
import { mascotSay } from '../lib/celebrate.js'
import { getSettings, useSettings } from '../lib/settings.js'
import { TELESCOPE_LOCKED, useStudying } from '../lib/studyLock.js'
import { primeDoorCreak } from './science-lab/labSound.js'

// Chế độ ngắm vũ trụ: chỉ tải khi bấm mở, không làm nặng app
const SpaceExplorer = lazy(() => import('./SpaceExplorer.jsx'))

/** Đặt cùng Suspense với SpaceExplorer nên chỉ chạy khi màn Vũ Trụ đã lên: phòng che đến khi trang học mờ hết (0,35s, explorer.css) rồi mới mờ đi.
 * @param {{ onFade: () => void, onDone: () => void }} props */
function LabHandoff({ onFade, onDone }) {
  useEffect(() => {
    const fade = setTimeout(onFade, 400)
    const done = setTimeout(onDone, 750)
    return () => {
      clearTimeout(fade)
      clearTimeout(done)
    }
    // Chỉ hẹn giờ một lần lúc màn Vũ Trụ vừa lên
  }, [])
  return null
}
const ScienceLab = lazy(() => import('./science-lab/ScienceLab.jsx'))
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
import { isFocusPage } from '../lib/focusPage.js'
import TutorTodoPanel from './TutorTodoPanel.jsx'
import TutorRecentPanel from './TutorRecentPanel.jsx'
import StudentTodayPanel from './StudentTodayPanel.jsx'

// Tham số URL của Kính thiên văn (địa điểm đang xem)
const PLACE_PARAM = 'vu-tru'

// Khung điều hướng (styles/shell.css): gia sư màn rộng = thanh bên ghim (☰ thu gọn thành dải icon), màn hẹp = ngăn kéo;
// học sinh điện thoại = thanh tab dưới + ngăn kéo cho các nút phụ, máy rộng = menu ngang như cũ
const SIDE_DOCKED = '(min-width: 1024px)'
const WIDE_CTX = '(min-width: 1360px)'
const PHONE = '(max-width: 640px)'
const RAIL_KEY = 'side-rail'
const CTX_KEY = 'ctx-collapsed'

/** @param {string} query */
function useMedia(query) {
  const subscribe = useCallback(
    /** @param {() => void} cb */ (cb) => {
      const m = window.matchMedia(query)
      m.addEventListener('change', cb)
      return () => m.removeEventListener('change', cb)
    },
    [query]
  )
  return useSyncExternalStore(subscribe, () => window.matchMedia(query).matches)
}

function loadRail() {
  try {
    return localStorage.getItem(RAIL_KEY) === '1'
  } catch {
    return false
  }
}

function loadCtxCollapsed() {
  try {
    return localStorage.getItem(CTX_KEY) === '1'
  } catch {
    return false
  }
}

// Lời gấu khi hỏi đăng xuất (chọn ngẫu nhiên)
const BYE = ['Bạn muốn đăng xuất ư? Tôi sẽ nhớ bạn lắm đó 🥺', 'Đi thật hả? Nhớ quay lại học tiếp với tôi nha!', 'Về nghỉ ngơi à? Hẹn gặp lại bạn sớm nhé 🐼']

const NAV = {
  tutor: [
    // `group`: tiêu đề nhóm nhỏ trong thanh bên (hiện khi đổi nhóm; thanh bên thu gọn thì chỉ còn đường kẻ)
    { to: '/tutor', label: 'Học sinh', icon: 'users', end: true, also: /^\/tutor\/students\//, group: 'Dạy học' },
    { to: '/tutor/library', label: 'Thư viện', icon: 'library', group: 'Dạy học' },
    { to: '/tutor/assignments', label: 'Chấm bài', icon: 'grade', group: 'Dạy học' },
    { to: '/tutor/import', label: 'Dán JSON', icon: 'import', group: 'Công cụ' },
    { to: '/tutor/reports', label: 'Báo lỗi đề', icon: 'flag', badge: 'reports', group: 'Công cụ' },
    { to: '/tutor/feedback', label: 'Góp ý', icon: 'chat', badge: 'feedback', group: 'Công cụ' },
  ],
  student: [
    { to: '/student', label: 'Bài cần làm', icon: 'todo', end: true },
    { to: '/student/results', label: 'Kết quả', icon: 'results' },
    { to: '/student/mistakes', label: 'Ôn tập', icon: 'refresh' },
    { to: '/student/library', label: 'Thư viện', icon: 'library' },
  ],
}

export default function Layout() {
  const { profile, signOut } = useAuth()
  const items = NAV[profile.role] || []
  const { pathname, search } = useLocation()
  // Trang danh sách: nhớ URL (chủ đề, bộ lọc) cho tab menu của nó — bấm lại tab là về đúng chỗ cũ
  rememberList(pathname, search)
  // Trong Thư viện, đổi chủ đề chỉ đổi cột phải: giữ nguyên trang (không chạy lại hiệu ứng, không mất mục lục)
  const pageKey = pathname.match(/^\/(tutor|student)\/library/)?.[0] ?? pathname

  const isTutor = profile.role === 'tutor'

  async function confirmSignOut() {
    const ok = await askConfirm({
      title: 'Đăng xuất?',
      say: BYE[Math.floor(Math.random() * BYE.length)],
      scene: 'logout',
      danger: true,
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
  // Thanh bên / ngăn kéo menu: mở bằng nút ☰; đổi trang hoặc đổi cỡ màn hình thì đóng ngăn kéo
  const docked = useMedia(SIDE_DOCKED)
  const wideCtx = useMedia(WIDE_CTX)
  const phone = useMedia(PHONE)
  const [drawer, setDrawer] = useState(false)
  const [rail, setRail] = useState(loadRail)
  const [ctxCollapsed, setCtxCollapsed] = useState(loadCtxCollapsed)
  const menuBtn = useRef(/** @type {HTMLButtonElement | null} */ (null))
  const sideRef = useRef(/** @type {HTMLElement | null} */ (null))
  const railMode = docked // màn rộng: ☰ thu gọn / mở rộng thanh bên (cả gia sư lẫn học sinh) thay vì mở ngăn kéo
  // Cột phải (ContextPanel): màn < 1360px là ngăn kéo bên phải, màn ≥ 1360px cho phép thu gọn / mở rộng
  const [ctxOpen, setCtxOpen] = useState(false)
  useEffect(() => {
    setDrawer(false)
    setCtxOpen(false)
  }, [pathname, docked, phone])
  useEffect(() => {
    const handleOpen = () => {
      setCtxOpen(true)
      setCtxCollapsed(false)
    }
    window.addEventListener('open-ctx-panel', handleOpen)
    return () => window.removeEventListener('open-ctx-panel', handleOpen)
  }, [])
  useEffect(() => {
    if (!ctxOpen) return
    // Ngăn kéo phải vừa mở: đưa focus vào nút Đóng
    /** @type {HTMLElement | null} */ (document.querySelector('#ctx-panel .ctx-close'))?.focus()
    /** @param {KeyboardEvent} e */
    const onKey = (e) => e.key === 'Escape' && setCtxOpen(false)
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [ctxOpen])
  function toggleCtx() {
    if (wideCtx) {
      const next = !ctxCollapsed
      setCtxCollapsed(next)
      try {
        localStorage.setItem(CTX_KEY, next ? '1' : '0')
      } catch {
        // bỏ qua
      }
      return
    }
    if (docked) return setCtxOpen((v) => !v)
    setDrawer(false)
    setCtxOpen(true)
  }
  function toggleMenu() {
    if (!railMode) return setDrawer((v) => !v)
    const next = !rail
    setRail(next)
    try {
      localStorage.setItem(RAIL_KEY, next ? '1' : '0')
    } catch {
      // không lưu được: chỉ nhớ trong lần mở này
    }
  }
  // Ngăn kéo vừa mở: focus vào nút đầu tiên; Esc đóng và trả focus về nút ☰
  useEffect(() => {
    if (!drawer) return
    sideRef.current?.querySelector('button')?.focus()
    /** @param {KeyboardEvent} e */
    const onKey = (e) => {
      if (e.key !== 'Escape') return
      setDrawer(false)
      menuBtn.current?.focus()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [drawer])

  // data-tabbar / data-side / data-ctx: các nút nổi (gấu, cụm cửa hàng, góp ý...) né thanh tab dưới / thanh bên (shell.css)
  const tabbar = !isTutor && !isFocusPage(pathname)
  useEffect(() => {
    const root = document.documentElement
    root.toggleAttribute('data-tabbar', tabbar)
    // Khung cố định (shell.css, lib/scroller.js): màn rộng — trang không cuộn, nội dung và cột phải tự cuộn
    root.toggleAttribute('data-shell', docked)
    root.dataset.side = rail ? 'rail' : 'open'
    root.dataset.ctx = ctxCollapsed ? 'collapsed' : 'open'
    return () => {
      delete root.dataset.side
      delete root.dataset.ctx
      root.removeAttribute('data-tabbar')
      root.removeAttribute('data-shell')
    }
  }, [tabbar, rail, docked, ctxCollapsed])
  // Header trong suốt ở đầu trang, đậm lên khi cuộn (chỉ đổi class khi vượt ngưỡng, không làm mờ nền)
  const [scrolled, setScrolled] = useState(false)
  const [exploring, setExploring] = useState(false)
  const [labOpen, setLabOpen] = useState(false)
  const [labLeaving, setLabLeaving] = useState(false)
  const fromLabRef = useRef(false)
  const labWalkInRef = useRef(true)
  const [settingsOpen, setSettingsOpen] = useState(false)
  // Viên nền trượt sau mục menu đang chọn: đo lại khi đổi trang hoặc khi mục menu đổi cỡ (chuông báo, xoay máy...)
  const navRef = useRef(/** @type {HTMLElement | null} */ (null))
  const [pill, setPill] = useState(/** @type {{ x: number, y: number, w: number, h: number } | null} */ (null))
  useLayoutEffect(() => {
    const nav = navRef.current
    if (!nav) return
    const measure = () => {
      const el = nav.querySelector('.nav-link.active')
      setPill(el instanceof HTMLElement ? { x: el.offsetLeft, y: el.offsetTop, w: el.offsetWidth, h: el.offsetHeight } : null)
    }
    measure()
    const ro = new ResizeObserver(measure)
    nav.querySelectorAll('.nav-link').forEach((el) => ro.observe(el))
    return () => ro.disconnect()
  }, [pathname])
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
  // Chiều cao thật của thanh trên cùng (menu xuống dòng, xoay máy, đổi cỡ chữ) → --topbar-h cho các khối dính bên dưới (cây Thư viện)
  useEffect(() => {
    const bar = document.querySelector('.topbar')
    if (!(bar instanceof HTMLElement)) return
    const root = document.documentElement
    const update = () => root.style.setProperty('--topbar-h', `${bar.offsetHeight}px`)
    update()
    const ro = new ResizeObserver(update)
    ro.observe(bar)
    return () => {
      ro.disconnect()
      root.style.removeProperty('--topbar-h')
    }
  }, [])

  /** Nút phòng khoa học / kính thiên văn: tròn trên thanh trên cùng, hoặc hàng có chữ trong ngăn kéo (`labeled`) @param {boolean} labeled @param {string} [extra] */
  const telescopeBtn = (labeled, extra = '') => (
    <button
      type="button"
      className={`${labeled ? 'side-btn' : 'btn btn-ghost theme-toggle'} telescope-btn ${extra}`}
      onClick={() => {
        labWalkInRef.current = true
        if (getSettings().soundEffects) primeDoorCreak()
        setDrawer(false)
        setLabOpen(true)
      }}
      aria-label="Phòng Khoa học"
      title="Phòng Khoa học & Nghiên cứu"
    >
      <Icon name="telescope" />
      {labeled && <span className="side-label">Phòng Khoa học</span>}
    </button>
  )

  const brand = (
    <span className="brand">
      <img className="brand-mark" src="/app-icon.svg" alt="" /> <span className="brand-text">Study with Duy Anh</span>
    </span>
  )

  const nav = (
    <nav className="nav nav-side" ref={navRef} aria-label="Menu chính">
      {pill && (
        <span
          className="nav-pill"
          aria-hidden="true"
          style={{ transform: `translate(${pill.x}px, ${pill.y}px)`, width: pill.w, height: pill.h }}
        />
      )}
      {items.map((it, i) => [
        it.group && it.group !== items[i - 1]?.group && (
          <div key={`g-${it.group}`} className="nav-group-label">
            {it.group}
          </div>
        ),
        <NavLink
          key={it.to}
          to={listUrl(it.to)}
          state={RESTORE}
          end={it.end}
          title={it.label}
          className={({ isActive }) => (isActive || it.also?.test(pathname) ? 'nav-link active' : 'nav-link')}
        >
          <Icon name={it.icon} size={19} />
          <span className="side-label">{it.label}</span>
          {it.badge && badges[it.badge] > 0 && (
            // key theo số: số đổi thì nhãn nảy lên một lần (reports.css)
            <span key={badges[it.badge]} className="nav-badge" aria-label={`${badges[it.badge]} ${it.badge === 'reports' ? 'câu chờ xem' : 'góp ý chưa xem'}`}>
              {badges[it.badge]}
            </span>
          )}
        </NavLink>,
      ])}
    </nav>
  )

  const content = (
    <div className={`app ${isTutor ? 'is-tutor' : 'is-student'}`}>
      {/* Thanh bên chung cho gia sư và học sinh: màn rộng ghim / thu gọn thành dải icon, màn hẹp là ngăn kéo */}
      <aside id="app-side" ref={sideRef} className={`side ${drawer ? 'is-open' : ''}`} aria-label="Menu">
        <div className="side-head">
          {brand}
          {/* Thanh bên ghim (màn rộng): nút ☰ thu gọn / mở rộng nằm ngay trong thanh bên, không trôi theo nội dung */}
          <button
            type="button"
            className="side-toggle"
            onClick={toggleMenu}
            aria-controls="app-side"
            aria-expanded={!rail}
            aria-label={rail ? 'Mở rộng thanh bên' : 'Thu gọn thanh bên'}
            title={rail ? 'Mở rộng thanh bên' : 'Thu gọn thanh bên'}
          >
            <Icon name="menu" />
          </button>
          <button type="button" className="side-close" onClick={() => setDrawer(false)} aria-label="Đóng menu" title="Đóng menu">
            <Icon name="close" />
          </button>
        </div>
        {nav}
        <div className="side-foot">
          {/* Màn rộng không còn thanh trên cùng: chuông + ngắm vũ trụ + bảng bên + cửa hàng + góp ý nằm ở đây
              (học sinh: cả màn hẹp; không còn nổi góc màn hình, đỡ che nội dung; chuỗi + Xu + Sao ở cột phải) */}
          <span className="side-user" title={profile.full_name}>
            {profile.full_name || 'Tài khoản'}
          </span>
          {docked && <NotificationBell variant="side" />}
          {telescopeBtn(true)}
          {/* Màn hẹp: thanh trên chỉ còn ☰ / chuỗi / chuông → bảng bên nằm ở đây; bấm thì đóng menu rồi mở ngăn kéo phải */}
          <button
            type="button"
            className="side-btn ctx-btn-side"
            onClick={toggleCtx}
            aria-controls="ctx-panel"
            aria-expanded={wideCtx ? !ctxCollapsed : ctxOpen}
            aria-label={wideCtx ? (ctxCollapsed ? 'Hiện bảng bên' : 'Ẩn bảng bên') : 'Bảng bên'}
            title={wideCtx ? (ctxCollapsed ? 'Hiện bảng bên' : 'Ẩn bảng bên') : 'Bảng bên'}
          >
            <Icon name="panel" />
            <span className="side-label">Bảng bên</span>
          </button>
          {(docked || !isTutor) && (
            <NavLink to={`/${profile.role === 'tutor' ? 'tutor' : 'student'}/shop`} className={({ isActive }) => (isActive ? 'side-btn is-current' : 'side-btn')} title="Cửa hàng gấu">
              <Icon name="shop" />
              <span className="side-label">Cửa hàng gấu</span>
            </NavLink>
          )}
          {!isTutor && <FeedbackButton />}
          <NavLink to={`/${isTutor ? 'tutor' : 'student'}/help`} className={({ isActive }) => (isActive ? 'side-btn is-current' : 'side-btn')} title="Hỏi đáp">
            <Icon name="help" />
            <span className="side-label">Hỏi đáp</span>
          </NavLink>
          <ThemeToggle withLabel className="side-btn" />
          <button
            type="button"
            className="side-btn"
            onClick={() => {
              setDrawer(false)
              setSettingsOpen(true)
            }}
            title="Cài đặt"
          >
            <Icon name="settings" />
            <span className="side-label">Cài đặt</span>
          </button>
          <button type="button" className="side-btn is-danger" onClick={confirmSignOut} title="Đăng xuất">
            <Icon name="logout" />
            <span className="side-label">Đăng xuất</span>
          </button>
        </div>
      </aside>
      {drawer && <div className="side-backdrop" onClick={() => setDrawer(false)} aria-hidden="true" />}

      <div className="app-main">
        {/* Màn rộng: bỏ thanh trên cùng (CSS shell.css), các nút của nó đã vào thanh bên */}
        <header className={`topbar ${scrolled ? 'is-scrolled' : ''}`}>
          <div className="topbar-inner">
            <button
              ref={menuBtn}
              type="button"
              className="btn btn-ghost theme-toggle menu-btn"
              onClick={toggleMenu}
              aria-controls="app-side"
              aria-expanded={railMode ? !rail : drawer}
              aria-label={railMode ? (rail ? 'Mở rộng thanh bên' : 'Thu gọn thanh bên') : 'Mở menu'}
              title={railMode ? (rail ? 'Mở rộng thanh bên' : 'Thu gọn thanh bên') : 'Menu'}
            >
              <Icon name="menu" />
            </button>
            {brand}
            <div className="topbar-user">
              {!isTutor && !docked && <StreakFlame />}
              {!docked && <NotificationBell />}
              <button
                type="button"
                className="btn btn-ghost theme-toggle ctx-btn-topbar"
                onClick={() => setCtxOpen((v) => !v)}
                aria-controls="ctx-panel"
                aria-expanded={ctxOpen}
                aria-label="Mở Bảng bên"
                title="Bảng bên"
              >
                <Icon name="grid" size={17} />
              </button>
            </div>
          </div>
        </header>
        <main className="page">
          <div className="page-body">
            <InstallBanner />
            {/* key theo đường dẫn: mỗi lần đổi trang chạy lại hiệu ứng hiện trang và xóa lỗi cũ */}
            <div key={pageKey} className="page-enter">
              <ErrorBoundary>
                <Suspense fallback={<Loading />}>
                  <Outlet />
                </Suspense>
              </ErrorBoundary>
            </div>
          </div>
          {/* Cột phải (shell.css): khối mặc định + khối của trang gửi vào qua ContextPanel (portal) */}
          <aside id="ctx-panel" className={`ctx-panel ${ctxOpen ? 'is-open' : ''}`} aria-label="Bảng bên">
            <button type="button" className="side-close ctx-close" onClick={() => setCtxOpen(false)} aria-label="Đóng bảng bên" title="Đóng">
              <Icon name="close" />
            </button>
            <div className="ctx-head-bar">
              <button type="button" className="ctx-collapse-btn" onClick={toggleCtx} title="Thu gọn cột bên phải để mở rộng vùng làm việc">
                <span>Thu gọn bảng bên</span>
                <Icon name="right" size={14} />
              </button>
            </div>
            {/* Khối mặc định theo vai trò; khối của trang (ContextPanel) xếp ngay sau */}
            {isTutor ? (
              <>
                <TutorTodoPanel />
                <TutorRecentPanel />
              </>
            ) : (
              <StudentTodayPanel />
            )}
          </aside>
          <button
            type="button"
            className="ctx-expand-btn"
            onClick={toggleCtx}
            title="Mở lại cột Bảng bên"
            aria-label="Mở lại cột Bảng bên"
          >
            <Icon name="left" size={14} />
            <span>Bảng bên</span>
          </button>
        </main>
        {ctxOpen && <div className="side-backdrop ctx-backdrop" onClick={() => setCtxOpen(false)} aria-hidden="true" />}
      </div>

      {/* Học sinh trên điện thoại: viên thuốc nổi 4 mục ở đáy màn hình, mục đang chọn mở rộng hiện chữ
          (ẩn khi đang làm bài / đọc bài giảng). Lớp .dock-* (không dùng .tab: trùng kiểu tab của bài giảng ở content.css) */}
      {tabbar && (
        <nav className="tabbar" aria-label="Menu chính">
          {items.map((it) => (
            <NavLink
              key={it.to}
              to={listUrl(it.to)}
              state={RESTORE}
              end={it.end}
              aria-label={it.label}
              className={({ isActive }) => (isActive ? 'dock-tab is-active' : 'dock-tab')}
            >
              <Icon name={it.icon} size={21} />
              <span className="dock-text">{it.label}</span>
            </NavLink>
          ))}
        </nav>
      )}
      {showMascot && (
        <Suspense fallback={null}>
          <Mascot />
        </Suspense>
      )}
      {/* Đổi trang thì lên đầu; Back / Forward / mở lại tab thì về đúng chỗ cũ */}
      <ScrollMemory />
      <ScrollJump />
      {/* Học sinh: cửa hàng + Góp ý luôn nằm trong thanh bên / ngăn kéo (Xu / Sao ở Bảng bên); chỉ gia sư màn hẹp còn cụm nổi */}
      {!docked && isTutor && <PandaDock />}
      <DialogHost />
      {exploring && (
        <Suspense fallback={null}>
          <SpaceExplorer
            backLabel={fromLabRef.current ? 'Rời kính viễn vọng' : 'Quay lại học'}
            onClose={() => {
              closeExplorer()
              if (fromLabRef.current) {
                fromLabRef.current = false
                labWalkInRef.current = false
                setLabOpen(true)
              }
            }}
            initialPlace={askedPlace}
            onPlaceChange={setPlaceParam}
          />
          {labOpen && (
            <LabHandoff
              onFade={() => setLabLeaving(true)}
              onDone={() => {
                setLabOpen(false)
                setLabLeaving(false)
              }}
            />
          )}
        </Suspense>
      )}
      {labOpen && (
        <Suspense fallback={null}>
          <ScienceLab
            initialWalkIn={labWalkInRef.current}
            leaving={labLeaving}
            onClose={() => {
              fromLabRef.current = false
              setLabOpen(false)
            }}
            onOpenSpace={() => {
              // Giữ phòng phía trên, LabHandoff đóng phòng khi màn Vũ Trụ đã sẵn sàng, để không lộ trang học
              fromLabRef.current = true
              setExploring(true)
            }}
          />
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
