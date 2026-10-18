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
import ChapterSelect from '../../components/ChapterSelect.jsx'
import { fetchChapters } from '../../lib/chapters.js'
import Icon from '../../components/Icon.jsx'
import Markdown from '../../components/Markdown.jsx'
import { packImages, unpackImages } from '../../lib/svg.js'
import { EXAM_MINUTES, EXAM_PARTS, examStructure, questionLabels, viNum } from '../../lib/exam.js'
import { ExamTimer } from '../../components/ExamParts.jsx'

const letter = (i) => String.fromCharCode(65 + i) // A, B, C...
const blankId = (i) => String.fromCharCode(97 + i) // a, b, c...

// Dạng dữ liệu trong form (dễ sửa hơn dạng lưu trong CSDL):
// mcq: [{ text }] + mcqCorrect (vị trí), blanks: [{ statement, answer }],
// tf: [{ statement, answer: true | false | null }] (4 ý a–d), shortAnswer: "1,89"
function toFormExercise(e) {
  const kind = e.kind || 'essay'
  // Hình nhúng base64 hiện gọn là (hinh-1), (hinh-2)... trong ô soạn
  const packed = packImages(e.question_md || '')
  const base = {
    key: tempKey(),
    id: e.id || null,
    kind,
    question_md: packed.text,
    qImages: packed.images,
    answer_md: e.answer_md || '',
    method_md: e.method_md || '',
    mcq: [{ text: '' }, { text: '' }, { text: '' }, { text: '' }],
    mcqCorrect: -1,
    blanks: [{ statement: '', answer: '' }],
    tf: ['a', 'b', 'c', 'd'].map(() => ({ statement: '', answer: null })),
    shortAnswer: '',
  }
  // Câu mới (chưa có options) giữ khung trống mặc định: 4 phương án / 4 ý
  if (kind === 'mcq' && e.options?.length) {
    const opts = e.options
    base.mcq = opts.map((o) => ({ text: o.text || '' }))
    base.mcqCorrect = opts.findIndex((o) => o.label === e.correct)
  }
  if (kind === 'fill_blank' && e.options?.length) {
    base.blanks = (e.options || []).map((b) => ({ statement: b.statement || '', answer: e.correct?.[b.id] ?? '' }))
  }
  if (kind === 'true_false' && e.options?.length) {
    base.tf = (e.options || []).map((o) => ({
      statement: o.statement || '',
      answer: typeof e.correct?.[o.id] === 'boolean' ? e.correct[o.id] : null,
    }))
  }
  if (kind === 'short') base.shortAnswer = typeof e.correct === 'string' ? e.correct : ''
  return base
}

function fromFormExercise(form) {
  const ex = { ...form, question_md: unpackImages(form.question_md, form.qImages || []) }
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
  if (ex.kind === 'true_false') {
    const options = ex.tf.map((r, i) => ({ id: blankId(i), statement: r.statement.trim() }))
    const correct = Object.fromEntries(ex.tf.map((r, i) => [blankId(i), r.answer]))
    return toExercisePayload({
      ...ex,
      options,
      correct,
      answer_md: ex.tf.map((r, i) => `**${blankId(i)})** ${r.answer ? 'Đúng' : 'Sai'}`).join(' · '),
    })
  }
  if (ex.kind === 'short') {
    const correct = ex.shortAnswer.trim()
    return toExercisePayload({ ...ex, options: null, correct, answer_md: correct.split(/\s*;\s*/).join(' hoặc ') })
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
  if (ex.kind === 'true_false') {
    if (!ex.tf.length) return `Câu ${n}: cần ít nhất 1 ý.`
    if (ex.tf.some((r) => !r.statement.trim())) return `Câu ${n}: điền nội dung cho đủ các ý a, b, c, d.`
    if (ex.tf.some((r) => r.answer === null)) return `Câu ${n}: chọn Đúng hoặc Sai cho từng ý.`
  }
  if (ex.kind === 'short' && !ex.shortAnswer.trim()) return `Câu ${n}: nhập đáp án trả lời ngắn.`
  return null
}

// Trang soạn / sửa bài tập. Dùng cho: /tutor/assignments/new, /tutor/assignments/:id/edit,
// và bản nháp từ "Dán JSON" (truyền qua location.state.draft).
export default function AssignmentEditor() {
  const { id } = useParams()
  const location = useLocation()
  const draft = location.state?.draft
  const presetChapter = location.state?.chapterId || ''

  const { data, loading, error, reload } = useAsync(async () => {
    const [lessons, chapters] = await Promise.all([
      supabase.from('lessons').select('id, title').order('created_at', { ascending: false }).then(unwrap),
      fetchChapters(),
    ])
    if (id) {
      const full = await fetchAssignmentFull(id)
      return {
        lessons,
        chapters,
        initial: {
          id,
          chapter_id: full.assignment.chapter_id || '',
          title: full.assignment.title,
          type: full.assignment.type,
          is_exam: !!full.assignment.is_exam,
          timed: full.assignment.time_limit_minutes != null,
          time_limit: String(full.assignment.time_limit_minutes || EXAM_MINUTES),
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
      chapters,
      initial: {
        id: null,
        chapter_id: presetChapter,
        title: draft?.title || '',
        type: draft?.type || 'homework',
        is_exam: !!draft?.is_exam,
        // Đề thi mới mặc định tính giờ 50 phút; gia sư tắt hoặc đổi số phút được
        timed: draft?.time_limit_minutes !== null,
        time_limit: String(draft?.time_limit_minutes || EXAM_MINUTES),
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

function AssignmentForm({ initial, lessons, chapters, submittedIds, fromImport }) {
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
  const labels = questionLabels(
    form.exercises.map((e) => ({ ...e, id: e.key })),
    form.is_exam
  )

  async function save(e) {
    e.preventDefault()
    setError(null)

    if (!form.title.trim()) return setError('Hãy nhập tiêu đề bài tập.')
    if (!form.exercises.length) return setError('Bài tập cần ít nhất 1 câu hỏi.')
    for (let i = 0; i < form.exercises.length; i++) {
      const msg = checkExercise(form.exercises[i], i + 1)
      if (msg) return setError(msg)
    }
    const minutes = parseInt(form.time_limit, 10)
    if (form.is_exam && form.timed && !(minutes >= 1 && minutes <= 600)) return setError('Thời gian làm bài phải từ 1 đến 600 phút.')
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
        is_exam: form.is_exam,
        time_limit_minutes: form.is_exam && form.timed ? minutes : null,
        due_date: form.due_date || null,
        lesson_id: form.lesson_id || null,
        chapter_id: form.chapter_id || null,
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
        <h1>
          <span className="title-icon"><Icon name="assignment" /></span>{isEdit ? 'Sửa bài tập' : 'Soạn bài tập'}
        </h1>
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
        <ChapterSelect chapters={chapters} value={form.chapter_id} onChange={(v) => set('chapter_id', v)} />
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

      <ExamToggle form={form} onChange={(v) => set('is_exam', v)} onSet={set} />

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
              {form.is_exam && labels[ex.key]?.includes('.') && <span className="badge badge-primary">Phần {labels[ex.key]}</span>}
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
                <Icon name="up" />
              </button>
              <button
                type="button"
                className="btn btn-small"
                onClick={() => moveEx(i, 1)}
                disabled={i === form.exercises.length - 1}
                aria-label="Xuống"
              >
                <Icon name="down" />
              </button>
              <button type="button" className="btn btn-small btn-danger" onClick={() => removeEx(i)} disabled={form.exercises.length === 1}>
                <Icon name="trash" />
                Xóa câu
              </button>
            </div>
          </div>

          <MarkdownField
            label="Đề bài"
            required
            value={ex.question_md}
            onChange={(v) => updateEx(i, { question_md: v })}
            renderPreview={(v) => <Markdown>{unpackImages(v, ex.qImages || [])}</Markdown>}
            hint={ex.qImages?.length ? `Có ${ex.qImages.length} hình, hiện gọn là (hinh-1), (hinh-2)... Giữ nguyên các mã này để không mất hình.` : undefined}
          />

          {ex.kind === 'mcq' && <McqEditor ex={ex} index={i} onChange={(patch) => updateEx(i, patch)} />}
          {ex.kind === 'fill_blank' && <BlankEditor ex={ex} onChange={(patch) => updateEx(i, patch)} />}
          {ex.kind === 'true_false' && <TrueFalseEditor ex={ex} onChange={(patch) => updateEx(i, patch)} />}
          {ex.kind === 'short' && (
            <label className="field">
              <span>Đáp án *</span>
              <input type="text" value={ex.shortAnswer} onChange={(e) => updateEx(i, { shortAnswer: e.target.value })} placeholder="vd. 1,89" />
              <span className="muted small">
                Máy chấm coi "1,89" và "1.89" là một. Nhiều cách viết đều đúng thì ngăn bằng dấu chấm phẩy, vd. <code>0,5; 1/2</code>.
              </span>
            </label>
          )}
          {ex.kind === 'essay' && (
            <MarkdownField label="Đáp án" rows={2} value={ex.answer_md} onChange={(v) => updateEx(i, { answer_md: v })} />
          )}
          <MarkdownField label="Phương pháp giải" rows={3} value={ex.method_md} onChange={(v) => updateEx(i, { method_md: v })} />
        </div>
      ))}
      {form.is_exam ? (
        <div className="row">
          {[...EXAM_PARTS.map((p) => [p.kind, `Phần ${p.roman}: ${KIND_LABEL[p.kind]}`]), ['essay', 'Tự luận']].map(([kind, label]) => (
            <button key={kind} type="button" className="btn" onClick={() => set('exercises', [...form.exercises, toFormExercise({ kind })])}>
              <Icon name="plus" />
              {label}
            </button>
          ))}
        </div>
      ) : (
        <button type="button" className="btn" onClick={() => set('exercises', [...form.exercises, toFormExercise({})])}>
          <Icon name="plus" />
          Thêm câu hỏi
        </button>
      )}

      <div className="card" style={{ marginTop: '1rem' }}>
        <h2>Học sinh nhận bài</h2>
        <StudentPicker value={form.student_ids} onChange={(v) => set('student_ids', v)} />
      </div>

      <div className="sticky-actions">
        <ErrorBox message={error} />
        <button type="submit" className="btn btn-primary btn-big" disabled={saving}>
          <Icon name="save" />
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
            <Icon name="trash" />
          </button>
        </div>
      ))}
      {ex.mcq.length < 8 && (
        <button type="button" className="btn btn-small" style={{ alignSelf: 'flex-start' }} onClick={() => onChange({ mcq: [...ex.mcq, { text: '' }] })}>
          <Icon name="plus" />
          Thêm phương án
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
            <Icon name="trash" />
          </button>
        </div>
      ))}
      <button
        type="button"
        className="btn btn-small"
        style={{ alignSelf: 'flex-start' }}
        onClick={() => onChange({ blanks: [...ex.blanks, { statement: '', answer: '' }] })}
      >
        <Icon name="plus" />
        Thêm ý
      </button>
      <span className="muted small">Máy chấm "khớp" khi học sinh gõ giống đáp án (không phân biệt hoa thường, khoảng trắng). Không khớp thì bạn tự xem.</span>
    </div>
  )
}

// Bật / tắt chế độ đề thi + cấu trúc đề so với chuẩn THPT 18 – 4 – 6
function ExamToggle({ form, onChange, onSet }) {
  const st = examStructure(form.exercises)
  return (
    <div className={form.is_exam ? 'card exam-toggle on' : 'card exam-toggle'}>
      <label className="exam-switch">
        <input type="checkbox" checked={form.is_exam} onChange={(e) => onChange(e.target.checked)} />
        <span>
          <strong>Đây là đề thi</strong> – chấm theo thang điểm THPT
        </span>
      </label>
      <p className="muted small" style={{ margin: '0.35rem 0 0' }}>
        Trắc nghiệm 0,25 đ/câu · Đúng/sai: đúng 1 ý 0,1 – 2 ý 0,25 – 3 ý 0,5 – 4 ý 1 đ · Trả lời ngắn 0,25 đ/câu. Bài thường thì để trống ô này.
      </p>
      {form.is_exam && <ExamTimer timed={form.timed} minutes={form.time_limit} onSet={onSet} />}
      {form.is_exam && (
        <div className="exam-structure">
          {EXAM_PARTS.map((p) => (
            <span key={p.kind} className={st.counts[p.kind] === p.standard ? 'badge badge-ok' : 'badge badge-warn'}>
              Phần {p.roman} · {KIND_LABEL[p.kind]}: {st.counts[p.kind]}/{p.standard} câu
            </span>
          ))}
          {st.other > 0 && <span className="badge">+ {st.other} câu tự chấm</span>}
          <span className={st.standard ? 'badge badge-ok' : 'badge badge-warn'}>Tối đa {viNum(st.max)} điểm máy chấm</span>
          {!st.standard && (
            <span className="muted small" style={{ flexBasis: '100%' }}>
              Đề chưa đúng cấu trúc chuẩn 18 – 4 – 6. Vẫn lưu được; điểm máy chấm sẽ được quy về thang 10.
            </span>
          )}
        </div>
      )}
    </div>
  )
}

// Soạn câu đúng/sai: 4 ý a–d, mỗi ý chọn đáp án Đúng hoặc Sai
function TrueFalseEditor({ ex, onChange }) {
  const setRow = (j, patch) => onChange({ tf: ex.tf.map((r, k) => (k === j ? { ...r, ...patch } : r)) })
  return (
    <div className="field">
      <span>Các ý (chọn đáp án Đúng / Sai cho từng ý)</span>
      <div className="tf-edit">
        {ex.tf.map((r, j) => (
          <div key={j} className="tf-edit-row">
            <span className="blank-id">{blankId(j)})</span>
            <input type="text" value={r.statement} onChange={(e) => setRow(j, { statement: e.target.value })} placeholder={`Nội dung ý ${blankId(j)}`} />
            <div className="tf-edit-pick" role="radiogroup" aria-label={`Đáp án ý ${blankId(j)}`}>
              {[true, false].map((v) => (
                <button
                  key={String(v)}
                  type="button"
                  className={r.answer === v ? (v ? 'chip active tf-true' : 'chip active tf-false') : 'chip'}
                  aria-pressed={r.answer === v}
                  onClick={() => setRow(j, { answer: v })}
                >
                  {v ? 'Đúng' : 'Sai'}
                </button>
              ))}
            </div>
            <button
              type="button"
              className="btn btn-small btn-ghost"
              onClick={() => onChange({ tf: ex.tf.filter((_, k) => k !== j) })}
              disabled={ex.tf.length <= 1}
              aria-label={`Xóa ý ${blankId(j)}`}
            >
              <Icon name="trash" />
            </button>
          </div>
        ))}
      </div>
      {ex.tf.length < 4 && (
        <button type="button" className="btn btn-small" style={{ alignSelf: 'flex-start' }} onClick={() => onChange({ tf: [...ex.tf, { statement: '', answer: null }] })}>
          <Icon name="plus" />
          Thêm ý
        </button>
      )}
    </div>
  )
}
