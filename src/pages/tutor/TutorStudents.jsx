import { memo, useDeferredValue, useMemo, useState } from 'react'
import { useRemembered } from '../../lib/navMemory.js'
import { Link } from 'react-router-dom'
import { supabase, unwrap } from '../../lib/supabase.js'
import { fetchStudentStats } from '../../lib/studentReport.js'
import { viNum } from '../../lib/exam.js'
import { useAsync } from '../../lib/useAsync.js'
import { errMsg } from '../../lib/errors.js'
import { fetchGroupRows, fetchStudents, renameGroup, saveGroupNote } from '../../lib/students.js'
import { buildGroups, groupLabel, summarizeGroup } from '../../lib/studentGroups.js'
import { buildBackup, downloadBackup, fetchStreaks, parseBackup, restoreStreaks } from '../../lib/streakBackup.js'
import { askConfirm, notifyDone, notifyError } from '../../lib/dialog.js'
import { matchTitle } from '../../lib/format.js'
import Loading from '../../components/Loading.jsx'
import ErrorBox from '../../components/ErrorBox.jsx'
import Icon from '../../components/Icon.jsx'
import CustomSelect from '../../components/CustomSelect.jsx'

const NONE = '__none' // khóa nhóm "Chưa xếp nhóm"

export default function TutorStudents() {
  const [group, setGroup] = useRemembered('tutor-students-group', 'all', (v) => typeof v === 'string')
  const [searchQuery, setSearchQuery] = useRemembered('tutor-students-search', '', (v) => typeof v === 'string')
  const deferredSearchQuery = useDeferredValue(searchQuery)
  const [gradeFilter, setGradeFilter] = useRemembered('tutor-students-grade', 'all', (v) => typeof v === 'string')
  const [statusFilter, setStatusFilter] = useRemembered('tutor-students-status', 'all', (v) => typeof v === 'string')
  const [viewMode, setViewMode] = useRemembered('tutor-students-view', 'groups', (v) => v === 'groups' || v === 'students')

  const [editing, setEditing] = useState(null) // học sinh đang sửa
  const [editGroup, setEditGroup] = useState(/** @type {{ name: string, note: string } | null} */ (null)) // nhóm đang sửa

  const { data, loading, error, reload } = useAsync(async () => {
    const [students, stats, streaks, rows] = await Promise.all([
      fetchStudents(),
      fetchStudentStats(),
      fetchStreaks().catch(() => []),
      fetchGroupRows().catch(() => []),
    ])
    return { students, stats, streakById: new Map(streaks.map((r) => [r.student_id, r.current_streak])), ...buildGroups(students, rows) }
  }, [])

  const students = data?.students || []
  const blocks = (data?.groups || []).map((g) => ({ key: g.name, title: groupLabel(g.name), note: g.note, name: g.name, list: g.students }))
  if (data?.ungrouped.length) blocks.push({ key: NONE, title: 'Chưa xếp nhóm', note: '', name: '', list: data.ungrouped })

  // Danh sách các nhóm định dạng cho CustomSelect (có ô tìm kiếm nhanh nếu có 100 nhóm)
  const groupOptions = useMemo(() => {
    /** @type {import('../../components/CustomSelect.jsx').SelectOption[]} */
    const opts = [
      {
        value: 'all',
        label: 'Tất cả học sinh',
        count: students.length,
        icon: 'users',
      },
    ]
    for (const b of blocks) {
      opts.push({
        value: b.key,
        label: b.title,
        count: b.list.length,
        icon: b.key === NONE ? 'inbox' : 'users',
      })
    }
    return opts
  }, [students.length, blocks])

  const activeSearch = deferredSearchQuery.trim().length > 0 || gradeFilter !== 'all' || statusFilter !== 'all'

  // Lọc học sinh theo từ khóa, khối lớp và tình trạng (sử dụng deferredSearchQuery để gõ mượt mà)
  const filteredStudents = useMemo(() => {
    if (!data) return []
    let list = students

    if (group !== 'all') {
      if (group === NONE) list = list.filter((s) => !s.group_name)
      else list = list.filter((s) => s.group_name === group)
    }

    const q = deferredSearchQuery.trim()
    if (q) {
      list = list.filter((s) =>
        matchTitle(s.full_name, q) ||
        matchTitle(s.group_name, q) ||
        (s.grade && String(s.grade).includes(q)) ||
        (s.subjects && s.subjects.some((sub) => matchTitle(sub, q)))
      )
    }

    if (gradeFilter !== 'all') {
      if (gradeFilter === 'other') list = list.filter((s) => !s.grade)
      else list = list.filter((s) => s.grade === Number(gradeFilter))
    }

    if (statusFilter !== 'all') {
      list = list.filter((s) => {
        const st = data.stats[s.id] || { todo: 0, overdue: 0, done: 0, checked: 0, avg: null }
        const streak = data.streakById.get(s.id) || 0
        if (statusFilter === 'overdue') return st.overdue > 0
        if (statusFilter === 'pending') return st.done > 0
        if (statusFilter === 'streak') return streak > 0
        if (statusFilter === 'needs_action') return st.overdue > 0 || st.done > 0
        return true
      })
    }

    return list
  }, [data, students, group, deferredSearchQuery, gradeFilter, statusFilter])

  // Lọc các khối nhóm: khi tìm kiếm, nhóm nào có học sinh khớp thì hiện trong lưới
  const filteredBlocks = useMemo(() => {
    if (!data) return []
    const q = deferredSearchQuery.trim()
    return blocks
      .map((b) => {
        const matching = b.list.filter((s) => {
          if (q) {
            const match =
              matchTitle(s.full_name, q) ||
              matchTitle(s.group_name, q) ||
              (s.grade && String(s.grade).includes(q)) ||
              (s.subjects && s.subjects.some((sub) => matchTitle(sub, q)))
            if (!match) return false
          }
          if (gradeFilter !== 'all') {
            if (gradeFilter === 'other' && s.grade) return false
            if (gradeFilter !== 'other' && s.grade !== Number(gradeFilter)) return false
          }
          if (statusFilter !== 'all') {
            const st = data.stats[s.id] || { todo: 0, overdue: 0, done: 0, checked: 0, avg: null }
            const streak = data.streakById.get(s.id) || 0
            if (statusFilter === 'overdue' && st.overdue === 0) return false
            if (statusFilter === 'pending' && st.done === 0) return false
            if (statusFilter === 'streak' && streak === 0) return false
            if (statusFilter === 'needs_action' && st.overdue === 0 && st.done === 0) return false
          }
          return true
        })
        return { ...b, matchingList: matching, sum: summarizeGroup(matching, data.stats) }
      })
      .filter((b) => !activeSearch || b.matchingList.length > 0)
  }, [blocks, deferredSearchQuery, gradeFilter, statusFilter, activeSearch, data])

  const detail = group === 'all' ? null : blocks.find((b) => b.key === group)

  function resetFilters() {
    setSearchQuery('')
    setGradeFilter('all')
    setStatusFilter('all')
    setGroup('all')
  }

  return (
    <div>
      <div className="page-head">
        <h1>
          <span className="title-icon"><Icon name="users" /></span>Học sinh {data && <span className="muted small">({students.length})</span>}
        </h1>
        {data && <StreakBackupButtons students={students} onRestored={reload} />}
      </div>

      {data && (
        <div className="assign-toolbar" style={{ flexWrap: 'wrap', gap: '0.6rem', marginBottom: '0.8rem' }}>
          {/* Thanh tìm kiếm */}
          <div style={{ position: 'relative', flex: '1 1 240px', minWidth: '200px' }}>
            <input
              type="search"
              className="assign-search"
              style={{ width: '100%', paddingLeft: '2.2rem' }}
              placeholder="Tìm theo tên học sinh, nhóm, lớp..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Tìm kiếm học sinh"
            />
            <span style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', opacity: 0.5, pointerEvents: 'none' }}>
              <Icon name="search" size={16} />
            </span>
          </div>

          {/* Bộ lọc Nhóm, Khối lớp, Tình trạng (CustomSelect làm đẹp đồng bộ, hỗ trợ 100 nhóm) */}
          <div className="row" style={{ flexWrap: 'wrap', gap: '0.5rem' }}>
            <CustomSelect
              value={group}
              onChange={setGroup}
              options={groupOptions}
              prefixLabel="Nhóm: "
              icon="users"
              searchable={true}
              searchPlaceholder="Tìm nhanh nhóm..."
              ariaLabel="Lọc theo nhóm học sinh"
            />

            <CustomSelect
              value={gradeFilter}
              onChange={setGradeFilter}
              options={[
                { value: 'all', label: 'Tất cả' },
                { value: '12', label: 'Lớp 12' },
                { value: '11', label: 'Lớp 11' },
                { value: '10', label: 'Lớp 10' },
                { value: 'other', label: 'Chưa đặt lớp' },
              ]}
              prefixLabel="Khối: "
              icon="filter"
              ariaLabel="Lọc theo khối lớp"
            />

            <CustomSelect
              value={statusFilter}
              onChange={setStatusFilter}
              options={[
                { value: 'all', label: 'Tất cả' },
                { value: 'needs_action', label: '⚠️ Cần chú ý (Quá hạn / Chờ chấm)' },
                { value: 'overdue', label: '🔴 Có bài quá hạn' },
                { value: 'pending', label: '🟡 Có bài chờ chấm' },
                { value: 'streak', label: '🔥 Đang có chuỗi' },
              ]}
              prefixLabel="Tình trạng: "
              ariaLabel="Lọc theo tình trạng học sinh"
            />

            {/* Hai chế độ xem: Nhóm (số nhóm) / Học sinh (số em) — số khớp bộ lọc và ô tìm kiếm. Ẩn khi đang trong một nhóm (lối ra: "← Về tất cả nhóm") */}
            {!detail && (
            <div className="chips" role="group" aria-label="Chế độ hiển thị" style={{ margin: 0 }}>
              <button
                type="button"
                className={`chip${viewMode === 'groups' ? ' active' : ''}`}
                onClick={() => setViewMode('groups')}
                title="Các khối nhóm: bấm một khối để xem học sinh trong nhóm"
              >
                <Icon name="grid" size={14} /> Nhóm ({filteredBlocks.length})
              </button>
              <button
                type="button"
                className={`chip${viewMode === 'students' ? ' active' : ''}`}
                onClick={() => setViewMode('students')}
                title="Mọi học sinh, chia khung theo nhóm"
              >
                <Icon name="users" size={14} /> Học sinh ({filteredStudents.length})
              </button>
            </div>
            )}

            <button type="button" className="btn btn-small btn-primary" onClick={() => setEditGroup({ name: '', note: '' })}>
              <Icon name="plus" />
              Nhóm mới
            </button>
          </div>
        </div>
      )}

      {/* Dòng trạng thái khi đang có bộ lọc / tìm kiếm */}
      {data && activeSearch && (
        <div className="row row-between small muted" style={{ margin: '0.3rem 0 0.8rem', padding: '0.4rem 0.6rem', background: 'var(--surface-2)', borderRadius: '8px', border: '1px solid var(--border)' }}>
          <span>
            Tìm thấy <strong>{filteredStudents.length}</strong> học sinh trong <strong>{filteredBlocks.length}</strong> nhóm
            {searchQuery && <> khớp &ldquo;{searchQuery}&rdquo;</>}
            {gradeFilter !== 'all' && <> · Khối {gradeFilter}</>}
            {statusFilter !== 'all' && <> · Tình trạng lọc</>}
          </span>
          <button type="button" className="btn btn-ghost btn-small" onClick={resetFilters} style={{ padding: '0.15rem 0.4rem' }}>
            <Icon name="close" size={14} /> Xóa bộ lọc
          </button>
        </div>
      )}

      {editGroup && (
        <GroupForm
          group={editGroup}
          onCancel={() => setEditGroup(null)}
          onSaved={() => {
            setEditGroup(null)
            reload()
          }}
        />
      )}

      {editing && (
        <EditStudent
          student={editing}
          onCancel={() => setEditing(null)}
          onSaved={() => {
            setEditing(null)
            reload()
          }}
        />
      )}

      {loading && <Loading />}
      <ErrorBox message={error} onRetry={reload} />

      {!loading && !error && students.length === 0 && (
        <div className="empty">
          Chưa có học sinh. Tạo tài khoản học sinh trong Supabase Dashboard &gt; Authentication &gt; Users (xem README), rồi tải lại trang.
        </div>
      )}

      {!loading && !error && students.length > 0 && filteredStudents.length === 0 && (
        <div className="empty">
          Không tìm thấy học sinh nào phù hợp bộ lọc.{' '}
          <button type="button" className="btn btn-ghost btn-small" onClick={resetFilters} style={{ marginTop: '0.5rem' }}>
            Xóa bộ lọc
          </button>
        </div>
      )}

      {/* ========================================================
          HAI CHẾ ĐỘ: NHÓM (khối nhóm, bấm vào xem em trong nhóm) / HỌC SINH (mọi em, chia khung theo nhóm)
          ======================================================== */}
      {!loading && !error && data && filteredStudents.length > 0 && (
        <section className="group-block">
          {detail ? (
            <GroupFrame
              block={detail}
              list={filteredStudents}
              data={data}
              onEditStudent={setEditing}
              onEditGroup={setEditGroup}
              onBack={() => setGroup('all')}
            />
          ) : viewMode === 'groups' ? (
            <div className="group-grid">
              {filteredBlocks.map((b) => (
                <button
                  key={b.key}
                  type="button"
                  className="group-card"
                  onClick={() => setGroup(b.key)}
                >
                  <div className="group-card-header">
                    <span className="group-card-icon">
                      <Icon name={b.key === NONE ? 'inbox' : 'users'} size={20} />
                    </span>
                    <span className="group-badge-count">{b.matchingList.length} em</span>
                  </div>
                  <strong className="group-card-title">{b.title}</strong>
                  {b.note && <span className="group-card-note">{b.note}</span>}
                  {(b.sum.avg !== null || b.sum.pending > 0 || b.sum.overdue > 0) && (
                    <div className="group-card-sum">
                      {b.sum.avg !== null && <span><span className="muted">TB</span> <b>{viNum(b.sum.avg)}</b></span>}
                      {b.sum.pending > 0 && <span className="badge badge-primary">{b.sum.pending} chờ chấm</span>}
                      {b.sum.overdue > 0 && <span className="badge badge-danger">{b.sum.overdue} quá hạn</span>}
                    </div>
                  )}
                  <div className="group-card-names">
                    {b.matchingList.length === 0 && <span className="muted small">Chưa có học sinh</span>}
                    {b.matchingList.slice(0, 3).map((s) => (
                      <span key={s.id} className="student-chip-mini">
                        <span className="student-initial">{s.full_name?.trim()?.charAt(0) || '?'}</span>
                        <span className="student-name-text">{s.full_name || '(chưa đặt tên)'}</span>
                      </span>
                    ))}
                    {b.matchingList.length > 3 && <span className="group-card-more">+{b.matchingList.length - 3} em nữa</span>}
                  </div>
                </button>
              ))}
            </div>
          ) : (
            filteredBlocks.map((b) => (
              <GroupFrame
                key={b.key}
                block={b}
                list={b.matchingList}
                data={data}
                onEditStudent={setEditing}
                onEditGroup={setEditGroup}
                onOpen={() => setGroup(b.key)}
              />
            ))
          )}
        </section>
      )}
    </div>
  )
}


function GroupForm({ group, onCancel, onSaved }) {
  const isNew = !group.name
  const [name, setName] = useState(group.name)
  const [note, setNote] = useState(group.note)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(/** @type {string | null} */ (null))

  async function save(e) {
    e.preventDefault()
    const n = name.trim()
    if (!n) return
    setSaving(true)
    setError(null)
    try {
      if (!isNew && n !== group.name) await renameGroup(group.name, n)
      await saveGroupNote(n, note.trim())
      onSaved()
    } catch (err) {
      setError(errMsg(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <form className="card" onSubmit={save}>
      <h2>{isNew ? 'Nhóm mới' : 'Sửa nhóm'}</h2>
      <ErrorBox message={error} />
      <label className="field">
        <span>Tên nhóm</span>
        <input type="text" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} required placeholder="Ví dụ: Lý 12 tối thứ 3" />
      </label>
      <label className="field">
        <span>Ghi chú (không bắt buộc)</span>
        <input type="text" value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} placeholder="Lịch học, mục tiêu..." />
      </label>
      {!isNew && <p className="muted small">Đổi tên sẽ đổi luôn nhóm của các em trong nhóm.</p>}
      <div className="row">
        <button type="submit" className="btn btn-primary" disabled={saving}>
          <Icon name="save" />
          {saving ? 'Đang lưu...' : 'Lưu'}
        </button>
        <button type="button" className="btn btn-ghost" onClick={onCancel} disabled={saving}>
          <Icon name="close" />
          Hủy
        </button>
      </div>
    </form>
  )
}

function StreakBackupButtons({ students, onRestored }) {
  const [busy, setBusy] = useState(false)

  const backup = async () => {
    setBusy(true)
    try {
      downloadBackup(buildBackup(students, await fetchStreaks()))
      notifyDone({ title: 'Đã tải file sao lưu chuỗi', message: 'Hãy giữ file này trước khi đổi cơ sở dữ liệu.' })
    } catch (err) {
      notifyError('Chưa sao lưu được chuỗi', errMsg(err))
    } finally {
      setBusy(false)
    }
  }

  const restore = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setBusy(true)
    try {
      const rows = parseBackup(await file.text())
      const ok = await askConfirm({
        title: 'Khôi phục chuỗi từ file?',
        message: `Đặt lại chuỗi của ${rows.length} học sinh theo file. Chuỗi hiện tại sẽ bị thay.`,
        confirmText: 'Khôi phục',
      })
      if (!ok) return
      const { done, failed } = await restoreStreaks(rows)
      onRestored()
      notifyDone({ title: 'Đã khôi phục chuỗi', message: failed ? `${done} học sinh xong, ${failed} lỗi (học sinh không còn tồn tại?).` : `${done} học sinh.` })
    } catch (err) {
      notifyError('Chưa khôi phục được chuỗi', errMsg(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="row" style={{ gap: '0.5rem' }}>
      <button type="button" className="btn btn-small" onClick={backup} disabled={busy}>
        🔥 Sao lưu chuỗi
      </button>
      <label className="btn btn-small" aria-disabled={busy}>
        Khôi phục chuỗi
        <input type="file" accept="application/json,.json" onChange={restore} disabled={busy} hidden />
      </label>
    </div>
  )
}

export function EditStudent({ student, onCancel, onSaved }) {
  const [form, setForm] = useState({
    full_name: student.full_name || '',
    group_name: student.group_name || '',
    grade: student.grade ? String(student.grade) : '',
    subjects: (student.subjects || []).join(', '),
  })
  const { data: groupRows } = useAsync(() => fetchGroupRows().catch(() => []), [])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })

  async function save(e) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      unwrap(
        await supabase
          .from('profiles')
          .update({
            full_name: form.full_name.trim(),
            group_name: form.group_name.trim() || null,
            grade: form.grade ? Number(form.grade) : null,
            subjects: form.subjects
              .split(',')
              .map((s) => s.trim())
              .filter(Boolean),
          })
          .eq('id', student.id)
      )
      onSaved()
    } catch (err) {
      setError(errMsg(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <form className="card" onSubmit={save}>
      <h2>Sửa học sinh</h2>
      <ErrorBox message={error} />
      <label className="field">
        <span>Họ tên</span>
        <input type="text" value={form.full_name} onChange={set('full_name')} required />
      </label>
      <div className="grid-2">
        <label className="field">
          <span>Nhóm</span>
          <input type="text" list="group-names" value={form.group_name} onChange={set('group_name')} maxLength={60} placeholder="Chọn hoặc gõ tên mới" />
          <datalist id="group-names">
            {(groupRows || []).map((g) => (
              <option key={g.name} value={g.name} />
            ))}
          </datalist>
        </label>
        <label className="field">
          <span>Lớp</span>
          <select value={form.grade} onChange={set('grade')}>
            <option value="">— chưa có —</option>
            {[6, 7, 8, 9, 10, 11, 12].map((g) => (
              <option key={g} value={g}>
                Lớp {g}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label className="field">
        <span>Môn (cách nhau bằng dấu phẩy)</span>
        <input type="text" value={form.subjects} onChange={set('subjects')} placeholder="Vật lý" />
      </label>
      <div className="row">
        <button type="submit" className="btn btn-primary" disabled={saving}>
          <Icon name="save" />
          {saving ? 'Đang lưu...' : 'Lưu'}
        </button>
        <button type="button" className="btn btn-ghost" onClick={onCancel} disabled={saving}>
          <Icon name="close" />
          Hủy
        </button>
      </div>
    </form>
  )
}

/** Một học sinh = một dòng gọn, cả dòng bấm được (mở hồ sơ). Chỉ hiện số đáng chú ý: chờ chấm, quá hạn, chuỗi. */
const StudentRow = memo(function StudentRow(/** @type {{ s: any, data: any, onEdit: (s: any) => void }} */ { s, data, onEdit }) {
  const st = data.stats[s.id] || { total: 0, overdue: 0, done: 0, checked: 0, avg: null }
  const streak = data.streakById.get(s.id)
  const info = [s.grade ? `Lớp ${s.grade}` : '', s.subjects?.join(', ')].filter(Boolean).join(' · ')
  return (
    <div className="student-row">
      <div className="student-row-main">
        <span className="student-initial student-row-avatar">{(s.full_name || '?').trim().charAt(0)}</span>
        <span className="student-row-text">
          <Link to={`/tutor/students/${s.id}`} className="student-row-name" title={s.full_name}>
            {s.full_name || '(chưa đặt tên)'}
          </Link>
          {info && <span className="student-row-info">{info}</span>}
        </span>
      </div>
      <div className="student-row-stats">
        <span><span className="muted">TB</span> <b>{st.avg === null ? '—' : viNum(st.avg)}</b></span>
        <span><span className="muted">Nộp</span> <b>{st.done + st.checked}/{st.total}</b></span>
        {st.done > 0 && <span className="badge badge-primary">{st.done} chờ chấm</span>}
        {st.overdue > 0 && <span className="badge badge-danger">{st.overdue} quá hạn</span>}
        {streak > 0 && <span>🔥 {streak}</span>}
      </div>
      <button type="button" className="btn btn-small btn-ghost student-row-edit" onClick={() => onEdit(s)} title="Sửa thông tin" aria-label={`Sửa ${s.full_name || 'học sinh'}`}>
        <Icon name="edit" />
      </button>
    </div>
  )
})

/** Khung viền mỏng của một nhóm: tiêu đề + các dòng học sinh. onBack: đang xem riêng một nhóm; onOpen: mở riêng nhóm này. */
function GroupFrame(
  /** @type {{ block: any, list: any[], data: any, onEditStudent: (s: any) => void, onEditGroup: (g: { name: string, note: string }) => void, onOpen?: () => void, onBack?: () => void }} */
  { block, list, data, onEditStudent, onEditGroup, onOpen, onBack }
) {
  return (
    <div className="group-frame">
      <div className="group-head">
        <h2 className="group-detail-title">
          <span className="group-card-icon">
            <Icon name={block.key === NONE ? 'inbox' : 'users'} size={18} />
          </span>
          <span>{block.title}</span>
          <span className="group-badge-count">{list.length} em</span>
        </h2>
        <div className="row">
          {onBack && (
            <button type="button" className="btn btn-small btn-ghost" onClick={onBack}>
              ← Về tất cả nhóm
            </button>
          )}
          {onOpen && (
            <button type="button" className="btn btn-small btn-ghost" onClick={onOpen} title="Xem riêng nhóm này">
              Vào nhóm →
            </button>
          )}
          {block.name && (
            <button type="button" className="btn btn-small btn-ghost" onClick={() => onEditGroup({ name: block.name, note: block.note })} title="Sửa nhóm">
              <Icon name="edit" size={14} /> Sửa
            </button>
          )}
        </div>
      </div>
      {block.note && <p className="group-note">{block.note}</p>}
      {list.length === 0 ? (
        <p className="muted small">Chưa có học sinh nào trong nhóm này.</p>
      ) : (
        <div className="student-rows">
          {list.map((s) => (
            <StudentRow key={s.id} s={s} data={data} onEdit={onEditStudent} />
          ))}
        </div>
      )}
    </div>
  )
}
