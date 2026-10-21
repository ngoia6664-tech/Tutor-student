import { useMemo } from 'react'
import TreePicker, { lessonNodes } from './TreePicker.jsx'

// Ô chọn bài giảng dạng cây Lớp › Môn › Chuyên đề › Chương › Bài giảng.
// lessons cần có chapter_id; value = lesson_id hoặc ''.
export default function LessonSelect({ lessons, chapters, value, onChange, label = 'Bài giảng liên quan (không bắt buộc)', emptyLabel = '— Không liên kết —', disabled, hint }) {
  const nodes = useMemo(() => lessonNodes(lessons || [], chapters || []), [lessons, chapters])
  return (
    <TreePicker
      label={label}
      nodes={nodes}
      value={value || ''}
      onChange={onChange}
      top={[{ value: '', label: emptyLabel }]}
      placeholder={emptyLabel}
      searchPlaceholder="Tìm bài giảng…"
      disabled={disabled}
      hint={hint}
    />
  )
}
