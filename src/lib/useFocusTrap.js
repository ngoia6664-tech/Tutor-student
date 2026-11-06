import { useEffect, useRef } from 'react'

const FOCUSABLE = 'button, textarea, input, select, a[href], [tabindex]:not([tabindex="-1"])'

/**
 * Hộp thoại nổi: mở thì focus vào hộp, Esc đóng, Tab / Shift+Tab xoay vòng trong hộp (không lọt ra trang phía sau),
 * đóng thì trả focus về nút đã mở. Gắn `ref` trả về vào div role="dialog" có tabIndex={-1}.
 * @param {() => void} onClose
 * @param {string} [firstFocus] selector ô nhận focus đầu tiên (mặc định: chính hộp)
 */
export function useFocusTrap(onClose, firstFocus) {
  const panel = useRef(/** @type {HTMLDivElement | null} */ (null))
  const closeRef = useRef(onClose)
  closeRef.current = onClose

  useEffect(() => {
    const opener = /** @type {HTMLElement | null} */ (document.activeElement)
    const box = panel.current
    const start = /** @type {HTMLElement | null} */ ((firstFocus && box?.querySelector(firstFocus)) || box)
    start?.focus()
    const key = (/** @type {KeyboardEvent} */ e) => {
      if (e.key === 'Escape') return closeRef.current()
      if (e.key !== 'Tab' || !panel.current) return
      const items = /** @type {HTMLButtonElement[]} */ ([...panel.current.querySelectorAll(FOCUSABLE)]).filter((el) => !el.disabled)
      if (!items.length) return
      const first = items[0]
      const last = items[items.length - 1]
      const inside = panel.current.contains(document.activeElement)
      if (e.shiftKey && (!inside || document.activeElement === first || document.activeElement === panel.current)) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && (!inside || document.activeElement === last)) {
        e.preventDefault()
        first.focus()
      }
    }
    window.addEventListener('keydown', key)
    return () => {
      window.removeEventListener('keydown', key)
      if (opener?.isConnected) opener.focus()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- chỉ chạy lúc mở / đóng hộp; onClose luôn lấy bản mới qua closeRef
  }, [])

  return panel
}
