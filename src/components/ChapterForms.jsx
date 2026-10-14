import { useState } from 'react'
import { supabase, unwrap } from '../lib/supabase.js'
import { errMsg } from '../lib/errors.js'
import ErrorBox from './ErrorBox.jsx'

const GRADES = [6, 7, 8, 9, 10, 11, 12]

function GradeSelect({ value, onChange }) {
  return (
    <label className="field">
      <span>Lớp</span>
      <select value={value ?? ''} onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}>
        <option value="">— Chưa rõ lớp —</option>
        {GRADES.map((g) => (
          <option key={g} value={g}>
            Lớp {g}
          </option>
        ))}
      </select>
    </label>
  )
}

function TextWithList({ label, id, value, onChange, options, placeholder }) {
  return (
    <label className="field">
      <span>{label}</span>
      <input type="text" list={id} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
      <datalist id={id}>
        {options.map((s) => (
          <option key={s} value={s} />
        ))}
      </datalist>
    </label>
  )
}

const dupMessage = (err) => (/duplicate|unique/i.test(err.message || '') ? 'Đã có chương trùng tên trong cùng lớp và môn.' : errMsg(err))

function FormButtons({ saving, onCancel }) {
  return (
    <div className="row">
      <button type="submit" className="btn btn-primary" disabled={saving}>
        {saving ? 'Đang lưu...' : 'Lưu'}
      </button>
      <button type="button" className="btn btn-ghost" onClick={onCancel} disabled={saving}>
        Hủy
      </button>
    </div>
  )
}

// Thêm / sửa một chương. chapter = {} (thêm mới, có thể điền sẵn grade/subject/section) hoặc chương đang sửa
export function ChapterForm({ chapter, subjects, sections, nextOrder, onCancel, onSaved }) {
  const isEdit = !!chapter.id
  const [form, setForm] = useState({
    title: chapter.title || '',
    grade: chapter.grade ?? null,
    subject: chapter.subject || '',
    section: chapter.section || '',
    sort_order: chapter.sort_order ?? nextOrder,
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }))

  async function save(e) {
    e.preventDefault()
    if (!form.title.trim()) return setError('Hãy nhập tên chương.')
    setSaving(true)
    setError(null)
    const row = {
      title: form.title.trim(),
      grade: form.grade,
      subject: form.subject.trim() || null,
      section: form.section.trim() || null,
      sort_order: Number(form.sort_order) || 0,
    }
    try {
      const saved = isEdit
        ? unwrap(await supabase.from('chapters').update(row).eq('id', chapter.id).select('id').single())
        : unwrap(await supabase.from('chapters').insert(row).select('id').single())
      onSaved(saved?.id)
    } catch (err) {
      setError(dupMessage(err))
      setSaving(false)
    }
  }

  return (
    <form className="card" onSubmit={save}>
      <h2>{isEdit ? 'Sửa chương' : 'Thêm chương'}</h2>
      <ErrorBox message={error} />
      <label className="field">
        <span>Tên chương *</span>
        <input type="text" value={form.title} onChange={(e) => set('title')(e.target.value)} placeholder="Chủ đề 4: Giao thoa sóng cơ" required autoFocus />
      </label>
      <div className="grid-2">
        <GradeSelect value={form.grade} onChange={set('grade')} />
        <TextWithList label="Môn" id="chapter-subjects" value={form.subject} onChange={set('subject')} options={subjects} placeholder="Vật lý" />
      </div>
      <div className="grid-2">
        <TextWithList label="Chuyên đề" id="chapter-sections" value={form.section} onChange={set('section')} options={sections} placeholder="Chuyên đề 2: Sóng" />
        <label className="field">
          <span>Thứ tự trong chuyên đề</span>
          <input type="number" value={form.sort_order} onChange={(e) => set('sort_order')(e.target.value)} />
        </label>
      </div>
      <FormButtons saving={saving} onCancel={onCancel} />
    </form>
  )
}

// Sửa cả nhóm cùng lúc: đổi lớp / tên môn / tên chuyên đề cho mọi chương trong nhóm.
// group = { level: 1 lớp | 2 môn | 3 chuyên đề, title, chapters, values: { grade, subject, section } }
export function GroupForm({ group, subjects, sections, onCancel, onSaved }) {
  const [form, setForm] = useState({
    grade: group.values.grade ?? null,
    subject: group.values.subject || '',
    section: group.values.section || '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }))

  async function save(e) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    const row = { grade: form.grade }
    if (group.level >= 2) row.subject = form.subject.trim() || null
    if (group.level >= 3) row.section = form.section.trim() || null
    try {
      unwrap(
        await supabase
          .from('chapters')
          .update(row)
          .in(
            'id',
            group.chapters.map((c) => c.id)
          )
      )
      onSaved(row)
    } catch (err) {
      setError(dupMessage(err))
      setSaving(false)
    }
  }

  return (
    <form className="card" onSubmit={save}>
      <h2>{group.title}</h2>
      <p className="muted small">Áp dụng cho {group.chapters.length} chương trong nhóm này. Bài giảng, bài tập bên trong giữ nguyên.</p>
      <ErrorBox message={error} />
      <div className="grid-2">
        <GradeSelect value={form.grade} onChange={set('grade')} />
        {group.level >= 2 && (
          <TextWithList label="Môn" id="group-subjects" value={form.subject} onChange={set('subject')} options={subjects} placeholder="Vật lý" />
        )}
      </div>
      {group.level >= 3 && (
        <TextWithList label="Tên chuyên đề" id="group-sections" value={form.section} onChange={set('section')} options={sections} placeholder="Chuyên đề 2: Sóng" />
      )}
      <FormButtons saving={saving} onCancel={onCancel} />
    </form>
  )
}
