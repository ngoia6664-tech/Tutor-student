import { useEffect, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { supabase, unwrap } from '../../lib/supabase.js'
import { useAsync } from '../../lib/useAsync.js'
import { compareDue, formatDate } from '../../lib/format.js'
import { buildTree, fromKey, gradeLabel, keyOf, libraryCrumbs, sectionLabel, sectionText, sortChapters, studentLibraryUrl, subjectLabel } from '../../lib/chapters.js'
import { useAuth } from '../../contexts/AuthContext.jsx'
import { useNotifications } from '../../contexts/NotificationsContext.jsx'
import Loading from '../../components/Loading.jsx'
import ErrorBox from '../../components/ErrorBox.jsx'
import { DueBadge, StatusBadge, TypeBadge } from '../../components/Badges.jsx'
import { nodeKey, TreeGroup, TreeLeaf, TreeSide, useOpenNodes } from '../../components/TreeNav.jsx'
import Icon from '../../components/Icon.jsx'
import StudyNow from '../../components/StudyNow.jsx'
import { findStudyChapter, useStudyChapterId } from '../../lib/studyNow.js'
import StudyNowButton from '../../components/StudyNowButton.jsx'
import FolderBox from '../../components/FolderBox.jsx'
import { groupByFolder } from '../../lib/folders.js'
import GradeShelf from '../../components/GradeShelf.jsx'
import ChapterCarousel from '../../components/ChapterCarousel.jsx'
import LibraryCrumbs from '../../components/LibraryCrumbs.jsx'
import LibraryNewPanel from '../../components/LibraryNewPanel.jsx'

const OTHER = 'khac' // mục "Các bài khác": bài chưa xếp chủ đề hoặc thuộc chủ đề của lớp khác
const OTHER_NAME = 'Các bài khác'
const OTHER_HINT = 'Bài giảng, bài tập chưa thuộc chủ đề nào trong Thư viện của bạn.'
/** @param {string} [id] */
const url = (id) => (id ? `/student/library/${id}` : '/student/library')

// Bài tập: chưa làm lên trước (hạn gần trước), rồi tới bài đã nộp
const byTodo = (a, b) =>
  (a.status === 'todo' ? 0 : 1) - (b.status === 'todo' ? 0 : 1) || compareDue(a.assignment.due_date, b.assignment.due_date)

// Thư viện (học sinh), chỉ gồm bài được giao, như Thư viện gia sư nhưng bỏ cấp Lớp:
// /student/library: kệ sách (môn = kệ, chương = cuốn) · ?mon=: kệ của một môn · ?mon=&cd=: băng chuyền chủ đề ·
// /:id: một chủ đề (gom theo thư mục) · /khac: "Các bài khác". Cây bên trái chỉ tới chương.
export default function StudentLibrary() {
  const { id } = useParams()
  const [params] = useSearchParams()
  const mon = id ? undefined : params.get('mon') ?? undefined
  const cd = mon !== undefined ? params.get('cd') ?? undefined : undefined
  const { profile } = useAuth()
  const myGrade = profile.grade ?? null
  const lop = keyOf(myGrade)
  const { open, toggle, ensure } = useOpenNodes('student-library-open')
  const [treeShown, setTreeShown] = useState(!id && mon === undefined)

  const { data, loading, error, reload } = useAsync(async () => {
    const [lessonRows, assignmentRows, chapters, folders] = await Promise.all([
      supabase
        .from('lesson_recipients')
        .select('assigned_at, lesson:lessons(id, title, created_at, chapter_id, folder_id, file_path, video_url)')
        .eq('student_id', profile.id)
        .then(unwrap),
      supabase
        .from('assignment_recipients')
        .select('status, score, submitted_at, assigned_at, assignment:assignments(id, title, type, due_date, chapter_id, folder_id)')
        .eq('student_id', profile.id)
        .then(unwrap),
      // RLS: học sinh chỉ đọc được các chủ đề có bài được giao cho mình
      supabase.from('chapters').select('id, title, section, grade, subject, sort_order').then(unwrap),
      // Thư mục gia sư tạo trong chủ đề (RLS: chỉ của các chủ đề mình thấy)
      supabase.from('chapter_folders').select('id, name, chapter_id').order('created_at').then(unwrap),
    ])
    const lessons = lessonRows.filter((r) => r.lesson).map((r) => ({ ...r.lesson, assigned_at: r.assigned_at })).sort((a, b) => (a.created_at < b.created_at ? -1 : 1))
    const assignments = assignmentRows.filter((r) => r.assignment)
    // Chỉ chủ đề của lớp mình (chủ đề chưa ghi lớp cũng hiện; học sinh chưa ghi lớp → hiện hết).
    // Gán cùng một lớp để cây / kệ sách gom về một lớp, bắt đầu từ Môn.
    const mine = sortChapters(chapters.filter((c) => myGrade === null || c.grade === null || c.grade === myGrade)).map((c) => ({ ...c, grade: myGrade }))
    return { lessons, assignments, chapters: mine, folders }
  }, [profile.id, myGrade])

  const chapters = data?.chapters || []
  const inTree = new Set(chapters.map((c) => c.id))
  // Chủ đề không thuộc lớp của học sinh (link từ bài giao của lớp khác): xem như "Các bài khác", không báo "không tìm thấy"
  const view = id && !inTree.has(id) ? OTHER : id
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

  // Kệ sách / băng chuyền đếm bài của từng chủ đề: lessons / assignments là số (count = Number)
  const counted = chapters.map((c) => {
    const it = itemsOf(c.id)
    return { ...c, lessons: it.lessons.length, assignments: it.assignments.length }
  })
  const tree = buildTree(counted)
  const subjectsTree = tree[0]?.subjects || []
  const current = view && view !== OTHER ? chapters.find((c) => c.id === view) : null
  const studyId = useStudyChapterId()
  const now = findStudyChapter(chapters, studyId)

  // Vị trí đang xem: của chủ đề đang mở, hoặc trên URL. Đường dẫn bỏ đoạn "Lớp" (học sinh chỉ có một lớp)
  const path = current ? { mon: keyOf(current.subject), cd: keyOf(current.section) } : { mon, cd }
  const crumbs = libraryCrumbs(tree, { lop, ...path }, studentLibraryUrl).slice(1)
  const inGroup = counted.filter((c) => keyOf(c.subject) === mon && (cd === undefined || keyOf(c.section) === cd))

  // Mở sẵn môn chứa mục đang xem và môn của chủ đề đang học (chương là lá của cây)
  useEffect(() => {
    if (path.mon !== undefined) ensure([nodeKey('s', path.mon)])
  }, [path.mon, ensure])
  useEffect(() => {
    if (now) ensure([nodeKey('s', keyOf(now.subject))])
  }, [now, ensure])
  useEffect(() => {
    if (id || mon !== undefined) setTreeShown(false)
  }, [id, mon, cd])

  const where = current
    ? [subjectLabel(current.subject), sectionText(current.section), current.title].join(' › ')
    : view === OTHER
      ? OTHER_NAME
      : mon !== undefined
        ? [subjectLabel(fromKey(mon)), cd !== undefined && sectionText(fromKey(cd))].filter(Boolean).join(' › ')
        : 'Chọn chương'

  // Nút trên thẻ chủ đề ở băng chuyền (cạnh "Mở"): đánh dấu đang học
  const chapterActions = (c) => <StudyNowButton chapterId={c.id} />


  return (
    <div className="library">
      {data && <LibraryNewPanel now={now} lessons={data.lessons} assignments={data.assignments} />}
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
              to={studentLibraryUrl(lop, s.key)}
              open={open.has(nodeKey('s', s.key))}
              onToggle={() => toggle(nodeKey('s', s.key))}
              active={!id && mon === s.key && cd === undefined}
              depth={0}
            >
              {s.sections.map((x) => (
                <TreeLeaf
                  key={x.key}
                  to={studentLibraryUrl(lop, s.key, x.key)}
                  label={sectionText(x.section)}
                  badge={x.chapters.reduce((n, c) => n + todoOf(c.id), 0) || null}
                  active={path.mon === s.key && path.cd === x.key}
                  now={x.chapters.some((c) => c.id === now?.id)}
                />
              ))}
            </TreeGroup>
          ))}
          {hasOther && <TreeLeaf to={url(OTHER)} label={OTHER_NAME} badge={todoOf(OTHER) || null} />}
        </ul>
      </TreeSide>

      <section className="library-main library-panel">
        <ErrorBox message={error} onRetry={reload} />
        {loading && <Loading />}
        {!loading && !error && (id || mon !== undefined) && <LibraryCrumbs segments={crumbs} root={url()} />}
        {!loading && !error && !id && mon === undefined && (
          <Overview
            shelf={counted}
            todo={(data?.assignments || []).filter((r) => r.status === 'todo').length}
            myGrade={myGrade}
            hasOther={hasOther}
            otherTodo={todoOf(OTHER)}
            now={now}
          />
        )}
        {!loading && !error && mon !== undefined && (
          <div>
            <div className="page-head">
              <h1>{cd !== undefined ? sectionLabel(fromKey(cd)) : subjectLabel(fromKey(mon))}</h1>
            </div>
            {inGroup.length === 0 ? (
              <div className="empty">
                Không có chủ đề nào ở mục này. <Link to={url()}>Về Thư viện</Link>
              </div>
            ) : cd === undefined ? (
              <GradeShelf chapters={inGroup} count={Number} url={studentLibraryUrl} />
            ) : (
              <ChapterCarousel key={`${mon}|${cd}`} memoKey={`hs|${mon}|${cd}`} chapters={inGroup} count={Number} toUrl={url} actions={chapterActions} />
            )}
          </div>
        )}
        {!loading && !error && view && (current || view === OTHER) && (
          <ChapterView chapter={current} items={itemsOf(view)} folders={(data.folders || []).filter((f) => f.chapter_id === current?.id)} />
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

// Một chủ đề: bài giảng + bài tập (bài chưa làm lên trước). Gia sư có chia thư mục thì gom theo thư mục
// (chỉ hiện thư mục có bài được giao cho mình), bài không thuộc thư mục nào ở mục "Các bài khác" cuối trang.
function ChapterView({ chapter, items, folders }) {
  const { isNew } = useNotifications()
  const { lessons, assignments } = items
  const done = assignments.filter((r) => r.status !== 'todo').length
  const grouped = groupByFolder(folders, lessons, assignments, (x) => (x.assignment || x).folder_id).filter((g) => g.lessons.length + g.assignments.length > 0)
  const groups = grouped.some((g) => g.folder) ? grouped : null

  const lessonRow = (l) => (
    <Link key={l.id} to={`/student/lessons/${l.id}`} className="list-item">
      <div className="list-item-title">
        📘 {l.title} {isNew(l.assigned_at) && <span className="badge badge-new">Mới</span>}
      </div>
      <div className="row small">
        {l.file_path && <span className="badge">📎 File</span>}
        {l.video_url && <span className="badge">▶️ Video</span>}
        <span className="muted">{formatDate(l.created_at)}</span>
      </div>
    </Link>
  )
  const assignmentRow = (r) => {
    const a = r.assignment
    return (
      <Link key={a.id} to={`/student/assignments/${a.id}`} className="list-item">
        <div className="list-item-title">
          ✏️ {a.title} {isNew(r.assigned_at) && <span className="badge badge-new">Mới</span>}
        </div>
        <div className="row small">
          <StatusBadge status={r.status} />
          <TypeBadge type={a.type} />
          {r.status === 'todo' && <DueBadge date={a.due_date} />}
          {r.status === 'todo' && a.due_date && <span className="muted">Hạn: {formatDate(a.due_date)}</span>}
          {r.status === 'checked' && r.score !== null && <span className="badge badge-ok">Điểm: {r.score}</span>}
        </div>
      </Link>
    )
  }
  return (
    <div>
      <div className="page-head">
        <h1>{chapter ? chapter.title : OTHER_NAME}</h1>
        {chapter && <StudyNowButton chapterId={chapter.id} />}
      </div>
      {!chapter && <p className="muted small">{OTHER_HINT}</p>}
      {assignments.length > 0 && (
        <div className="progress-row">
          <Progress done={done} total={assignments.length} />
          <span className="muted small">
            Đã nộp {done}/{assignments.length} bài tập
          </span>
        </div>
      )}

      {groups ? (
        groups.map(({ folder, lessons: ls, assignments: as }) =>
          folder ? (
            <FolderBox key={folder.id} name={folder.name} count={ls.length + as.length}>
              {ls.map(lessonRow)}
              {as.map(assignmentRow)}
            </FolderBox>
          ) : (
            <section key="loose">
              <h2 className="section-title">
                {OTHER_NAME} ({ls.length + as.length})
              </h2>
              <div className="list">
                {ls.map(lessonRow)}
                {as.map(assignmentRow)}
              </div>
            </section>
          )
        )
      ) : (
        <>
          <h2 className="section-title">Bài giảng ({lessons.length})</h2>
          {lessons.length === 0 ? (
            <div className="empty" style={{ marginBottom: '1.25rem' }}>
              Chưa có bài giảng.
            </div>
          ) : (
            <div className="list" style={{ marginBottom: '1.25rem' }}>
              {lessons.map(lessonRow)}
            </div>
          )}

          <h2 className="section-title">Bài tập ({assignments.length})</h2>
          {assignments.length === 0 ? <div className="empty">Chưa có bài tập.</div> : <div className="list">{assignments.map(assignmentRow)}</div>}
        </>
      )}
    </div>
  )
}

// Trang đầu Thư viện: chủ đề đang học, số bài chưa làm, kệ sách các môn, cuối cùng là "Các bài khác"
function Overview({ shelf, todo, myGrade, hasOther, otherTodo, now }) {
  return (
    <div>
      <div className="page-head">
        <h1>
          <span className="title-icon">
            <Icon name="library" />
          </span>
          Thư viện {myGrade ? gradeLabel(myGrade) : ''}
        </h1>
      </div>
      <StudyNow chapter={now} />
      <p className="muted">
        {todo > 0 && (
          <>
            Bạn còn <b>{todo}</b> bài tập chưa làm.{' '}
          </>
        )}
        Chọn một chương trên kệ để xem các chủ đề.
      </p>
      {shelf.length === 0 && !hasOther && <div className="empty">Chưa có bài nào được giao cho bạn.</div>}
      <GradeShelf chapters={shelf} count={Number} url={studentLibraryUrl} />
      {hasOther && (
        <Link to={url(OTHER)} className="list-item overview-card" style={{ display: 'block' }}>
          <div className="list-item-title">
            {OTHER_NAME} {otherTodo > 0 && <span className="badge badge-warn">{otherTodo} chưa làm</span>}
          </div>
          <div className="muted small">{OTHER_HINT}</div>
        </Link>
      )}
    </div>
  )
}
