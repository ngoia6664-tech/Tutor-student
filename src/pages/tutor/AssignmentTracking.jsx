import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { supabase, unwrap } from '../../lib/supabase.js'
import { useAsync } from '../../lib/useAsync.js'
import { errMsg } from '../../lib/errors.js'
import { formatDate, formatDateTime, formatScore } from '../../lib/format.js'
import { autoSummary, deleteAssignment, fetchAssignmentFull, removeSubmissionFiles } from '../../lib/assignments.js'
import ExerciseBody, { KIND_LABEL } from '../../components/ExerciseBody.jsx'
import { loadSubmissionImages } from '../../lib/submissions.js'
import { studentLabel } from '../../lib/students.js'
import Loading from '../../components/Loading.jsx'
import ErrorBox from '../../components/ErrorBox.jsx'
import Markdown from '../../components/Markdown.jsx'
import ImageGallery from '../../components/ImageGallery.jsx'
import { DueBadge, StatusBadge, TypeBadge } from '../../components/Badges.jsx'
import Icon from '../../components/Icon.jsx'

const STATUS_ORDER = { done: 0, todo: 1, checked: 2 }

// Bảng theo dõi một bài tập: trạng thái từng học sinh, ảnh bài nộp, chấm điểm
export default function AssignmentTracking() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [actionError, setActionError] = useState(null)
  const [deleting, setDeleting] = useState(false)

  const { data, loading, error, reload } = useAsync(() => fetchAssignmentFull(id), [id])

  // Khi tải lại sau lúc chấm, giữ dữ liệu cũ trên màn hình thay vì hiện loading
  if (loading && !data) return <Loading />
  if (error)
    return (
      <div>
        <ErrorBox message={error} onRetry={reload} />
        <Link to="/tutor/assignments">← Về danh sách bài tập</Link>
      </div>
    )

  const { assignment: a, exercises, recipients } = data
  // Bài chờ chấm lên đầu
  const sorted = [...recipients].sort(
    (x, y) => STATUS_ORDER[x.status] - STATUS_ORDER[y.status] || (x.student?.full_name || '').localeCompare(y.student?.full_name || '')
  )
  const counts = { todo: 0, done: 0, checked: 0 }
  recipients.forEach((r) => (counts[r.status] += 1))

  async function handleDelete() {
    if (!window.confirm(`Xóa bài tập "${a.title}"? Toàn bộ câu hỏi, đáp án, bài nộp và điểm sẽ mất.`)) return
    setDeleting(true)
    setActionError(null)
    try {
      await deleteAssignment(a.id)
      navigate('/tutor/assignments', { replace: true })
    } catch (e) {
      setActionError(errMsg(e))
      setDeleting(false)
    }
  }

  return (
    <div>
      <Link to="/tutor/assignments" className="small">
        ← Danh sách bài tập
      </Link>
      <div className="card" style={{ marginTop: '0.5rem' }}>
        <h1>{a.title}</h1>
        <div className="row" style={{ marginBottom: '0.5rem' }}>
          <TypeBadge type={a.type} />
          <DueBadge date={a.due_date} />
          <span className="muted small">Hạn: {formatDate(a.due_date)}</span>
        </div>
        <div className="row small" style={{ marginBottom: '0.75rem' }}>
          <span className="badge badge-warn">{counts.todo} chưa nộp</span>
          <span className="badge badge-primary">{counts.done} chờ chấm</span>
          <span className="badge badge-ok">{counts.checked} đã chấm</span>
        </div>
        <div className="row">
          <Link className="btn btn-small" to={`/tutor/assignments/${a.id}/edit`}>
            <Icon name="edit" />
            Sửa bài
          </Link>
          <button type="button" className="btn btn-small btn-danger" onClick={handleDelete} disabled={deleting}>
            <Icon name="trash" />
            {deleting ? 'Đang xóa...' : 'Xóa bài'}
          </button>
        </div>
        <ErrorBox message={actionError} />
      </div>

      <details className="card">
        <summary style={{ cursor: 'pointer', fontWeight: 600 }}>Đề bài và đáp án ({exercises.length} câu)</summary>
        <div style={{ marginTop: '0.75rem' }}>
          {exercises.map((ex, i) => (
            <div key={ex.id} className="question">
              <div className="question-label">
                Câu {i + 1} <span className="badge">{KIND_LABEL[ex.kind]}</span>
              </div>
              <ExerciseBody ex={ex} mode="preview" name={`k-${ex.id}`} correct={ex.correct} />
              {ex.kind === 'essay' && ex.answer_md && (
                <div className="answer-box">
                  <div className="box-label">Đáp án</div>
                  <Markdown>{ex.answer_md}</Markdown>
                </div>
              )}
              {ex.method_md && (
                <div className="method-box">
                  <div className="box-label">Phương pháp giải</div>
                  <Markdown>{ex.method_md}</Markdown>
                </div>
              )}
            </div>
          ))}
        </div>
      </details>

      <h2>Học sinh ({recipients.length})</h2>
      {recipients.length === 0 && (
        <div className="empty">
          Bài này chưa giao cho ai. <Link to={`/tutor/assignments/${a.id}/edit`}>Chọn học sinh</Link>
        </div>
      )}
      {sorted.map((r) => (
        <GradeCard key={r.student_id} rec={r} exercises={exercises} answers={data.answersByStudent[r.student_id] || {}} onChanged={reload} />
      ))}
    </div>
  )
}

// Bài làm học sinh gõ / chọn trong app, kèm kết quả máy chấm từng câu
function AnswerSheet({ exercises, answers, studentId }) {
  return (
    <div className="answer-sheet">
      {exercises.map((ex, i) => {
        const a = answers[ex.id]
        return (
          <div key={ex.id} className="question">
            <div className="question-label">
              Câu {i + 1} <span className="badge">{KIND_LABEL[ex.kind]}</span>
              {a?.is_correct === true && <span className="badge badge-ok">Đúng</span>}
              {a?.is_correct === false && <span className="badge badge-danger">Sai</span>}
              {ex.kind === 'fill_blank' && a && a.is_correct == null && <span className="badge badge-warn">Cần xem</span>}
              {!a && <span className="badge badge-muted">Không trả lời</span>}
            </div>
            <ExerciseBody ex={ex} mode="review" name={`s-${studentId}-${ex.id}`} value={a?.answer} correct={ex.correct} />
          </div>
        )
      })}
    </div>
  )
}

function GradeCard({ rec, exercises, answers, onChanged }) {
  const sum = autoSummary(exercises, answers)
  const answeredCount = Object.keys(answers).length
  const [showSheet, setShowSheet] = useState(false)
  const [score, setScore] = useState(rec.score ?? '')
  const [feedback, setFeedback] = useState(rec.feedback ?? '')
  const [images, setImages] = useState(null) // null = chưa tải
  const [imgLoading, setImgLoading] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [saved, setSaved] = useState(false)

  async function toggleImages() {
    if (images) return setImages(null)
    setImgLoading(true)
    setError(null)
    try {
      setImages(await loadSubmissionImages(rec.submission_path))
    } catch (e) {
      setError(errMsg(e))
    } finally {
      setImgLoading(false)
    }
  }

  async function saveGrade(e) {
    e.preventDefault()
    if (rec.status === 'todo' && !window.confirm('Học sinh chưa nộp bài. Vẫn chấm và đánh dấu "Đã chấm"?')) return
    const num = score === '' ? null : Number(score)
    if (num !== null && (Number.isNaN(num) || num < 0)) return setError('Điểm không hợp lệ.')
    setBusy(true)
    setError(null)
    setSaved(false)
    try {
      unwrap(
        await supabase
          .from('assignment_recipients')
          .update({ score: num, feedback: feedback.trim() || null, status: 'checked' })
          .eq('assignment_id', rec.assignment_id)
          .eq('student_id', rec.student_id)
      )
      setSaved(true)
      onChanged()
    } catch (err) {
      setError(errMsg(err))
    } finally {
      setBusy(false)
    }
  }

  // Cho học sinh nộp lại: xóa ảnh cũ, đưa về trạng thái chưa nộp
  async function reopen() {
    if (!window.confirm('Mở lại để học sinh nộp lại? Ảnh nộp kèm sẽ bị xóa; câu trả lời đã gõ/chọn được giữ để học sinh sửa. (Học sinh đã xem đáp án.)')) return
    setBusy(true)
    setError(null)
    try {
      await removeSubmissionFiles(rec.submission_path)
      unwrap(
        await supabase
          .from('assignment_recipients')
          .update({ status: 'todo', submission_path: null, submitted_at: null })
          .eq('assignment_id', rec.assignment_id)
          .eq('student_id', rec.student_id)
      )
      onChanged()
    } catch (err) {
      setError(errMsg(err))
      setBusy(false)
    }
  }

  return (
    <form className="card" onSubmit={saveGrade}>
      <div className="row row-between" style={{ marginBottom: '0.5rem' }}>
        <strong>{studentLabel(rec.student)}</strong>
        <StatusBadge status={rec.status} />
      </div>
      {rec.submitted_at && <p className="muted small" style={{ margin: '0 0 0.5rem' }}>Nộp lúc {formatDateTime(rec.submitted_at)}</p>}
      {rec.status === 'checked' && (
        <p className="small" style={{ margin: '0 0 0.5rem' }}>
          Điểm hiện tại: <strong>{formatScore(rec.score)}</strong>
        </p>
      )}

      {rec.status !== 'todo' && sum.autoTotal > 0 && (
        <p className="small" style={{ margin: '0 0 0.5rem' }}>
          Máy chấm: <strong>{sum.correct}/{sum.autoTotal}</strong> câu trắc nghiệm / điền khuyết đúng
        </p>
      )}

      <div className="row" style={{ marginBottom: '0.75rem' }}>
        {answeredCount > 0 && (
          <button type="button" className="btn btn-small" onClick={() => setShowSheet((s) => !s)}>
            <Icon name="eye" />
            {showSheet ? 'Ẩn bài làm' : `Xem bài làm (${answeredCount}/${exercises.length} câu)`}
          </button>
        )}
        {rec.submission_path && (
          <button type="button" className="btn btn-small" onClick={toggleImages} disabled={imgLoading}>
            <Icon name="image" />
            {imgLoading ? 'Đang tải ảnh...' : images ? 'Ẩn ảnh' : 'Xem ảnh nộp kèm'}
          </button>
        )}
      </div>
      {showSheet && <AnswerSheet exercises={exercises} answers={answers} studentId={rec.student_id} />}
      {images && (
        <div style={{ marginBottom: '0.75rem' }}>
          <ImageGallery images={images} />
        </div>
      )}

      <div className="grid-2">
        <label className="field">
          <span>Điểm (thang 10)</span>
          <input type="number" inputMode="decimal" step="0.25" min="0" value={score} onChange={(e) => setScore(e.target.value)} />
        </label>
        {rec.status !== 'todo' && sum.autoTotal > 0 && (
          <div className="field" style={{ justifyContent: 'flex-end' }}>
            <button
              type="button"
              className="btn btn-small"
              title="Điểm = số câu đúng / số câu máy chấm × 10, làm tròn 0,25"
              onClick={() => setScore(String(Math.round((sum.correct / sum.autoTotal) * 40) / 4))}
            >
              <Icon name="zap" />
              Dùng điểm máy chấm ({Math.round((sum.correct / sum.autoTotal) * 40) / 4})
            </button>
          </div>
        )}
      </div>
      <label className="field">
        <span>Nhận xét</span>
        <textarea rows={3} value={feedback} onChange={(e) => setFeedback(e.target.value)} style={{ fontFamily: 'inherit' }} />
      </label>

      <ErrorBox message={error} />
      {saved && <div className="alert alert-ok">Đã lưu điểm và nhận xét.</div>}

      <div className="row">
        <button type="submit" className="btn btn-primary" disabled={busy}>
          <Icon name="save" />
          {busy ? 'Đang lưu...' : rec.status === 'checked' ? 'Cập nhật chấm' : 'Lưu chấm'}
        </button>
        {rec.status !== 'todo' && (
          <button type="button" className="btn btn-ghost" onClick={reopen} disabled={busy}>
            <Icon name="refresh" />
            Cho nộp lại
          </button>
        )}
      </div>
    </form>
  )
}
