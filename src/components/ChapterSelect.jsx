import { Link } from 'react-router-dom'
import { groupBySection } from '../lib/chapters.js'

// Ô chọn chương (chia nhóm theo chuyên đề). value = chapter_id hoặc ''.
export default function ChapterSelect({ chapters, value, onChange, label = 'Chương', extraOptions = null }) {
  const groups = groupBySection(chapters || [])
  return (
    <label className="field">
      <span>
        {label}{' '}
        <Link to="/tutor/chapters" className="small" style={{ fontWeight: 400 }}>
          (quản lý chương)
        </Link>
      </span>
      <select value={value || ''} onChange={(e) => onChange(e.target.value)}>
        <option value="">— Chưa xếp chương —</option>
        {extraOptions}
        {groups.map((g) => (
          <optgroup key={g.key} label={g.label}>
            {g.chapters.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
    </label>
  )
}
