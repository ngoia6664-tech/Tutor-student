import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { chapterUrl } from '../lib/chapters.js'
import { splitTitle, subjectKind } from '../lib/chapterArt.js'
import { useRemembered } from '../lib/navMemory.js'
import ChapterArt from './ChapterArt.jsx'
import Icon from './Icon.jsx'

// Chương của một chuyên đề dạng băng chuyền (Thư viện gia sư + học sinh): chương đang chọn to ở giữa, hai bên nhỏ và mờ.
// Vuốt / mũi tên / phím ← → để lướt; "Tất cả chương" mở lưới để nhảy thẳng, khỏi lướt từng chương.
// Bấm chương bên cạnh: máy tính mở luôn, điện thoại chỉ đưa ra giữa (tránh mở nhầm khi đang vuốt).
// Vị trí nhớ trong phiên theo chuyên đề: mở chương rồi quay lại vẫn đứng đúng chương đó.

// Thẻ đang chọn nghiêng theo chuột, lớp ánh kim loại (foil) trượt theo: chỉ ghi biến CSS (--tx/--ty từ -1 đến 1, --gx/--gy %),
// phần vẽ ở library.css. Chỉ chuột thật; bật "giảm chuyển động" thì không nghiêng.
/** @param {import('react').PointerEvent<HTMLElement>} e */
function tilt(e) {
  if (e.pointerType !== 'mouse' || matchMedia('(prefers-reduced-motion: reduce)').matches) return
  const el = e.currentTarget
  const r = el.getBoundingClientRect()
  const x = (e.clientX - r.left) / r.width
  const y = (e.clientY - r.top) / r.height
  el.dataset.tilt = ''
  el.style.setProperty('--tx', ((x - 0.5) * 2).toFixed(3))
  el.style.setProperty('--ty', ((y - 0.5) * 2).toFixed(3))
  el.style.setProperty('--gx', `${(x * 100).toFixed(1)}%`)
  el.style.setProperty('--gy', `${(y * 100).toFixed(1)}%`)
}
/** @param {import('react').PointerEvent<HTMLElement>} e */
function untilt(e) {
  const el = e.currentTarget
  delete el.dataset.tilt
  for (const k of ['--tx', '--ty', '--gx', '--gy']) el.style.removeProperty(k)
}

const finePointer = () => matchMedia('(hover: hover) and (pointer: fine)').matches
/** @returns {ScrollBehavior} */
const smooth = () => (matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth')

/**
 * @param {{
 *   chapters: { id: string, title: string, subject?: string | null, lessons?: unknown, assignments?: unknown }[],
 *   memoKey: string,
 *   count: (v: unknown) => number,
 *   onEdit?: (c: any) => void,
 *   onDelete?: (c: any) => void,
 *   toUrl?: (id: string) => string,
 *   actions?: (c: any) => import('react').ReactNode,
 * }} props
 * toUrl: link mở chương (mặc định chapterUrl của gia sư); actions: nút thay cho Sửa / Xóa (học sinh)
 */
export default function ChapterCarousel({ chapters, memoKey, count, onEdit, onDelete, toUrl = chapterUrl, actions }) {
  const navigate = useNavigate()
  const trackRef = useRef(/** @type {HTMLDivElement | null} */ (null))
  const frame = useRef(0)
  const [saved, setSaved] = useRemembered(`ccar:${memoKey}`, 0, (/** @type {unknown} */ v) => Number.isInteger(v))
  const index = Math.max(0, Math.min(saved, chapters.length - 1))
  const [gridOpen, setGridOpen] = useState(false)

  // Chỉ cuộn; chương ở giữa do onScroll tính (số đếm chạy theo khi lướt qua)
  /** @param {number} i @param {ScrollBehavior} [behavior] */
  const go = (i, behavior = smooth()) => {
    const track = trackRef.current
    const card = track?.children[i]
    if (!track || !(card instanceof HTMLElement)) return
    track.scrollTo({ left: card.offsetLeft - (track.clientWidth - card.offsetWidth) / 2, behavior })
  }

  const onScroll = () => {
    if (frame.current) return
    frame.current = requestAnimationFrame(() => {
      frame.current = 0
      const track = trackRef.current
      if (!track) return
      const mid = track.scrollLeft + track.clientWidth / 2
      let best = 0
      let dist = Infinity
      Array.from(track.children).forEach((el, i) => {
        if (!(el instanceof HTMLElement)) return
        const d = Math.abs(el.offsetLeft + el.offsetWidth / 2 - mid)
        if (d < dist) [dist, best] = [d, i]
      })
      setSaved(best)
    })
  }

  // Mở trang: đứng ngay chương nhớ lần trước, không trượt
  useLayoutEffect(() => {
    go(index, 'auto')
  }, [])
  useEffect(() => () => cancelAnimationFrame(frame.current), [])

  /** @param {import('react').KeyboardEvent} e */
  const onKey = (e) => {
    if (e.key === 'ArrowLeft' && index > 0) go(index - 1)
    else if (e.key === 'ArrowRight' && index < chapters.length - 1) go(index + 1)
    else return
    e.preventDefault()
  }

  return (
    <div className="ccar">
      <div
        className="ccar-track"
        ref={trackRef}
        onScroll={onScroll}
        onKeyDown={onKey}
        tabIndex={0}
        aria-label="Các chương. Dùng phím mũi tên trái, phải để chuyển chương"
      >
        {chapters.map((c, i) => {
          const { num, name } = splitTitle(c.title, i)
          const center = i === index
          return (
            <article
              key={c.id}
              className={`ccar-card is-${subjectKind(c.subject)}${center ? ' is-center' : ''}`}
              aria-current={center ? 'true' : undefined}
              onPointerMove={center ? tilt : undefined}
              onPointerLeave={center ? untilt : undefined}
            >
              <div className="ccar-face">
                <ChapterArt subject={c.subject} num={num} />
                <Link className="ccar-title" to={toUrl(c.id)} tabIndex={center ? undefined : -1}>
                  {name}
                </Link>
                <div className="ccar-stats">
                  <span>
                    <Icon name="lesson" size={17} />
                    <b>{count(c.lessons)}</b> bài giảng
                  </span>
                  <span>
                    <Icon name="assignment" size={17} />
                    <b>{count(c.assignments)}</b> bài tập
                  </span>
                </div>
                <div className="row ccar-actions" inert={!center}>
                  <Link className="btn btn-small btn-primary" to={toUrl(c.id)}>
                    <Icon name="open" />
                    Mở
                  </Link>
                  {actions ? (
                    actions(c)
                  ) : (
                    <>
                      <button type="button" className="btn btn-small" onClick={() => onEdit?.(c)}>
                        <Icon name="edit" />
                        Sửa
                      </button>
                      <button type="button" className="btn btn-small btn-danger" onClick={() => onDelete?.(c)}>
                        <Icon name="trash" />
                        Xóa
                      </button>
                    </>
                  )}
                </div>
              </div>
              {!center && (
                <button
                  type="button"
                  className="ccar-hit"
                  tabIndex={-1}
                  aria-label={`Chương ${num}: ${name}`}
                  onClick={() => (finePointer() ? navigate(toUrl(c.id)) : go(i))}
                />
              )}
            </article>
          )
        })}
      </div>

      <div className="ccar-nav">
        <button type="button" className="btn btn-small ccar-arrow" disabled={index <= 0} onClick={() => go(index - 1)} aria-label="Chương trước">
          <Icon name="left" />
        </button>
        <span className="ccar-count" aria-live="polite">
          <b>{index + 1}</b> / {chapters.length}
        </span>
        <button
          type="button"
          className="btn btn-small ccar-arrow"
          disabled={index >= chapters.length - 1}
          onClick={() => go(index + 1)}
          aria-label="Chương sau"
        >
          <Icon name="right" />
        </button>
        <button type="button" className="btn btn-small ccar-all" aria-expanded={gridOpen} onClick={() => setGridOpen((o) => !o)}>
          <Icon name="grid" />
          Tất cả chương
        </button>
      </div>

      {gridOpen && (
        <div className="ccar-grid">
          {chapters.map((c, i) => {
            const { num, name } = splitTitle(c.title, i)
            return (
              <button
                key={c.id}
                type="button"
                className={i === index ? 'ccar-cell is-current' : 'ccar-cell'}
                onClick={() => {
                  go(i)
                  setGridOpen(false)
                }}
              >
                <b>{num}</b>
                <span>{name}</span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
