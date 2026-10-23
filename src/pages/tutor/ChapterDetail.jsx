import { useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase, unwrap } from '../../lib/supabase.js'
import { useAsync } from '../../lib/useAsync.js'
import { formatDate, formatDateTime } from '../../lib/format.js'
import Loading from '../../components/Loading.jsx'
import ErrorBox from '../../components/ErrorBox.jsx'
import { DueBadge, TypeBadge } from '../../components/Badges.jsx'
import { gradeLabel, keyOf, libraryUrl, sectionLabel, subjectLabel } from '../../lib/chapters.js'
import Icon from '../../components/Icon.jsx'
import { AssignDialog, SelectBar, SelectCheck, SelectToggle, useAssignSelection } from '../../components/QuickAssign.jsx'

// Nội dung một chương (cột phải của Thư viện): các bài giảng, bài tập bên trong, kèm tình hình nộp bài
export default function ChapterDetail({ id, reloadKey = 0, onEdit, onDelete }) {
  const pick = useAssignSelection()
  const [assigning, setAssigning] = useState(null)
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
    <div className="assign-space">
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
            <Icon name="plus" />
            Bài giảng
          </Link>
          <Link className="btn btn-small btn-primary" to="/tutor/assignments/new" {...newState}>
            <Icon name="plus" />
            Bài tập
          </Link>
          {lessons.length + assignments.length > 0 && <SelectToggle sel={pick} />}
          {onEdit && (
            <button type="button" className="btn btn-small" onClick={() => onEdit(chapter)}>
              <Icon name="edit" />
              Sửa chương
            </button>
          )}
          {onDelete && (
            <button type="button" className="btn btn-small btn-danger" onClick={() => onDelete(chapter, lessons.length + assignments.length)}>
              <Icon name="trash" />
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
          {lessons.map((l) => {
            const item = { kind: 'lesson', id: l.id, title: l.title }
            return (
              <div key={l.id} className={pick.has('lesson', l.id) ? 'list-item is-picked' : 'list-item'}>
                <div className="list-item-title assign-title">
                  <SelectCheck sel={pick} item={item} />
                  <Link to={`/tutor/lessons/${l.id}`} style={{ color: 'inherit' }}>
                    📘 {l.title}
                  </Link>
                </div>
                <div className="row small">
                  <AssignButton count={l.lesson_recipients.length} onClick={() => setAssigning([item])} />
                  <span className="muted">{formatDateTime(l.created_at)}</span>
                </div>
              </div>
            )
          })}
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
            const item = { kind: 'assignment', id: a.id, title: a.title }
            return (
              <div key={a.id} className={pick.has('assignment', a.id) ? 'list-item is-picked' : 'list-item'}>
                <div className="list-item-title assign-title">
                  <SelectCheck sel={pick} item={item} />
                  <Link to={`/tutor/assignments/${a.id}`} style={{ color: 'inherit' }}>
                    ✏️ {a.title}
                  </Link>
                </div>
                <div className="row small">
                  <AssignButton count={a.assignment_recipients.length} onClick={() => setAssigning([item])} />
                  <TypeBadge type={a.type} />
                  <DueBadge date={a.due_date} />
                  {a.due_date && <span className="muted">Hạn: {formatDate(a.due_date)}</span>}
                </div>
                <div className="row small" style={{ marginTop: '0.4rem' }}>
                  <span className="badge badge-warn">{cnt.todo} chưa nộp</span>
                  <span className="badge badge-primary">{cnt.done} chờ chấm</span>
                  <span className="badge badge-ok">{cnt.checked} đã chấm</span>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <SelectBar sel={pick} onAssign={() => setAssigning(pick.items)} />
      {assigning && (
        <AssignDialog
          items={assigning}
          onClose={() => setAssigning(null)}
          onSaved={() => {
            if (assigning.length > 1) pick.stop()
            reload()
          }}
        />
      )}
    </div>
  )
}

function AssignButton({ count, onClick }) {
  return (
    <button type="button" className="btn btn-small" onClick={onClick} title="Chọn học sinh nhận bài">
      <Icon name="users" />
      Giao ({count})
    </button>
  )
}
