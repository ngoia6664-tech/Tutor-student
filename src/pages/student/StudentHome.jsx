import { Link } from 'react-router-dom'
import { supabase, unwrap } from '../../lib/supabase.js'
import { useAsync } from '../../lib/useAsync.js'
import { compareDue, formatDate } from '../../lib/format.js'
import { useAuth } from '../../contexts/AuthContext.jsx'
import Loading from '../../components/Loading.jsx'
import ErrorBox from '../../components/ErrorBox.jsx'
import { DueBadge, TypeBadge } from '../../components/Badges.jsx'

export default function StudentHome() {
  const { profile } = useAuth()

  // Bài chưa nộp, sắp theo hạn gần nhất
  const { data, loading, error, reload } = useAsync(async () => {
    const rows = unwrap(
      await supabase
        .from('assignment_recipients')
        .select('status, assignment:assignments(id, title, type, due_date, chapter:chapters(title))')
        .eq('student_id', profile.id)
        .eq('status', 'todo')
    )
    return rows.filter((r) => r.assignment).sort((a, b) => compareDue(a.assignment.due_date, b.assignment.due_date))
  }, [profile.id])

  return (
    <div>
      <div className="page-head">
        <h1>Chào {profile.full_name || 'bạn'} 👋</h1>
      </div>
      <h2>Bài cần làm</h2>

      {loading && <Loading />}
      <ErrorBox message={error} onRetry={reload} />

      {!loading && !error && data.length === 0 && <div className="empty">🎉 Bạn đã làm hết bài được giao.</div>}

      {!loading && !error && data.length > 0 && (
        <div className="list">
          {data.map(({ assignment: a }) => (
            <Link key={a.id} to={`/student/assignments/${a.id}`} className="list-item">
              <div className="list-item-title">{a.title}</div>
              <div className="row">
                {a.chapter && <span className="badge badge-primary">{a.chapter.title}</span>}
                <TypeBadge type={a.type} />
                <DueBadge date={a.due_date} />
                {a.due_date && <span className="muted small">Hạn: {formatDate(a.due_date)}</span>}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
