import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import Icon from './Icon.jsx'
import { confirmDeleteMany, confirmDropSubmitted, notifyDone, notifyError } from '../lib/dialog.js'
import StudentPicker from './StudentPicker.jsx'
import ChapterSelect from './ChapterSelect.jsx'
import Loading from './Loading.jsx'
import ErrorBox from './ErrorBox.jsx'
import { errMsg } from '../lib/errors.js'
import { fetchChapters } from '../lib/chapters.js'
import { addRecipients, fetchRecipients, setRecipients } from '../lib/recipients.js'
import { deleteItems, deleteWarning, itemsLabel, moveToChapter } from '../lib/bulk.js'

// Khung bảng nổi dùng chung (Giao cho học sinh, Chuyển chương): bấm nền / Esc để đóng
function DialogFrame({ id, icon, title, onClose, children, className = '' }) {
  const panel = useRef(null)
  const closeRef = useRef(onClose)
  closeRef.current = onClose
  useEffect(() => {
    panel.current?.focus()
    const key = (e) => e.key === 'Escape' && closeRef.current()
    window.addEventListener('keydown', key)
    return () => window.removeEventListener('keydown', key)
  }, [])
  return createPortal(
    <div className="settings-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`settings-panel ${className}`} role="dialog" aria-modal="true" aria-labelledby={id} tabIndex={-1} ref={panel}>
        <div className="settings-head">
          <h2 id={id}>
            <Icon name={icon} size={20} /> {title}
          </h2>
          <button type="button" className="btn btn-ghost theme-toggle" onClick={onClose} aria-label="Đóng" title="Đóng">
            <Icon name="close" />
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body,
  )
}

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
      if (lostSubmitted.length && !(await confirmDropSubmitted(lostSubmitted.length))) return
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

  return (
    <DialogFrame id="assign-title" icon="users" title="Giao cho học sinh" onClose={onClose}>
      <p className="muted small" style={{ margin: '0 0 0.75rem' }}>
        {single ? (
          <>
            {single.kind === 'lesson' ? '📘' : '✏️'} {single.title}
          </>
        ) : (
          <>Giao thêm {itemsLabel(items)} đã chọn. Học sinh đã có bài thì giữ nguyên.</>
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
    </DialogFrame>
  )
}

// Sửa nhiều → Chuyển chương: chỉ đổi chương, nội dung / câu hỏi / học sinh nhận giữ nguyên
export function MoveDialog({ items, onClose, onSaved }) {
  const [chapters, setChapters] = useState(null)
  const [target, setTarget] = useState('')
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let alive = true
    fetchChapters()
      .then((rows) => alive && setChapters(rows))
      .catch((e) => alive && setError(errMsg(e)))
    return () => {
      alive = false
    }
  }, [])

  async function save() {
    setError(null)
    setSaving(true)
    try {
      const { moved, failed } = await moveToChapter(items, target)
      if (failed.length) {
        setError(`Đã chuyển ${moved}/${items.length} bài. ${failedText(failed)}`)
        setSaving(false)
        onSaved?.(false)
        return
      }
      const name = chapters.find((c) => c.id === target)?.title
      notifyDone({ title: `Đã chuyển ${itemsLabel(items)}`, say: name ? `Đã xếp vào chương "${name}" rồi nhé 📂` : 'Đã chuyển sang "Chưa xếp chương" 📂' })
      onSaved?.(true)
      onClose()
    } catch (e) {
      setError(errMsg(e))
      setSaving(false)
    }
  }

  return (
    <DialogFrame id="move-title" icon="folder" title="Chuyển chương" onClose={onClose} className="move-panel">
      <p className="muted small" style={{ margin: '0 0 0.75rem' }}>
        Chuyển {itemsLabel(items)} đã chọn sang chương mới. Nội dung, câu hỏi, đáp án và học sinh nhận giữ nguyên.
      </p>
      <ErrorBox message={error} />
      {chapters === null ? !error && <Loading text="Đang tải danh sách chương..." /> : <ChapterSelect chapters={chapters} value={target} onChange={setTarget} label="Chương đích" defaultOpen />}
      <div className="row" style={{ marginTop: '1rem', justifyContent: 'flex-end' }}>
        <button type="button" className="btn" onClick={onClose}>
          Hủy
        </button>
        <button type="button" className="btn btn-primary" disabled={saving || chapters === null} onClick={save}>
          <Icon name="folder" />
          {saving ? 'Đang chuyển...' : 'Chuyển'}
        </button>
      </div>
    </DialogFrame>
  )
}

// "Không xóa được: "Bài 1" (lỗi...), "Bài 2" (...)"
function failedText(failed, verb = 'Không xử lý được') {
  return `${verb}: ${failed.map((f) => `"${f.item.title}" (${errMsg(f.error)})`).join('; ')}`
}

// Xóa nhiều bài giảng / bài tập: hỏi xác nhận (nói rõ số lượng + bài đã có học sinh nộp) → xóa từng bài → báo kết quả.
// Trả false nếu gia sư bấm Hủy (không đụng dữ liệu).
export async function deletePicked(items) {
  if (!items.length) return false
  if (!(await confirmDeleteMany(itemsLabel(items), deleteWarning(items)))) return false
  const { done, failed } = await deleteItems(items)
  if (!failed.length) {
    notifyDone({ title: `Đã xóa ${itemsLabel(items)}`, say: 'Xong rồi! Đã dọn sạch các mục đã chọn ✨', scene: 'deleted' })
  } else {
    notifyError(`Đã xóa ${done}/${items.length} mục`, failedText(failed, 'Không xóa được'))
  }
  return true
}

// Chế độ chọn nhiều: mode = 'edit' (Sửa nhiều: chuyển chương, giao) | 'delete' (Xóa nhiều) | null. key = `${kind}:${id}`
export function useAssignSelection() {
  const [mode, setMode] = useState(null)
  const [picked, setPicked] = useState(() => new Map())
  const keyOf = (it) => `${it.kind}:${it.id}`
  return {
    on: mode !== null,
    mode,
    picked,
    items: [...picked.values()],
    has: (kind, id) => picked.has(`${kind}:${id}`),
    toggle(item) {
      const k = keyOf(item)
      setPicked((m) => {
        const next = new Map(m)
        if (next.has(k)) next.delete(k)
        else next.set(k, item)
        return next
      })
    },
    // Chọn / bỏ chọn cả danh sách đang hiển thị
    setAll(list, on) {
      setPicked((m) => {
        const next = new Map(m)
        for (const it of list) on ? next.set(keyOf(it), it) : next.delete(keyOf(it))
        return next
      })
    },
    // Bỏ các mục không còn hiển thị (đổi bộ lọc) để không thao tác nhầm lên mục bị ẩn
    retain(list) {
      const keep = new Set(list.map(keyOf))
      setPicked((m) => ([...m.keys()].every((k) => keep.has(k)) ? m : new Map([...m].filter(([k]) => keep.has(k)))))
    },
    // Đổi chế độ luôn xóa lựa chọn cũ: tick ở Sửa nhiều không mang sang Xóa nhiều
    start(next = 'edit') {
      setMode(next)
      setPicked(new Map())
    },
    stop() {
      setMode(null)
      setPicked(new Map())
    },
  }
}

const MODES = {
  edit: { icon: 'edit', label: 'Sửa nhiều', off: 'Thôi sửa' },
  delete: { icon: 'trash', label: 'Xóa nhiều', off: 'Thôi xóa' },
}

// Nút bật/tắt Sửa nhiều / Xóa nhiều (đặt ở đầu trang). Hai chế độ không bật cùng lúc.
export function SelectModes({ sel, modes = ['edit', 'delete'] }) {
  return modes.map((m) => {
    const active = sel.mode === m
    const cls = active ? (m === 'delete' ? 'btn btn-small btn-danger' : 'btn btn-small btn-primary') : 'btn btn-small'
    return (
      <button key={m} type="button" className={cls} aria-pressed={active} onClick={active ? sel.stop : () => sel.start(m)}>
        <Icon name={active ? 'close' : MODES[m].icon} />
        {active ? MODES[m].off : MODES[m].label}
      </button>
    )
  })
}

// Ô tick cạnh tên bài khi đang chọn nhiều
export function SelectCheck({ sel, item }) {
  if (!sel.on) return null
  return (
    <input
      type="checkbox"
      className={sel.mode === 'delete' ? 'assign-check is-delete' : 'assign-check'}
      checked={sel.has(item.kind, item.id)}
      onChange={() => sel.toggle(item)}
      onClick={(e) => e.stopPropagation()}
      aria-label={`Chọn "${item.title}"`}
    />
  )
}

// Thanh dưới màn hình: số mục đã chọn, Chọn tất cả (chỉ mục đang hiển thị), các thao tác của chế độ hiện tại.
// visible: các mục đang hiển thị; onAssign / onMove / onDelete nhận danh sách mục đã chọn (trong số đang hiển thị).
// extra: nội dung thêm (vd. ô "Xóa luôn bài bên trong" khi xóa chương). Đang xử lý thì khóa mọi nút.
export function SelectBar({ sel, visible, onAssign, onMove, onDelete, extra }) {
  const [busy, setBusy] = useState(false)
  const visibleKey = visible.map((it) => `${it.kind}:${it.id}`).join(',')
  useEffect(() => {
    if (sel.on) sel.retain(visible)
  }, [visibleKey, sel.on]) // eslint-disable-line react-hooks/exhaustive-deps
  if (!sel.on) return null
  const chosen = visible.filter((it) => sel.has(it.kind, it.id))
  const n = chosen.length
  const allOn = n > 0 && n === visible.length
  const del = sel.mode === 'delete'

  async function run(fn) {
    setBusy(true)
    try {
      await fn(chosen)
    } finally {
      setBusy(false)
    }
  }

  // Gắn thẳng vào body: khung trang có hiệu ứng page-in (transform) làm position: fixed bám theo khung thay vì màn hình
  return createPortal(
    <div className={del ? 'assign-bar is-delete' : 'assign-bar'} role="region" aria-label={del ? 'Xóa nhiều' : 'Sửa nhiều'}>
      <div className="assign-bar-info">
        <span>
          {del ? 'Xóa' : 'Sửa'}: đã chọn <strong>{n}</strong>/{visible.length}
        </span>
        <button type="button" className="btn btn-small btn-ghost" disabled={busy || !visible.length} onClick={() => sel.setAll(visible, !allOn)}>
          <Icon name="check" />
          {allOn ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
        </button>
      </div>
      {extra}
      <div className="row">
        <button type="button" className="btn btn-small" disabled={busy} onClick={sel.stop}>
          Hủy
        </button>
        {del ? (
          <button type="button" className="btn btn-small btn-danger" disabled={busy || !n} onClick={() => run(onDelete)}>
            <Icon name="trash" />
            {busy ? 'Đang xóa...' : 'Xóa đã chọn'}
          </button>
        ) : (
          <>
            {onMove && (
              <button type="button" className="btn btn-small" disabled={busy || !n} onClick={() => onMove(chosen)}>
                <Icon name="folder" />
                Chuyển chương
              </button>
            )}
            {onAssign && (
              <button type="button" className="btn btn-small btn-primary" disabled={busy || !n} onClick={() => onAssign(chosen)}>
                <Icon name="users" />
                Giao cho...
              </button>
            )}
          </>
        )}
      </div>
    </div>,
    document.body,
  )
}
