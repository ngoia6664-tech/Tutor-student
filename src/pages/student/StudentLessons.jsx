import { Link } from 'react-router-dom'
import { supabase, unwrap } from '../../lib/supabase.js'
import { useAsync } from '../../lib/useAsync.js'
import { formatDateTime } from '../../lib/format.js'
import { useAuth } from '../../contexts/AuthContext.jsx'
import Loading from '../../components/Loading.jsx'
import ErrorBox from '../../components/ErrorBox.jsx'

export default function StudentLessons() {
  const { profile } = useAuth()

  const { data, loading, error, reload } = useAsync(async () => {
    const rows = unwrap(
      await supabase
        .from('lesson_recipients')
        .select('lesson:lessons(id, title, file_path, video_url, created_at)')
        .eq('student_id', profile.id)
    )
    // Bài mới nhất lên đầu
    return rows
      .map((r) => r.lesson)
      .filter(Boolean)
      .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
  }, [profile.id])

  return (
    <div>
      <div className="page-head">
        <h1>Bài giảng</h1>
      </div>

      {loading && <Loading />}
      <ErrorBox message={error} onRetry={reload} />

      {!loading && !error && data.length === 0 && <div className="empty">Chưa có bài giảng nào được giao cho bạn.</div>}

      {!loading && !error && data.length > 0 && (
        <div className="list">
          {data.map((l) => (
            <Link key={l.id} to={`/student/lessons/${l.id}`} className="list-item">
              <div className="list-item-title">📘 {l.title}</div>
              <div className="row small">
                {l.file_path && <span className="badge">📎 File</span>}
                {l.video_url && <span className="badge">▶️ Video</span>}
                <span className="muted">{formatDateTime(l.created_at)}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
