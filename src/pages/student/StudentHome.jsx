import { Link } from 'react-router-dom'
import { supabase, unwrap } from '../../lib/supabase.js'
import { useAsync } from '../../lib/useAsync.js'
import { compareDue, formatDate } from '../../lib/format.js'
import { fetchStudentChapters } from '../../lib/chapters.js'
import { useAuth } from '../../contexts/AuthContext.jsx'
import { useNotifications } from '../../contexts/NotificationsContext.jsx'
import Loading from '../../components/Loading.jsx'
import ErrorBox from '../../components/ErrorBox.jsx'
import { DueBadge, TypeBadge } from '../../components/Badges.jsx'
import FilterTree, { matchItem, selectionLabel, useTreeSelection } from '../../components/FilterTree.jsx'
import StudyNow from '../../components/StudyNow.jsx'
import StudyNowButton from '../../components/StudyNowButton.jsx'
import ContextPanel from '../../components/ContextPanel.jsx'
import { draftCount, draftKey, readDraft } from '../../lib/drafts.js'
import { findStudyChapter, useStudyChapterId } from '../../lib/studyNow.js'

// Bài chưa nộp, sắp theo hạn gần nhất; cây bên trái lọc theo chủ đề của lớp mình
export default function StudentHome() {
  const { profile } = useAuth()
  const { isNew } = useNotifications()
  const sel = useTreeSelection()
  const studyId = useStudyChapterId()

  const { data, loading, error, reload } = useAsync(async () => {
    const [rows, chapters] = await Promise.all([
      supabase
        .from('assignment_recipients')
        .select('status, assigned_at, assignment:assignments(id, title, type, due_date, chapter_id, chapter:chapters(title))')
        .eq('student_id', profile.id)
        .eq('status', 'todo')
        .then(unwrap),
      fetchStudentChapters(profile.grade ?? null),
    ])
    const list = rows
      .filter((r) => r.assignment)
      .map((r) => ({ ...r, chapter_id: r.assignment.chapter_id }))
      .sort((a, b) => compareDue(a.assignment.due_date, b.assignment.due_date))
    return { list, chapters }
  }, [profile.id, profile.grade])

  const chapters = data?.chapters || []
  const chapterById = new Map(chapters.map((c) => [c.id, c]))
  const rows = (data?.list || []).filter((r) => matchItem(r, chapterById, sel))
  const where = selectionLabel(sel, chapterById, 'Bài khác')
  const now = findStudyChapter(chapters, studyId)

  // Cột phải: 3 bài có hạn gần nhất (không theo bộ lọc cây, để luôn thấy bài gấp)
  const soon = (data?.list || []).filter((r) => r.assignment.due_date).slice(0, 3)
  // Đang làm dở: bài chưa nộp có bản nháp trên máy này (đã trả lời ít nhất 1 câu), làm tiếp đúng chỗ cũ
  const inProgress = (data?.list || [])
    .map((r) => ({ a: r.assignment, n: draftCount(readDraft(draftKey(r.assignment.id, profile.id))) }))
    .filter((d) => d.n > 0)
    .slice(0, 4)

  return (
    <div className="library">
      {inProgress.length > 0 && (
        <ContextPanel title="Đang làm dở">
          <ul className="ctx-feed">
            {inProgress.map(({ a, n }) => (
              <li key={a.id}>
                <Link to={`/student/assignments/${a.id}`} className="ctx-feed-row">
                  <span className="ctx-feed-main">
                    <b>{a.title}</b>
                    <span className="muted">Đã trả lời {n} câu, lưu trên máy này</span>
                  </span>
                  <span className="ctx-go">Làm tiếp</span>
                </Link>
              </li>
            ))}
          </ul>
        </ContextPanel>
      )}
      {data && (
        <ContextPanel title="Sắp đến hạn">
          {soon.length ? (
            <ul className="ctx-feed">
              {soon.map(({ assignment: a }) => (
                <li key={a.id}>
                  <Link to={`/student/assignments/${a.id}`} className="ctx-feed-row">
                    <span className="ctx-feed-main">
                      <b>{a.title}</b>
                      <span className="muted">Hạn {formatDate(a.due_date)}</span>
                    </span>
                    <DueBadge date={a.due_date} />
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted small ctx-empty">Không có bài nào có hạn nộp. Bài mới giao sẽ hiện ở đây.</p>
          )}
        </ContextPanel>
      )}
      <FilterTree
        title="Bài cần làm"
        icon="todo"
        chapters={chapters}
        items={data?.list || []}
        badgeIf={() => true}
        showCount={false}
        hideEmpty
        noneLabel="Bài khác"
        storageKey="todo-tree-open"
        nowId={now?.id}
      />
      <section className="library-main">
        <div className="page-head">
          <div>
            <h1>Chào {profile.full_name || 'bạn'} 👋</h1>
            <p className="muted small page-sub">{where ? `Bài cần làm · ${where}` : 'Bài cần làm, hạn gần nhất lên trước'}</p>
          </div>
          {chapterById.has(sel.ch) && <StudyNowButton chapterId={sel.ch} />}
        </div>

        {!where && !loading && <StudyNow chapter={now} />}

        {loading && <Loading />}
        <ErrorBox message={error} onRetry={reload} />

        {!loading && !error && rows.length === 0 && (
          <div className={where ? 'empty' : 'empty empty-done'}>{where ? 'Mục này không còn bài cần làm.' : 'Bạn đã làm hết bài được giao.'}</div>
        )}

        {!loading && !error && rows.length > 0 && (
          <div className="list">
            {rows.map(({ assignment: a, assigned_at }) => (
              <Link key={a.id} to={`/student/assignments/${a.id}`} className="list-item">
                <div className="list-item-title">
                  {a.title} {isNew(assigned_at) && <span className="badge badge-new">Mới</span>}
                </div>
                <div className="row">
                  {a.chapter && <span className="badge badge-primary">{a.chapter.title}</span>}
                  <TypeBadge type={a.type} />
                  <DueBadge date={a.due_date} />
                  {a.due_date && <span className="muted small">Hạn: {formatDate(a.due_date)}</span>}
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
