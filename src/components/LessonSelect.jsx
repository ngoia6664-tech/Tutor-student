// @ts-nocheck — nợ kiểu: xóa dòng này rồi chạy npm run typecheck để sửa
import { useMemo } from 'react'
import TreePicker, { lessonNodes } from './TreePicker.jsx'

// Ô chọn bài giảng dạng cây Lớp › Môn › Chuyên đề › Chương › Bài giảng.
// lessons cần có chapter_id; value = lesson_id hoặc ''.
// focusChapterId: chương đang chọn cho bài → mở sẵn nhánh chương đó khi bấm chọn.
export default function LessonSelect({ lessons, chapters, value, onChange, label = 'Bài giảng liên quan (không bắt buộc)', emptyLabel = '— Không liên kết —', disabled, hint, focusChapterId }) {
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
      focusKey={focusChapterId ? `ch:${focusChapterId}` : undefined}
      clearLabel="Xóa liên kết"
      disabled={disabled}
      hint={hint}
    />
  )
}
