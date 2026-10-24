import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { registerDialogHost } from '../lib/dialog.js'
import { burstConfetti } from '../lib/celebrate.js'
import { mascotSound } from '../lib/spaceSound.js'
import { useSettings } from '../lib/settings.js'
import DialogScene, { hasScene } from './DialogScene.jsx'
import Icon from './Icon.jsx'

/**
 * Hộp thoại có Gấu Trúc ngồi ở góc (mở qua lib/dialog.js: askConfirm / notifyDone).
 * - Nền mờ phủ cả trang, chỉ thao tác được trong hộp; bấm ra ngoài hoặc Esc = Hủy / đóng.
 * - Giữ Tab trong hộp; đóng thì trả focus về nút đã bấm.
 * - Hộp "xong việc" tự tắt sau 2 giây, có nút ×.
 * Tắt "Linh vật Panda" (Cài đặt) thì hộp vẫn hiện, chỉ không vẽ gấu.
 */
export default function DialogHost() {
  const [dlg, setDlg] = useState(null)
  const queue = useRef([])
  const current = useRef(null)
  const showPanda = useSettings().mascot

  useEffect(() => {
    function open(d) {
      // Đang có hộp hỏi chưa trả lời: hộp mới xếp hàng; hộp "xong việc" đang hiện thì thay luôn
      if (current.current?.type === 'confirm') return queue.current.push(d)
      show(d)
    }
    return registerDialogHost(open)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function show(d) {
    const next = d ? { ...d, id: Date.now(), returnFocus: document.activeElement } : null
    current.current = next
    setDlg(next)
    if (!next) return
    mascotSound(next.type === 'done' ? 'cheer' : 'talk')
    if (next.type === 'done' && next.confetti) burstConfetti()
  }

  function close(answer) {
    const d = current.current
    if (!d) return
    d.resolve?.(answer)
    // Trả focus về chỗ cũ (nếu phần tử còn trên trang)
    if (d.returnFocus?.isConnected) d.returnFocus.focus?.({ preventScroll: true })
    show(queue.current.shift() || null)
  }

  if (!dlg) return null
  return createPortal(<DialogCard key={dlg.id} dlg={dlg} showPanda={showPanda} onClose={close} />, document.body)
}

function DialogCard({ dlg, showPanda, onClose }) {
  const cardRef = useRef(null)
  const isConfirm = dlg.type === 'confirm'

  // Mở: focus nút an toàn (xóa → Hủy); hộp xong việc tự tắt
  useEffect(() => {
    const card = cardRef.current
    const first = card?.querySelector(isConfirm && !dlg.danger ? '[data-confirm]' : '[data-cancel]')
    first?.focus({ preventScroll: true })
    if (!isConfirm && dlg.autoClose) {
      const t = setTimeout(() => onClose(), dlg.autoClose)
      return () => clearTimeout(t)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Esc đóng; Tab vòng trong hộp; khóa cuộn trang phía sau
  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose(false)
      } else if (e.key === 'Tab') {
        const items = [...(cardRef.current?.querySelectorAll('button') || [])]
        if (!items.length) return
        const i = items.indexOf(document.activeElement)
        const next = e.shiftKey ? (i <= 0 ? items.length - 1 : i - 1) : i === items.length - 1 ? 0 : i + 1
        e.preventDefault()
        items[next].focus()
      }
    }
    document.addEventListener('keydown', onKey)
    const html = document.documentElement
    const prev = html.style.overflow
    html.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      html.style.overflow = prev
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div
      className="dlg-overlay"
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) onClose(false)
      }}
    >
      <div
        ref={cardRef}
        className={`dlg-card ${isConfirm ? '' : 'is-done'} ${dlg.danger ? 'is-danger' : ''} ${showPanda ? 'has-panda' : ''} ${dlg.scene ? `scene-${dlg.scene}` : ''}`}
        role={isConfirm ? 'alertdialog' : 'dialog'}
        aria-modal="true"
        aria-labelledby={`dlg-title-${dlg.id}`}
        aria-describedby={dlg.say || dlg.message ? `dlg-desc-${dlg.id}` : undefined}
      >
        {showPanda && (
          <div className="dlg-panda">
            <DialogScene scene={dlg.scene} pose={dlg.pose} />
            {dlg.emoji && !hasScene(dlg.scene) && <span className="dlg-emoji">{dlg.emoji}</span>}
          </div>
        )}
        {!isConfirm && (
          <button type="button" className="dlg-x" onClick={() => onClose()} aria-label="Đóng" data-cancel>
            <Icon name="close" size={16} />
          </button>
        )}
        <h2 className="dlg-title" id={`dlg-title-${dlg.id}`}>
          {dlg.title}
        </h2>
        <div id={`dlg-desc-${dlg.id}`}>
          {dlg.say && <p className="dlg-say">{dlg.say}</p>}
          {dlg.message && <p className="dlg-message muted small">{dlg.message}</p>}
        </div>
        {isConfirm && (
          <div className="dlg-actions">
            <button type="button" className="btn" onClick={() => onClose(false)} data-cancel>
              {dlg.cancelText || 'Hủy'}
            </button>
            <button type="button" className={dlg.danger ? 'btn btn-danger' : 'btn btn-primary'} onClick={() => onClose(true)} data-confirm>
              {dlg.confirmText || 'Đồng ý'}
            </button>
          </div>
        )}
        {!isConfirm && dlg.autoClose ? <div className="dlg-timer" style={{ animationDuration: `${dlg.autoClose}ms` }} /> : null}
      </div>
    </div>
  )
}
