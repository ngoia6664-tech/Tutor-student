import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import TreePicker, { chapterNodes } from './TreePicker.jsx'

// Ô chọn chương dạng cây Lớp › Môn › Chuyên đề › Chương. value = chapter_id hoặc ''.
// extraTop: lựa chọn thêm ở đầu danh sách, vd. [{ value: 'new', label: '+ Tạo chương mới…' }]
export default function ChapterSelect({ chapters, value, onChange, label = 'Chương', extraTop = [], hint }) {
  const nodes = useMemo(() => chapterNodes(chapters || []), [chapters])
  return (
    <TreePicker
      label={label}
      labelExtra={
        <Link to="/tutor/library" className="small" style={{ fontWeight: 400 }}>
          (mở Thư viện)
        </Link>
      }
      nodes={nodes}
      value={value || ''}
      onChange={onChange}
      top={[{ value: '', label: '— Chưa xếp chương —' }, ...extraTop]}
      placeholder="— Chưa xếp chương —"
      searchPlaceholder="Tìm chương, chuyên đề…"
      hint={hint}
    />
  )
}
