import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link, useLocation } from 'react-router-dom'
import { useNotifications } from '../contexts/NotificationsContext.jsx'
import { formatDate } from '../lib/format.js'
import Icon from './Icon.jsx'

// "5 phút trước", "3 giờ trước", "Hôm qua", hoặc ngày
function timeAgo(at) {
  const diff = (Date.now() - new Date(at).getTime()) / 1000
  if (diff < 60) return 'Vừa xong'
  if (diff < 3600) return `${Math.floor(diff / 60)} phút trước`
  if (diff < 86400) return `${Math.floor(diff / 3600)} giờ trước`
  if (diff < 2 * 86400) return 'Hôm qua'
  return formatDate(at)
}

// Chuông thông báo trên thanh trên cùng: học sinh = bài giao gần đây, gia sư = học sinh nộp bài gần đây
export default function NotificationBell() {
  const { enabled, isTutor, items, unread, isUnread, markSeen } = useNotifications()
  const [open, setOpen] = useState(false)
  const [highlight, setHighlight] = useState(() => new Set()) // bài còn tô "mới" trong lần mở này
  const box = useRef(null)
  const panel = useRef(null)
  const [pos, setPos] = useState(null) // vị trí bảng (gắn vào <body>, canh dưới nút chuông)
  const { pathname } = useLocation()
  const [perm, setPerm] = useState(() => ('Notification' in window ? Notification.permission : 'unsupported'))

  // Đổi trang thì đóng bảng
  useEffect(() => setOpen(false), [pathname])
  useEffect(() => {
    if (!open) return
    const close = () => setOpen(false)
    window.addEventListener('resize', close)
    return () => window.removeEventListener('resize', close)
  }, [open])

  // Bấm ra ngoài hoặc Esc thì đóng
  useEffect(() => {
    if (!open) return
    const onDown = (e) => !box.current?.contains(e.target) && !panel.current?.contains(e.target) && setOpen(false)
    const onKey = (e) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  if (!enabled) return null

  function toggle() {
    if (!open) {
      const r = box.current.getBoundingClientRect()
      // Điện thoại: bảng trải ngang màn hình (CSS lo); máy tính: canh mép phải với nút chuông
      setPos(window.innerWidth <= 560 ? { top: r.bottom + 8 } : { top: r.bottom + 8, right: window.innerWidth - r.right })
      // Mở chuông = đã xem: số trên chuông về 0, nhưng bài mới vẫn được tô trong lần mở này
      setHighlight(new Set(items.filter(isUnread).map((it) => it.key)))
      if (unread > 0) markSeen()
    }
    setOpen((v) => !v)
  }

  async function askPermission() {
    try {
      setPerm(await Notification.requestPermission())
    } catch {
      // bỏ qua
    }
  }

  return (
    <div className="bell" ref={box}>
      <button
        type="button"
        className={unread > 0 ? 'bell-btn has-new' : 'bell-btn'}
        onClick={toggle}
        aria-label={unread > 0 ? `Thông báo: ${unread} bài mới` : 'Thông báo'}
        aria-expanded={open}
      >
        <svg viewBox="0 0 24 24" width="19" height="19" aria-hidden="true">
          <path
            d="M18 16v-5a6 6 0 1 0-12 0v5l-1.5 2h15L18 16Zm-8 4a2 2 0 0 0 4 0"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        {unread > 0 && <span className="bell-count">{unread > 9 ? '9+' : unread}</span>}
      </button>

      {open &&
        createPortal(
        <div className="bell-panel" role="dialog" aria-label="Thông báo" ref={panel} style={pos || undefined}>
          <div className="bell-head">
            <b>Thông báo</b>
            <span className="muted small">14 ngày gần đây</span>
          </div>
          {items.length === 0 ? (
            <p className="muted small bell-empty">{isTutor ? 'Chưa có học sinh nào nộp bài.' : 'Chưa có bài mới nào được giao.'}</p>
          ) : (
            <ul className="bell-list">
              {items.map((it) => (
                <li key={it.key}>
                  <Link to={it.to} className={highlight.has(it.key) ? 'bell-item new' : 'bell-item'}>
                    <span className="bell-icon" aria-hidden="true">
                      {it.kind === 'lesson' ? '📘' : it.kind === 'submission' ? '📥' : '✏️'}
                    </span>
                    <span className="bell-body">
                      <span className="bell-kind">
                        {it.kind === 'submission' ? (
                          <>
                            {it.student} nộp bài · {it.status === 'checked' ? 'đã chấm' : 'chờ chấm'}
                          </>
                        ) : (
                          <>
                            {it.kind === 'lesson' ? 'Bài giảng mới' : 'Bài tập mới'}
                            {it.kind === 'assignment' && it.status !== 'todo' && ' · đã nộp'}
                          </>
                        )}
                      </span>
                      <span className="bell-title">{it.title}</span>
                      <span className="bell-meta">
                        {it.chapter ? `${it.chapter} · ` : ''}
                        {timeAgo(it.at)}
                        {it.kind === 'assignment' && it.due && it.status === 'todo' ? ` · Hạn ${formatDate(it.due)}` : ''}
                      </span>
                    </span>
                    {highlight.has(it.key) && <span className="bell-dot" aria-label="mới" />}
                  </Link>
                </li>
              ))}
            </ul>
          )}
          {perm === 'default' && (
            <button type="button" className="btn btn-small btn-ghost bell-perm" onClick={askPermission}>
              <Icon name="bell" />
              Báo cả khi đang mở tab khác
            </button>
          )}
        </div>,
        // Gắn thẳng vào <body>: thanh trên cùng có hiệu ứng làm mờ nền, đặt bảng bên trong sẽ bị vẽ xuyên thấu
        document.body
      )}
    </div>
  )
}
