import { Link } from 'react-router-dom'
import { supabase, unwrap } from '../../lib/supabase.js'
import { useAsync } from '../../lib/useAsync.js'
import { formatDateTime, formatScore } from '../../lib/format.js'
import { useAuth } from '../../contexts/AuthContext.jsx'
import Loading from '../../components/Loading.jsx'
import ErrorBox from '../../components/ErrorBox.jsx'
import { StatusBadge, TypeBadge } from '../../components/Badges.jsx'

// Bài đã nộp: điểm và nhận xét (nếu gia sư đã chấm)
export default function StudentResults() {
  const { profile } = useAuth()

  const { data, loading, error, reload } = useAsync(async () => {
    const rows = unwrap(
      await supabase
        .from('assignment_recipients')
        .select('status, submitted_at, score, feedback, assignment:assignments(id, title, type, due_date)')
        .eq('student_id', profile.id)
        .in('status', ['done', 'checked'])
        .order('submitted_at', { ascending: false })
    )
    return rows.filter((r) => r.assignment)
  }, [profile.id])

  return (
    <div>
      <div className="page-head">
        <h1>Kết quả</h1>
      </div>

      {loading && <Loading />}
      <ErrorBox message={error} onRetry={reload} />

      {!loading && !error && data.length === 0 && <div className="empty">Bạn chưa nộp bài nào.</div>}

      {!loading && !error && data.length > 0 && (
        <div className="list">
          {data.map((r) => (
            <Link key={r.assignment.id} to={`/student/assignments/${r.assignment.id}`} className="list-item">
              <div className="row row-between">
                <div className="list-item-title">{r.assignment.title}</div>
                {r.status === 'checked' && <span className="score">{formatScore(r.score)}</span>}
              </div>
              <div className="row">
                <TypeBadge type={r.assignment.type} />
                <StatusBadge status={r.status} />
                <span className="muted small">Nộp: {formatDateTime(r.submitted_at)}</span>
              </div>
              {r.status === 'checked' && r.feedback && (
                <p className="small" style={{ margin: '0.5rem 0 0', whiteSpace: 'pre-wrap' }}>
                  💬 {r.feedback.length > 160 ? r.feedback.slice(0, 160) + '…' : r.feedback}
                </p>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
