import { Link, useParams } from 'react-router-dom'
import { supabase, unwrap } from '../../lib/supabase.js'
import { useAsync } from '../../lib/useAsync.js'
import { formatDate, formatDateTime, formatScore } from '../../lib/format.js'
import { loadSubmissionImages } from '../../lib/submissions.js'
import { useAuth } from '../../contexts/AuthContext.jsx'
import Loading from '../../components/Loading.jsx'
import ErrorBox from '../../components/ErrorBox.jsx'
import Markdown from '../../components/Markdown.jsx'
import ImageGallery from '../../components/ImageGallery.jsx'
import { DueBadge, StatusBadge, TypeBadge } from '../../components/Badges.jsx'
import SubmitPanel from './SubmitPanel.jsx'

export default function StudentAssignment() {
  const { id } = useParams()
  const { profile } = useAuth()

  const { data, loading, error, reload } = useAsync(async () => {
    const rec = unwrap(
      await supabase
        .from('assignment_recipients')
        .select('*')
        .eq('assignment_id', id)
        .eq('student_id', profile.id)
        .maybeSingle()
    )
    if (!rec) throw new Error('Không tìm thấy bài tập, hoặc bài này không được giao cho bạn.')

    const assignment = unwrap(await supabase.from('assignments').select('id, title, type, due_date, lesson_id').eq('id', id).single())
    const exercises = unwrap(
      await supabase.from('exercises').select('id, sort_order, question_md').eq('assignment_id', id).order('sort_order')
    )

    // Chỉ hỏi đáp án khi đã nộp. (Dù có hỏi trước, RLS cũng trả về rỗng.)
    let keys = {}
    let images = []
    if (rec.status !== 'todo') {
      if (exercises.length) {
        const rows = unwrap(
          await supabase
            .from('answer_keys')
            .select('exercise_id, answer_md, method_md')
            .in(
              'exercise_id',
              exercises.map((e) => e.id)
            )
        )
        keys = Object.fromEntries(rows.map((k) => [k.exercise_id, k]))
      }
      images = await loadSubmissionImages(rec.submission_path)
    }
    return { rec, assignment, exercises, keys, images }
  }, [id, profile.id])

  if (loading) return <Loading />
  if (error)
    return (
      <div>
        <ErrorBox message={error} onRetry={reload} />
        <Link to="/student">← Về danh sách bài</Link>
      </div>
    )

  const { rec, assignment: a, exercises, keys, images } = data
  const submitted = rec.status !== 'todo'

  return (
    <div>
      <Link to={submitted ? '/student/results' : '/student'} className="small">
        ← Quay lại
      </Link>
      <div className="card" style={{ marginTop: '0.5rem' }}>
        <h1>{a.title}</h1>
        <div className="row">
          <TypeBadge type={a.type} />
          <StatusBadge status={rec.status} />
          {!submitted && <DueBadge date={a.due_date} />}
          <span className="muted small">Hạn: {formatDate(a.due_date)}</span>
        </div>
        {a.lesson_id && (
          <p className="small" style={{ marginBottom: 0 }}>
            <Link to={`/student/lessons/${a.lesson_id}`}>📘 Xem bài giảng liên quan</Link>
          </p>
        )}
      </div>

      {/* Điểm và nhận xét khi gia sư đã chấm */}
      {rec.status === 'checked' && (
        <div className="card">
          <h2>Kết quả</h2>
          <div className="row">
            <span className="muted">Điểm:</span>
            <span className="score">{formatScore(rec.score)}</span>
          </div>
          {rec.feedback && (
            <div style={{ marginTop: '0.5rem' }}>
              <div className="box-label">Nhận xét của gia sư</div>
              <p style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{rec.feedback}</p>
            </div>
          )}
        </div>
      )}
      {rec.status === 'done' && (
        <div className="alert alert-ok">
          ✅ Đã nộp lúc {formatDateTime(rec.submitted_at)}. Gia sư sẽ chấm và nhận xét sau. Đáp án đã hiện bên dưới để bạn tự kiểm tra.
        </div>
      )}

      <div className="card">
        <h2>Đề bài</h2>
        {exercises.length === 0 && <p className="muted">Bài này chưa có câu hỏi.</p>}
        {exercises.map((ex, i) => {
          const k = keys[ex.id]
          return (
            <div key={ex.id} className="question">
              <div className="question-label">Câu {i + 1}</div>
              <Markdown>{ex.question_md}</Markdown>
              {submitted && k?.answer_md && (
                <div className="answer-box">
                  <div className="box-label">Đáp án</div>
                  <Markdown>{k.answer_md}</Markdown>
                </div>
              )}
              {submitted && k?.method_md && (
                <div className="method-box">
                  <div className="box-label">Phương pháp giải</div>
                  <Markdown>{k.method_md}</Markdown>
                </div>
              )}
              {submitted && !k?.answer_md && !k?.method_md && <p className="muted small">Gia sư chưa nhập đáp án cho câu này.</p>}
            </div>
          )
        })}
      </div>

      {submitted ? (
        <div className="card">
          <h2>Bài bạn đã nộp</h2>
          <ImageGallery images={images} />
        </div>
      ) : (
        <SubmitPanel
          assignmentId={a.id}
          studentId={profile.id}
          onSubmitted={() => {
            window.scrollTo({ top: 0, behavior: 'smooth' })
            reload()
          }}
        />
      )}
    </div>
  )
}
