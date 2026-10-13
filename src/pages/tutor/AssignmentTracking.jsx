import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { supabase, unwrap } from '../../lib/supabase.js'
import { useAsync } from '../../lib/useAsync.js'
import { errMsg } from '../../lib/errors.js'
import { formatDate, formatDateTime, formatScore } from '../../lib/format.js'
import { deleteAssignment, fetchAssignmentFull, removeSubmissionFiles } from '../../lib/assignments.js'
import { loadSubmissionImages } from '../../lib/submissions.js'
import { studentLabel } from '../../lib/students.js'
import Loading from '../../components/Loading.jsx'
import ErrorBox from '../../components/ErrorBox.jsx'
import Markdown from '../../components/Markdown.jsx'
import ImageGallery from '../../components/ImageGallery.jsx'
import { DueBadge, StatusBadge, TypeBadge } from '../../components/Badges.jsx'

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
            Sửa bài
          </Link>
          <button type="button" className="btn btn-small btn-danger" onClick={handleDelete} disabled={deleting}>
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
              <div className="question-label">Câu {i + 1}</div>
              <Markdown>{ex.question_md}</Markdown>
              {ex.answer_md && (
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
        <GradeCard key={r.student_id} rec={r} onChanged={reload} />
      ))}
    </div>
  )
}

function GradeCard({ rec, onChanged }) {
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
    if (!window.confirm('Mở lại để học sinh nộp lại? Ảnh bài nộp cũ sẽ bị xóa. (Học sinh đã xem đáp án.)')) return
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

      {rec.submission_path && (
        <div style={{ marginBottom: '0.75rem' }}>
          <button type="button" className="btn btn-small" onClick={toggleImages} disabled={imgLoading}>
            {imgLoading ? 'Đang tải ảnh...' : images ? 'Ẩn ảnh bài nộp' : '🖼️ Xem ảnh bài nộp'}
          </button>
          {images && (
            <div style={{ marginTop: '0.5rem' }}>
              <ImageGallery images={images} />
            </div>
          )}
        </div>
      )}

      <div className="grid-2">
        <label className="field">
          <span>Điểm</span>
          <input type="number" inputMode="decimal" step="0.25" min="0" value={score} onChange={(e) => setScore(e.target.value)} />
        </label>
      </div>
      <label className="field">
        <span>Nhận xét</span>
        <textarea rows={3} value={feedback} onChange={(e) => setFeedback(e.target.value)} style={{ fontFamily: 'inherit' }} />
      </label>

      <ErrorBox message={error} />
      {saved && <div className="alert alert-ok">Đã lưu điểm và nhận xét.</div>}

      <div className="row">
        <button type="submit" className="btn btn-primary" disabled={busy}>
          {busy ? 'Đang lưu...' : rec.status === 'checked' ? 'Cập nhật chấm' : 'Lưu chấm'}
        </button>
        {rec.status !== 'todo' && (
          <button type="button" className="btn btn-ghost" onClick={reopen} disabled={busy}>
            Cho nộp lại
          </button>
        )}
      </div>
    </form>
  )
}
