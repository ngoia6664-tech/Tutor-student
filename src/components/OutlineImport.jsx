import { useMemo, useState } from 'react'
import { supabase, unwrap } from '../lib/supabase.js'
import { errMsg } from '../lib/errors.js'
import { findChapter, gradeLabel, sectionLabel, subjectLabel } from '../lib/chapters.js'
import { OUTLINE_SAMPLE, parseOutline } from '../lib/outline.js'
import ErrorBox from './ErrorBox.jsx'
import Icon from './Icon.jsx'

// Dán mục lục giáo trình → xem trước cây → tạo nhiều chương một lần.
// Chương đã có (cùng tên, lớp, môn) thì giữ nguyên, không tạo trùng (hàm ensure_chapter).
export default function OutlineImport({ chapters, defaults, onCancel, onDone }) {
  const [text, setText] = useState('')
  const [saving, setSaving] = useState(false)
  const [progress, setProgress] = useState('')
  const [error, setError] = useState(null)

  const { items, warnings } = useMemo(() => parseOutline(text, defaults), [text, defaults])
  const rows = items.map((it) => ({ ...it, existing: findChapter(chapters, it) }))
  const fresh = rows.filter((r) => !r.existing && r.grade)
  const skipped = rows.filter((r) => !r.grade).length

  // Gom để xem trước: Lớp · Môn → Chuyên đề → chương
  const groups = []
  for (const r of rows) {
    const head = `${gradeLabel(r.grade)} · ${subjectLabel(r.subject)}`
    let g = groups.find((x) => x.head === head)
    if (!g) groups.push((g = { head, sections: [] }))
    let s = g.sections.find((x) => x.section === r.section)
    if (!s) g.sections.push((s = { section: r.section, rows: [] }))
    s.rows.push(r)
  }

  async function save() {
    setSaving(true)
    setError(null)
    const created = []
    try {
      for (let i = 0; i < fresh.length; i++) {
        const r = fresh[i]
        setProgress(`Đang tạo ${i + 1}/${fresh.length}: ${r.title}`)
        created.push(
          unwrap(
            await supabase.rpc('ensure_chapter', { p_title: r.title, p_section: r.section || null, p_grade: r.grade, p_subject: r.subject || null })
          )
        )
      }
      onDone(created.length, fresh[0])
    } catch (e) {
      setError(`${errMsg(e)}${created.length ? ` (đã tạo được ${created.length} chương trước khi lỗi)` : ''}`)
      if (created.length) onDone(created.length, null, true)
    } finally {
      setSaving(false)
      setProgress('')
    }
  }

  return (
    <div className="card outline-import">
      <div className="row row-between">
        <h2 style={{ margin: 0 }}>
          <Icon name="import" /> Nhập mục lục
        </h2>
        <button type="button" className="btn btn-small btn-ghost" onClick={onCancel} disabled={saving}>
          <Icon name="close" />
          Đóng
        </button>
      </div>
      <p className="muted small">
        Dán mục lục chép từ giáo trình hoặc Word. Mỗi dòng một mục: dòng <b>"Lớp 12 · Vật lý"</b> chọn lớp và môn; dòng bắt đầu bằng <b>"Chương", "Chuyên đề", "Phần"</b> là
        chuyên đề; các dòng có gạch đầu dòng, thụt vào, hoặc bắt đầu bằng <b>"Chủ đề", "Bài"</b> là chương bên trong. Không ghi lớp thì dùng{' '}
        {gradeLabel(defaults.grade)}, môn {subjectLabel(defaults.subject)}.
      </p>
      <div className="outline-grid">
        <div className="field" style={{ marginBottom: 0 }}>
          <div className="row row-between">
            <label htmlFor="outline-text" style={{ fontWeight: 600 }}>
              Mục lục
            </label>
            {!text && (
              <button type="button" className="btn btn-small btn-ghost" onClick={() => setText(OUTLINE_SAMPLE)}>
                Điền ví dụ
              </button>
            )}
          </div>
          <textarea
            id="outline-text"
            rows={14}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={OUTLINE_SAMPLE}
            spellCheck={false}
          />
        </div>

        <div className="outline-preview" aria-live="polite">
          <div className="box-label">Xem trước</div>
          {!rows.length && <p className="muted small">Dán mục lục bên trái để xem cây chương sẽ tạo.</p>}
          {groups.map((g) => (
            <div key={g.head} className="outline-group">
              <div className="outline-head">{g.head}</div>
              {g.sections.map((s) => (
                <div key={s.section || '-'} className="outline-section">
                  <div className="outline-section-title">
                    <Icon name="folder" /> {sectionLabel(s.section)}
                  </div>
                  <ul>
                    {s.rows.map((r) => (
                      <li key={r.line} className={r.existing ? 'is-existing' : ''}>
                        <span>{r.title}</span>
                        {r.existing ? <span className="badge">Đã có</span> : r.grade ? <span className="badge badge-ok">Mới</span> : <span className="badge badge-warn">Thiếu lớp</span>}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {warnings.length > 0 && (
        <ul className="alert alert-info small" style={{ paddingLeft: '1.8rem', marginTop: '0.8rem' }}>
          {warnings.map((w) => (
            <li key={w}>{w}</li>
          ))}
        </ul>
      )}
      <ErrorBox message={error} />
      {progress && <div className="alert alert-info">{progress}</div>}

      <div className="row" style={{ marginTop: '0.8rem' }}>
        <button type="button" className="btn btn-primary" onClick={save} disabled={saving || !fresh.length}>
          <Icon name="plus" />
          {saving ? 'Đang tạo...' : fresh.length ? `Tạo ${fresh.length} chương` : 'Không có chương mới'}
        </button>
        {rows.length > fresh.length && (
          <span className="muted small">
            {rows.length - fresh.length - skipped > 0 && `${rows.length - fresh.length - skipped} chương đã có sẵn, giữ nguyên. `}
            {skipped > 0 && `${skipped} chương thiếu lớp, sẽ không tạo.`}
          </span>
        )}
      </div>
    </div>
  )
}
