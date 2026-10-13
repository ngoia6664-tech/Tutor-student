import { useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { supabase, unwrap } from '../../lib/supabase.js'
import { useAsync } from '../../lib/useAsync.js'
import { errMsg } from '../../lib/errors.js'
import { fetchAssignmentFull } from '../../lib/assignments.js'
import { tempKey } from '../../lib/students.js'
import Loading from '../../components/Loading.jsx'
import ErrorBox from '../../components/ErrorBox.jsx'
import MarkdownField from '../../components/MarkdownField.jsx'
import StudentPicker from '../../components/StudentPicker.jsx'

const emptyExercise = () => ({ key: tempKey(), question_md: '', answer_md: '', method_md: '' })

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
          exercises: full.exercises.map((e) => ({ ...e, key: tempKey() })),
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
        exercises: draft?.exercises?.length
          ? draft.exercises.map((e) => ({
              key: tempKey(),
              question_md: e.question_md || '',
              answer_md: e.answer_md || '',
              method_md: e.method_md || '',
            }))
          : [emptyExercise()],
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
  const setEx = (index, k, v) =>
    setForm((f) => ({ ...f, exercises: f.exercises.map((e, i) => (i === index ? { ...e, [k]: v } : e)) }))
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

    // Kiểm tra trước khi gửi
    if (!form.title.trim()) return setError('Hãy nhập tiêu đề bài tập.')
    if (!form.exercises.length) return setError('Bài tập cần ít nhất 1 câu hỏi.')
    const emptyIdx = form.exercises.findIndex((x) => !x.question_md.trim())
    if (emptyIdx >= 0) return setError(`Câu ${emptyIdx + 1} chưa có đề bài.`)
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
        exercises: form.exercises.map(({ question_md, answer_md, method_md }) => ({ question_md, answer_md, method_md })),
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
          Đã có {submittedIds.length} học sinh nộp bài. Sửa câu hỏi sẽ thay toàn bộ câu cũ bằng nội dung mới; bài nộp và điểm vẫn giữ.
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
        Viết Markdown, công thức đặt trong <code>$...$</code> hoặc <code>$$...$$</code>. Đáp án và phương pháp chỉ hiện cho học sinh sau khi nộp.
      </p>
      {form.exercises.map((ex, i) => (
        <div key={ex.key} className="exercise-edit">
          <div className="row row-between" style={{ marginBottom: '0.5rem' }}>
            <strong>Câu {i + 1}</strong>
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
              <button
                type="button"
                className="btn btn-small btn-danger"
                onClick={() => removeEx(i)}
                disabled={form.exercises.length === 1}
              >
                Xóa câu
              </button>
            </div>
          </div>
          <MarkdownField label="Đề bài" required value={ex.question_md} onChange={(v) => setEx(i, 'question_md', v)} />
          <MarkdownField label="Đáp án" rows={2} value={ex.answer_md} onChange={(v) => setEx(i, 'answer_md', v)} />
          <MarkdownField label="Phương pháp giải" rows={3} value={ex.method_md} onChange={(v) => setEx(i, 'method_md', v)} />
        </div>
      ))}
      <button type="button" className="btn" onClick={() => set('exercises', [...form.exercises, emptyExercise()])}>
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
