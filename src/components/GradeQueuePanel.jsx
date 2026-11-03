import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'
import { useAsync } from '../lib/useAsync.js'
import ContextPanel from './ContextPanel.jsx'
import { timeAgo } from './NotificationBell.jsx'

const LIMIT = 8

// Cột phải trang Chấm bài (gia sư): mọi bài học sinh đã nộp mà chưa chấm (status 'done'), nộp sớm nhất lên trước
// để chấm theo thứ tự đến. Bấm một dòng mở thẳng bài của bạn đó ở trang chấm (?hs=). Thay khối mặc định (`replace`).
export default function GradeQueuePanel() {
  const { data, loading, error } = useAsync(async () => {
    const { data: rows, count, error } = await supabase
      .from('assignment_recipients')
      .select('student_id, submitted_at, student:profiles(full_name), assignment:assignments(id, title)', { count: 'exact' })
      .eq('status', 'done')
      .order('submitted_at', { ascending: true })
      .limit(LIMIT)
    if (error) throw error
    return { rows: (rows || []).filter((r) => r.assignment), total: count ?? rows?.length ?? 0 }
  }, [])

  return (
    <ContextPanel title="Hàng đợi chấm" replace>
      {loading ? (
        <p className="muted small ctx-empty">Đang tải…</p>
      ) : error ? (
        <p className="muted small ctx-empty">Chưa tải được hàng đợi. Tải lại trang để thử lại.</p>
      ) : !data?.rows.length ? (
        <p className="muted small ctx-empty">Không còn bài nào chờ chấm. Học sinh nộp bài thì sẽ hiện ở đây.</p>
      ) : (
        <>
          <p className="small ctx-note">
            <strong>{data.total}</strong> bài chờ chấm, nộp sớm nhất lên trước{data.total > LIMIT ? ` (hiện ${LIMIT})` : ''}
          </p>
          <ol className="ctx-feed ctx-queue">
            {data.rows.map((r) => (
              <li key={`${r.assignment.id}:${r.student_id}`}>
                <Link to={`/tutor/assignments/${r.assignment.id}?hs=${r.student_id}`} className="ctx-feed-row">
                  <span className="ctx-feed-main">
                    <b>{r.student?.full_name || 'Học sinh'}</b>
                    <span className="muted">{r.assignment.title}</span>
                  </span>
                  <span className="ctx-queue-side">
                    <span className="muted small">{timeAgo(r.submitted_at)}</span>
                    <span className="ctx-go">Chấm</span>
                  </span>
                </Link>
              </li>
            ))}
          </ol>
        </>
      )}
    </ContextPanel>
  )
}
