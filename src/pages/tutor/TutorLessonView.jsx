import { Link, useParams } from 'react-router-dom'
import { supabase, unwrap } from '../../lib/supabase.js'
import { useAsync } from '../../lib/useAsync.js'
import { studentLabel } from '../../lib/students.js'
import Loading from '../../components/Loading.jsx'
import ErrorBox from '../../components/ErrorBox.jsx'
import LessonView from '../../components/LessonView.jsx'
import Icon from '../../components/Icon.jsx'

export default function TutorLessonView() {
  const { id } = useParams()

  const { data, loading, error, reload } = useAsync(async () => {
    const [lesson, assignments] = await Promise.all([
      supabase
        .from('lessons')
        .select('*, lesson_recipients(student:profiles(id, full_name, group_name, grade))')
        .eq('id', id)
        .maybeSingle()
        .then(unwrap),
      supabase.from('assignments').select('id, title').eq('lesson_id', id).then(unwrap),
    ])
    if (!lesson) throw new Error('Không tìm thấy bài giảng (có thể đã bị xóa).')
    return { lesson, assignments }
  }, [id])

  if (loading) return <Loading />
  if (error)
    return (
      <div>
        <ErrorBox message={error} onRetry={reload} />
        <Link to="/tutor/lessons">← Danh sách bài giảng</Link>
      </div>
    )

  const { lesson, assignments } = data
  return (
    <div>
      <div className="row row-between" style={{ marginBottom: '0.5rem' }}>
        <Link to="/tutor/lessons" className="small">
          ← Danh sách bài giảng
        </Link>
        <Link className="btn btn-small" to={`/tutor/lessons/${id}/edit`}>
          <Icon name="edit" />
          Sửa
        </Link>
      </div>
      <LessonView lesson={lesson} />

      <div className="card">
        <h2>Đã giao cho ({lesson.lesson_recipients.length})</h2>
        {lesson.lesson_recipients.length === 0 ? (
          <p className="muted">Chưa giao cho học sinh nào.</p>
        ) : (
          <ul style={{ margin: 0, paddingLeft: '1.2rem' }}>
            {lesson.lesson_recipients.map((r, i) => (
              <li key={r.student?.id || i}>{studentLabel(r.student)}</li>
            ))}
          </ul>
        )}
      </div>

      {assignments.length > 0 && (
        <div className="card">
          <h2>Bài tập liên quan</h2>
          <ul style={{ margin: 0, paddingLeft: '1.2rem' }}>
            {assignments.map((a) => (
              <li key={a.id}>
                <Link to={`/tutor/assignments/${a.id}`}>{a.title}</Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
