import { useState } from 'react'
import { NOTE_MAX, saveMarkNote } from '../lib/marks.js'
import { errMsg } from '../lib/errors.js'
import Markdown from './Markdown.jsx'
import Icon from './Icon.jsx'

/**
 * Ghi chú riêng của học sinh cho một câu khó (mục Câu khó ở trang Ôn tập): kiến thức, công thức cần nhớ để làm bài.
 * Chỉ học sinh đó xem được. Viết Markdown, công thức trong $...$ như đề bài.
 * - note: ghi chú đã lưu · onSaved(note): báo trang cha giữ bản mới
 */
export default function HardNote({ exerciseId, studentId, note, onSaved }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(note)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  function startEdit() {
    setDraft(note)
    setError(null)
    setEditing(true)
  }

  async function save(e) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const text = draft.trim()
      await saveMarkNote(exerciseId, studentId, text)
      onSaved(text)
      setEditing(false)
    } catch (err) {
      setError(errMsg(err))
    } finally {
      setBusy(false)
    }
  }

  if (editing) {
    return (
      <form className="hard-note is-editing" onSubmit={save}>
        <label className="field" style={{ marginBottom: '0.5rem' }}>
          <span>📝 Ghi chú của bạn</span>
          <textarea
            className="hard-note-input"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            maxLength={NOTE_MAX}
            rows={4}
            placeholder="Ghi lại kiến thức để làm câu này, vd. công thức $v = s/t$, chỗ hay nhầm, mẹo nhớ…"
            autoFocus
          />
        </label>
        {error && <p className="qr-error small">{error}</p>}
        <div className="row">
          <button type="submit" className="btn btn-small btn-primary" disabled={busy}>
            <Icon name="save" size={15} />
            {busy ? 'Đang lưu…' : 'Lưu ghi chú'}
          </button>
          <button type="button" className="btn btn-small btn-ghost" onClick={() => setEditing(false)} disabled={busy}>
            Hủy
          </button>
          <span className="muted small" style={{ marginLeft: 'auto' }}>
            {draft.length}/{NOTE_MAX}
          </span>
        </div>
      </form>
    )
  }

  if (!note) {
    return (
      <button type="button" className="btn btn-small btn-ghost hard-note-add" onClick={startEdit}>
        <Icon name="edit" size={15} />
        Thêm ghi chú
      </button>
    )
  }

  return (
    <div className="hard-note">
      <div className="row row-between" style={{ marginBottom: '0.25rem' }}>
        <span className="box-label" style={{ margin: 0 }}>
          📝 Ghi chú của bạn
        </span>
        <button type="button" className="btn btn-small btn-ghost" onClick={startEdit}>
          <Icon name="edit" size={15} />
          Sửa
        </button>
      </div>
      <Markdown>{note}</Markdown>
    </div>
  )
}
