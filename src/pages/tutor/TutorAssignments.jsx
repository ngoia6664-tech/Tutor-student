import { useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase, unwrap } from '../../lib/supabase.js'
import { useAsync } from '../../lib/useAsync.js'
import { errMsg } from '../../lib/errors.js'
import { formatDate } from '../../lib/format.js'
import { deleteAssignment } from '../../lib/assignments.js'
import Loading from '../../components/Loading.jsx'
import ErrorBox from '../../components/ErrorBox.jsx'
import { DueBadge, TypeBadge } from '../../components/Badges.jsx'
import ChapterGroups from '../../components/ChapterGroups.jsx'
import FilterTree, { matchItem, selectionLabel, useTreeSelection } from '../../components/FilterTree.jsx'
import { fetchChapters } from '../../lib/chapters.js'
import Icon from '../../components/Icon.jsx'
import { AssignDialog, SelectBar, SelectCheck, SelectToggle, useAssignSelection } from '../../components/QuickAssign.jsx'

export default function TutorAssignments() {
  const [filter, setFilter] = useState('all')
  const sel = useTreeSelection()
  const [actionError, setActionError] = useState(null)
  const [deleting, setDeleting] = useState(null)
  const pick = useAssignSelection()
  const [assigning, setAssigning] = useState(null)

  const { data, loading, error, reload } = useAsync(async () => {
    const [rows, chapters] = await Promise.all([
      supabase
        .from('assignments')
        .select('id, title, type, due_date, created_at, chapter_id, assignment_recipients(status)')
        .order('created_at', { ascending: false })
        .then(unwrap),
      fetchChapters(),
    ])
    const list = rows.map((a) => {
      const c = { todo: 0, done: 0, checked: 0 }
      a.assignment_recipients.forEach((r) => (c[r.status] += 1))
      return { ...a, counts: c, total: a.assignment_recipients.length }
    })
    return { list, chapters }
  }, [])

  async function handleDelete(a) {
    if (!window.confirm(`Xóa bài tập "${a.title}"? Toàn bộ câu hỏi, đáp án, bài nộp và điểm sẽ mất.`)) return
    setDeleting(a.id)
    setActionError(null)
    try {
      await deleteAssignment(a.id)
      reload()
    } catch (e) {
      setActionError(errMsg(e))
    } finally {
      setDeleting(null)
    }
  }

  const chapters = data?.chapters || []
  const chapterById = new Map(chapters.map((c) => [c.id, c]))
  const rows = (data?.list || []).filter((a) => matchItem(a, chapterById, sel)).filter((a) => (filter === 'pending' ? a.counts.done > 0 : true))
  const where = selectionLabel(sel, chapterById, 'Chưa xếp chương')

  return (
    <div className="library">
      <FilterTree
        title="Bài tập"
        icon="assignment"
        chapters={chapters}
        items={data?.list || []}
        badgeIf={(a) => a.counts.done > 0}
        gradeTabs
        storageKey="assignments-tree-open"
      />
      <section className="library-main">
        <div className="page-head">
          <div>
            <h1>
              <span className="title-icon"><Icon name="assignment" /></span>Bài tập
            </h1>
            {where && <p className="muted small page-sub">{where}</p>}
          </div>
          <div className="row">
            <SelectToggle sel={pick} />
            <Link className="btn" to="/tutor/import">
              <Icon name="import" />
              Dán JSON
            </Link>
            <Link className="btn btn-primary" to="/tutor/assignments/new" state={sel.ch && sel.ch !== 'none' ? { chapterId: sel.ch } : undefined}>
              <Icon name="plus" />
              Soạn bài tập
            </Link>
          </div>
        </div>

        <div className="chips" style={{ marginBottom: '1rem' }}>
          <button type="button" className={filter === 'all' ? 'chip active' : 'chip'} onClick={() => setFilter('all')}>
            Tất cả
          </button>
          <button type="button" className={filter === 'pending' ? 'chip active' : 'chip'} onClick={() => setFilter('pending')}>
            Có bài chờ chấm
          </button>
        </div>

        <ErrorBox message={actionError} />
        {loading && <Loading />}
        <ErrorBox message={error} onRetry={reload} />

        {!loading && !error && rows.length === 0 && (
          <div className="empty">{filter === 'pending' ? 'Không có bài nào chờ chấm.' : where ? 'Mục này chưa có bài tập.' : 'Chưa có bài tập nào.'}</div>
        )}

        {!loading && !error && rows.length > 0 && sel.ch && <div className="list">{rows.map(renderAssignment)}</div>}
        {!loading && !error && rows.length > 0 && !sel.ch && <ChapterGroups items={rows} chapters={chapters} renderItem={renderAssignment} />}
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
      </section>
    </div>
  )

  function renderAssignment(a) {
    const item = { kind: 'assignment', id: a.id, title: a.title }
    return (
      <div key={a.id} className={pick.has('assignment', a.id) ? 'list-item is-picked' : 'list-item'}>
        <div className="list-item-title assign-title">
          <SelectCheck sel={pick} item={item} />
          <Link to={`/tutor/assignments/${a.id}`} style={{ color: 'inherit' }}>
            {a.title}
          </Link>
        </div>
        <div className="row" style={{ marginBottom: '0.5rem' }}>
          <TypeBadge type={a.type} />
          <DueBadge date={a.due_date} />
          <span className="muted small">Hạn: {formatDate(a.due_date)}</span>
        </div>
        <div className="row small" style={{ marginBottom: '0.5rem' }}>
          <span>{a.total} học sinh:</span>
          <span className="badge badge-warn">{a.counts.todo} chưa nộp</span>
          <span className="badge badge-primary">{a.counts.done} chờ chấm</span>
          <span className="badge badge-ok">{a.counts.checked} đã chấm</span>
        </div>
        <div className="row">
          <Link className="btn btn-small btn-primary" to={`/tutor/assignments/${a.id}`}>
            <Icon name="grade" />
            Theo dõi & chấm
          </Link>
          <button type="button" className="btn btn-small" onClick={() => setAssigning([item])}>
            <Icon name="users" />
            Giao ({a.total})
          </button>
          <Link className="btn btn-small" to={`/tutor/assignments/${a.id}/edit`}>
            <Icon name="edit" />
            Sửa
          </Link>
          <button type="button" className="btn btn-small btn-danger" disabled={deleting === a.id} onClick={() => handleDelete(a)}>
            <Icon name="trash" />
            {deleting === a.id ? 'Đang xóa...' : 'Xóa'}
          </button>
        </div>
      </div>
    )
  }
}
