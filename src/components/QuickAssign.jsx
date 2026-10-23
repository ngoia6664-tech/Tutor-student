import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import Icon from './Icon.jsx'
import StudentPicker from './StudentPicker.jsx'
import Loading from './Loading.jsx'
import ErrorBox from './ErrorBox.jsx'
import { errMsg } from '../lib/errors.js'
import { addRecipients, fetchRecipients, setRecipients } from '../lib/recipients.js'

// Giao bài nhanh từ danh sách (Bài giảng, Bài tập, chương trong Thư viện).
// items = [{ kind: 'lesson'|'assignment', id, title }]
//  - 1 bài: sửa đúng danh sách học sinh nhận (bỏ học sinh đã nộp thì hỏi lại)
//  - nhiều bài: chỉ GIAO THÊM học sinh đã chọn, ai đã có bài thì giữ nguyên
export function AssignDialog({ items, onClose, onSaved }) {
  const single = items.length === 1 ? items[0] : null
  const [current, setCurrent] = useState(single ? null : [])
  const [ids, setIds] = useState([])
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(false)
  const panel = useRef(null)
  const closeRef = useRef(onClose)
  closeRef.current = onClose

  useEffect(() => {
    panel.current?.focus()
    const key = (e) => e.key === 'Escape' && closeRef.current()
    window.addEventListener('keydown', key)
    return () => window.removeEventListener('keydown', key)
  }, [])

  useEffect(() => {
    if (!single) return
    let alive = true
    fetchRecipients(single.kind, single.id)
      .then((rows) => {
        if (!alive) return
        setCurrent(rows)
        setIds(rows.map((r) => r.student_id))
      })
      .catch((e) => alive && setError(errMsg(e)))
    return () => {
      alive = false
    }
  }, []) // mỗi lần mở bảng là một bài cố định

  async function save() {
    setError(null)
    if (single) {
      const want = new Set(ids)
      const lostSubmitted = current.filter((r) => !want.has(r.student_id) && r.status && r.status !== 'todo')
      if (
        lostSubmitted.length &&
        !window.confirm(`Bạn bỏ chọn ${lostSubmitted.length} học sinh đã nộp bài. Bài nộp và điểm của các em sẽ bị xóa. Tiếp tục?`)
      )
        return
    } else if (!ids.length) {
      setError('Chọn ít nhất một học sinh.')
      return
    }
    setSaving(true)
    try {
      if (single) await setRecipients(single.kind, single.id, ids, current)
      else await addRecipients(items, ids)
      onSaved?.()
      onClose()
    } catch (e) {
      setError(errMsg(e))
      setSaving(false)
    }
  }

  const nLessons = items.filter((it) => it.kind === 'lesson').length
  const nAssignments = items.length - nLessons
  const what = [nLessons && `${nLessons} bài giảng`, nAssignments && `${nAssignments} bài tập`].filter(Boolean).join(' + ')

  return createPortal(
    <div className="settings-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="settings-panel" role="dialog" aria-modal="true" aria-labelledby="assign-title" tabIndex={-1} ref={panel}>
        <div className="settings-head">
          <h2 id="assign-title">
            <Icon name="users" size={20} /> Giao cho học sinh
          </h2>
          <button type="button" className="btn btn-ghost theme-toggle" onClick={onClose} aria-label="Đóng" title="Đóng">
            <Icon name="close" />
          </button>
        </div>
        <p className="muted small" style={{ margin: '0 0 0.75rem' }}>
          {single ? (
            <>
              {single.kind === 'lesson' ? '📘' : '✏️'} {single.title}
            </>
          ) : (
            <>Giao thêm {what} đã chọn. Học sinh đã có bài thì giữ nguyên.</>
          )}
        </p>

        <ErrorBox message={error} />
        {current === null ? (
          !error && <Loading text="Đang tải danh sách nhận..." />
        ) : (
          <StudentPicker value={ids} onChange={setIds} />
        )}

        <div className="row" style={{ marginTop: '1rem', justifyContent: 'flex-end' }}>
          <button type="button" className="btn" onClick={onClose}>
            Hủy
          </button>
          <button type="button" className="btn btn-primary" disabled={saving || current === null} onClick={save}>
            <Icon name="send" />
            {saving ? 'Đang lưu...' : single ? 'Lưu' : 'Giao'}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}

// Chế độ tick nhiều bài để giao một lần: key = `${kind}:${id}`
export function useAssignSelection() {
  const [on, setOn] = useState(false)
  const [picked, setPicked] = useState(() => new Map())
  return {
    on,
    picked,
    items: [...picked.values()],
    has: (kind, id) => picked.has(`${kind}:${id}`),
    toggle(item) {
      const k = `${item.kind}:${item.id}`
      setPicked((m) => {
        const next = new Map(m)
        if (next.has(k)) next.delete(k)
        else next.set(k, item)
        return next
      })
    },
    start: () => setOn(true),
    stop() {
      setOn(false)
      setPicked(new Map())
    },
  }
}

// Nút bật/tắt chế độ chọn nhiều (đặt ở đầu trang)
export function SelectToggle({ sel }) {
  return (
    <button type="button" className={sel.on ? 'btn btn-small btn-primary' : 'btn btn-small'} onClick={sel.on ? sel.stop : sel.start}>
      <Icon name={sel.on ? 'close' : 'check'} />
      {sel.on ? 'Thôi chọn' : 'Chọn nhiều để giao'}
    </button>
  )
}

// Ô tick cạnh tên bài khi đang chọn nhiều
export function SelectCheck({ sel, item }) {
  if (!sel.on) return null
  return (
    <input
      type="checkbox"
      className="assign-check"
      checked={sel.has(item.kind, item.id)}
      onChange={() => sel.toggle(item)}
      onClick={(e) => e.stopPropagation()}
      aria-label={`Chọn "${item.title}"`}
    />
  )
}

// Thanh dưới màn hình: số bài đã chọn + nút Giao
export function SelectBar({ sel, onAssign }) {
  if (!sel.on) return null
  const n = sel.picked.size
  return (
    <div className="assign-bar">
      <span>
        Đã chọn <strong>{n}</strong> bài
      </span>
      <div className="row">
        <button type="button" className="btn btn-small" onClick={sel.stop}>
          Hủy
        </button>
        <button type="button" className="btn btn-small btn-primary" disabled={!n} onClick={onAssign}>
          <Icon name="users" />
          Giao cho...
        </button>
      </div>
    </div>
  )
}
