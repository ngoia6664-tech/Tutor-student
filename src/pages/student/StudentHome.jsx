import { useDeferredValue, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase, unwrap } from '../../lib/supabase.js'
import { useAsync } from '../../lib/useAsync.js'
import { compareDue, daysUntil, formatDate, matchTitle } from '../../lib/format.js'
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
import { draftCount, draftKey, fetchServerDraftCounts, readDraft } from '../../lib/drafts.js'
import { findStudyChapter, useStudyChapterId } from '../../lib/studyNow.js'
import Icon from '../../components/Icon.jsx'
import CustomSelect from '../../components/CustomSelect.jsx'

// Bài chưa nộp, sắp theo hạn gần nhất; cây bên trái lọc theo chủ đề của lớp mình
export default function StudentHome() {
  const { profile } = useAuth()
  const { isNew } = useNotifications()
  const sel = useTreeSelection()
  const studyId = useStudyChapterId()

  const [query, setQuery] = useState('')
  const deferredQuery = useDeferredValue(query)
  const [quickFilter, setQuickFilter] = useState('all') // 'all' | 'soon' | 'draft' | 'overdue' | 'exam'
  const [sortBy, setSortBy] = useState('due') // 'due' | 'assigned' | 'title'

  const { data, loading, error, reload } = useAsync(async () => {
    const [rows, chapters, serverDrafts] = await Promise.all([
      supabase
        .from('assignment_recipients')
        .select('status, assigned_at, assignment:assignments(id, title, type, due_date, is_exam, chapter_id, chapter:chapters(title))')
        .eq('student_id', profile.id)
        .eq('status', 'todo')
        .eq('quiet', false) // bài tự học trong khóa nằm ở Thư viện, không phải bài cần làm
        .then(unwrap),
      fetchStudentChapters(profile.grade ?? null),
      fetchServerDraftCounts(),
    ])
    const list = rows
      .filter((r) => r.assignment)
      .map((r) => ({ ...r, chapter_id: r.assignment.chapter_id }))
      .sort((a, b) => compareDue(a.assignment.due_date, b.assignment.due_date))
    return { list, chapters, serverDrafts }
  }, [profile.id, profile.grade])

  const chapters = data?.chapters || []
  const chapterById = new Map(chapters.map((c) => [c.id, c]))
  const now = findStudyChapter(chapters, studyId)

  // Cột phải: 3 bài có hạn gần nhất (không theo bộ lọc cây, để luôn thấy bài gấp)
  const soon = (data?.list || []).filter((r) => r.assignment.due_date).slice(0, 3)

  // Đang làm dở: bài chưa nộp có bản nháp (trên máy này hoặc trên máy chủ, đã trả lời ít nhất 1 câu), làm tiếp đúng chỗ cũ
  const inProgressMap = useMemo(() => {
    const map = new Map()
    if (!data?.list) return map
    for (const r of data.list) {
      const id = r.assignment.id
      const n = Math.max(draftCount(readDraft(draftKey(id, profile.id))), data.serverDrafts.get(id) || 0)
      if (n > 0) map.set(id, n)
    }
    return map
  }, [data?.list, data?.serverDrafts, profile.id])

  const inProgress = (data?.list || [])
    .filter((r) => inProgressMap.has(r.assignment.id))
    .map((r) => ({ a: r.assignment, n: inProgressMap.get(r.assignment.id) }))
    .slice(0, 4)

  // Lọc theo cây + ô tìm kiếm + chip lọc nhanh + sắp xếp
  const filteredRows = useMemo(() => {
    if (!data?.list) return []
    let list = data.list.filter((r) => matchItem(r, chapterById, sel))

    // Tìm kiếm (dùng deferredQuery)
    const q = deferredQuery.trim()
    if (q) {
      list = list.filter(
        (r) =>
          matchTitle(r.assignment.title, q) ||
          (r.assignment.chapter && matchTitle(r.assignment.chapter.title, q))
      )
    }

    // Chip lọc nhanh
    if (quickFilter === 'soon') {
      list = list.filter((r) => {
        const d = daysUntil(r.assignment.due_date)
        return d !== null && d >= 0 && d <= 3
      })
    } else if (quickFilter === 'draft') {
      list = list.filter((r) => inProgressMap.has(r.assignment.id))
    } else if (quickFilter === 'overdue') {
      list = list.filter((r) => {
        const d = daysUntil(r.assignment.due_date)
        return d !== null && d < 0
      })
    } else if (quickFilter === 'exam') {
      list = list.filter((r) => r.assignment.is_exam)
    }

    // Sắp xếp
    return [...list].sort((a, b) => {
      if (sortBy === 'title') {
        return (a.assignment.title || '').localeCompare(b.assignment.title || '', 'vi')
      }
      if (sortBy === 'assigned') {
        return (b.assigned_at || '').localeCompare(a.assigned_at || '')
      }
      // mặc định due
      return compareDue(a.assignment.due_date, b.assignment.due_date)
    })
  }, [data?.list, chapterById, sel, query, quickFilter, sortBy, inProgressMap])

  const where = selectionLabel(sel, chapterById, 'Bài khác')
  const activeFilters = query.trim().length > 0 || quickFilter !== 'all' || sortBy !== 'due'

  // Đếm nhanh cho các chip
  const counts = useMemo(() => {
    if (!data?.list) return { total: 0, soon: 0, draft: 0, overdue: 0, exam: 0 }
    let s = 0, d = 0, o = 0, e = 0
    for (const r of data.list) {
      const days = daysUntil(r.assignment.due_date)
      if (days !== null && days >= 0 && days <= 3) s++
      if (days !== null && days < 0) o++
      if (inProgressMap.has(r.assignment.id)) d++
      if (r.assignment.is_exam) e++
    }
    return { total: data.list.length, soon: s, draft: d, overdue: o, exam: e }
  }, [data?.list, inProgressMap])

  function resetQuick() {
    setQuery('')
    setQuickFilter('all')
    setSortBy('due')
  }

  return (
    <div className="library">
      {inProgress.length > 0 && (
        <ContextPanel title="Đang làm dở" icon="resume">
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
        <ContextPanel title="Sắp đến hạn" icon="clock">
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
            <p className="muted small page-sub">{where ? `Bài cần làm · ${where}` : 'Bài cần làm được giao'}</p>
          </div>
          {chapterById.has(sel.ch) && <StudyNowButton chapterId={sel.ch} />}
        </div>

        {!where && !loading && <StudyNow chapter={now} />}

        {/* Thanh tìm kiếm và bộ lọc bài tập */}
        {data && (
          <div style={{ marginBottom: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <div className="row" style={{ gap: '0.5rem', flexWrap: 'wrap' }}>
              <div style={{ position: 'relative', flex: '1 1 200px', minWidth: '180px' }}>
                <input
                  type="search"
                  className="assign-search"
                  style={{ width: '100%', paddingLeft: '2.1rem' }}
                  placeholder="Tìm bài tập theo tên, chủ đề..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  aria-label="Tìm kiếm bài tập"
                />
                <span style={{ position: 'absolute', left: '0.7rem', top: '50%', transform: 'translateY(-50%)', opacity: 0.5, pointerEvents: 'none' }}>
                  <Icon name="search" size={15} />
                </span>
              </div>

              <CustomSelect
                value={sortBy}
                onChange={setSortBy}
                options={[
                  { value: 'due', label: 'Hạn gần nhất', icon: 'clock' },
                  { value: 'assigned', label: 'Mới giao nhất', icon: 'zap' },
                  { value: 'title', label: 'Tên A-Z', icon: 'file' },
                ]}
                prefixLabel="Sắp xếp: "
                icon="clock"
                ariaLabel="Sắp xếp danh sách"
              />
            </div>

            {/* Chips lọc nhanh */}
            <div className="chips" style={{ margin: 0, flexWrap: 'wrap', gap: '0.35rem' }}>
              <button
                type="button"
                className={`chip${quickFilter === 'all' ? ' active' : ''}`}
                onClick={() => setQuickFilter('all')}
              >
                Tất cả ({counts.total})
              </button>
              {counts.soon > 0 && (
                <button
                  type="button"
                  className={`chip${quickFilter === 'soon' ? ' active' : ''}`}
                  onClick={() => setQuickFilter('soon')}
                >
                  ⏰ Sắp đến hạn ({counts.soon})
                </button>
              )}
              {counts.draft > 0 && (
                <button
                  type="button"
                  className={`chip${quickFilter === 'draft' ? ' active' : ''}`}
                  onClick={() => setQuickFilter('draft')}
                >
                  ✍️ Đang làm dở ({counts.draft})
                </button>
              )}
              {counts.overdue > 0 && (
                <button
                  type="button"
                  className={`chip${quickFilter === 'overdue' ? ' active' : ''}`}
                  onClick={() => setQuickFilter('overdue')}
                >
                  ⚠️ Quá hạn ({counts.overdue})
                </button>
              )}
              {counts.exam > 0 && (
                <button
                  type="button"
                  className={`chip${quickFilter === 'exam' ? ' active' : ''}`}
                  onClick={() => setQuickFilter('exam')}
                >
                  ⏱️ Đề thi ({counts.exam})
                </button>
              )}
            </div>

            {activeFilters && (
              <div className="row row-between small muted" style={{ padding: '0.2rem 0.4rem' }}>
                <span>
                  Tìm thấy <strong>{filteredRows.length}</strong> bài phù hợp
                  {query && <> khớp &ldquo;{query}&rdquo;</>}
                </span>
                <button type="button" className="btn btn-ghost btn-small" onClick={resetQuick} style={{ padding: '0.1rem 0.35rem' }}>
                  <Icon name="close" size={13} /> Xóa tìm kiếm
                </button>
              </div>
            )}
          </div>
        )}

        {loading && <Loading />}
        <ErrorBox message={error} onRetry={reload} />

        {!loading && !error && filteredRows.length === 0 && (
          <div className={where ? 'empty' : 'empty empty-done'}>
            {activeFilters
              ? 'Không có bài nào khớp với từ khóa hoặc bộ lọc này.'
              : where
                ? 'Mục này không còn bài cần làm.'
                : 'Bạn đã làm hết bài được giao. Tuyệt vời! 🎉'}
          </div>
        )}

        {!loading && !error && filteredRows.length > 0 && (
          <div className="list">
            {filteredRows.map(({ assignment: a, assigned_at }) => (
              <Link key={a.id} to={`/student/assignments/${a.id}`} className="list-item">
                <div className="list-item-title">
                  {a.title} {isNew(assigned_at) && <span className="badge badge-new">Mới</span>}
                  {inProgressMap.has(a.id) && (
                    <span className="badge badge-warn" style={{ marginLeft: '0.4rem', fontSize: '0.75rem' }}>
                      Đang làm dở ({inProgressMap.get(a.id)} câu)
                    </span>
                  )}
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
