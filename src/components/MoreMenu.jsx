import { memo, useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import Icon from './Icon.jsx'

// Menu thả xuống dùng chung: nút "⋯ Thao tác khác" (MoreMenu) và menu chọn nhanh trên đường dẫn Thư viện (LibraryCrumbs).
// Bàn phím: Enter / Space / ↓ mở, ↑↓ Home End di chuyển, Esc đóng và trả focus về nút, Tab đóng; bấm ra ngoài đóng. CSS ở library.css.

/**
 * Trạng thái + hành vi chung của một menu thả xuống. Gắn `box` + `onKeyDown` vào khung bọc, `btn` vào nút mở, `menu` + `id` vào danh sách;
 * mỗi mục có role="menuitem" tabIndex={-1}.
 * @param {string} [focusSel] mục được focus khi vừa mở (mặc định mục đầu)
 */
export function useDropMenu(focusSel) {
  const [open, setOpen] = useState(false)
  const box = useRef(/** @type {HTMLSpanElement | null} */ (null))
  const btn = useRef(/** @type {HTMLButtonElement | null} */ (null))
  const menu = useRef(/** @type {HTMLUListElement | null} */ (null))
  const id = useId()
  const items = () => /** @type {HTMLElement[]} */ ([...(menu.current?.querySelectorAll('[role="menuitem"]') || [])])

  // Vừa mở: menu tràn mép màn hình (điện thoại) thì dịch vào trong; đưa focus vào mục cần chọn
  useLayoutEffect(() => {
    const m = menu.current
    if (!open || !m) return
    m.style.transform = ''
    const r = m.getBoundingClientRect()
    const vw = document.documentElement.clientWidth
    const dx = r.right > vw - 8 ? vw - 8 - r.right : r.left < 8 ? 8 - r.left : 0
    if (dx) m.style.transform = `translateX(${dx}px)`
    const list = items()
    ;((focusSel && list.find((a) => a.matches(focusSel))) || list[0])?.focus()
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  // Bấm / chạm ra ngoài thì đóng (không đóng theo blur: Safari làm mất focus trước khi kịp nhận cú bấm vào mục)
  useEffect(() => {
    if (!open) return
    /** @param {PointerEvent} e */
    const onDown = (e) => !box.current?.contains(/** @type {Node} */ (e.target)) && setOpen(false)
    document.addEventListener('pointerdown', onDown)
    return () => document.removeEventListener('pointerdown', onDown)
  }, [open])

  /** @param {import('react').KeyboardEvent} e */
  function onKeyDown(e) {
    if (!open) {
      if (e.target === btn.current && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
        e.preventDefault()
        setOpen(true)
      }
      return
    }
    if (e.key === 'Escape') {
      e.preventDefault()
      setOpen(false)
      btn.current?.focus()
      return
    }
    if (e.key === 'Tab') return setOpen(false) // để Tab đi tiếp như thường
    const list = items()
    if (e.key === ' ' && list.includes(/** @type {HTMLElement} */ (e.target))) {
      e.preventDefault() // link không tự nhận phím cách như mục menu
      return /** @type {HTMLElement} */ (e.target).click()
    }
    const i = list.indexOf(/** @type {HTMLElement} */ (document.activeElement))
    const to = { ArrowDown: i + 1, ArrowUp: i - 1, Home: 0, End: list.length - 1 }[e.key]
    if (to === undefined || !list.length) return
    e.preventDefault()
    list[(to + list.length) % list.length].focus()
  }

  return { open, setOpen, box, btn, menu, id, onKeyDown }
}

/** @typedef {{ key: string, label: string, icon?: string, danger?: boolean, onSelect: () => void }} MoreItem */

/**
 * Nút "⋯" gom các thao tác ít dùng. Mục false / null bị bỏ qua; không còn mục nào thì không hiện nút.
 * @param {{ items: (MoreItem | false | null | undefined)[], label?: string }} props
 */
function MoreMenu({ items, label = 'Thao tác khác' }) {
  const { open, setOpen, box, btn, menu, id, onKeyDown } = useDropMenu()
  const list = /** @type {MoreItem[]} */ (items.filter(Boolean))
  if (!list.length) return null
  return (
    <span className="more-menu" ref={box} onKeyDown={onKeyDown}>
      <button
        ref={btn}
        type="button"
        className="btn btn-small more-btn"
        aria-label={label}
        title={label}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? id : undefined}
        onClick={() => setOpen((v) => !v)}
      >
        <Icon name="more" size={20} />
      </button>
      {open && (
        <ul ref={menu} id={id} role="menu" aria-label={label} className="crumb-menu more-list">
          {list.map((it) => (
            <li key={it.key} role="none">
              <button
                type="button"
                role="menuitem"
                tabIndex={-1}
                className={it.danger ? 'crumb-item is-danger' : 'crumb-item'}
                onClick={() => {
                  setOpen(false)
                  btn.current?.focus() // trả focus về nút trước khi mục biến mất
                  it.onSelect()
                }}
              >
                {it.icon && <Icon name={/** @type {any} */ (it.icon)} size={16} />}
                <span className="crumb-item-text">{it.label}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </span>
  )
}
export default memo(MoreMenu)
