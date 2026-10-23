import { Link, useLocation, useParams } from 'react-router-dom'
import { supabase, unwrap } from '../../lib/supabase.js'
import { useAsync } from '../../lib/useAsync.js'
import Loading from '../../components/Loading.jsx'
import ErrorBox from '../../components/ErrorBox.jsx'
import LessonView from '../../components/LessonView.jsx'
import StudyNowButton from '../../components/StudyNowButton.jsx'

export default function StudentLesson() {
  const { id } = useParams()
  const fromLessons = useLocation().state?.from === 'lessons'

  const { data, loading, error, reload } = useAsync(async () => {
    // RLS chỉ trả về bài giảng được giao cho học sinh này
    const lesson = unwrap(await supabase.from('lessons').select('*').eq('id', id).maybeSingle())
    if (!lesson) throw new Error('Không tìm thấy bài giảng, hoặc bài này không được giao cho bạn.')
    const assignments = unwrap(await supabase.from('assignments').select('id, title').eq('lesson_id', id))
    return { lesson, assignments }
  }, [id])

  if (loading) return <Loading />
  if (error)
    return (
      <div>
        <ErrorBox message={error} onRetry={reload} />
        <Link to={fromLessons ? '/student/lessons' : '/student/library'}>{fromLessons ? '← Bài giảng' : '← Thư viện'}</Link>
      </div>
    )

  // Vào từ trang Bài giảng thì quay lại Bài giảng, còn lại về chương trong Thư viện
  const back = fromLessons
    ? { to: '/student/lessons', label: '← Bài giảng' }
    : { to: data.lesson.chapter_id ? `/student/library/${data.lesson.chapter_id}` : '/student/library', label: '← Thư viện' }

  return (
    <div>
      <Link to={back.to} className="small">
        {back.label}
      </Link>
      {data.lesson.chapter_id && (
        <div className="row" style={{ marginTop: '0.5rem' }}>
          <StudyNowButton chapterId={data.lesson.chapter_id} />
        </div>
      )}
      <div style={{ marginTop: '0.5rem' }}>
        <LessonView lesson={data.lesson} />
      </div>
      {data.assignments.length > 0 && (
        <div className="card">
          <h2>Bài tập của bài này</h2>
          <div className="list">
            {data.assignments.map((a) => (
              <Link key={a.id} to={`/student/assignments/${a.id}`} className="list-item">
                ✏️ {a.title}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
