import { Link, useParams } from 'react-router-dom'
import { supabase, unwrap } from '../../lib/supabase.js'
import { useAsync } from '../../lib/useAsync.js'
import { formatDate, formatDateTime } from '../../lib/format.js'
import Loading from '../../components/Loading.jsx'
import ErrorBox from '../../components/ErrorBox.jsx'
import { DueBadge, TypeBadge } from '../../components/Badges.jsx'
import { gradeLabel, keyOf, sectionLabel, subjectLabel } from '../../lib/chapters.js'

// Link về một cấp trong trang Chương (?lop=&mon=&cd=)
const levelUrl = (...vals) => '/tutor/chapters?' + new URLSearchParams(vals.map((v, i) => [['lop', 'mon', 'cd'][i], keyOf(v)])).toString()

// Một chương: các bài giảng và bài tập bên trong, kèm tình hình nộp bài
export default function ChapterDetail() {
  const { id } = useParams()

  const { data, loading, error, reload } = useAsync(async () => {
    const chapter = unwrap(await supabase.from('chapters').select('*').eq('id', id).maybeSingle())
    if (!chapter) throw new Error('Không tìm thấy chương (có thể đã bị xóa).')
    const [lessons, assignments] = await Promise.all([
      supabase.from('lessons').select('id, title, created_at, lesson_recipients(student_id)').eq('chapter_id', id).order('created_at').then(unwrap),
      supabase
        .from('assignments')
        .select('id, title, type, due_date, created_at, assignment_recipients(status)')
        .eq('chapter_id', id)
        .order('created_at')
        .then(unwrap),
    ])
    return { chapter, lessons, assignments }
  }, [id])

  if (loading) return <Loading />
  if (error)
    return (
      <div>
        <ErrorBox message={error} onRetry={reload} />
        <Link to="/tutor/chapters">← Danh sách chương</Link>
      </div>
    )

  const { chapter, lessons, assignments } = data
  const newState = { state: { chapterId: chapter.id } }

  return (
    <div>
      <nav className="crumbs" aria-label="Vị trí" style={{ marginTop: 0 }}>
        <Link to="/tutor/chapters">Tất cả lớp</Link>
        <span>›</span>
        <Link to={levelUrl(chapter.grade)}>{gradeLabel(chapter.grade)}</Link>
        <span>›</span>
        <Link to={levelUrl(chapter.grade, chapter.subject)}>{subjectLabel(chapter.subject)}</Link>
        <span>›</span>
        <Link to={levelUrl(chapter.grade, chapter.subject, chapter.section)}>{sectionLabel(chapter.section)}</Link>
      </nav>
      <header className="lesson-head">
        <h1>{chapter.title}</h1>
        <div className="row">
          <Link className="btn btn-small btn-primary" to="/tutor/lessons/new" {...newState}>
            + Bài giảng trong chương
          </Link>
          <Link className="btn btn-small btn-primary" to="/tutor/assignments/new" {...newState}>
            + Bài tập trong chương
          </Link>
        </div>
      </header>

      <h2 className="section-title">Bài giảng ({lessons.length})</h2>
      {lessons.length === 0 ? (
        <div className="empty" style={{ marginBottom: '1.25rem' }}>
          Chưa có bài giảng trong chương này.
        </div>
      ) : (
        <div className="list" style={{ marginBottom: '1.25rem' }}>
          {lessons.map((l) => (
            <Link key={l.id} to={`/tutor/lessons/${l.id}`} className="list-item">
              <div className="list-item-title">📘 {l.title}</div>
              <div className="row small">
                <span className="badge">{l.lesson_recipients.length} học sinh</span>
                <span className="muted">{formatDateTime(l.created_at)}</span>
              </div>
            </Link>
          ))}
        </div>
      )}

      <h2 className="section-title">Bài tập ({assignments.length})</h2>
      {assignments.length === 0 ? (
        <div className="empty">Chưa có bài tập trong chương này.</div>
      ) : (
        <div className="list">
          {assignments.map((a) => {
            const c = { todo: 0, done: 0, checked: 0 }
            a.assignment_recipients.forEach((r) => (c[r.status] += 1))
            return (
              <Link key={a.id} to={`/tutor/assignments/${a.id}`} className="list-item">
                <div className="list-item-title">✏️ {a.title}</div>
                <div className="row small">
                  <TypeBadge type={a.type} />
                  <DueBadge date={a.due_date} />
                  {a.due_date && <span className="muted">Hạn: {formatDate(a.due_date)}</span>}
                </div>
                <div className="row small" style={{ marginTop: '0.4rem' }}>
                  <span className="badge badge-warn">{c.todo} chưa nộp</span>
                  <span className="badge badge-primary">{c.done} chờ chấm</span>
                  <span className="badge badge-ok">{c.checked} đã chấm</span>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
