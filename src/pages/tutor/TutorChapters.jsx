import { useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase, unwrap } from '../../lib/supabase.js'
import { useAsync } from '../../lib/useAsync.js'
import { errMsg } from '../../lib/errors.js'
import { groupBySection, sortChapters } from '../../lib/chapters.js'
import Loading from '../../components/Loading.jsx'
import ErrorBox from '../../components/ErrorBox.jsx'

// Lấy số đếm từ dạng PostgREST "lessons(count)" → [{ count: n }]
const countOf = (v) => (Array.isArray(v) ? v[0]?.count ?? 0 : 0)

export default function TutorChapters() {
  const [editing, setEditing] = useState(null) // null | {} (tạo mới) | chương đang sửa
  const [actionError, setActionError] = useState(null)

  const { data, loading, error, reload } = useAsync(
    async () =>
      sortChapters(unwrap(await supabase.from('chapters').select('id, title, section, sort_order, lessons(count), assignments(count)'))),
    []
  )
  const chapters = data || []
  const sections = [...new Set(chapters.map((c) => c.section).filter(Boolean))]

  async function handleDelete(c) {
    const n = countOf(c.lessons) + countOf(c.assignments)
    const msg = n
      ? `Xóa chương "${c.title}"? ${n} bài giảng / bài tập trong chương sẽ KHÔNG bị xóa, chỉ chuyển sang "Chưa xếp chương".`
      : `Xóa chương "${c.title}"?`
    if (!window.confirm(msg)) return
    setActionError(null)
    try {
      unwrap(await supabase.from('chapters').delete().eq('id', c.id))
      reload()
    } catch (e) {
      setActionError(errMsg(e))
    }
  }

  return (
    <div>
      <div className="page-head">
        <h1>Chương</h1>
        <button type="button" className="btn btn-primary" onClick={() => setEditing({})}>
          + Thêm chương
        </button>
      </div>
      <p className="muted small" style={{ marginTop: '-0.5rem' }}>
        Mỗi chương gom bài giảng và bài tập của cùng một nội dung. Khi nhập file JSON, chương được tự tạo theo trường <code>topic</code>.
      </p>

      {editing && (
        <ChapterForm
          chapter={editing}
          sections={sections}
          nextOrder={chapters.length}
          onCancel={() => setEditing(null)}
          onSaved={() => {
            setEditing(null)
            reload()
          }}
        />
      )}

      <ErrorBox message={actionError} />
      {loading && <Loading />}
      <ErrorBox message={error} onRetry={reload} />

      {!loading && !error && chapters.length === 0 && (
        <div className="empty">Chưa có chương nào. Bấm "Thêm chương" hoặc nhập một file JSON để tự tạo.</div>
      )}

      {groupBySection(chapters).map((g) => (
        <section key={g.section} style={{ marginBottom: '1.25rem' }}>
          <h2 className="section-title">{g.section}</h2>
          <div className="list">
            {g.chapters.map((c) => (
              <div key={c.id} className="list-item">
                <Link to={`/tutor/chapters/${c.id}`} className="list-item-title" style={{ display: 'block', color: 'inherit' }}>
                  {c.title}
                </Link>
                <div className="row small" style={{ marginBottom: '0.5rem' }}>
                  <span className="badge">{countOf(c.lessons)} bài giảng</span>
                  <span className="badge">{countOf(c.assignments)} bài tập</span>
                </div>
                <div className="row">
                  <Link className="btn btn-small btn-primary" to={`/tutor/chapters/${c.id}`}>
                    Mở chương
                  </Link>
                  <button type="button" className="btn btn-small" onClick={() => setEditing(c)}>
                    Sửa
                  </button>
                  <button type="button" className="btn btn-small btn-danger" onClick={() => handleDelete(c)}>
                    Xóa
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}

function ChapterForm({ chapter, sections, nextOrder, onCancel, onSaved }) {
  const isEdit = !!chapter.id
  const [form, setForm] = useState({
    title: chapter.title || '',
    section: chapter.section || '',
    sort_order: chapter.sort_order ?? nextOrder,
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  async function save(e) {
    e.preventDefault()
    if (!form.title.trim()) return setError('Hãy nhập tên chương.')
    setSaving(true)
    setError(null)
    const row = { title: form.title.trim(), section: form.section.trim() || null, sort_order: Number(form.sort_order) || 0 }
    try {
      if (isEdit) unwrap(await supabase.from('chapters').update(row).eq('id', chapter.id))
      else unwrap(await supabase.from('chapters').insert(row))
      onSaved()
    } catch (err) {
      setError(/duplicate|unique/i.test(err.message || '') ? 'Đã có chương trùng tên.' : errMsg(err))
      setSaving(false)
    }
  }

  return (
    <form className="card" onSubmit={save}>
      <h2>{isEdit ? 'Sửa chương' : 'Thêm chương'}</h2>
      <ErrorBox message={error} />
      <label className="field">
        <span>Tên chương *</span>
        <input
          type="text"
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          placeholder="Chủ đề 4: Giao thoa sóng cơ"
          required
        />
      </label>
      <div className="grid-2">
        <label className="field">
          <span>Thuộc chuyên đề (để nhóm)</span>
          <input
            type="text"
            list="chapter-sections"
            value={form.section}
            onChange={(e) => setForm({ ...form, section: e.target.value })}
            placeholder="Chuyên đề 2: Sóng"
          />
          <datalist id="chapter-sections">
            {sections.map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
        </label>
        <label className="field">
          <span>Thứ tự</span>
          <input type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: e.target.value })} />
        </label>
      </div>
      <div className="row">
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? 'Đang lưu...' : 'Lưu'}
        </button>
        <button type="button" className="btn btn-ghost" onClick={onCancel} disabled={saving}>
          Hủy
        </button>
      </div>
    </form>
  )
}
