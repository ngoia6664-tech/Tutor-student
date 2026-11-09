import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase, unwrap } from '../../lib/supabase.js'
import { useAsync } from '../../lib/useAsync.js'
import { useRemembered } from '../../lib/navMemory.js'
import { errMsg } from '../../lib/errors.js'
import { formatDate, matchTitle } from '../../lib/format.js'
import { deleteAssignment } from '../../lib/assignments.js'
import Loading from '../../components/Loading.jsx'
import ErrorBox from '../../components/ErrorBox.jsx'
import { DueBadge, TypeBadge } from '../../components/Badges.jsx'
import Icon from '../../components/Icon.jsx'
import GradeQueuePanel from '../../components/GradeQueuePanel.jsx'
import MoreMenu from '../../components/MoreMenu.jsx'
import { confirmDelete, notifyDeleted } from '../../lib/dialog.js'
import { AssignDialog, deletePicked, MoveDialog, SelectBar, SelectCheck, useAssignSelection } from '../../components/QuickAssign.jsx'

// Chấm bài (gia sư): hàng đợi công việc — danh sách phẳng mọi bài tập, lọc "Có bài chờ chấm", tìm theo tên.
// Duyệt theo Lớp › Môn › Chủ đề đã có ở Thư viện nên trang này không có cây.
// Thao tác phụ (Sửa nhiều, Xóa nhiều, Dán JSON) nằm trong menu "⋯"; nút chính là "Soạn bài tập".

// Mục menu "⋯" bật / tắt chế độ chọn nhiều (cùng hành vi với SelectModes trong QuickAssign.jsx)
function selectModeItems(sel) {
  const modes = [
    { key: 'edit', label: 'Sửa nhiều', off: 'Thôi sửa', icon: 'edit' },
    { key: 'delete', label: 'Xóa nhiều', off: 'Thôi xóa', icon: 'trash' },
  ]
  return modes.map((m) => {
    const active = sel.mode === m.key
    return {
      key: `mode-${m.key}`,
      label: active ? m.off : m.label,
      icon: active ? 'close' : m.icon,
      danger: m.key === 'delete' && !active,
      onSelect: active ? sel.stop : () => sel.start(m.key),
    }
  })
}

export default function TutorAssignments() {
  const navigate = useNavigate()
  // Lọc "Chờ chấm" + ô tìm nhớ trong phiên: mở bài rồi quay lại vẫn còn
  const [filter, setFilter] = useRemembered('tutor-assignments-filter', 'all', (v) => v === 'all' || v === 'pending')
  const [query, setQuery] = useRemembered('tutor-assignments-q', '', (v) => typeof v === 'string')
  const [actionError, setActionError] = useState(null)
  const [deleting, setDeleting] = useState(null)
  const pick = useAssignSelection()
  const [assigning, setAssigning] = useState(null)
  const [moving, setMoving] = useState(null)

  const { data, loading, error, reload } = useAsync(async () => {
    const rows = unwrap(
      await supabase.from('assignments').select('id, title, type, due_date, created_at, assignment_recipients(status)').order('created_at', { ascending: false })
    )
    return rows.map((a) => {
      const c = { todo: 0, done: 0, checked: 0 }
      a.assignment_recipients.forEach((r) => (c[r.status] += 1))
      return { ...a, counts: c, total: a.assignment_recipients.length }
    })
  }, [])

  async function handleDelete(a) {
    if (!(await confirmDelete('bài tập', a.title, 'Toàn bộ câu hỏi, đáp án, bài nộp và điểm sẽ mất.'))) return
    setDeleting(a.id)
    setActionError(null)
    try {
      await deleteAssignment(a.id)
      reload()
      notifyDeleted('bài tập')
    } catch (e) {
      setActionError(errMsg(e))
    } finally {
      setDeleting(null)
    }
  }

  const all = data || []
  const pendingCount = all.filter((a) => a.counts.done > 0).length
  const rows = all.filter((a) => (filter === 'pending' ? a.counts.done > 0 : true) && matchTitle(a.title, query))

  return (
    <section>
      <GradeQueuePanel />
      <div className="page-head">
        <h1>
          <span className="title-icon"><Icon name="grade" /></span>Chấm bài
        </h1>
      </div>

      <div className="assign-toolbar">
        <div className="assign-filters">
          <div className="chips">
            <button type="button" className={filter === 'all' ? 'chip active' : 'chip'} onClick={() => setFilter('all')}>
              Tất cả
            </button>
            <button type="button" className={filter === 'pending' ? 'chip active' : 'chip'} onClick={() => setFilter('pending')}>
              Có bài chờ chấm{pendingCount > 0 ? ` (${pendingCount})` : ''}
            </button>
          </div>
          <input
            type="search"
            className="assign-search"
            placeholder="Tìm bài tập theo tên…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Tìm bài tập theo tên"
          />
        </div>
        <div className="assign-top-actions">
          <Link className="btn btn-primary" to="/tutor/assignments/new">
            <Icon name="plus" />
            Soạn bài tập
          </Link>
          <MoreMenu
            label="Thao tác khác"
            items={[
              ...selectModeItems(pick),
              { key: 'import', label: 'Nhập bài', icon: 'import', onSelect: () => navigate('/tutor/import') },
            ]}
          />
        </div>
      </div>

      <ErrorBox message={actionError} />
      {loading && <Loading />}
      <ErrorBox message={error} onRetry={reload} />

      {!loading && !error && rows.length === 0 && (
        <div className="empty">{query.trim() ? `Không có bài tập nào khớp "${query.trim()}".` : filter === 'pending' ? 'Không có bài nào chờ chấm.' : 'Chưa có bài tập nào.'}</div>
      )}

      {!loading && !error && rows.length > 0 && <div className="list">{rows.map(renderAssignment)}</div>}
      <SelectBar
        sel={pick}
        visible={rows.map(itemOf)}
        onAssign={setAssigning}
        onMove={setMoving}
        onDelete={async (items) => {
          if (await deletePicked(items)) {
            pick.stop()
            reload()
          }
        }}
      />
      {moving && (
        <MoveDialog
          items={moving}
          onClose={() => setMoving(null)}
          onSaved={(ok) => {
            if (ok) pick.stop()
            reload()
          }}
        />
      )}
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
  )

  // Mục dùng cho chọn nhiều; submitted = số học sinh đã nộp (cảnh báo khi xóa)
  function itemOf(a) {
    return { kind: 'assignment', id: a.id, title: a.title, submitted: a.counts.done + a.counts.checked }
  }

  function renderAssignment(a) {
    const item = itemOf(a)
    // Chỉ hiện trạng thái có số > 0; cả ba bằng 0 thì ghi một dòng nhạt
    const stats = [
      [a.counts.todo, 'chưa nộp', 'badge-warn'],
      [a.counts.done, 'chờ chấm', 'badge-primary'],
      [a.counts.checked, 'đã chấm', 'badge-ok'],
    ].filter(([n]) => n > 0)
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
          {stats.length > 0 ? (
            <>
              {a.total > 0 && <span>{a.total} học sinh</span>}
              {stats.map(([n, text, cls]) => (
                <span key={text} className={`badge ${cls}`}>
                  {n} {text}
                </span>
              ))}
            </>
          ) : (
            <span className="muted">Chưa có học sinh nào làm</span>
          )}
        </div>
        <div className="assign-actions">
          <Link className="btn btn-primary assign-main" to={`/tutor/assignments/${a.id}`}>
            <Icon name="grade" />
            Theo dõi & chấm
          </Link>
          <button type="button" className="btn" onClick={() => setAssigning([item])}>
            <Icon name="users" />
            Giao ({a.total})
          </button>
          <Link className="btn" to={`/tutor/assignments/${a.id}/edit`}>
            <Icon name="edit" />
            Sửa
          </Link>
          <button type="button" className="btn btn-danger" disabled={deleting === a.id} onClick={() => handleDelete(a)}>
            <Icon name="trash" />
            {deleting === a.id ? 'Đang xóa...' : 'Xóa'}
          </button>
        </div>
      </div>
    )
  }
}
