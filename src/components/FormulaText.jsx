import { Fragment } from 'react'

// Chữ gấu nói (Mascot, SpaceExplorer): đoạn đặt trong `...` là công thức → tô nổi bật (<mark className="formula">, styles/mascot.css).
// shown = số ký tự đang hiện (gấu "viết phấn" dần), bỏ trống = hiện hết. Dấu ` không hiện, không tính vào số ký tự.
export const plainText = (text) => text.replaceAll('`', '')

export default function FormulaText({ text, shown = Infinity }) {
  let left = shown
  return text.split('`').map((part, i) => {
    if (!part || left <= 0) return null
    const s = part.slice(0, left)
    left -= part.length
    return i % 2 ? (
      <mark key={i} className="formula">
        {s}
      </mark>
    ) : (
      <Fragment key={i}>{s}</Fragment>
    )
  })
}
