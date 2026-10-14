import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { supabase, unwrap } from '../../lib/supabase.js'
import { useAsync } from '../../lib/useAsync.js'
import { errMsg } from '../../lib/errors.js'
import {
  buildTree,
  fromKey,
  gradeFromKey,
  gradeLabel,
  sectionLabel,
  sortChapters,
  subjectLabel,
} from '../../lib/chapters.js'
import Loading from '../../components/Loading.jsx'
import ErrorBox from '../../components/ErrorBox.jsx'

// Lấy số đếm từ dạng PostgREST "lessons(count)" → [{ count: n }]
const countOf = (v) => (Array.isArray(v) ? v[0]?.count ?? 0 : 0)
const sumLessons = (list) => list.reduce((n, c) => n + countOf(c.lessons), 0)
const sumAssignments = (list) => list.reduce((n, c) => n + countOf(c.assignments), 0)

// Link tới một cấp trong cây: ?lop=11&mon=Vật lý&cd=Chuyên đề 2 (giá trị trống = '-')
function levelUrl(...keys) {
  const p = new URLSearchParams()
  ;['lop', 'mon', 'cd'].forEach((name, i) => keys[i] !== undefined && p.set(name, keys[i]))
  const q = p.toString()
  return q ? `/tutor/chapters?${q}` : '/tutor/chapters'
}

// Trang Chương: Lớp › Môn › Chuyên đề › Chương, mỗi cấp có nút mở cấp tiếp theo
export default function TutorChapters() {
  const [params] = useSearchParams()
  const lop = params.get('lop') ?? undefined
  const mon = lop !== undefined ? params.get('mon') ?? undefined : undefined
  const cd = mon !== undefined ? params.get('cd') ?? undefined : undefined

  const [editing, setEditing] = useState(null) // null | {} (tạo mới) | chương đang sửa
  const [editingGroup, setEditingGroup] = useState(null) // { level, title, chapters, values }
  const [actionError, setActionError] = useState(null)

  const { data, loading, error, reload } = useAsync(
    async () =>
      sortChapters(
        unwrap(await supabase.from('chapters').select('id, title, section, grade, subject, sort_order, lessons(count), assignments(count)'))
      ),
    []
  )
  const chapters = data || []
  const tree = buildTree(chapters)
  const gradeNode = lop !== undefined ? tree.find((g) => g.key === lop) : null
  const subjectNode = gradeNode && mon !== undefined ? gradeNode.subjects.find((s) => s.key === mon) : null
  const sectionNode = subjectNode && cd !== undefined ? subjectNode.sections.find((s) => s.key === cd) : null
  const level = cd !== undefined ? 3 : mon !== undefined ? 2 : lop !== undefined ? 1 : 0
  const missing = !loading && !error && ((level >= 1 && !gradeNode) || (level >= 2 && !subjectNode) || (level >= 3 && !sectionNode))

  const subjects = [...new Set(['Vật lý', ...chapters.map((c) => c.subject).filter(Boolean)])]
  const sections = [...new Set(chapters.map((c) => c.section).filter(Boolean))]

  // Thêm chương mới ở cấp đang xem thì điền sẵn lớp / môn / chuyên đề
  const preset = {
    grade: lop !== undefined ? gradeFromKey(lop) : null,
    subject: mon !== undefined ? fromKey(mon) : 'Vật lý',
    section: cd !== undefined ? fromKey(cd) : null,
  }

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

  function openChapterForm(c) {
    setEditingGroup(null)
    setEditing(c)
  }
  function openGroupForm(g) {
    setEditing(null)
    setEditingGroup(g)
  }
  const closeForms = () => {
    setEditing(null)
    setEditingGroup(null)
  }

  return (
    <div>
      <div className="page-head">
        <h1>{level === 0 ? 'Chương' : level === 1 ? gradeLabel(gradeFromKey(lop)) : level === 2 ? subjectLabel(fromKey(mon)) : sectionLabel(fromKey(cd))}</h1>
        <button type="button" className="btn btn-primary" onClick={() => openChapterForm({ ...preset })}>
          + Thêm chương
        </button>
      </div>

      <nav className="crumbs" aria-label="Vị trí">
        {level === 0 ? (
          <span className="muted small">Lớp › Môn › Chuyên đề › Chương. Khi nhập file JSON, chương được tự xếp theo lớp, môn, chuyên đề trong file.</span>
        ) : (
          <>
            <Link to={levelUrl()}>Tất cả lớp</Link>
            {level >= 2 && (
              <>
                <span>›</span>
                <Link to={levelUrl(lop)}>{gradeLabel(gradeFromKey(lop))}</Link>
              </>
            )}
            {level >= 3 && (
              <>
                <span>›</span>
                <Link to={levelUrl(lop, mon)}>{subjectLabel(fromKey(mon))}</Link>
              </>
            )}
          </>
        )}
      </nav>

      {editing && (
        <ChapterForm
          chapter={editing}
          subjects={subjects}
          sections={sections}
          nextOrder={chapters.length}
          onCancel={closeForms}
          onSaved={() => {
            closeForms()
            reload()
          }}
        />
      )}
      {editingGroup && (
        <GroupForm
          group={editingGroup}
          subjects={subjects}
          sections={sections}
          onCancel={closeForms}
          onSaved={() => {
            closeForms()
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
      {missing && (
        <div className="empty">
          Không còn chương nào ở mục này (có thể vừa đổi tên hoặc chuyển đi). <Link to={levelUrl()}>Về danh sách lớp</Link>
        </div>
      )}

      {/* Cấp 0: các lớp */}
      {level === 0 && (
        <div className="list">
          {tree.map((g) => {
            const all = g.subjects.flatMap((s) => s.sections.flatMap((x) => x.chapters))
            return (
              <GroupCard
                key={g.key}
                title={gradeLabel(g.grade)}
                to={levelUrl(g.key)}
                openLabel="Mở lớp"
                badges={[`${g.subjects.length} môn`, `${g.subjects.reduce((n, s) => n + s.sections.length, 0)} chuyên đề`, `${all.length} chương`]}
                chips={g.subjects.map((s) => ({ key: s.key, label: subjectLabel(s.subject), to: levelUrl(g.key, s.key) }))}
                onEdit={() =>
                  openGroupForm({ level: 1, title: `Sửa ${gradeLabel(g.grade)}`, chapters: all, values: { grade: g.grade } })
                }
              />
            )
          })}
        </div>
      )}

      {/* Cấp 1: các môn trong lớp */}
      {level === 1 && gradeNode && (
        <div className="list">
          {gradeNode.subjects.map((s) => {
            const all = s.sections.flatMap((x) => x.chapters)
            return (
              <GroupCard
                key={s.key}
                title={subjectLabel(s.subject)}
                to={levelUrl(lop, s.key)}
                openLabel="Mở môn"
                badges={[`${s.sections.length} chuyên đề`, `${all.length} chương`, `${sumLessons(all)} bài giảng`, `${sumAssignments(all)} bài tập`]}
                chips={s.sections.map((x) => ({ key: x.key, label: sectionLabel(x.section), to: levelUrl(lop, s.key, x.key) }))}
                onEdit={() =>
                  openGroupForm({
                    level: 2,
                    title: `Sửa môn ${subjectLabel(s.subject)} – ${gradeLabel(gradeNode.grade)}`,
                    chapters: all,
                    values: { grade: gradeNode.grade, subject: s.subject },
                  })
                }
              />
            )
          })}
        </div>
      )}

      {/* Cấp 2: các chuyên đề trong môn */}
      {level === 2 && subjectNode && (
        <div className="list">
          {subjectNode.sections.map((x) => (
            <GroupCard
              key={x.key}
              title={sectionLabel(x.section)}
              to={levelUrl(lop, mon, x.key)}
              openLabel="Mở chuyên đề"
              badges={[`${x.chapters.length} chương`, `${sumLessons(x.chapters)} bài giảng`, `${sumAssignments(x.chapters)} bài tập`]}
              chips={x.chapters.map((c) => ({ key: c.id, label: c.title, to: `/tutor/chapters/${c.id}` }))}
              onEdit={() =>
                openGroupForm({
                  level: 3,
                  title: `Sửa chuyên đề ${sectionLabel(x.section)}`,
                  chapters: x.chapters,
                  values: { grade: gradeNode.grade, subject: subjectNode.subject, section: x.section },
                })
              }
            />
          ))}
        </div>
      )}

      {/* Cấp 3: các chương trong chuyên đề */}
      {level === 3 && sectionNode && (
        <div className="list">
          {sectionNode.chapters.map((c) => (
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
                <button type="button" className="btn btn-small" onClick={() => openChapterForm(c)}>
                  Sửa
                </button>
                <button type="button" className="btn btn-small btn-danger" onClick={() => handleDelete(c)}>
                  Xóa
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// Thẻ một nhóm (lớp / môn / chuyên đề): tên, số đếm, lối tắt tới cấp con, nút mở + sửa
function GroupCard({ title, to, openLabel, badges, chips, onEdit }) {
  return (
    <div className="list-item">
      <Link to={to} className="list-item-title" style={{ display: 'block', color: 'inherit' }}>
        {title}
      </Link>
      <div className="row small" style={{ marginBottom: '0.5rem' }}>
        {badges.map((b) => (
          <span key={b} className="badge">
            {b}
          </span>
        ))}
      </div>
      {chips.length > 0 && (
        <div className="chips">
          {chips.map((c) => (
            <Link key={c.key} to={c.to} className="chip">
              {c.label}
            </Link>
          ))}
        </div>
      )}
      <div className="row">
        <Link className="btn btn-small btn-primary" to={to}>
          {openLabel}
        </Link>
        <button type="button" className="btn btn-small" onClick={onEdit}>
          Sửa
        </button>
      </div>
    </div>
  )
}

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

function ChapterForm({ chapter, subjects, sections, nextOrder, onCancel, onSaved }) {
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
      if (isEdit) unwrap(await supabase.from('chapters').update(row).eq('id', chapter.id))
      else unwrap(await supabase.from('chapters').insert(row))
      onSaved()
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
        <input type="text" value={form.title} onChange={(e) => set('title')(e.target.value)} placeholder="Chủ đề 4: Giao thoa sóng cơ" required />
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

// Sửa cả nhóm cùng lúc: đổi lớp / tên môn / tên chuyên đề cho mọi chương trong nhóm
function GroupForm({ group, subjects, sections, onCancel, onSaved }) {
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
      onSaved()
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

