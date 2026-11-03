import { useAsync } from '../lib/useAsync.js'
import { fetchStudents } from '../lib/students.js'
import { buildGroups, groupLabel } from '../lib/studentGroups.js'
import Loading from './Loading.jsx'
import ErrorBox from './ErrorBox.jsx'

// Chọn học sinh nhận bài. Nhóm chỉ là nút chọn nhanh, bài vẫn giao theo từng em.
export default function StudentPicker({ value, onChange }) {
  const { data: students, loading, error, reload } = useAsync(fetchStudents, [])
  const selected = new Set(value)

  if (loading) return <Loading text="Đang tải học sinh..." />
  if (error) return <ErrorBox message={error} onRetry={reload} />
  if (!students.length)
    return <p className="muted">Chưa có học sinh nào. Hãy tạo tài khoản học sinh trong Supabase (xem README).</p>

  function toggle(id) {
    const next = new Set(selected)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    onChange([...next])
  }

  function toggleGroup(g) {
    const ids = students.filter((s) => s.group_name === g).map((s) => s.id)
    const allIn = ids.every((id) => selected.has(id))
    const next = new Set(selected)
    ids.forEach((id) => (allIn ? next.delete(id) : next.add(id)))
    onChange([...next])
  }

  // Nhóm thật từ dữ liệu; nhóm rỗng không có ai để chọn nên bỏ qua
  const groupsPresent = buildGroups(students, []).groups.map((g) => g.name)

  return (
    <div>
      <div className="chips" style={{ marginBottom: '0.5rem' }}>
        {groupsPresent.map((g) => {
          const ids = students.filter((s) => s.group_name === g).map((s) => s.id)
          const allIn = ids.every((id) => selected.has(id))
          return (
            <button key={g} type="button" className={allIn ? 'chip active' : 'chip'} onClick={() => toggleGroup(g)}>
              {groupLabel(g)}
            </button>
          )
        })}
        <button type="button" className="chip" onClick={() => onChange(students.map((s) => s.id))}>
          Chọn tất cả
        </button>
        <button type="button" className="chip" onClick={() => onChange([])}>
          Bỏ chọn
        </button>
      </div>
      {students.map((s) => (
        <label key={s.id} className="check">
          <input type="checkbox" checked={selected.has(s.id)} onChange={() => toggle(s.id)} />
          <span>
            {s.full_name || '(chưa đặt tên)'}{' '}
            <span className="muted small">
              {s.group_name ? `· ${groupLabel(s.group_name)}` : '· chưa có nhóm'}
              {s.grade ? ` · Lớp ${s.grade}` : ''}
            </span>
          </span>
        </label>
      ))}
      <p className="muted small" style={{ margin: '0.25rem 0 0' }}>
        Đã chọn {selected.size}/{students.length} học sinh.
      </p>
    </div>
  )
}
