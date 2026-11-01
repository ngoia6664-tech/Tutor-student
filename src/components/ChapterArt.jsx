import { memo } from 'react'
import { subjectLabel } from '../lib/chapters.js'

// Đầu thẻ chương (ChapterCarousel): chip tên môn bên trái, số chương nhỏ ở góc phải.
// Tiêu đề + số bài mới là phần nổi bật, đầu thẻ chỉ để định vị. Màu theo môn: biến --hue ở thẻ cha (library.css).

/** @param {{ num: string, subject?: string | null }} props */
function ChapterArt({ num, subject }) {
  return (
    <div className="ccar-cover" aria-hidden="true">
      <span className="subject-chip">{subjectLabel(subject)}</span>
      <span className="ccar-num">Chương {num}</span>
    </div>
  )
}

export default memo(ChapterArt)
