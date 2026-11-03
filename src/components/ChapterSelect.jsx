// @ts-nocheck — nợ kiểu: xóa dòng này rồi chạy npm run typecheck để sửa
import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import TreePicker, { chapterNodes } from './TreePicker.jsx'

// Ô chọn chủ đề dạng cây Lớp › Môn › Chương › Chủ đề. value = chapter_id hoặc ''.
// extraTop: lựa chọn thêm ở đầu danh sách, vd. [{ value: 'new', label: '+ Tạo chủ đề mới…' }]
export default function ChapterSelect({ chapters, value, onChange, label = 'Chủ đề', extraTop = [], hint, defaultOpen }) {
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
      top={[{ value: '', label: '— Chưa xếp chủ đề —' }, ...extraTop]}
      placeholder="— Chưa xếp chủ đề —"
      searchPlaceholder="Tìm chủ đề, chương…"
      hint={hint}
      defaultOpen={defaultOpen}
    />
  )
}
