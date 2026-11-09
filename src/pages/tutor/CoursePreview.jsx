import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase, unwrap } from '../../lib/supabase.js'
import { useAsync } from '../../lib/useAsync.js'
import { buildTree, keyOf, libraryUrl, sectionText } from '../../lib/chapters.js'
import Loading from '../../components/Loading.jsx'
import ErrorBox from '../../components/ErrorBox.jsx'
import Icon from '../../components/Icon.jsx'

// Trang "Xem như học sinh" (chỉ đọc) cho một khóa: /tutor/courses/:id/preview
/** @param {string} id */
async function fetchPreview(id) {
  const [course, chapters, recipients] = await Promise.all([
    supabase.from('courses').select('id, title, grade, subject').eq('id', id).single().then(unwrap),
    supabase.from('chapters').select('id, title, section, grade, subject, sort_order, course_id').eq('course_id', id).then(unwrap),
    supabase.from('course_recipients').select('student_id, profile:profiles(full_name)').eq('course_id', id).then(unwrap),
  ])
  const ids = chapters.map((c) => c.id)
  const [lessons, assignments] = ids.length
    ? await Promise.all([
        supabase.from('lessons').select('id, title, hidden, chapter_id').in('chapter_id', ids).order('title').then(unwrap),
        supabase.from('assignments').select('id, title, hidden, chapter_id').in('chapter_id', ids).order('title').then(unwrap),
      ])
    : [[], []]
  return { course, chapters, recipients, lessons, assignments }
}

/** @param {string} studentId @param {string[]} ids */
async function fetchStatus(studentId, ids) {
  if (!studentId || !ids.length) return []
  return unwrap(
    await supabase.from('assignment_recipients').select('assignment_id, status, quiet').eq('student_id', studentId).in('assignment_id', ids)
  )
}

const STATUS = { todo: 'Chưa làm', done: 'Đã nộp', checked: 'Đã chấm' }

/** @param {{ item: any, kind: 'lesson' | 'assignment', st?: any, picked: boolean }} props */
function Row({ item, kind, st, picked }) {
  return (
    <li className={`preview-row${item.hidden ? ' is-hidden' : ''}`}>
      <Icon name={kind === 'lesson' ? 'book' : 'edit'} />
      <Link to={`/tutor/${kind === 'lesson' ? 'lessons' : 'assignments'}/${item.id}`}>{item.title}</Link>
      {kind === 'assignment' && picked && !item.hidden && (
        <span className={`preview-status st-${st?.status || 'none'}`}>
          {st ? `${STATUS[st.status] || st.status} · ${st.quiet ? 'tự học' : 'đã báo'}` : 'Chưa có bài'}
        </span>
      )}
    </li>
  )
}

export default function CoursePreview() {
  const { id = '' } = useParams()
  const [studentId, setStudentId] = useState('')
  const { data, loading, error, reload } = useAsync(() => fetchPreview(id), [id])
  const assignIds = useMemo(() => (data?.assignments || []).map((a) => a.id), [data])
  const status = useAsync(() => fetchStatus(studentId, assignIds), [studentId, assignIds])

  if (loading && !data) return <Loading />
  if (error) return <ErrorBox message={error} onRetry={reload} />
  if (!data) return null

  const { course, chapters, recipients, lessons, assignments } = data
  const back = libraryUrl(keyOf(course.grade), keyOf(course.subject), course.id)
  const sections = buildTree(chapters, [course])[0]?.subjects[0]?.sections || []
  const stOf = new Map((status.data || []).map((s) => [s.assignment_id, s]))
  const visible = assignments.filter((a) => !a.hidden)
  const sent = visible.filter((a) => ['done', 'checked'].includes(stOf.get(a.id)?.status)).length
  const hiddenItems = [
    ...lessons.filter((l) => l.hidden).map((l) => ({ item: l, kind: 'lesson' })),
    ...assignments.filter((a) => a.hidden).map((a) => ({ item: a, kind: 'assignment' })),
  ]
  const picked = !!studentId

  return (
    <div className="page course-preview">
      <div className="preview-banner" role="status">
        <Icon name="eye" />
        <b>Bạn đang xem như học sinh trong khóa {course.title}</b>
        <Link className="btn btn-small" to={back}>
          Quay lại trang khóa
        </Link>
      </div>
      <p className="muted small">
        Bài tự học trong khóa nằm ở <b>Thư viện</b> của học sinh, không có chuông báo. Bài đã <b>Báo</b> thì hiện thêm ở <b>Bài cần làm</b>.
      </p>

      <label className="preview-pick">
        Xem theo học sinh:{' '}
        <select value={studentId} onChange={(e) => setStudentId(e.target.value)}>
          <option value="">Xem chung</option>
          {recipients.map((r) => (
            <option key={r.student_id} value={r.student_id}>
              {r.profile?.full_name || 'Học sinh'}
            </option>
          ))}
        </select>
      </label>
      {picked && status.data && (
        <div className="progress-row">
          <div className="progress">
            <div className="progress-bar" style={{ width: `${visible.length ? (sent / visible.length) * 100 : 0}%` }} />
          </div>
          <span className="small">
            Đã nộp {sent}/{visible.length}
          </span>
        </div>
      )}

      {sections.length === 0 && <div className="empty">Khóa chưa có chủ đề nào.</div>}
      {sections.map((sec) => (
        <section key={sec.key} className="preview-section">
          <h2>{sectionText(sec.section)}</h2>
          {sec.chapters.map((c) => {
            const ls = lessons.filter((l) => l.chapter_id === c.id && !l.hidden)
            const as = assignments.filter((a) => a.chapter_id === c.id && !a.hidden)
            return (
              <div key={c.id} className="preview-topic">
                <h3>{c.title}</h3>
                {ls.length + as.length === 0 ? (
                  <p className="muted small">Chưa có bài nào đang mở.</p>
                ) : (
                  <ul className="preview-list">
                    {ls.map((l) => <Row key={l.id} item={l} kind="lesson" picked={picked} />)}
                    {as.map((a) => <Row key={a.id} item={a} kind="assignment" st={stOf.get(a.id)} picked={picked} />)}
                  </ul>
                )}
              </div>
            )
          })}
        </section>
      ))}

      {hiddenItems.length > 0 && (
        <section className="preview-section preview-hidden">
          <h2>Đang ẩn — học sinh không thấy</h2>
          <ul className="preview-list">
            {hiddenItems.map(({ item, kind }) => (
              <Row key={item.id} item={{ ...item, hidden: true }} kind={/** @type {any} */ (kind)} picked={picked} />
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
