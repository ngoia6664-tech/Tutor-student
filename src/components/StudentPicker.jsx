import { useDeferredValue, useMemo, useState } from 'react'
import { useAsync } from '../lib/useAsync.js'
import { fetchStudents } from '../lib/students.js'
import { buildGroups, groupLabel } from '../lib/studentGroups.js'
import { matchTitle } from '../lib/format.js'
import Loading from './Loading.jsx'
import ErrorBox from './ErrorBox.jsx'
import Icon from './Icon.jsx'
import CustomSelect from './CustomSelect.jsx'

// Chọn học sinh nhận bài. Nhóm chỉ là nút chọn nhanh, bài vẫn giao theo từng em.
// onlyIds: chỉ hiện các em này (vd. Báo bài trong khóa: chỉ học sinh có khóa); emptyText: câu khi không có ai
/** @param {{ value: string[], onChange: (ids: string[]) => void, onlyIds?: string[], emptyText?: string }} props */
export default function StudentPicker({ value, onChange, onlyIds, emptyText }) {
  const { data: all, loading, error, reload } = useAsync(fetchStudents, [])
  const onlyKey = onlyIds ? onlyIds.join(',') : null
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const students = useMemo(() => (all && onlyIds ? all.filter((s) => onlyIds.includes(s.id)) : all), [all, onlyKey])
  const [q, setQ] = useState('')
  const deferredQ = useDeferredValue(q)
  const selected = new Set(value)

  const filtered = useMemo(() => {
    if (!students) return []
    const query = deferredQ.trim()
    if (!query) return students
    return students.filter(
      (s) =>
        matchTitle(s.full_name, query) ||
        matchTitle(s.group_name, query) ||
        (s.grade && String(s.grade).includes(query)) ||
        (s.subjects && s.subjects.some((sub) => matchTitle(sub, query)))
    )
  }, [students, deferredQ])

  if (loading) return <Loading text="Đang tải học sinh..." />
  if (error) return <ErrorBox message={error} onRetry={reload} />
  if (!students.length)
    return <p className="muted">{emptyText || 'Chưa có học sinh nào. Hãy tạo tài khoản học sinh trong Supabase (xem README).'}</p>

  function toggle(id) {
    const next = new Set(selected)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    onChange([...next])
  }

  function toggleGroup(g) {
    const ids = students.filter((s) => s.group_name === g).map((s) => s.id)
    const allIn = ids.length > 0 && ids.every((id) => selected.has(id))
    const next = new Set(selected)
    ids.forEach((id) => (allIn ? next.delete(id) : next.add(id)))
    onChange([...next])
  }

  function pickFiltered() {
    const next = new Set(selected)
    filtered.forEach((s) => next.add(s.id))
    onChange([...next])
  }

  // Nhóm thật từ dữ liệu; nhóm rỗng không có ai để chọn nên bỏ qua
  const groupsPresent = buildGroups(students, []).groups.map((g) => g.name)
  const groupPickerOptions = groupsPresent.map((g) => {
    const ids = students.filter((s) => s.group_name === g).map((s) => s.id)
    const allIn = ids.length > 0 && ids.every((id) => selected.has(id))
    return {
      value: g,
      label: `${allIn ? '✓ Đã chọn: ' : '+ Chọn nhóm: '}${groupLabel(g)}`,
      count: ids.length,
      icon: /** @type {import('./Icon.jsx').IconName} */ (allIn ? 'check' : 'users'),
    }
  })

  return (
    <div>
      <div className="row" style={{ flexWrap: 'wrap', gap: '0.45rem', marginBottom: '0.6rem', alignItems: 'center' }}>
        <button type="button" className="btn btn-small" onClick={() => onChange(students.map((s) => s.id))}>
          Chọn tất cả ({students.length})
        </button>
        <button type="button" className="btn btn-small btn-ghost" onClick={() => onChange([])}>
          Bỏ chọn
        </button>

        {groupsPresent.length > 0 && (
          <CustomSelect
            value=""
            onChange={(g) => g && toggleGroup(g)}
            options={groupPickerOptions}
            placeholder="Chọn nhanh theo nhóm..."
            icon="users"
            searchable={groupsPresent.length > 5}
            searchPlaceholder="Tìm nhóm..."
          />
        )}
      </div>

      <div style={{ position: 'relative', marginBottom: '0.5rem' }}>
        <input
          type="search"
          className="input"
          style={{ width: '100%', paddingLeft: '2.1rem' }}
          placeholder="Tìm học sinh theo tên, nhóm, lớp..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <span style={{ position: 'absolute', left: '0.7rem', top: '50%', transform: 'translateY(-50%)', opacity: 0.5, pointerEvents: 'none' }}>
          <Icon name="users" size={16} />
        </span>
      </div>

      {deferredQ.trim() && (
        <div className="row row-between small" style={{ marginBottom: '0.4rem' }}>
          <span className="muted">Tìm thấy {filtered.length}/{students.length} học sinh</span>
          {filtered.length > 0 && (
            <button type="button" className="btn btn-ghost btn-small" onClick={pickFiltered}>
              + Chọn {filtered.length} em này
            </button>
          )}
        </div>
      )}

      {filtered.length === 0 ? (
        <p className="muted small" style={{ padding: '0.5rem 0' }}>Không tìm thấy học sinh nào khớp &ldquo;{q}&rdquo;.</p>
      ) : (
        <div style={{ maxHeight: '240px', overflowY: 'auto', paddingRight: '0.25rem' }}>
          {filtered.map((s) => (
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
        </div>
      )}

      <p className="muted small" style={{ margin: '0.4rem 0 0' }}>
        Đã chọn <strong>{selected.size}</strong>/{students.length} học sinh.
      </p>
    </div>
  )
}
