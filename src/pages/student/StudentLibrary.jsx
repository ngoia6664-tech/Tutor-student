import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { supabase, unwrap } from '../../lib/supabase.js'
import { useAsync } from '../../lib/useAsync.js'
import { compareDue, formatDate } from '../../lib/format.js'
import {
  buildTree,
  courseLabel,
  fromKey,
  gradeFromKey,
  gradeLabel,
  keyOf,
  libraryCrumbs,
  sectionLabel,
  sectionText,
  sortChapters,
  studentGrade,
  studentLibraryUrlFor,
  subjectLabel,
} from '../../lib/chapters.js'
import { useAuth } from '../../contexts/AuthContext.jsx'
import { useNotifications } from '../../contexts/NotificationsContext.jsx'
import Loading from '../../components/Loading.jsx'
import ErrorBox from '../../components/ErrorBox.jsx'
import { DueBadge, StatusBadge, TypeBadge } from '../../components/Badges.jsx'
import { nodeKey, TreeGroup, TreeLeaf, TreeSide, useOpenNodes } from '../../components/TreeNav.jsx'
import Icon from '../../components/Icon.jsx'
import CustomSelect from '../../components/CustomSelect.jsx'
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
export default function StudentLibrary() {
  const { id } = useParams()
  const [params] = useSearchParams()
  const lopParam = id ? undefined : params.get('lop') ?? undefined // lớp khác lớp mình (khóa của lớp khác)
  const mon = id ? undefined : params.get('mon') ?? undefined
  const kh = mon !== undefined ? params.get('kh') ?? undefined : undefined // khóa ('-' = bài không thuộc khóa)
  const cd = mon !== undefined ? params.get('cd') ?? undefined : undefined
  const { profile } = useAuth()
  const navigate = useNavigate()
  const myGrade = profile.grade ?? null
  const myLop = keyOf(myGrade)
  const sUrl = studentLibraryUrlFor(myLop)
  const { open, toggle, ensure } = useOpenNodes('student-library-open')
  const [treeShown, setTreeShown] = useState(!id && mon === undefined)

  const { data, loading, error, reload } = useAsync(async () => {
    const [lessonRows, assignmentRows, chapters, folders, courses] = await Promise.all([
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
      supabase.from('chapters').select('id, title, section, grade, subject, sort_order, course_id').then(unwrap),
      // Thư mục gia sư tạo trong chủ đề (RLS: chỉ của các chủ đề mình thấy)
      supabase.from('chapter_folders').select('id, name, chapter_id').order('created_at').then(unwrap),
      // RLS: chỉ khóa được giao cho mình
      supabase.from('courses').select('id, title, sort_order').then(unwrap),
    ])
    const lessons = lessonRows.filter((r) => r.lesson).map((r) => ({ ...r.lesson, assigned_at: r.assigned_at })).sort((a, b) => (a.created_at < b.created_at ? -1 : 1))
    const assignments = assignmentRows.filter((r) => r.assignment)
    // Chủ đề của khóa mình được giao luôn tính, kể cả khóa của lớp khác; khóa gắn lớp + môn của chủ đề để cây gom đúng chỗ
    const mine = sortChapters(chapters.filter((c) => myGrade === null || c.grade === null || c.grade === myGrade || c.course_id)).map((c) => ({
      ...c,
      grade: studentGrade(c, myGrade),
    }))
    const myCourses = courses
      .map((k) => {
        const c = mine.find((x) => x.course_id === k.id)
        return { ...k, grade: c?.grade ?? myGrade, subject: c?.subject ?? null }
      })
      .filter((k) => k.subject !== null)
    return { lessons, assignments, chapters: mine, folders, courses: myCourses }
  }, [profile.id, myGrade])

  const chapters = data?.chapters || []
  const inTree = new Set(chapters.map((c) => c.id))
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

  const counted = chapters.map((c) => {
    const it = itemsOf(c.id)
    return { ...c, lessons: it.lessons.length, assignments: it.assignments.length }
  })
  const courses = data?.courses || []
  const tree = buildTree(counted, courses)
  // Có bài của nhiều lớp (khóa lớp khác) → cây thêm cấp Lớp
  const multi = tree.length > 1
  // Lớp mở mặc định: lớp của mình nếu có bài, không thì lớp đầu tiên có bài (vd. chỉ được giao khóa lớp khác / chưa ghi lớp)
  const defaultLop = tree.some((g) => g.key === myLop) ? myLop : tree[0]?.key ?? myLop
  // Tiến độ một khóa: số bài tập đã nộp / tổng số bài tập đang có trong khóa
  const courseProgress = (courseId) => {
    const ids = new Set(chapters.filter((c) => c.course_id === courseId).map((c) => c.id))
    const list = (data?.assignments || []).filter((r) => ids.has(r.assignment.chapter_id))
    return { done: list.filter((r) => r.status !== 'todo').length, total: list.length }
  }
  const current = view && view !== OTHER ? chapters.find((c) => c.id === view) : null
  const studyId = useStudyChapterId()
  const now = findStudyChapter(chapters, studyId)

  const path = current
    ? { lop: keyOf(current.grade), mon: keyOf(current.subject), kh: keyOf(current.course_id), cd: keyOf(current.section) }
    : { lop: lopParam ?? defaultLop, mon, kh, cd }
  const lop = path.lop
  const allCrumbs = libraryCrumbs(tree, path, sUrl)
  // Một lớp: bỏ đoạn Lớp như trước; nhiều lớp: giữ, chỉ cho chọn các lớp có bài
  const crumbs = multi
    ? allCrumbs.map((seg, i) => (i === 0 ? { ...seg, options: seg.options.filter((o) => !o.empty) } : seg))
    : allCrumbs.slice(1)
  const inGroup = counted.filter(
    (c) =>
      keyOf(c.grade) === lop &&
      keyOf(c.subject) === mon &&
      (kh === undefined || keyOf(c.course_id) === kh) &&
      (cd === undefined || keyOf(c.section) === cd)
  )
  const course = kh !== undefined ? courses.find((k) => k.id === kh) || null : null

  useEffect(() => {
    if (path.mon !== undefined)
      ensure([nodeKey('g', path.lop), nodeKey('s', path.lop, path.mon), ...(path.kh !== undefined ? [nodeKey('k', path.lop, path.mon, path.kh)] : [])])
  }, [path.lop, path.mon, path.kh, ensure])
  useEffect(() => {
    if (now) ensure([nodeKey('g', keyOf(now.grade)), nodeKey('s', keyOf(now.grade), keyOf(now.subject))])
  }, [now, ensure])
  useEffect(() => {
    if (id || mon !== undefined) setTreeShown(false)
  }, [id, mon, kh, cd])

  const where = current
    ? [multi && gradeLabel(current.grade), subjectLabel(current.subject), sectionText(current.section), current.title].filter(Boolean).join(' › ')
    : view === OTHER
      ? OTHER_NAME
      : mon !== undefined
        ? [multi && gradeLabel(gradeFromKey(lop)), subjectLabel(fromKey(mon)), kh !== undefined && courseLabel(course), cd !== undefined && sectionText(fromKey(cd))]
            .filter(Boolean)
            .join(' › ')
        : 'Chọn chương'

  const chapterActions = (c) => <StudyNowButton chapterId={c.id} />

  // Có bài của nhiều lớp (khóa lớp khác): chọn lớp riêng như Thư viện gia sư, cây chỉ hiện lớp đang chọn.
  // Hiện ở mục lục và cả đầu trang Thư viện (mục lục thu gọn vẫn đổi được lớp)
  const gradePicker = multi && (
    <CustomSelect
      value={lop}
      onChange={(k) => navigate(sUrl(k))}
      options={tree.map((g) => ({ value: g.key, label: gradeLabel(g.grade), icon: 'grade' }))}
      prefixLabel="Khối: "
      icon="grade"
      className="tree-grade-select"
      style={{ width: '100%' }}
      ariaLabel="Chọn lớp"
    />
  )

  // Các môn của một lớp trên cây (d: độ lùi)
  const subjectNodes = (g, d) =>
    g.subjects.map((s) => {
    // Môn không có khóa nào: cây cũ Môn › Chương
    const flat = s.courses.length === 1 && !s.courses[0].course
    const leaves = (sections, k) =>
      sections.map((x) => (
        <TreeLeaf
          key={x.key}
          to={sUrl(g.key, s.key, k, x.key)}
          label={sectionText(x.section)}
          badge={x.chapters.reduce((n, c) => n + todoOf(c.id), 0) || null}
          active={path.lop === g.key && path.mon === s.key && path.cd === x.key && (k === undefined || path.kh === k)}
          now={x.chapters.some((c) => c.id === now?.id)}
        />
      ))
    return (
      <TreeGroup
        key={s.key}
        label={subjectLabel(s.subject)}
        to={sUrl(g.key, s.key)}
        open={open.has(nodeKey('s', g.key, s.key))}
        onToggle={() => toggle(nodeKey('s', g.key, s.key))}
        active={!id && lop === g.key && mon === s.key && kh === undefined && cd === undefined}
        depth={d}
      >
        {flat
          ? leaves(s.sections, undefined)
          : s.courses.map((k) => (
              <TreeGroup
                key={k.key}
                label={courseLabel(k.course)}
                to={sUrl(g.key, s.key, k.key)}
                open={open.has(nodeKey('k', g.key, s.key, k.key))}
                onToggle={() => toggle(nodeKey('k', g.key, s.key, k.key))}
                active={!id && lop === g.key && mon === s.key && kh === k.key && cd === undefined}
                depth={d + 1}
              >
                {leaves(k.sections, k.key)}
              </TreeGroup>
            ))}
      </TreeGroup>
    )
  })

  return (
    <div className="library">
      {data && <LibraryNewPanel now={now} lessons={data.lessons} assignments={data.assignments} />}
      <TreeSide shown={treeShown} onToggleShown={() => setTreeShown((v) => !v)} where={where}>
        <div className="tree-head">
          <Link to={url()} className="tree-title">
            Thư viện {myGrade && !multi ? `· Lớp ${myGrade}` : ''}
          </Link>
          {gradePicker}
        </div>
        {loading && <Loading text="Đang tải…" />}
        {!loading && !error && chapters.length === 0 && !hasOther && <p className="muted small">Chưa có bài nào được giao.</p>}
        <ul className="tree" role="tree">
          {tree.filter((g) => g.key === lop).map((g) => subjectNodes(g, 0))}
          {hasOther && <TreeLeaf to={url(OTHER)} label={OTHER_NAME} badge={todoOf(OTHER) || null} />}
        </ul>
      </TreeSide>

      <section className="library-main library-panel">
        <ErrorBox message={error} onRetry={reload} />
        {loading && <Loading />}
        {!loading && !error && (id || mon !== undefined) && <LibraryCrumbs segments={crumbs} root={url()} />}
        {!loading && !error && !id && mon === undefined && multi && <div className="student-grade-pick">{gradePicker}</div>}
        {!loading && !error && !id && mon === undefined && (
          <Overview
            shelf={counted.filter((c) => keyOf(c.grade) === lop)}
            todo={(data?.assignments || []).filter((r) => r.status === 'todo').length}
            myGrade={gradeFromKey(lop)}
            hasOther={hasOther}
            otherTodo={todoOf(OTHER)}
            now={now}
            courses={courses.filter((k) => keyOf(k.grade) === lop)}
            progressOf={courseProgress}
            url={sUrl}
          />
        )}
        {!loading && !error && mon !== undefined && (
          <div>
            <div className="page-head">
              <h1>{cd !== undefined ? sectionLabel(fromKey(cd)) : kh !== undefined ? courseLabel(course) : subjectLabel(fromKey(mon))}</h1>
            </div>
            {course && cd === undefined && <CourseProgress {...courseProgress(course.id)} />}
            {inGroup.length === 0 ? (
              <div className="empty">
                {course ? 'Khóa chưa có bài nào mở cho bạn. Giáo viên sẽ mở dần theo buổi học nhé.' : 'Không có chủ đề nào ở mục này.'}{' '}
                <Link to={url()}>Về Thư viện</Link>
              </div>
            ) : cd === undefined ? (
              <GradeShelf chapters={inGroup} count={Number} url={sUrl} courses={courses} singleCourse={kh !== undefined} />
            ) : (
              <ChapterCarousel key={`${mon}|${kh}|${cd}`} memoKey={`hs|${mon}|${kh}|${cd}`} chapters={inGroup} count={Number} toUrl={url} actions={chapterActions} />
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

// Tiến độ một khóa: bài tập đã nộp / tổng bài tập đang mở trong khóa
function CourseProgress({ done, total }) {
  if (!total) return null
  return (
    <div className="progress-row">
      <Progress done={done} total={total} />
      <span className="muted small">
        Đã làm {done}/{total} bài tập trong khóa
      </span>
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

// Một chủ đề: bài giảng + bài tập (bài chưa làm lên trước).
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

function Overview({ shelf, todo, myGrade, hasOther, otherTodo, now, courses, progressOf, url: sUrl }) {
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
      {courses.length > 0 && (
        <div className="overview-grid" style={{ marginBottom: '1rem' }}>
          {courses.map((k) => {
            const p = progressOf(k.id)
            return (
              <Link key={k.id} to={sUrl(keyOf(k.grade), keyOf(k.subject), k.id)} className="list-item overview-card">
                <div className="list-item-title">🎓 {k.title}</div>
                <div className="muted small">{[k.grade !== myGrade && gradeLabel(k.grade), subjectLabel(k.subject)].filter(Boolean).join(' · ')}</div>
                {p.total > 0 && (
                  <div className="progress-row" style={{ marginTop: '0.5rem' }}>
                    <Progress done={p.done} total={p.total} />
                    <span className="muted small">
                      {p.done}/{p.total}
                    </span>
                  </div>
                )}
              </Link>
            )
          })}
        </div>
      )}
      {shelf.length === 0 && !hasOther && <div className="empty">Chưa có bài nào được giao cho bạn.</div>}
      <GradeShelf chapters={shelf} count={Number} url={sUrl} />
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
