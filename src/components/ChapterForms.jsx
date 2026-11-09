import { useState } from 'react'
import { supabase, unwrap } from '../lib/supabase.js'
import { errMsg } from '../lib/errors.js'
import ErrorBox from './ErrorBox.jsx'
import Icon from './Icon.jsx'
import CustomSelect from './CustomSelect.jsx'

const GRADES = [6, 7, 8, 9, 10, 11, 12]

function GradeSelect({ value, onChange }) {
  const options = [
    { value: '', label: '— Chưa rõ lớp —' },
    ...GRADES.map((g) => ({ value: g, label: `Lớp ${g}` })),
  ]
  return (
    <div className="field">
      <span>Lớp</span>
      <CustomSelect
        value={value ?? ''}
        onChange={(val) => onChange(val ? Number(val) : null)}
        options={options}
        placeholder="— Chưa rõ lớp —"
        ariaLabel="Khối lớp"
      />
    </div>
  )
}

function TextWithList({ label, id, value, onChange, options, placeholder, autoFocus = false, hint = '' }) {
  return (
    <label className="field">
      <span>{label}</span>
      <input type="text" list={id} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} autoFocus={autoFocus} />
      <datalist id={id}>
        {options.map((s) => (
          <option key={s} value={s} />
        ))}
      </datalist>
      {hint && <small className="muted">{hint}</small>}
    </label>
  )
}

const dupMessage = (err, what = 'chủ đề trùng tên trong cùng lớp, môn và khóa') =>
  /duplicate|unique/i.test(err.message || '') ? `Đã có ${what}.` : errMsg(err)
const norm = (v) => (v || '').trim().toLowerCase()
// Khóa thuộc đúng lớp + môn đang chọn trong form
const coursesFor = (courses, grade, subject) => courses.filter((k) => (k.grade ?? null) === (grade ?? null) && norm(k.subject) === norm(subject))

function FormButtons({ saving, onCancel }) {
  return (
    <div className="row">
      <button type="submit" className="btn btn-primary" disabled={saving}>
        <Icon name="save" />
        {saving ? 'Đang lưu...' : 'Lưu'}
      </button>
      <button type="button" className="btn btn-ghost" onClick={onCancel} disabled={saving}>
        <Icon name="close" />
        Hủy
      </button>
    </div>
  )
}

// Thêm / sửa một chủ đề. chapter = {} (thêm mới, có thể điền sẵn grade/subject/course_id/section) hoặc chủ đề đang sửa
// courses: mọi khóa; ô Khóa chỉ hiện khóa cùng lớp + môn đang chọn
export function ChapterForm({ chapter, subjects, sections, courses = [], nextOrder, onCancel, onSaved }) {
  const isEdit = !!chapter.id
  const [form, setForm] = useState({
    title: chapter.title || '',
    grade: chapter.grade ?? null,
    subject: chapter.subject || '',
    course_id: chapter.course_id || '',
    section: chapter.section || '',
    sort_order: chapter.sort_order ?? nextOrder,
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }))
  const courseOptions = coursesFor(courses, form.grade, form.subject)

  async function save(e) {
    e.preventDefault()
    if (!form.title.trim()) return setError('Hãy nhập tên chủ đề.')
    setSaving(true)
    setError(null)
    const row = {
      title: form.title.trim(),
      grade: form.grade,
      subject: form.subject.trim() || null,
      // Đổi lớp / môn mà khóa cũ không còn thuộc lớp / môn đó → về "Chương ngoài khóa"
      course_id: courseOptions.some((k) => k.id === form.course_id) ? form.course_id : null,
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
      <h2>{isEdit ? 'Sửa chủ đề' : 'Thêm chủ đề'}</h2>
      <ErrorBox message={error} />
      <label className="field">
        <span>Tên chủ đề *</span>
        <input type="text" value={form.title} onChange={(e) => set('title')(e.target.value)} placeholder="Chủ đề 4: Giao thoa sóng cơ" required autoFocus />
        <small className="muted">Một bài / một buổi học, vd. Chủ đề 4: Giao thoa sóng cơ.</small>
      </label>
      <div className="grid-2">
        <GradeSelect value={form.grade} onChange={set('grade')} />
        <TextWithList label="Môn" id="chapter-subjects" value={form.subject} onChange={set('subject')} options={subjects} placeholder="Vật lý" />
      </div>
      {courseOptions.length > 0 && (
        <div className="field">
          <span>Khóa</span>
          <CustomSelect
            value={courseOptions.some((k) => k.id === form.course_id) ? form.course_id : ''}
            onChange={set('course_id')}
            options={[{ value: '', label: '— Chương ngoài khóa —' }, ...courseOptions.map((k) => ({ value: k.id, label: k.title }))]}
            placeholder="— Chương ngoài khóa —"
            ariaLabel="Khóa học"
          />
        </div>
      )}
      <div className="grid-2">
        <TextWithList
          label="Chương"
          id="chapter-sections"
          value={form.section}
          onChange={set('section')}
          options={sections}
          placeholder="Chương 2: Sóng"
          hint="Nhóm lớn gom nhiều chủ đề, vd. Chương 2: Sóng."
        />
        <label className="field">
          <span>Thứ tự trong chương</span>
          <input type="number" value={form.sort_order} onChange={(e) => set('sort_order')(e.target.value)} />
        </label>
      </div>
      <FormButtons saving={saving} onCancel={onCancel} />
    </form>
  )
}

// Sửa cả nhóm cùng lúc: đổi lớp / tên môn / khóa / tên chương cho mọi chủ đề trong nhóm.
// group = { level: 1 lớp | 2 môn | 3 chương, title, chapters, values: { grade, subject, course_id, section } }
export function GroupForm({ group, subjects, sections, courses = [], onCancel, onSaved }) {
  const [form, setForm] = useState({
    grade: group.values.grade ?? null,
    subject: group.values.subject || '',
    course_id: group.values.course_id || '',
    section: group.values.section || '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }))
  const courseOptions = coursesFor(courses, form.grade, form.subject)

  async function save(e) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    const row = { grade: form.grade }
    if (group.level >= 2) row.subject = form.subject.trim() || null
    if (group.level >= 3) {
      row.section = form.section.trim() || null
      if (group.values.course_id !== undefined) {
        row.course_id = courseOptions.some((k) => k.id === form.course_id) ? form.course_id : null
      }
    }
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
      <p className="muted small">Áp dụng cho {group.chapters.length} chủ đề trong nhóm này. Bài giảng, bài tập bên trong giữ nguyên.</p>
      <ErrorBox message={error} />
      {group.level >= 3 && (
        <TextWithList label="Tên chương" id="group-sections" value={form.section} onChange={set('section')} options={sections} placeholder="Chương 2: Sóng" autoFocus />
      )}
      <div className="grid-2">
        <GradeSelect value={form.grade} onChange={set('grade')} />
        {group.level >= 2 && (
          <TextWithList label="Môn" id="group-subjects" value={form.subject} onChange={set('subject')} options={subjects} placeholder="Vật lý" autoFocus={group.level === 2} />
        )}
      </div>
      {group.level >= 3 && courseOptions.length > 0 && (
        <div className="field">
          <span>Khóa</span>
          <CustomSelect
            value={courseOptions.some((k) => k.id === form.course_id) ? form.course_id : ''}
            onChange={set('course_id')}
            options={[{ value: '', label: '— Chương ngoài khóa —' }, ...courseOptions.map((k) => ({ value: k.id, label: k.title }))]}
            placeholder="— Chương ngoài khóa —"
            ariaLabel="Khóa học"
          />
        </div>
      )}
      <FormButtons saving={saving} onCancel={onCancel} />
    </form>
  )
}

// Thêm / đổi tên một khóa. course = { grade, subject } (thêm mới trong lớp + môn đang xem) hoặc khóa đang sửa
// subject undefined (mở từ trang lớp) → hiện ô Môn
export function CourseForm({ course, subjects = [], onCancel, onSaved }) {
  const isEdit = !!course.id
  const askSubject = !isEdit && course.subject === undefined
  const [title, setTitle] = useState(course.title || '')
  const [subject, setSubject] = useState('Vật lý')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  async function save(e) {
    e.preventDefault()
    if (!title.trim()) return setError('Hãy nhập tên khóa.')
    setSaving(true)
    setError(null)
    try {
      const row = isEdit
        ? unwrap(await supabase.from('courses').update({ title: title.trim() }).eq('id', course.id).select('id, grade, subject').single())
        : unwrap(
            await supabase
              .from('courses')
              .insert({ title: title.trim(), grade: course.grade ?? null, subject: (askSubject ? subject.trim() : course.subject) || null })
              .select('id, grade, subject')
              .single(),
          )
      onSaved(row)
    } catch (err) {
      setError(dupMessage(err, 'khóa trùng tên trong cùng lớp và môn'))
      setSaving(false)
    }
  }

  const where = [course.grade ? `Lớp ${course.grade}` : '', course.subject || ''].filter(Boolean).join(' · ')
  return (
    <form className="card" onSubmit={save}>
      <h2>{isEdit ? 'Đổi tên khóa' : 'Thêm khóa'}</h2>
      {where && <p className="muted small">{where}</p>}
      <ErrorBox message={error} />
      <label className="field">
        <span>Tên khóa *</span>
        <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Khóa cơ bản" maxLength={80} required autoFocus />
      </label>
      {askSubject && <TextWithList label="Môn" id="course-subjects" value={subject} onChange={setSubject} options={subjects} placeholder="Vật lý" />}
      <FormButtons saving={saving} onCancel={onCancel} />
    </form>
  )
}
