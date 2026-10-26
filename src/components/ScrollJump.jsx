import { useEffect, useState } from 'react'
import { prefersReducedMotion } from '../lib/settings.js'

const GAP = 300 // cách đầu / cuối trang bao nhiêu px thì hiện mũi tên tương ứng

// Hai mũi tên nổi cạnh phải giữa màn hình: lên đầu trang / xuống cuối trang.
// Chỉ hiện khi đã cuộn vào giữa trang dài (đang ở đầu trang thì ẩn cả hai). Có trong Layout → mọi trang.
export default function ScrollJump() {
  const [pos, setPos] = useState({ up: false, down: false })

  useEffect(() => {
    let frame = 0
    const check = () => {
      frame = 0
      const y = window.scrollY
      const left = document.documentElement.scrollHeight - window.innerHeight - y
      const up = y > GAP
      const down = up && left > GAP
      setPos((p) => (p.up === up && p.down === down ? p : { up, down }))
    }
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(check)
    }
    check()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [])

  if (!pos.up && !pos.down) return null
  const go = (top) => window.scrollTo({ top, behavior: prefersReducedMotion() ? 'auto' : 'smooth' })

  return (
    <div className="scroll-jump">
      {pos.up && (
        <button type="button" onClick={() => go(0)} aria-label="Lên đầu trang" title="Lên đầu trang">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M6 15l6-6 6 6" />
          </svg>
        </button>
      )}
      {pos.down && (
        <button type="button" onClick={() => go(document.documentElement.scrollHeight)} aria-label="Xuống cuối trang" title="Xuống cuối trang">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M6 9l6 6 6-6" />
          </svg>
        </button>
      )}
    </div>
  )
}
