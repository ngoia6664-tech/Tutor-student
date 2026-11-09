import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link, useLocation } from 'react-router-dom'
import { useNotifications } from '../contexts/NotificationsContext.jsx'
import { formatDate } from '../lib/format.js'
import Icon from './Icon.jsx'

// "5 phút trước", "3 giờ trước", "Hôm qua", hoặc ngày (dùng cả ở TutorTodoPanel)
/** @param {string} at */
export function timeAgo(at) {
  const diff = (Date.now() - new Date(at).getTime()) / 1000
  if (diff < 60) return 'Vừa xong'
  if (diff < 3600) return `${Math.floor(diff / 60)} phút trước`
  if (diff < 86400) return `${Math.floor(diff / 3600)} giờ trước`
  if (diff < 2 * 86400) return 'Hôm qua'
  return formatDate(at)
}

// Chuông thông báo: học sinh = bài giao gần đây, gia sư = học sinh nộp bài gần đây.
// variant 'top' = nút tròn trên thanh trên cùng; 'side' = hàng có chữ trong thanh bên (bảng mở bên phải nút, không chạy ra ngoài mép trái)
/** @param {{ variant?: 'top' | 'side' }} props */
export default function NotificationBell({ variant = 'top' }) {
  const side = variant === 'side'
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

    function getPanelPos() {
    if (!box.current) return null
    const r = box.current.getBoundingClientRect()
    const margin = 16
    const vw = window.innerWidth
    const vh = window.innerHeight

    // Đo kích thước panel nếu đã render hoặc ước tính ban đầu
    const panelW = panel.current?.offsetWidth || Math.min(360, vw - margin * 2)
    const panelH = panel.current?.offsetHeight || 420
    const maxH = Math.min(540, vh - margin * 2)

    if (side && vw > 560) {
      // Bên cạnh thanh bên (desktop)
      let left = r.right + 10
      if (left + panelW > vw - margin) {
        left = Math.max(margin, vw - margin - panelW)
      }

      // Ưu tiên mở lên trên nếu nút ở nửa dưới màn hình, mở xuống dưới nếu nút ở nửa trên
      let top = r.top > vh / 2 ? r.bottom - panelH : r.top
      // Giới hạn an toàn tuyệt đối: không bao giờ tràn mép trên (< margin) hoặc tràn mép dưới (> vh - margin - panelH)
      top = Math.max(margin, Math.min(top, vh - margin - panelH))

      return {
        left,
        top,
        bottom: 'auto',
        right: 'auto',
        maxHeight: maxH,
      }
    }

    if (vw <= 560) {
      // Màn hình hẹp điện thoại
      const top = Math.max(margin, Math.min(r.bottom + 8, vh - margin - 200))
      return {
        top,
        left: margin,
        right: margin,
        width: 'auto',
        maxHeight: Math.max(180, vh - top - margin),
      }
    }

    // Nút chuông thanh trên cùng (desktop/tablet)
    let top = r.bottom + 8
    let right = Math.max(margin, vw - r.right)
    if (top + panelH > vh - margin) {
      if (r.top - panelH > margin) {
        top = r.top - panelH - 8
      } else {
        top = Math.max(margin, vh - margin - panelH)
      }
    }

    return {
      top,
      right,
      left: 'auto',
      bottom: 'auto',
      maxHeight: maxH,
    }
  }

  function toggle() {
    if (!open) {
      setPos(getPanelPos())
      setHighlight(new Set(items.filter(isUnread).map((it) => it.key)))
      if (unread > 0) markSeen()
      setOpen(true)
    } else {
      setOpen(false)
    }
  }

  useLayoutEffect(() => {
    if (!open) return
    const update = () => setPos(getPanelPos())
    update()
    window.addEventListener('resize', update)
    window.addEventListener('scroll', update, { capture: true, passive: true })
    return () => {
      window.removeEventListener('resize', update)
      window.removeEventListener('scroll', update, { capture: true })
    }
  }, [open, items.length])

  async function askPermission() {
    try {
      setPerm(await Notification.requestPermission())
    } catch {
      // bỏ qua
    }
  }

  return (
    <div className={side ? 'bell bell-side' : 'bell'} ref={box}>
      <button
        type="button"
        className={`${side ? 'side-btn' : 'bell-btn'}${unread > 0 ? ' has-new' : ''}`}
        onClick={toggle}
        aria-label={unread > 0 ? `Thông báo: ${unread} bài mới` : 'Thông báo'}
        aria-expanded={open}
        title="Thông báo"
      >
        <svg className="icon" viewBox="0 0 24 24" width={side ? 18 : 19} height={side ? 18 : 19} aria-hidden="true">
          <path
            d="M18 16v-5a6 6 0 1 0-12 0v5l-1.5 2h15L18 16Zm-8 4a2 2 0 0 0 4 0"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        {side && <span className="side-label">Thông báo</span>}
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
                      {it.kind === 'lesson' ? '📘' : it.kind === 'course' ? '🎓' : it.kind === 'submission' ? '📥' : '✏️'}
                    </span>
                    <span className="bell-body">
                      <span className="bell-kind">
                        {it.kind === 'submission' ? (
                          <>
                            {it.student} nộp bài · {it.status === 'checked' ? 'đã chấm' : 'chờ chấm'}
                          </>
                        ) : (
                          <>
                            {it.kind === 'lesson' ? 'Bài giảng mới' : it.kind === 'course' ? 'Bạn được giao khóa học' : 'Bài tập mới'}
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
