import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase, unwrap } from '../../lib/supabase.js'
import { useAsync } from '../../lib/useAsync.js'
import { compareDue, formatDate } from '../../lib/format.js'
import { buildTree, gradeLabel, keyOf, sectionLabel, sortChapters, subjectLabel } from '../../lib/chapters.js'
import { useAuth } from '../../contexts/AuthContext.jsx'
import Loading from '../../components/Loading.jsx'
import ErrorBox from '../../components/ErrorBox.jsx'
import { DueBadge, StatusBadge, TypeBadge } from '../../components/Badges.jsx'
import { nodeKey, TreeGroup, TreeLeaf, TreeSide, useOpenNodes } from '../../components/TreeNav.jsx'

const OTHER = 'khac' // mục "Bài khác": bài chưa xếp chương hoặc thuộc lớp khác
const url = (id) => (id ? `/student/library/${id}` : '/student/library')

// Bài tập: chưa làm lên trước (hạn gần trước), rồi tới bài đã nộp
const byTodo = (a, b) =>
  (a.status === 'todo' ? 0 : 1) - (b.status === 'todo' ? 0 : 1) || compareDue(a.assignment.due_date, b.assignment.due_date)

// Thư viện (học sinh): cây Môn › Chuyên đề › Chương của LỚP MÌNH, chỉ gồm bài được giao.
// Bấm chương để xem bài giảng + bài tập của chương đó.
export default function StudentLibrary() {
  const { id } = useParams()
  const { profile } = useAuth()
  const myGrade = profile.grade ?? null
  const { open, toggle, ensure } = useOpenNodes('student-library-open')
  const [treeShown, setTreeShown] = useState(!id)

  const { data, loading, error, reload } = useAsync(async () => {
    const [lessonRows, assignmentRows, chapters] = await Promise.all([
      supabase
        .from('lesson_recipients')
        .select('lesson:lessons(id, title, created_at, chapter_id, file_path, video_url)')
        .eq('student_id', profile.id)
        .then(unwrap),
      supabase
        .from('assignment_recipients')
        .select('status, score, submitted_at, assignment:assignments(id, title, type, due_date, chapter_id)')
        .eq('student_id', profile.id)
        .then(unwrap),
      // RLS: học sinh chỉ đọc được các chương có bài được giao cho mình
      supabase.from('chapters').select('id, title, section, grade, subject, sort_order').then(unwrap),
    ])
    const lessons = lessonRows.map((r) => r.lesson).filter(Boolean).sort((a, b) => (a.created_at < b.created_at ? -1 : 1))
    const assignments = assignmentRows.filter((r) => r.assignment)
    // Cây chỉ gồm chương của lớp mình (chương chưa ghi lớp cũng hiện). Chưa ghi lớp cho học sinh → hiện hết.
    const mine = sortChapters(chapters.filter((c) => myGrade === null || c.grade === null || c.grade === myGrade))
    return { lessons, assignments, chapters: mine }
  }, [profile.id, myGrade])

  const chapters = data?.chapters || []
  const inTree = new Set(chapters.map((c) => c.id))
  const itemsOf = (chapterId) => {
    const match = (cid) => (chapterId === OTHER ? !cid || !inTree.has(cid) : cid === chapterId)
    return {
      lessons: (data?.lessons || []).filter((l) => match(l.chapter_id)),
      assignments: (data?.assignments || []).filter((r) => match(r.assignment.chapter_id)).sort(byTodo),
    }
  }
  const todoOf = (chapterId) => itemsOf(chapterId).assignments.filter((r) => r.status === 'todo').length
  const other = itemsOf(OTHER)
  const hasOther = other.lessons.length + other.assignments.length > 0

  // Một lớp nên bỏ cấp Lớp, cây bắt đầu từ Môn
  const subjectsTree = buildTree(chapters.map((c) => ({ ...c, grade: myGrade })))[0]?.subjects || []
  const current = id && id !== OTHER ? chapters.find((c) => c.id === id) : null

  useEffect(() => {
    if (current) ensure([nodeKey('s', keyOf(current.subject)), nodeKey('c', keyOf(current.subject), keyOf(current.section))])
  }, [current, ensure])
  useEffect(() => {
    if (id) setTreeShown(false)
  }, [id])

  const where = current ? [subjectLabel(current.subject), current.title].join(' › ') : id === OTHER ? 'Bài khác' : 'Chọn chương'

  return (
    <div className="library">
      <TreeSide shown={treeShown} onToggleShown={() => setTreeShown((v) => !v)} where={where}>
        <div className="tree-head">
          <Link to={url()} className="tree-title">
            Thư viện {myGrade ? `· Lớp ${myGrade}` : ''}
          </Link>
        </div>
        {loading && <Loading text="Đang tải…" />}
        {!loading && !error && chapters.length === 0 && !hasOther && <p className="muted small">Chưa có bài nào được giao.</p>}
        <ul className="tree" role="tree">
          {subjectsTree.map((s) => (
            <TreeGroup
              key={s.key}
              label={subjectLabel(s.subject)}
              open={open.has(nodeKey('s', s.key))}
              onToggle={() => toggle(nodeKey('s', s.key))}
              depth={0}
            >
              {s.sections.map((x) => (
                <TreeGroup
                  key={x.key}
                  label={sectionLabel(x.section)}
                  open={open.has(nodeKey('c', s.key, x.key))}
                  onToggle={() => toggle(nodeKey('c', s.key, x.key))}
                  depth={1}
                >
                  {x.chapters.map((c) => (
                    <TreeLeaf key={c.id} to={url(c.id)} label={c.title} badge={todoOf(c.id) || null} />
                  ))}
                </TreeGroup>
              ))}
            </TreeGroup>
          ))}
          {hasOther && <TreeLeaf to={url(OTHER)} label="Bài khác" badge={todoOf(OTHER) || null} />}
        </ul>
      </TreeSide>

      <section className="library-main">
        <ErrorBox message={error} onRetry={reload} />
        {loading && <Loading />}
        {!loading && !error && !id && <Overview chapters={chapters} itemsOf={itemsOf} myGrade={myGrade} hasOther={hasOther} />}
        {!loading && !error && id && (current || id === OTHER) && <ChapterView chapter={current} items={itemsOf(id)} />}
        {!loading && !error && id && !current && id !== OTHER && (
          <div className="empty">
            Không tìm thấy chương này. <Link to={url()}>Về Thư viện</Link>
          </div>
        )}
      </section>
    </div>
  )
}

function Progress({ done, total }) {
  const pct = total ? Math.round((done / total) * 100) : 0
  return (
    <div className="progress" title={`Đã nộp ${done}/${total} bài tập`}>
      <div className="progress-bar" style={{ width: `${pct}%` }} />
    </div>
  )
}

// Một chương: bài giảng + bài tập (bài chưa làm lên trước)
function ChapterView({ chapter, items }) {
  const { lessons, assignments } = items
  const done = assignments.filter((r) => r.status !== 'todo').length
  return (
    <div>
      {chapter && (
        <nav className="crumbs" aria-label="Vị trí">
          <span>{subjectLabel(chapter.subject)}</span>
          <span>›</span>
          <span>{sectionLabel(chapter.section)}</span>
        </nav>
      )}
      <div className="page-head">
        <h1>{chapter ? chapter.title : 'Bài khác'}</h1>
      </div>
      {assignments.length > 0 && (
        <div className="progress-row">
          <Progress done={done} total={assignments.length} />
          <span className="muted small">
            Đã nộp {done}/{assignments.length} bài tập
          </span>
        </div>
      )}

      <h2 className="section-title">Bài giảng ({lessons.length})</h2>
      {lessons.length === 0 ? (
        <div className="empty" style={{ marginBottom: '1.25rem' }}>
          Chưa có bài giảng.
        </div>
      ) : (
        <div className="list" style={{ marginBottom: '1.25rem' }}>
          {lessons.map((l) => (
            <Link key={l.id} to={`/student/lessons/${l.id}`} className="list-item">
              <div className="list-item-title">📘 {l.title}</div>
              <div className="row small">
                {l.file_path && <span className="badge">📎 File</span>}
                {l.video_url && <span className="badge">▶️ Video</span>}
                <span className="muted">{formatDate(l.created_at)}</span>
              </div>
            </Link>
          ))}
        </div>
      )}

      <h2 className="section-title">Bài tập ({assignments.length})</h2>
      {assignments.length === 0 ? (
        <div className="empty">Chưa có bài tập.</div>
      ) : (
        <div className="list">
          {assignments.map((r) => {
            const a = r.assignment
            return (
              <Link key={a.id} to={`/student/assignments/${a.id}`} className="list-item">
                <div className="list-item-title">✏️ {a.title}</div>
                <div className="row small">
                  <StatusBadge status={r.status} />
                  <TypeBadge type={a.type} />
                  {r.status === 'todo' && <DueBadge date={a.due_date} />}
                  {r.status === 'todo' && a.due_date && <span className="muted">Hạn: {formatDate(a.due_date)}</span>}
                  {r.status === 'checked' && r.score !== null && <span className="badge badge-ok">Điểm: {r.score}</span>}
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}

// Chưa chọn chương: tiến độ từng chương của lớp mình
function Overview({ chapters, itemsOf, myGrade, hasOther }) {
  const total = chapters.reduce((n, c) => n + itemsOf(c.id).assignments.filter((r) => r.status === 'todo').length, 0) + (hasOther ? itemsOf(OTHER).assignments.filter((r) => r.status === 'todo').length : 0)
  const sections = []
  for (const c of chapters) {
    const k = `${keyOf(c.subject)}|${keyOf(c.section)}`
    let g = sections.find((x) => x.k === k)
    if (!g) sections.push((g = { k, title: sectionLabel(c.section), sub: subjectLabel(c.subject), items: [] }))
    g.items.push(c)
  }
  return (
    <div>
      <div className="page-head">
        <h1>Thư viện {myGrade ? gradeLabel(myGrade) : ''}</h1>
      </div>
      <p className="muted">
        {total > 0 ? (
          <>
            Bạn còn <b>{total}</b> bài tập chưa làm. Chọn một chương ở mục lục để xem bài giảng và bài tập của chương đó.
          </>
        ) : (
          'Chọn một chương ở mục lục để xem bài giảng và bài tập của chương đó.'
        )}
      </p>
      {chapters.length === 0 && !hasOther && <div className="empty">Chưa có bài nào được giao cho bạn.</div>}
      {sections.map((g) => (
        <div key={g.k} style={{ marginBottom: '1.1rem' }}>
          <h2 className="section-title">
            {g.title} <span className="muted small">· {g.sub}</span>
          </h2>
          <div className="overview-grid">
            {g.items.map((c) => {
              const { lessons, assignments } = itemsOf(c.id)
              const done = assignments.filter((r) => r.status !== 'todo').length
              const todo = assignments.length - done
              return (
                <Link key={c.id} to={url(c.id)} className="list-item overview-card">
                  <div className="list-item-title">{c.title}</div>
                  <div className="row small" style={{ margin: '0.4rem 0 0.6rem' }}>
                    <span className="badge">{lessons.length} bài giảng</span>
                    <span className="badge">{assignments.length} bài tập</span>
                    {todo > 0 && <span className="badge badge-warn">{todo} chưa làm</span>}
                  </div>
                  {assignments.length > 0 && <Progress done={done} total={assignments.length} />}
                </Link>
              )
            })}
          </div>
        </div>
      ))}
      {hasOther && (
        <Link to={url(OTHER)} className="list-item overview-card" style={{ display: 'block' }}>
          <div className="list-item-title">Bài khác</div>
          <div className="muted small">Bài chưa xếp vào chương của lớp bạn</div>
        </Link>
      )}
    </div>
  )
}
