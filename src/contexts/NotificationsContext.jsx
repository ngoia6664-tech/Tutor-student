import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase, unwrap } from '../lib/supabase.js'
import { useAuth } from './AuthContext.jsx'

// Thông báo bài giảng / bài tập mới cho học sinh.
// - "Mới" = được giao sau lần cuối học sinh mở chuông (profiles.notif_seen_at, lưu trên máy chủ
//   nên điện thoại và máy tính dùng chung).
// - Kiểm tra lại mỗi phút và mỗi khi quay lại tab; có bài mới thì hiện thông báo nổi.
const WINDOW_DAYS = 14 // chỉ xét bài giao trong 14 ngày gần nhất
const POLL_MS = 60_000

const NotificationsContext = createContext(null)

// Dùng ở trang nào cũng được; ngoài vai trò học sinh thì trả về bản rỗng
const EMPTY = { items: [], unread: 0, isNew: () => false, markSeen: () => {}, refresh: () => {}, enabled: false }
export function useNotifications() {
  return useContext(NotificationsContext) || EMPTY
}

const windowStart = () => new Date(Date.now() - WINDOW_DAYS * 864e5)
const toDate = (v) => (v ? new Date(v) : null)

async function fetchItems(studentId) {
  const since = windowStart().toISOString()
  const [lessons, assignments] = await Promise.all([
    supabase
      .from('lesson_recipients')
      .select('assigned_at, lesson:lessons(id, title, chapter:chapters(title))')
      .eq('student_id', studentId)
      .gte('assigned_at', since)
      .then(unwrap),
    supabase
      .from('assignment_recipients')
      .select('assigned_at, status, assignment:assignments(id, title, type, due_date, chapter:chapters(title))')
      .eq('student_id', studentId)
      .gte('assigned_at', since)
      .then(unwrap),
  ])
  return [
    ...lessons
      .filter((r) => r.lesson)
      .map((r) => ({
        key: `l:${r.lesson.id}`,
        kind: 'lesson',
        title: r.lesson.title,
        chapter: r.lesson.chapter?.title || null,
        at: r.assigned_at,
        to: `/student/lessons/${r.lesson.id}`,
      })),
    ...assignments
      .filter((r) => r.assignment)
      .map((r) => ({
        key: `a:${r.assignment.id}`,
        kind: 'assignment',
        title: r.assignment.title,
        chapter: r.assignment.chapter?.title || null,
        at: r.assigned_at,
        due: r.assignment.due_date,
        status: r.status,
        to: `/student/assignments/${r.assignment.id}`,
      })),
  ].sort((a, b) => (a.at < b.at ? 1 : -1))
}

const kindText = (it) => (it.kind === 'lesson' ? 'Bài giảng mới' : 'Bài tập mới')

export function NotificationsProvider({ children }) {
  const { profile } = useAuth()
  const enabled = profile?.role === 'student'
  const [items, setItems] = useState([])
  const [seenAt, setSeenAt] = useState(() => toDate(profile?.notif_seen_at))
  const [toast, setToast] = useState(null) // { text, to }
  const seenRef = useRef(seenAt)
  const knownKeys = useRef(null) // bài đã biết ở lần tải trước (để phát hiện bài vừa giao)
  // Mốc cho nhãn "Mới" trong các trang: lúc mở app, không đổi khi bấm chuông trong phiên này
  const baseline = useRef(toDate(profile?.notif_seen_at))

  const refresh = useCallback(async () => {
    if (!enabled) return
    let list
    try {
      list = await fetchItems(profile.id)
    } catch {
      return // lỗi mạng / CSDL chưa nâng cấp: không làm phiền, lần sau thử lại
    }
    const unread = list.filter((it) => new Date(it.at) > (seenRef.current || windowStart()))
    if (knownKeys.current === null) {
      // Lần đầu mở app trong phiên: nhắc nếu còn bài mới chưa xem
      let shown = false
      try {
        shown = sessionStorage.getItem('notif-greeted') === '1'
        sessionStorage.setItem('notif-greeted', '1')
      } catch {
        // bỏ qua
      }
      if (unread.length && !shown) setToast({ text: `Bạn có ${unread.length} bài mới được giao`, to: null })
    } else {
      const fresh = unread.filter((it) => !knownKeys.current.has(it.key))
      if (fresh.length) {
        const text = fresh.length === 1 ? `${kindText(fresh[0])}: ${fresh[0].title}` : `Có ${fresh.length} bài mới được giao`
        setToast({ text, to: fresh.length === 1 ? fresh[0].to : null })
        // Đang ở tab khác và đã cho phép: báo bằng thông báo của trình duyệt
        try {
          if (document.hidden && 'Notification' in window && Notification.permission === 'granted') new Notification('Study with Duy Anh', { body: text })
        } catch {
          // trình duyệt không hỗ trợ: bỏ qua
        }
      }
    }
    knownKeys.current = new Set(list.map((it) => it.key))
    setItems(list)
  }, [enabled, profile?.id])

  useEffect(() => {
    if (!enabled) return
    refresh()
    const timer = setInterval(refresh, POLL_MS)
    const onVisible = () => document.visibilityState === 'visible' && refresh()
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('focus', onVisible)
    return () => {
      clearInterval(timer)
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('focus', onVisible)
    }
  }, [enabled, refresh])

  // Thông báo nổi tự ẩn sau 7 giây
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 7000)
    return () => clearTimeout(t)
  }, [toast])

  const markSeen = useCallback(async () => {
    const now = new Date()
    seenRef.current = now
    setSeenAt(now) // cập nhật ngay trên màn hình, rồi lưu lên máy chủ
    try {
      const t = unwrap(await supabase.rpc('mark_notifications_seen'))
      if (t) {
        seenRef.current = new Date(t)
        setSeenAt(new Date(t))
      }
    } catch {
      // chưa lưu được: lần sau mở chuông sẽ lưu lại
    }
  }, [])

  const value = useMemo(() => {
    const base = seenAt || windowStart()
    return {
      enabled,
      items,
      unread: items.filter((it) => new Date(it.at) > base).length,
      isUnread: (it) => new Date(it.at) > base,
      // Nhãn "Mới" trong danh sách: giao sau lần xem thông báo trước khi mở app
      isNew: (at) => !!at && new Date(at) > (baseline.current || windowStart()),
      markSeen,
      refresh,
    }
  }, [enabled, items, seenAt, markSeen, refresh])

  return (
    <NotificationsContext.Provider value={value}>
      {children}
      {toast && <Toast toast={toast} onClose={() => setToast(null)} />}
    </NotificationsContext.Provider>
  )
}

function Toast({ toast, onClose }) {
  return (
    <div className="toast" role="status" aria-live="polite">
      <span className="toast-icon" aria-hidden="true">
        🔔
      </span>
      <span className="toast-text">{toast.text}</span>
      {toast.to && (
        <Link className="btn btn-small btn-primary" to={toast.to} onClick={onClose}>
          Xem
        </Link>
      )}
      <button type="button" className="toast-close" onClick={onClose} aria-label="Đóng">
        ×
      </button>
    </div>
  )
}
