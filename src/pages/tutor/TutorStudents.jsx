import { useDeferredValue, useMemo, useState } from 'react'
import { useRemembered } from '../../lib/navMemory.js'
import { Link } from 'react-router-dom'
import { supabase, unwrap } from '../../lib/supabase.js'
import { fetchStudentStats } from '../../lib/studentReport.js'
import { viNum } from '../../lib/exam.js'
import { useAsync } from '../../lib/useAsync.js'
import { errMsg } from '../../lib/errors.js'
import { fetchGroupRows, fetchStudents, renameGroup, saveGroupNote } from '../../lib/students.js'
import { buildGroups, groupLabel } from '../../lib/studentGroups.js'
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
  const [viewMode, setViewMode] = useRemembered('tutor-students-view', 'cards', (v) => v === 'cards' || v === 'table')

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
        return { ...b, matchingList: matching }
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

            {/* Chuyển đổi giữa 2 chế độ: Dạng Thẻ (Cards) vs Dạng Bảng (Table) */}
            <div className="chips" role="group" aria-label="Chế độ hiển thị" style={{ margin: 0 }}>
              <button
                type="button"
                className={`chip${viewMode === 'cards' ? ' active' : ''}`}
                onClick={() => setViewMode('cards')}
                title="Xem dạng thẻ trực quan"
              >
                <Icon name="grid" size={14} /> Dạng thẻ ({filteredStudents.length})
              </button>
              <button
                type="button"
                className={`chip${viewMode === 'table' ? ' active' : ''}`}
                onClick={() => setViewMode('table')}
                title="Xem dạng bảng tóm tắt"
              >
                <Icon name="table" size={14} /> Dạng bảng
              </button>
            </div>

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
          CHẾ ĐỘ HIỂN THỊ: DẠNG THẺ (CARDS) HOẶC DẠNG BẢNG (TABLE)
          ======================================================== */}
      {!loading && !error && data && filteredStudents.length > 0 && (
        <section className="group-block">
          {detail && (
            <div className="group-head">
              <h2 className="group-detail-title">
                <span className="group-card-icon">
                  <Icon name={detail.key === NONE ? 'inbox' : 'users'} size={22} />
                </span>
                {detail.title} <span className="muted small">{detail.list.length} em</span>
              </h2>
              <div className="row">
                <button type="button" className="btn btn-small btn-ghost" onClick={() => setGroup('all')}>
                  ← Về tất cả nhóm
                </button>
                {detail.name && (
                  <button type="button" className="btn btn-small" onClick={() => setEditGroup({ name: detail.name, note: detail.note })}>
                    <Icon name="edit" />
                    Sửa nhóm
                  </button>
                )}
              </div>
            </div>
          )}

          {detail?.note && <p className="group-note">{detail.note}</p>}

          {viewMode === 'table' ? (
            <StudentTable list={filteredStudents} data={data} onEdit={setEditing} />
          ) : (
            <div className="student-grid">
              {filteredStudents.map((s) => {
                const st = data.stats[s.id] || { lessons: 0, total: 0, todo: 0, overdue: 0, done: 0, checked: 0, avg: null }
                const streak = data.streakById.get(s.id)
                return (
                  <div key={s.id} className="student-card">
                    <div>
                      <div className="student-card-head">
                        <div className="student-card-avatar">
                          {(s.full_name || '?').trim().charAt(0).toUpperCase()}
                        </div>
                        <div className="student-card-meta">
                          <Link to={`/tutor/students/${s.id}`} className="student-card-name" title={s.full_name}>
                            {s.full_name || '(chưa đặt tên)'}
                          </Link>
                          <div className="row small muted" style={{ gap: '0.35rem', marginTop: '0.2rem' }}>
                            <span>{s.group_name ? groupLabel(s.group_name) : 'Chưa xếp nhóm'}</span>
                            {s.grade && <span>· Lớp {s.grade}</span>}
                          </div>
                        </div>
                      </div>

                      <div className="student-card-stats">
                        <div className="student-card-stat-item">
                          <span className="muted">Điểm TB:</span>
                          <b>{st.avg === null ? '—' : viNum(st.avg)}</b>
                        </div>
                        <div className="student-card-stat-item">
                          <span className="muted">Đã nộp:</span>
                          <b>{st.done + st.checked}/{st.total}</b>
                        </div>
                        <div className="student-card-stat-item">
                          <span className="muted">Chờ chấm:</span>
                          <b style={st.done > 0 ? { color: 'var(--primary)' } : undefined}>{st.done}</b>
                        </div>
                        <div className="student-card-stat-item">
                          <span className="muted">Quá hạn:</span>
                          <b style={st.overdue > 0 ? { color: 'var(--danger)' } : undefined}>{st.overdue}</b>
                        </div>
                      </div>
                    </div>

                    <div className="row row-between" style={{ marginTop: 'auto', paddingTop: '0.5rem', borderTop: '1px solid var(--border)' }}>
                      <span className="small muted">
                        {streak !== undefined && streak > 0 ? `🔥 ${streak} ngày` : '—'}
                      </span>
                      <div className="row" style={{ gap: '0.35rem' }}>
                        <Link to={`/tutor/students/${s.id}`} className="btn btn-small">
                          <Icon name="open" /> Xem
                        </Link>
                        <button type="button" className="btn btn-small btn-ghost" onClick={() => setEditing(s)} title="Sửa thông tin">
                          <Icon name="edit" />
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>
      )}
    </div>
  )
}

/** Bảng học sinh (dạng rút gọn / bảng tổng hợp) */
function StudentTable({ list, data, onEdit }) {
  return (
    <div className="card table-wrap">
      <table className="table table-cards">
        <thead>
          <tr>
            <th>Học sinh</th>
            <th>Lớp</th>
            <th>Môn</th>
            <th>Bài giảng</th>
            <th>Đã nộp</th>
            <th>Chưa nộp</th>
            <th>Chờ chấm</th>
            <th>Điểm TB</th>
            <th>Chuỗi 🔥</th>
            <th>Thao tác</th>
          </tr>
        </thead>
        <tbody>
          {list.map((s) => {
            const st = data.stats[s.id] || { lessons: 0, total: 0, todo: 0, overdue: 0, done: 0, checked: 0, avg: null }
            const streak = data.streakById.get(s.id)
            return (
              <tr key={s.id}>
                <td>
                  <Link to={`/tutor/students/${s.id}`} className="student-link">
                    <span className="student-initial" style={{ width: '1.65rem', height: '1.65rem', fontSize: '0.78rem' }}>
                      {s.full_name?.trim()?.charAt(0) || '?'}
                    </span>
                    <strong>{s.full_name || '(chưa đặt tên)'}</strong>
                  </Link>
                  <div className="small muted">{s.group_name ? groupLabel(s.group_name) : 'Chưa xếp nhóm'}</div>
                </td>
                <td data-label="Lớp">{s.grade ? `Lớp ${s.grade}` : '—'}</td>
                <td data-label="Môn">{s.subjects?.length ? s.subjects.join(', ') : '—'}</td>
                <td data-label="Bài giảng">{st.lessons}</td>
                <td data-label="Đã nộp">
                  <strong>{st.done + st.checked}</strong>/{st.total}
                </td>
                <td data-label="Chưa nộp">
                  {st.todo + st.overdue}
                  {st.overdue > 0 && <span className="badge badge-danger" style={{ marginLeft: '0.35rem' }}>{st.overdue} quá hạn</span>}
                </td>
                <td data-label="Chờ chấm">
                  {st.done > 0 ? <span className="badge badge-primary">{st.done}</span> : 0}
                </td>
                <td data-label="Điểm TB">{st.avg === null ? '—' : <strong>{viNum(st.avg)}</strong>}</td>
                <td data-label="Chuỗi 🔥">{streak !== undefined && streak > 0 ? `${streak} ngày` : '—'}</td>
                <td>
                  <div className="row" style={{ flexWrap: 'nowrap', gap: '0.4rem' }}>
                    <Link to={`/tutor/students/${s.id}`} className="btn btn-small">
                      <Icon name="open" />
                      Xem
                    </Link>
                    <button type="button" className="btn btn-small btn-ghost" onClick={() => onEdit(s)} title="Sửa thông tin">
                      <Icon name="edit" />
                      Sửa
                    </button>
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
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
