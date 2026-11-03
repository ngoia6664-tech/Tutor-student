import { useState } from 'react'
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
import Loading from '../../components/Loading.jsx'
import ErrorBox from '../../components/ErrorBox.jsx'
import Icon from '../../components/Icon.jsx'

const NONE = '__none' // khóa nhóm "Chưa xếp nhóm" (tên nhóm thật không bắt đầu bằng __)
const PAGE_SIZE = 6 // số khối nhóm mỗi trang
const PREVIEW = 2 // số học sinh hiện đầu mỗi khối; nhiều hơn thì ghi "+N em nữa"

export default function TutorStudents() {
  const [group, setGroup] = useRemembered('tutor-students-group', 'all', (v) => typeof v === 'string')
  const [editing, setEditing] = useState(null) // học sinh đang sửa
  const [editGroup, setEditGroup] = useState(/** @type {{ name: string, note: string } | null} */ (null)) // nhóm đang sửa; name rỗng = tạo mới
  const [page, setPage] = useState(0) // trang của lưới khối nhóm

  const { data, loading, error, reload } = useAsync(async () => {
    const [students, stats, streaks, rows] = await Promise.all([
      fetchStudents(),
      fetchStudentStats(),
      fetchStreaks().catch(() => []), // chưa chạy schema.sql / lỗi mạng: cột chuỗi hiện "—", không chặn danh sách
      fetchGroupRows().catch(() => []), // chưa chạy schema.sql: vẫn gom theo tên nhóm trong hồ sơ
    ])
    return { students, stats, streakById: new Map(streaks.map((r) => [r.student_id, r.current_streak])), ...buildGroups(students, rows) }
  }, [])

  const students = data?.students || []
  const blocks = (data?.groups || []).map((g) => ({ key: g.name, title: groupLabel(g.name), note: g.note, name: g.name, list: g.students }))
  if (data?.ungrouped.length) blocks.push({ key: NONE, title: 'Chưa xếp nhóm', note: '', name: '', list: data.ungrouped })
  const detail = group === 'all' ? null : blocks.find((b) => b.key === group) // nhóm đang mở xem chi tiết
  const pages = Math.max(1, Math.ceil(blocks.length / PAGE_SIZE))
  const cur = Math.min(page, pages - 1)
  const pageBlocks = blocks.slice(cur * PAGE_SIZE, (cur + 1) * PAGE_SIZE)

  return (
    <div>
      <div className="page-head">
        <h1>
          <span className="title-icon"><Icon name="users" /></span>Học sinh {data && <span className="muted small">({students.length})</span>}</h1>
        {data && <StreakBackupButtons students={students} onRestored={reload} />}
      </div>

      {data && (
        <div className="row" style={{ marginBottom: '1rem' }}>
          {group !== 'all' && (
            <button type="button" className="btn btn-small" onClick={() => setGroup('all')}>
              <Icon name="left" />
              Tất cả nhóm
            </button>
          )}
          <button type="button" className="btn btn-small" onClick={() => setEditGroup({ name: '', note: '' })}>
            <Icon name="plus" />
            Nhóm mới
          </button>
        </div>
      )}

      {data && blocks.length > 1 && (
        <div className="chips group-chips" role="group" aria-label="Lọc theo nhóm">
          {[{ key: 'all', title: 'Tất cả học sinh', list: students }, ...blocks].map((b) => (
            <button key={b.key} type="button" className={`chip${group === b.key ? ' active' : ''}`} aria-pressed={group === b.key} onClick={() => setGroup(b.key)}>
              {b.title} ({b.list.length})
            </button>
          ))}
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
      {!loading && !error && data && group !== 'all' && !detail && <div className="empty">Nhóm này không còn.</div>}

      {/* Tổng quan: lưới khối nhóm, bấm một khối để xem học sinh của nhóm */}
      {!loading && !error && data && group === 'all' && blocks.length > 0 && (
        <>
          <div className="group-grid">
            {pageBlocks.map((b) => (
              <button key={b.key} type="button" className="group-card" onClick={() => setGroup(b.key)}>
                <span className="group-card-icon">
                  <Icon name={b.key === NONE ? 'inbox' : 'users'} size={22} />
                </span>
                <strong className="group-card-title">{b.title}</strong>
                <span className="group-card-count">{b.list.length} em</span>
                {b.note && <span className="group-card-note">{b.note}</span>}
                <span className="group-card-names">
                  {b.list.length === 0 && <span className="muted">Chưa có học sinh</span>}
                  {b.list.slice(0, PREVIEW).map((s) => (
                    <span key={s.id}>{s.full_name || '(chưa đặt tên)'}</span>
                  ))}
                  {b.list.length > PREVIEW && <span className="muted">+{b.list.length - PREVIEW} em nữa</span>}
                </span>
              </button>
            ))}
          </div>
          {pages > 1 && (
            <nav className="group-pager" aria-label="Phân trang nhóm">
              <button type="button" className="btn btn-small" disabled={cur === 0} onClick={() => setPage(cur - 1)}>
                <Icon name="left" />
                Trước
              </button>
              <span className="muted small">
                Trang {cur + 1}/{pages}
              </span>
              <button type="button" className="btn btn-small" disabled={cur >= pages - 1} onClick={() => setPage(cur + 1)}>
                Sau
                <Icon name="right" />
              </button>
            </nav>
          )}
        </>
      )}

      {/* Chi tiết một nhóm */}
      {!loading && !error && data && detail && (
        <section className="group-block">
          <div className="group-head">
            <h2 className="group-detail-title">
              <span className="group-card-icon">
                <Icon name={detail.key === NONE ? 'inbox' : 'users'} size={22} />
              </span>
              {detail.title} <span className="muted small">{detail.list.length} em</span>
            </h2>
            {detail.name && (
              <button type="button" className="btn btn-small" onClick={() => setEditGroup({ name: detail.name, note: detail.note })}>
                <Icon name="edit" />
                Sửa nhóm
              </button>
            )}
          </div>
          {detail.note && <p className="group-note">{detail.note}</p>}
          {detail.list.length === 0 && <div className="empty">Nhóm chưa có học sinh.</div>}
          {detail.list.length > 0 && <StudentTable list={detail.list} data={data} onEdit={setEditing} />}
        </section>
      )}
    </div>
  )
}

/** Bảng học sinh của một nhóm */
function StudentTable({ list, data, onEdit }) {
  return (
    <div className="card table-wrap">
      <table className="table table-cards">
        <thead>
          <tr>
            <th>Tên</th>
            <th>Lớp</th>
            <th>Môn</th>
            <th>Bài giảng</th>
            <th>Bài tập đã nộp</th>
            <th>Chưa nộp</th>
            <th>Chờ chấm</th>
            <th>Điểm TB</th>
            <th>Chuỗi 🔥</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {list.map((s) => {
            const st = data.stats[s.id] || { lessons: 0, total: 0, todo: 0, overdue: 0, done: 0, checked: 0, avg: null }
            return (
              <tr key={s.id}>
                <td>
                  <Link to={`/tutor/students/${s.id}`} className="student-link">
                    <strong>{s.full_name || '(chưa đặt tên)'}</strong>
                  </Link>
                </td>
                <td data-label="Lớp">{s.grade || '—'}</td>
                <td data-label="Môn">{s.subjects?.length ? s.subjects.join(', ') : '—'}</td>
                <td data-label="Bài giảng">{st.lessons}</td>
                <td data-label="Bài tập đã nộp">
                  {st.done + st.checked}/{st.total}
                </td>
                <td data-label="Chưa nộp">
                  {st.todo + st.overdue}
                  {st.overdue > 0 && <span className="badge badge-danger" style={{ marginLeft: '0.35rem' }}>{st.overdue} quá hạn</span>}
                </td>
                <td data-label="Chờ chấm">{st.done ? <span className="badge badge-primary">{st.done}</span> : 0}</td>
                <td data-label="Điểm TB">{st.avg === null ? '—' : <strong>{viNum(st.avg)}</strong>}</td>
                <td data-label="Chuỗi 🔥">{data.streakById.has(s.id) ? `${data.streakById.get(s.id)} ngày` : '—'}</td>
                <td>
                  <div className="row" style={{ flexWrap: 'nowrap', gap: '0.4rem' }}>
                    <Link to={`/tutor/students/${s.id}`} className="btn btn-small">
                      <Icon name="open" />
                      Xem
                    </Link>
                    <button type="button" className="btn btn-small" onClick={() => onEdit(s)}>
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

/** Tạo nhóm mới (name rỗng) hoặc đổi tên / sửa ghi chú một nhóm
 * @param {{ group: { name: string, note: string }, onCancel: () => void, onSaved: () => void }} props */
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

// Sửa tên, nhóm, lớp, môn của học sinh
// Sao lưu / khôi phục chuỗi 🔥 của mọi học sinh ra file JSON (tạm thời, xem lib/streakBackup.js): tải về trước khi đổi CSDL
/** @param {{ students: { id: string, full_name?: string | null }[], onRestored: () => void }} props */
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
    e.target.value = '' // chọn lại cùng file vẫn kích hoạt
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
