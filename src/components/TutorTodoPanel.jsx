import { Link } from 'react-router-dom'
import { useNotifications } from '../contexts/NotificationsContext.jsx'
import { countOpenReports } from '../lib/reports.js'
import { countUnseenFeedback } from '../lib/feedback.js'
import { useAsync } from '../lib/useAsync.js'
import { CtxCard } from './ContextPanel.jsx'

// Khối mặc định cột phải của gia sư (Layout → ContextDefault): chỉ còn "Việc cần xử lý" (danh sách bài vừa nộp đã có ở chuông).
// Số bài chờ chấm lấy từ chuông thông báo (NotificationsContext), số báo lỗi / góp ý đếm như menu.
export default function TutorTodoPanel() {
  const { items } = useNotifications()
  const { data } = useAsync(() => Promise.all([countOpenReports(), countUnseenFeedback()]), [])
  const [reports = 0, feedback = 0] = data || []
  const pending = items.filter((it) => it.kind === 'submission' && it.status === 'done').length // đã nộp, chưa chấm

  const todo = [
    { to: '/tutor/assignments', n: pending, label: 'bài mới nộp chờ chấm', tone: 'warn' },
    { to: '/tutor/reports', n: reports, label: 'câu bị báo lỗi', tone: 'bad' },
    { to: '/tutor/feedback', n: feedback, label: 'góp ý chưa xem', tone: 'info' },
  ].filter((t) => t.n)

  return (
    <CtxCard title="Việc cần xử lý" className="ctx-default ctx-quiet">
      {todo.length ? (
        <ul className="ctx-todo">
          {todo.map((t) => (
            <li key={t.to}>
              <Link to={t.to} className={`ctx-todo-row tone-${t.tone}`}>
                <strong className="ctx-num">{t.n}</strong>
                <span>{t.label}</span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="muted small ctx-empty">Không còn việc nào đang chờ. Học sinh nộp bài thì sẽ hiện ở đây.</p>
      )}
    </CtxCard>
  )
}
