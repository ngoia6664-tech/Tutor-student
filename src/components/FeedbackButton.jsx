import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useLocation } from 'react-router-dom'
import Icon from './Icon.jsx'
import { KINDS, RATINGS, sendFeedback } from '../lib/feedback.js'
import { errMsg } from '../lib/errors.js'
import { mascotSay } from '../lib/celebrate.js'
import { useStudying } from '../lib/studyLock.js'

const MAX = 2000

// Nút "Góp ý" nổi ở góc trái dưới (học sinh). Bấm mở bảng gửi góp ý, không đổi trang.
// Đang làm bài thì ẩn để khỏi phân tâm.
export default function FeedbackButton() {
  const [open, setOpen] = useState(false)
  const studying = useStudying()
  if (studying && !open) return null
  return (
    <>
      <button type="button" className="feedback-fab" onClick={() => setOpen(true)} aria-label="Gửi góp ý" title="Góp ý cho thầy">
        <span className="feedback-fab-emoji" aria-hidden="true">💬</span>
        <span className="feedback-fab-text">Góp ý</span>
      </button>
      {open && <FeedbackPanel onClose={() => setOpen(false)} />}
    </>
  )
}

function FeedbackPanel({ onClose }) {
  const { pathname } = useLocation()
  const [kind, setKind] = useState('idea')
  const [rating, setRating] = useState(null)
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const panel = useRef(null)
  const closeRef = useRef(onClose)
  closeRef.current = onClose

  useEffect(() => {
    const opener = document.activeElement
    panel.current?.querySelector('textarea')?.focus()
    const key = (e) => {
      if (e.key === 'Escape') return closeRef.current()
      if (e.key !== 'Tab' || !panel.current) return
      // Giữ focus trong hộp góp ý: Tab/Shift+Tab xoay vòng, không lọt ra trang phía sau
      const items = [...panel.current.querySelectorAll('button, textarea, input, select, a[href], [tabindex]:not([tabindex="-1"])')].filter(
        (el) => !el.disabled
      )
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
      // Đóng hộp thì trả focus về nút Góp ý
      if (opener?.isConnected) opener.focus()
    }
  }, [])

  async function submit(e) {
    e.preventDefault()
    if (!message.trim()) return setError('Bạn viết vài dòng góp ý nhé.')
    setBusy(true)
    setError('')
    try {
      await sendFeedback({ kind, rating, message, page: pathname })
      setDone(true)
      mascotSay('Cảm ơn bạn đã góp ý! Thầy sẽ đọc kỹ từng dòng 💖', 'cheer')
    } catch (err) {
      setError(errMsg(err))
    } finally {
      setBusy(false)
    }
  }

  return createPortal(
    <div className="settings-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="settings-panel feedback-panel" role="dialog" aria-modal="true" aria-labelledby="feedback-title" tabIndex={-1} ref={panel}>
        <div className="settings-head">
          <h2 id="feedback-title">
            <Icon name="chat" size={20} /> Góp ý cho thầy
          </h2>
          <button type="button" className="btn btn-ghost theme-toggle" onClick={onClose} aria-label="Đóng" title="Đóng">
            <Icon name="close" />
          </button>
        </div>

        {done ? (
          <div className="feedback-done">
            <div className="feedback-done-emoji" aria-hidden="true">🐼💖</div>
            <p>
              <b>Đã gửi góp ý!</b>
              <br />
              Cảm ơn bạn, mỗi góp ý giúp app tốt hơn mỗi ngày.
            </p>
            <div className="row" style={{ justifyContent: 'center' }}>
              <button type="button" className="btn btn-ghost" onClick={() => (setDone(false), setMessage(''), setRating(null))}>
                Gửi thêm
              </button>
              <button type="button" className="btn btn-primary" onClick={onClose}>
                Đóng
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={submit}>
            <p className="muted small" style={{ marginTop: 0 }}>
              Bạn thấy app thế nào? Có gì muốn thêm, chỗ nào khó dùng hay bị lỗi, cứ nói với thầy nhé.
            </p>

            <section className="settings-section">
              <h3>Bạn thấy app thế nào?</h3>
              <div className="feedback-rating" role="radiogroup" aria-label="Mức hài lòng">
                {RATINGS.map((r) => (
                  <button
                    key={r.value}
                    type="button"
                    role="radio"
                    aria-checked={rating === r.value}
                    className={`feedback-face ${rating === r.value ? 'is-on' : ''}`}
                    onClick={() => setRating(rating === r.value ? null : r.value)}
                    title={r.label}
                  >
                    <span aria-hidden="true">{r.emoji}</span>
                    <small>{r.label}</small>
                  </button>
                ))}
              </div>
            </section>

            <section className="settings-section">
              <h3>Loại góp ý</h3>
              <div className="feedback-kinds" role="radiogroup" aria-label="Loại góp ý">
                {KINDS.map((k) => (
                  <button
                    key={k.id}
                    type="button"
                    role="radio"
                    aria-checked={kind === k.id}
                    className={`feedback-kind ${kind === k.id ? 'is-on' : ''}`}
                    onClick={() => setKind(k.id)}
                  >
                    {k.emoji} {k.label}
                  </button>
                ))}
              </div>
            </section>

            <section className="settings-section">
              <label htmlFor="feedback-msg">
                <h3>Nội dung</h3>
              </label>
              <textarea
                id="feedback-msg"
                rows={5}
                maxLength={MAX}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={kind === 'bug' ? 'Lỗi xảy ra ở đâu, khi bạn làm gì?' : 'Viết góp ý của bạn…'}
              />
              <div className="muted small" style={{ textAlign: 'right' }}>
                {message.length}/{MAX}
              </div>
            </section>

            {error && <div className="alert alert-error">{error}</div>}

            <div className="row" style={{ justifyContent: 'flex-end' }}>
              <button type="button" className="btn btn-ghost" onClick={onClose}>
                Để sau
              </button>
              <button type="submit" className="btn btn-primary" disabled={busy || !message.trim()}>
                <Icon name="send" /> {busy ? 'Đang gửi…' : 'Gửi góp ý'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>,
    document.body
  )
}
