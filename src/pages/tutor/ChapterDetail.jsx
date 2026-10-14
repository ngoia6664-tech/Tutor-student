import { Link } from 'react-router-dom'
import { supabase, unwrap } from '../../lib/supabase.js'
import { useAsync } from '../../lib/useAsync.js'
import { formatDate, formatDateTime } from '../../lib/format.js'
import Loading from '../../components/Loading.jsx'
import ErrorBox from '../../components/ErrorBox.jsx'
import { DueBadge, TypeBadge } from '../../components/Badges.jsx'
import { gradeLabel, keyOf, libraryUrl, sectionLabel, subjectLabel } from '../../lib/chapters.js'

// Nội dung một chương (cột phải của Thư viện): các bài giảng, bài tập bên trong, kèm tình hình nộp bài
export default function ChapterDetail({ id, reloadKey = 0, onEdit, onDelete }) {
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
  }, [id, reloadKey])

  if (loading) return <Loading />
  if (error)
    return (
      <div>
        <ErrorBox message={error} onRetry={reload} />
        <Link to={libraryUrl()}>← Thư viện</Link>
      </div>
    )

  const { chapter, lessons, assignments } = data
  const newState = { state: { chapterId: chapter.id } }
  const [g, s, c] = [keyOf(chapter.grade), keyOf(chapter.subject), keyOf(chapter.section)]

  return (
    <div>
      <nav className="crumbs" aria-label="Vị trí">
        <Link to={libraryUrl(g)}>{gradeLabel(chapter.grade)}</Link>
        <span>›</span>
        <Link to={libraryUrl(g, s)}>{subjectLabel(chapter.subject)}</Link>
        <span>›</span>
        <Link to={libraryUrl(g, s, c)}>{sectionLabel(chapter.section)}</Link>
      </nav>
      <header className="lesson-head" style={{ marginTop: 0 }}>
        <h1>{chapter.title}</h1>
        <div className="row">
          <Link className="btn btn-small btn-primary" to="/tutor/lessons/new" {...newState}>
            + Bài giảng
          </Link>
          <Link className="btn btn-small btn-primary" to="/tutor/assignments/new" {...newState}>
            + Bài tập
          </Link>
          {onEdit && (
            <button type="button" className="btn btn-small" onClick={() => onEdit(chapter)}>
              Sửa chương
            </button>
          )}
          {onDelete && (
            <button type="button" className="btn btn-small btn-danger" onClick={() => onDelete(chapter, lessons.length + assignments.length)}>
              Xóa
            </button>
          )}
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
            const cnt = { todo: 0, done: 0, checked: 0 }
            a.assignment_recipients.forEach((r) => (cnt[r.status] += 1))
            return (
              <Link key={a.id} to={`/tutor/assignments/${a.id}`} className="list-item">
                <div className="list-item-title">✏️ {a.title}</div>
                <div className="row small">
                  <TypeBadge type={a.type} />
                  <DueBadge date={a.due_date} />
                  {a.due_date && <span className="muted">Hạn: {formatDate(a.due_date)}</span>}
                </div>
                <div className="row small" style={{ marginTop: '0.4rem' }}>
                  <span className="badge badge-warn">{cnt.todo} chưa nộp</span>
                  <span className="badge badge-primary">{cnt.done} chờ chấm</span>
                  <span className="badge badge-ok">{cnt.checked} đã chấm</span>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
