import { Link } from 'react-router-dom'
import ContextPanel from './ContextPanel.jsx'
import { timeAgo } from './NotificationBell.jsx'

// Cột phải Thư viện học sinh: chủ đề đang học (lối tắt quay lại) + bài giảng / bài tập mới được giao gần đây
// (theo assigned_at, dữ liệu trang đã tải sẵn, không truy vấn thêm).

/**
 * @param {{
 *   now: { id: string, title: string } | null,
 *   lessons: { id: string, title: string, assigned_at?: string }[],
 *   assignments: { status: string, assigned_at?: string, assignment: { id: string, title: string } }[],
 * }} props
 */
export default function LibraryNewPanel({ now, lessons, assignments }) {
  const fresh = [
    ...lessons.map((l) => ({ key: `l:${l.id}`, kind: 'Bài giảng', title: l.title, at: l.assigned_at, to: `/student/lessons/${l.id}` })),
    ...assignments.map((r) => ({
      key: `a:${r.assignment.id}`,
      kind: r.status === 'todo' ? 'Bài tập, chưa làm' : 'Bài tập',
      title: r.assignment.title,
      at: r.assigned_at,
      to: `/student/assignments/${r.assignment.id}`,
    })),
  ]
    .filter((x) => x.at)
    .sort((a, b) => (a.at < b.at ? 1 : -1))
    .slice(0, 4)

  return (
    <>
      {now && (
        <ContextPanel title="Đang học" icon="book">
          <Link to={`/student/library/${now.id}`} className="ctx-feed-row ctx-now">
            <span className="ctx-feed-main">
              <b>{now.title}</b>
              <span className="muted">Chủ đề bạn đã đánh dấu đang học</span>
            </span>
            <span className="ctx-go">Mở</span>
          </Link>
        </ContextPanel>
      )}
      <ContextPanel title="Mới được giao" icon="inbox">
        {fresh.length ? (
          <ul className="ctx-feed">
            {fresh.map((x) => (
              <li key={x.key}>
                <Link to={x.to} className="ctx-feed-row">
                  <span className="ctx-feed-main">
                    <b>{x.title}</b>
                    <span className="muted">{x.kind}</span>
                  </span>
                  <span className="muted small ctx-feed-time">{timeAgo(x.at)}</span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted small ctx-empty">Chưa có bài nào được giao. Bài mới sẽ hiện ở đây.</p>
        )}
      </ContextPanel>
    </>
  )
}
