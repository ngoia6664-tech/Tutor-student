import { useState } from 'react'
import { supabase, unwrap } from '../lib/supabase.js'
import { errMsg } from '../lib/errors.js'
import { formatDateTime } from '../lib/format.js'
import Icon from './Icon.jsx'

// Trạng thái báo lỗi học sinh thấy
const STATUS_TEXT = {
  open: 'Đã báo lỗi, gia sư sẽ xem lại',
  fixed: 'Gia sư đã sửa câu này',
  dismissed: 'Gia sư đã xem: không lỗi',
}
const STATUS_BADGE = { open: 'badge-warn', fixed: 'badge-ok', dismissed: 'badge-muted' }

/**
 * Nút "Báo lỗi đề" cho một câu (đặt trong .question-label: nút nằm bên phải,
 * ô ghi chú xuống dòng riêng bên dưới).
 * - report: báo lỗi gần nhất của học sinh cho câu này (hoặc null)
 */
export default function ReportQuestion({ exerciseId, report: initial }) {
  const [report, setReport] = useState(initial || null)
  const [open, setOpen] = useState(false)
  const [note, setNote] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState(null)
  const isOpen = report?.status === 'open'

  function toggle() {
    if (!open) {
      setNote(isOpen ? report.note : '')
      setError(null)
    }
    setOpen((v) => !v)
  }

  async function send(e) {
    e.preventDefault()
    if (!note.trim()) return setError('Hãy ghi rõ câu này bị lỗi như thế nào.')
    setSending(true)
    setError(null)
    try {
      setReport(unwrap(await supabase.rpc('report_exercise', { p_exercise_id: exerciseId, p_note: note })))
      setOpen(false)
    } catch (err) {
      setError(errMsg(err))
    } finally {
      setSending(false)
    }
  }

  return (
    <>
      <span className="qr-actions">
        {report && (
          <span className={`badge ${STATUS_BADGE[report.status]}`} title={report.note}>
            {STATUS_TEXT[report.status]}
          </span>
        )}
        <button type="button" className="btn btn-small btn-ghost qr-btn" onClick={toggle} aria-expanded={open}>
          <Icon name="flag" size={15} />
          {isOpen ? 'Sửa báo lỗi' : 'Báo lỗi đề'}
        </button>
      </span>
      {open && (
        <form className="qr-form" onSubmit={send}>
          <label className="field" style={{ marginBottom: '0.5rem' }}>
            <span>Câu này bị lỗi như thế nào?</span>
            <textarea
              className="qr-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={2000}
              rows={3}
              placeholder="Ví dụ: đề thiếu dữ kiện khối lượng, đáp án B và C giống nhau, hình vẽ không khớp đề…"
              autoFocus
            />
          </label>
          {isOpen && <p className="muted small" style={{ margin: '0 0 0.5rem' }}>Đã gửi lúc {formatDateTime(report.created_at)}. Gửi lại sẽ thay ghi chú cũ.</p>}
          {error && <p className="qr-error small">{error}</p>}
          <div className="row">
            <button type="submit" className="btn btn-small btn-primary" disabled={sending}>
              <Icon name="send" size={15} />
              {sending ? 'Đang gửi…' : 'Gửi cho gia sư'}
            </button>
            <button type="button" className="btn btn-small btn-ghost" onClick={() => setOpen(false)}>
              Huỷ
            </button>
          </div>
        </form>
      )}
    </>
  )
}
