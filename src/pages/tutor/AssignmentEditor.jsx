import { useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { supabase, unwrap } from '../../lib/supabase.js'
import { useAsync } from '../../lib/useAsync.js'
import { errMsg } from '../../lib/errors.js'
import { fetchAssignmentFull, toExercisePayload } from '../../lib/assignments.js'
import { tempKey } from '../../lib/students.js'
import Loading from '../../components/Loading.jsx'
import ErrorBox from '../../components/ErrorBox.jsx'
import MarkdownField from '../../components/MarkdownField.jsx'
import StudentPicker from '../../components/StudentPicker.jsx'
import { KIND_LABEL } from '../../components/ExerciseBody.jsx'

const letter = (i) => String.fromCharCode(65 + i) // A, B, C...
const blankId = (i) => String.fromCharCode(97 + i) // a, b, c...

// Dạng dữ liệu trong form (dễ sửa hơn dạng lưu trong CSDL):
// mcq: [{ text }] + mcqCorrect (vị trí), blanks: [{ statement, answer }]
function toFormExercise(e) {
  const kind = e.kind || 'essay'
  const base = {
    key: tempKey(),
    id: e.id || null,
    kind,
    question_md: e.question_md || '',
    answer_md: e.answer_md || '',
    method_md: e.method_md || '',
    mcq: [{ text: '' }, { text: '' }, { text: '' }, { text: '' }],
    mcqCorrect: -1,
    blanks: [{ statement: '', answer: '' }],
  }
  if (kind === 'mcq') {
    const opts = e.options || []
    base.mcq = opts.map((o) => ({ text: o.text || '' }))
    base.mcqCorrect = opts.findIndex((o) => o.label === e.correct)
  }
  if (kind === 'fill_blank') {
    base.blanks = (e.options || []).map((b) => ({ statement: b.statement || '', answer: e.correct?.[b.id] ?? '' }))
  }
  return base
}

function fromFormExercise(ex) {
  if (ex.kind === 'mcq') {
    const options = ex.mcq.map((o, i) => ({ label: letter(i), text: o.text.trim() }))
    const correct = ex.mcqCorrect >= 0 ? letter(ex.mcqCorrect) : null
    const right = options[ex.mcqCorrect]
    return toExercisePayload({
      ...ex,
      options,
      correct,
      answer_md: right ? `**${right.label}.** ${right.text}` : '',
    })
  }
  if (ex.kind === 'fill_blank') {
    const options = ex.blanks.map((b, i) => ({ id: blankId(i), statement: b.statement.trim() }))
    const correct = Object.fromEntries(ex.blanks.map((b, i) => [blankId(i), b.answer.trim()]))
    return toExercisePayload({
      ...ex,
      options,
      correct,
      answer_md: ex.blanks.map((b, i) => `**${blankId(i)})** ${b.answer.trim()}`).join('\n\n'),
    })
  }
  return toExercisePayload(ex)
}

// Kiểm tra một câu, trả về câu báo lỗi hoặc null
function checkExercise(ex, n) {
  if (!ex.question_md.trim()) return `Câu ${n} chưa có đề bài.`
  if (ex.kind === 'mcq') {
    if (ex.mcq.filter((o) => o.text.trim()).length < 2 || ex.mcq.some((o) => !o.text.trim()))
      return `Câu ${n}: điền đủ nội dung các phương án (ít nhất 2), hoặc xóa phương án trống.`
    if (ex.mcqCorrect < 0) return `Câu ${n}: hãy chọn phương án đúng.`
  }
  if (ex.kind === 'fill_blank') {
    if (!ex.blanks.length) return `Câu ${n}: cần ít nhất 1 chỗ trống.`
    if (ex.blanks.some((b) => !b.statement.trim() || !b.answer.trim())) return `Câu ${n}: mỗi ý cần có nội dung và đáp án.`
  }
  return null
}

// Trang soạn / sửa bài tập. Dùng cho: /tutor/assignments/new, /tutor/assignments/:id/edit,
// và bản nháp từ "Dán JSON" (truyền qua location.state.draft).
export default function AssignmentEditor() {
  const { id } = useParams()
  const location = useLocation()
  const draft = location.state?.draft

  const { data, loading, error, reload } = useAsync(async () => {
    const lessons = unwrap(await supabase.from('lessons').select('id, title').order('created_at', { ascending: false }))
    if (id) {
      const full = await fetchAssignmentFull(id)
      return {
        lessons,
        initial: {
          id,
          title: full.assignment.title,
          type: full.assignment.type,
          due_date: full.assignment.due_date || '',
          lesson_id: full.assignment.lesson_id || '',
          exercises: full.exercises.map(toFormExercise),
          student_ids: full.recipients.map((r) => r.student_id),
        },
        // Học sinh đã nộp: cảnh báo nếu bị bỏ chọn
        submittedIds: full.recipients.filter((r) => r.status !== 'todo').map((r) => r.student_id),
      }
    }
    return {
      lessons,
      initial: {
        id: null,
        title: draft?.title || '',
        type: draft?.type || 'homework',
        due_date: draft?.due_date || '',
        lesson_id: '',
        exercises: draft?.exercises?.length ? draft.exercises.map((e) => toFormExercise({ ...e, id: null })) : [toFormExercise({})],
        student_ids: [],
      },
      submittedIds: [],
    }
  }, [id])

  if (loading) return <Loading />
  if (error)
    return (
      <div>
        <ErrorBox message={error} onRetry={reload} />
        <Link to="/tutor/assignments">← Về danh sách bài tập</Link>
      </div>
    )

  return <AssignmentForm key={id || 'new'} {...data} fromImport={!!draft && !id} />
}

function AssignmentForm({ initial, lessons, submittedIds, fromImport }) {
  const navigate = useNavigate()
  const [form, setForm] = useState(initial)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const isEdit = !!initial.id

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))
  const updateEx = (index, patch) =>
    setForm((f) => ({ ...f, exercises: f.exercises.map((e, i) => (i === index ? { ...e, ...patch } : e)) }))
  const moveEx = (index, delta) =>
    setForm((f) => {
      const list = [...f.exercises]
      const j = index + delta
      if (j < 0 || j >= list.length) return f
      ;[list[index], list[j]] = [list[j], list[index]]
      return { ...f, exercises: list }
    })
  const removeEx = (index) => setForm((f) => ({ ...f, exercises: f.exercises.filter((_, i) => i !== index) }))

  async function save(e) {
    e.preventDefault()
    setError(null)

    if (!form.title.trim()) return setError('Hãy nhập tiêu đề bài tập.')
    if (!form.exercises.length) return setError('Bài tập cần ít nhất 1 câu hỏi.')
    for (let i = 0; i < form.exercises.length; i++) {
      const msg = checkExercise(form.exercises[i], i + 1)
      if (msg) return setError(msg)
    }
    if (!form.student_ids.length && !window.confirm('Chưa chọn học sinh nào. Vẫn lưu?')) return

    const removedSubmitted = submittedIds.filter((sid) => !form.student_ids.includes(sid))
    if (
      removedSubmitted.length &&
      !window.confirm(`Bạn bỏ chọn ${removedSubmitted.length} học sinh đã nộp bài. Bài nộp và điểm của các em sẽ bị xóa. Tiếp tục?`)
    )
      return

    setSaving(true)
    try {
      const payload = {
        id: form.id,
        title: form.title.trim(),
        type: form.type,
        due_date: form.due_date || null,
        lesson_id: form.lesson_id || null,
        exercises: form.exercises.map(fromFormExercise),
        student_ids: form.student_ids,
      }
      const newId = unwrap(await supabase.rpc('save_assignment', { p: payload }))
      navigate(`/tutor/assignments/${newId}`, { replace: true })
    } catch (err) {
      setError(errMsg(err))
      setSaving(false)
    }
  }

  return (
    <form onSubmit={save}>
      <div className="page-head">
        <h1>{isEdit ? 'Sửa bài tập' : 'Soạn bài tập'}</h1>
        <Link to="/tutor/assignments">← Danh sách</Link>
      </div>

      {fromImport && <div className="alert alert-info">Đã nạp nội dung từ JSON. Kiểm tra lại, chọn học sinh nhận rồi bấm Lưu.</div>}
      {isEdit && submittedIds.length > 0 && (
        <div className="alert alert-info">
          Đã có {submittedIds.length} học sinh nộp bài. Câu trả lời của các em được giữ; nếu bạn sửa đáp án trắc nghiệm hoặc điền khuyết, bài đã nộp sẽ
          được chấm lại theo đáp án mới. Xóa câu nào thì câu trả lời của câu đó cũng bị xóa.
        </div>
      )}

      <div className="card">
        <label className="field">
          <span>Tiêu đề *</span>
          <input type="text" value={form.title} onChange={(e) => set('title', e.target.value)} required />
        </label>
        <div className="grid-2">
          <label className="field">
            <span>Loại</span>
            <select value={form.type} onChange={(e) => set('type', e.target.value)}>
              <option value="classwork">Làm trên lớp</option>
              <option value="homework">Về nhà</option>
            </select>
          </label>
          <label className="field">
            <span>Hạn nộp</span>
            <input type="date" value={form.due_date} onChange={(e) => set('due_date', e.target.value)} />
          </label>
        </div>
        <label className="field">
          <span>Bài giảng liên quan (không bắt buộc)</span>
          <select value={form.lesson_id} onChange={(e) => set('lesson_id', e.target.value)}>
            <option value="">— Không —</option>
            {lessons.map((l) => (
              <option key={l.id} value={l.id}>
                {l.title}
              </option>
            ))}
          </select>
        </label>
      </div>

      <h2>Câu hỏi ({form.exercises.length})</h2>
      <p className="muted small">
        Viết Markdown, công thức đặt trong <code>$...$</code> hoặc <code>$$...$$</code>. Trắc nghiệm và điền khuyết được chấm tự động khi học sinh nộp.
        Đáp án và phương pháp chỉ hiện cho học sinh sau khi nộp.
      </p>
      {form.exercises.map((ex, i) => (
        <div key={ex.key} className="exercise-edit">
          <div className="row row-between" style={{ marginBottom: '0.5rem' }}>
            <div className="row">
              <strong>Câu {i + 1}</strong>
              <select
                aria-label={`Loại câu ${i + 1}`}
                value={ex.kind}
                onChange={(e) => updateEx(i, { kind: e.target.value })}
                style={{ width: 'auto' }}
              >
                {Object.entries(KIND_LABEL).map(([k, label]) => (
                  <option key={k} value={k}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div className="row">
              <button type="button" className="btn btn-small" onClick={() => moveEx(i, -1)} disabled={i === 0} aria-label="Lên">
                ↑
              </button>
              <button
                type="button"
                className="btn btn-small"
                onClick={() => moveEx(i, 1)}
                disabled={i === form.exercises.length - 1}
                aria-label="Xuống"
              >
                ↓
              </button>
              <button type="button" className="btn btn-small btn-danger" onClick={() => removeEx(i)} disabled={form.exercises.length === 1}>
                Xóa câu
              </button>
            </div>
          </div>

          <MarkdownField label="Đề bài" required value={ex.question_md} onChange={(v) => updateEx(i, { question_md: v })} />

          {ex.kind === 'mcq' && <McqEditor ex={ex} index={i} onChange={(patch) => updateEx(i, patch)} />}
          {ex.kind === 'fill_blank' && <BlankEditor ex={ex} onChange={(patch) => updateEx(i, patch)} />}
          {ex.kind === 'essay' && (
            <MarkdownField label="Đáp án" rows={2} value={ex.answer_md} onChange={(v) => updateEx(i, { answer_md: v })} />
          )}
          <MarkdownField label="Phương pháp giải" rows={3} value={ex.method_md} onChange={(v) => updateEx(i, { method_md: v })} />
        </div>
      ))}
      <button type="button" className="btn" onClick={() => set('exercises', [...form.exercises, toFormExercise({})])}>
        + Thêm câu hỏi
      </button>

      <div className="card" style={{ marginTop: '1rem' }}>
        <h2>Học sinh nhận bài</h2>
        <StudentPicker value={form.student_ids} onChange={(v) => set('student_ids', v)} />
      </div>

      <div className="sticky-actions">
        <ErrorBox message={error} />
        <button type="submit" className="btn btn-primary btn-big" disabled={saving}>
          {saving ? 'Đang lưu...' : isEdit ? 'Lưu thay đổi' : 'Lưu và giao bài'}
        </button>
      </div>
    </form>
  )
}

// Soạn phương án trắc nghiệm; chấm tròn bên trái là phương án đúng
function McqEditor({ ex, index, onChange }) {
  const setText = (j, text) => onChange({ mcq: ex.mcq.map((o, k) => (k === j ? { text } : o)) })
  const remove = (j) =>
    onChange({
      mcq: ex.mcq.filter((_, k) => k !== j),
      mcqCorrect: ex.mcqCorrect === j ? -1 : ex.mcqCorrect > j ? ex.mcqCorrect - 1 : ex.mcqCorrect,
    })
  return (
    <div className="field">
      <span>Phương án (chọn chấm tròn ở phương án đúng)</span>
      {ex.mcq.map((o, j) => (
        <div key={j} className="option-row">
          <input
            type="radio"
            name={`correct-${ex.key}`}
            checked={ex.mcqCorrect === j}
            onChange={() => onChange({ mcqCorrect: j })}
            aria-label={`Phương án ${letter(j)} là đáp án đúng (câu ${index + 1})`}
          />
          <span className="choice-label">{letter(j)}</span>
          <input type="text" value={o.text} onChange={(e) => setText(j, e.target.value)} placeholder={`Nội dung phương án ${letter(j)}`} />
          <button type="button" className="btn btn-small btn-ghost" onClick={() => remove(j)} disabled={ex.mcq.length <= 2} aria-label="Xóa phương án">
            ×
          </button>
        </div>
      ))}
      {ex.mcq.length < 8 && (
        <button type="button" className="btn btn-small" style={{ alignSelf: 'flex-start' }} onClick={() => onChange({ mcq: [...ex.mcq, { text: '' }] })}>
          + Thêm phương án
        </button>
      )}
    </div>
  )
}

// Soạn các ý điền khuyết: nội dung có chỗ trống + đáp án
function BlankEditor({ ex, onChange }) {
  const setBlank = (j, patch) => onChange({ blanks: ex.blanks.map((b, k) => (k === j ? { ...b, ...patch } : b)) })
  return (
    <div className="field">
      <span>Các chỗ trống</span>
      {ex.blanks.map((b, j) => (
        <div key={j} className="blank-edit">
          <span className="blank-id">{blankId(j)})</span>
          <input type="text" value={b.statement} onChange={(e) => setBlank(j, { statement: e.target.value })} placeholder="Câu có chỗ trống, vd: Đơn vị của tần số là ......" />
          <input type="text" value={b.answer} onChange={(e) => setBlank(j, { answer: e.target.value })} placeholder="Đáp án" />
          <button
            type="button"
            className="btn btn-small btn-ghost"
            onClick={() => onChange({ blanks: ex.blanks.filter((_, k) => k !== j) })}
            disabled={ex.blanks.length <= 1}
            aria-label="Xóa ý"
          >
            ×
          </button>
        </div>
      ))}
      <button
        type="button"
        className="btn btn-small"
        style={{ alignSelf: 'flex-start' }}
        onClick={() => onChange({ blanks: [...ex.blanks, { statement: '', answer: '' }] })}
      >
        + Thêm ý
      </button>
      <span className="muted small">Máy chấm "khớp" khi học sinh gõ giống đáp án (không phân biệt hoa thường, khoảng trắng). Không khớp thì bạn tự xem.</span>
    </div>
  )
}
