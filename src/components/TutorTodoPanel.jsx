import { Link } from 'react-router-dom'
import { useNotifications } from '../contexts/NotificationsContext.jsx'
import { countOpenReports } from '../lib/reports.js'
import { countUnseenFeedback } from '../lib/feedback.js'
import { useAsync } from '../lib/useAsync.js'
import Icon from './Icon.jsx'

// Khối mặc định cột phải của gia sư (Layout): "Việc cần xử lý" thu thành một dải số một dòng, luôn ở đầu cột.
// Số bài chờ chấm lấy từ chuông thông báo (NotificationsContext), số báo lỗi / góp ý đếm như menu.
export default function TutorTodoPanel() {
  const { items } = useNotifications()
  const { data } = useAsync(() => Promise.all([countOpenReports(), countUnseenFeedback()]), [])
  const [reports = 0, feedback = 0] = data || []
  const pending = items.filter((it) => it.kind === 'submission' && it.status === 'done').length // đã nộp, chưa chấm

  const todo = [
    { to: '/tutor/assignments', n: pending, short: 'chấm', label: 'bài mới nộp chờ chấm', tone: 'warn' },
    { to: '/tutor/reports', n: reports, short: 'lỗi', label: 'câu bị báo lỗi', tone: 'bad' },
    { to: '/tutor/feedback', n: feedback, short: 'góp ý', label: 'góp ý chưa xem', tone: 'info' },
  ].filter((t) => t.n)

  return (
    // ctx-card để cột phải hiện ra; ctx-default để trang `replace` ẩn được; ctx-top để luôn nằm đầu cột
    <nav className="ctx-card ctx-default ctx-top ctx-strip" aria-label="Việc cần xử lý">
      <Icon name="todo" className="ctx-strip-icon" title="Việc cần xử lý" />
      {todo.length ? (
        todo.map((t) => (
          <Link key={t.to} to={t.to} className={`ctx-strip-item tone-${t.tone}`} title={`${t.n} ${t.label}`}>
            <strong className="ctx-num">{t.n}</strong> {t.short}
          </Link>
        ))
      ) : (
        <span className="muted small">Không còn việc nào chờ.</span>
      )}
    </nav>
  )
}
