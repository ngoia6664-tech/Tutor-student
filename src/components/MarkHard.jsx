import { useState } from 'react'
import { setMark } from '../lib/marks.js'
import { errMsg } from '../lib/errors.js'
import Icon from './Icon.jsx'
import { askConfirm } from '../lib/dialog.js'

/**
 * Nút "Câu khó" cho một câu (đặt trong .question-label, trước nút Báo lỗi đề).
 * Đánh dấu thì câu vào mục "Câu khó" ở trang Ôn tập; chỉ mất khi bấm "Bỏ đánh dấu".
 * - marked: trạng thái ban đầu; onChange(on): báo cho trang cha (vd. ẩn câu khỏi danh sách)
 */
export default function MarkHard({ exerciseId, studentId, marked: initial = false, hasNote = false, onChange }) {
  const [marked, setMarked] = useState(initial)
  const [busy, setBusy] = useState(false)

  async function toggle() {
    const next = !marked
    // Bỏ đánh dấu là xóa luôn ghi chú: có ghi chú thì hỏi lại
    if (!next && hasNote) {
      const ok = await askConfirm({
        title: 'Bỏ đánh dấu câu khó?',
        say: 'Câu này đang có ghi chú của bạn. Bỏ đánh dấu thì ghi chú cũng mất luôn đó nha!',
        scene: 'delete',
        confirmText: 'Bỏ đánh dấu',
        cancelText: 'Giữ lại',
        danger: true,
      })
      if (!ok) return
    }
    setBusy(true)
    try {
      await setMark(exerciseId, studentId, next)
      setMarked(next)
      onChange?.(next)
    } catch (e) {
      window.alert(errMsg(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <button
      type="button"
      className={marked ? 'btn btn-small btn-ghost mh-btn is-marked' : 'btn btn-small btn-ghost mh-btn'}
      onClick={toggle}
      disabled={busy}
      aria-pressed={marked}
      title={marked ? 'Câu này đang ở mục Câu khó (trang Ôn tập)' : 'Lưu câu này vào mục Câu khó để làm lại sau'}
    >
      <Icon name="star" size={15} />
      {marked ? 'Bỏ đánh dấu' : 'Câu khó'}
    </button>
  )
}
