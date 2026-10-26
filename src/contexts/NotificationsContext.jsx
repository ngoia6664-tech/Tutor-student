import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase, unwrap } from '../lib/supabase.js'
import { useAuth } from './AuthContext.jsx'
import Icon from '../components/Icon.jsx'
import { mascotSay } from '../lib/celebrate.js'

// Thông báo bài giảng / bài tập mới cho học sinh; gia sư: học sinh vừa nộp bài.
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

// Gia sư: học sinh nộp bài (lần nộp chính thức; "Cho nộp lại" rồi nộp lần nữa = thông báo mới).
// Mở thẳng bài làm của bạn đó ở trang chấm (?hs=)
async function fetchSubmissions() {
  const rows = await supabase
    .from('assignment_recipients')
    .select('student_id, submitted_at, status, score, student:profiles(full_name), assignment:assignments(id, title, chapter:chapters(title))')
    .gte('submitted_at', windowStart().toISOString())
    .order('submitted_at', { ascending: false })
    .limit(50)
    .then(unwrap)
  return rows
    .filter((r) => r.assignment && r.submitted_at && r.status !== 'todo')
    .map((r) => ({
      key: `s:${r.assignment.id}:${r.student_id}:${r.submitted_at}`,
      kind: 'submission',
      title: r.assignment.title,
      student: r.student?.full_name || 'Học sinh',
      chapter: r.assignment.chapter?.title || null,
      at: r.submitted_at,
      status: r.status,
      to: `/tutor/assignments/${r.assignment.id}?hs=${r.student_id}`,
    }))
}

const kindText = (it) => (it.kind === 'lesson' ? 'Bài giảng mới' : it.kind === 'submission' ? `${it.student} vừa nộp bài` : 'Bài tập mới')

// Chuông báo luôn kèm gấu nói (Mascot nghe sự kiện từ lib/celebrate.js)
function announce(setToast, toast) {
  setToast(toast)
  mascotSay(toast.text)
}

export function NotificationsProvider({ children }) {
  const { profile } = useAuth()
  const isTutor = profile?.role === 'tutor'
  const enabled = profile?.role === 'student' || isTutor
  const [items, setItems] = useState([])
  const [seenAt, setSeenAt] = useState(() => toDate(profile?.notif_seen_at))
  const [toast, setToast] = useState(null) // { text, to }
  const seenRef = useRef(seenAt)
  const knownKeys = useRef(null) // bài đã biết ở lần tải trước (để phát hiện bài vừa giao)
  // Mốc cho nhãn "Mới" trong các trang: lúc mở app, không đổi khi bấm chuông trong phiên này
  const baseline = useRef(toDate(profile?.notif_seen_at))
  const lastRefresh = useRef(0)

  // Hồ sơ lấy từ bộ nhớ máy có thể cũ: hồ sơ mới từ máy chủ về thì dời mốc "đã xem" lên
  const serverSeen = profile?.notif_seen_at
  useEffect(() => {
    const t = toDate(serverSeen)
    if (!t) return
    if (!baseline.current || t > baseline.current) baseline.current = t
    if (!seenRef.current || t > seenRef.current) {
      seenRef.current = t
      setSeenAt(t)
    }
  }, [serverSeen])

  const refresh = useCallback(async () => {
    if (!enabled) return
    // Quay lại tab bắn cả focus lẫn visibilitychange: chỉ tải một lần
    if (Date.now() - lastRefresh.current < 3000) return
    lastRefresh.current = Date.now()
    let list
    try {
      list = isTutor ? await fetchSubmissions() : await fetchItems(profile.id)
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
      if (unread.length && !shown)
        announce(setToast, { text: isTutor ? `Có ${unread.length} bài học sinh mới nộp` : `Bạn có ${unread.length} bài mới được giao`, to: null })
    } else {
      const fresh = unread.filter((it) => !knownKeys.current.has(it.key))
      if (fresh.length) {
        const text =
          fresh.length === 1 ? `${kindText(fresh[0])}: ${fresh[0].title}` : isTutor ? `Có ${fresh.length} bài học sinh vừa nộp` : `Có ${fresh.length} bài mới được giao`
        announce(setToast, { text, to: fresh.length === 1 ? fresh[0].to : null })
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
  }, [enabled, isTutor, profile?.id])

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
      isTutor,
      items,
      unread: items.filter((it) => new Date(it.at) > base).length,
      isUnread: (it) => new Date(it.at) > base,
      // Nhãn "Mới" trong danh sách: giao sau lần xem thông báo trước khi mở app
      isNew: (at) => !!at && new Date(at) > (baseline.current || windowStart()),
      markSeen,
      refresh,
    }
  }, [enabled, isTutor, items, seenAt, markSeen, refresh])

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
          <Icon name="eye" />
          Xem
        </Link>
      )}
      <button type="button" className="toast-close" onClick={onClose} aria-label="Đóng">
        ×
      </button>
    </div>
  )
}
