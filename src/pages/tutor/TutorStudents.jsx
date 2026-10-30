import { useState } from 'react'
import { useRemembered } from '../../lib/navMemory.js'
import { Link } from 'react-router-dom'
import { supabase, unwrap } from '../../lib/supabase.js'
import { fetchStudentStats } from '../../lib/studentReport.js'
import { viNum } from '../../lib/exam.js'
import { useAsync } from '../../lib/useAsync.js'
import { errMsg } from '../../lib/errors.js'
import { fetchStudents, GROUPS } from '../../lib/students.js'
import Loading from '../../components/Loading.jsx'
import ErrorBox from '../../components/ErrorBox.jsx'
import Icon from '../../components/Icon.jsx'

export default function TutorStudents() {
  const [group, setGroup] = useRemembered('tutor-students-group', 'all', (v) => v === 'all' || GROUPS.includes(v))
  const [editing, setEditing] = useState(null) // học sinh đang sửa

  const { data, loading, error, reload } = useAsync(async () => {
    const [students, stats] = await Promise.all([fetchStudents(), fetchStudentStats()])
    return { students, stats }
  }, [])

  const students = data?.students || []
  const shown = group === 'all' ? students : students.filter((s) => s.group_name === group)

  return (
    <div>
      <div className="page-head">
        <h1>
          <span className="title-icon"><Icon name="users" /></span>Học sinh {data && <span className="muted small">({students.length})</span>}</h1>
      </div>

      <div className="chips" style={{ marginBottom: '1rem' }}>
        <button type="button" className={group === 'all' ? 'chip active' : 'chip'} onClick={() => setGroup('all')}>
          Tất cả
        </button>
        {GROUPS.map((g) => (
          <button key={g} type="button" className={group === g ? 'chip active' : 'chip'} onClick={() => setGroup(g)}>
            Nhóm {g}
          </button>
        ))}
      </div>

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
      {!loading && !error && students.length > 0 && shown.length === 0 && <div className="empty">Nhóm {group} chưa có học sinh.</div>}

      {!loading && !error && shown.length > 0 && (
        <div className="card table-wrap">
          <table className="table table-cards">
            <thead>
              <tr>
                <th>Tên</th>
                <th>Nhóm</th>
                <th>Lớp</th>
                <th>Môn</th>
                <th>Bài giảng</th>
                <th>Bài tập đã nộp</th>
                <th>Chưa nộp</th>
                <th>Chờ chấm</th>
                <th>Điểm TB</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {shown.map((s) => {
                const st = data.stats[s.id] || { lessons: 0, total: 0, todo: 0, overdue: 0, done: 0, checked: 0, avg: null }
                return (
                  <tr key={s.id}>
                    <td>
                      <Link to={`/tutor/students/${s.id}`} className="student-link">
                        <strong>{s.full_name || '(chưa đặt tên)'}</strong>
                      </Link>
                    </td>
                    <td data-label="Nhóm">{s.group_name || '—'}</td>
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
                    <td>
                      <div className="row" style={{ flexWrap: 'nowrap', gap: '0.4rem' }}>
                        <Link to={`/tutor/students/${s.id}`} className="btn btn-small">
                          <Icon name="open" />
                          Xem
                        </Link>
                        <button type="button" className="btn btn-small" onClick={() => setEditing(s)}>
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
      )}
    </div>
  )
}

// Sửa tên, nhóm, lớp, môn của học sinh
export function EditStudent({ student, onCancel, onSaved }) {
  const [form, setForm] = useState({
    full_name: student.full_name || '',
    group_name: student.group_name || '',
    grade: student.grade ? String(student.grade) : '',
    subjects: (student.subjects || []).join(', '),
  })
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
            group_name: form.group_name || null,
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
          <select value={form.group_name} onChange={set('group_name')}>
            <option value="">— chưa có —</option>
            {GROUPS.map((g) => (
              <option key={g} value={g}>
                Nhóm {g}
              </option>
            ))}
          </select>
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
