import { Fragment, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase, unwrap } from '../../lib/supabase.js'
import { useAsync } from '../../lib/useAsync.js'
import { formatDate, formatDateTime, formatScore } from '../../lib/format.js'
import { loadSubmissionImages } from '../../lib/submissions.js'
import { autoSummary } from '../../lib/assignments.js'
import { groupExercises, questionLabels } from '../../lib/exam.js'
import { useAuth } from '../../contexts/AuthContext.jsx'
import Loading from '../../components/Loading.jsx'
import ErrorBox from '../../components/ErrorBox.jsx'
import Markdown from '../../components/Markdown.jsx'
import ImageGallery from '../../components/ImageGallery.jsx'
import ExerciseBody, { KIND_LABEL } from '../../components/ExerciseBody.jsx'
import { DueBadge, StatusBadge, TypeBadge } from '../../components/Badges.jsx'
import { ExamNav, ExamScoreCard, PartHeading, PointsBadge } from '../../components/ExamParts.jsx'
import SubmitPanel from './SubmitPanel.jsx'

// Bản nháp câu trả lời lưu trên máy (lỡ tắt trình duyệt không mất bài)
const draftKey = (assignmentId, studentId) => `draft-answers:${studentId}:${assignmentId}`
function readDraft(key) {
  try {
    return JSON.parse(localStorage.getItem(key) || 'null')
  } catch {
    return null
  }
}
function writeDraft(key, value) {
  try {
    if (value) localStorage.setItem(key, JSON.stringify(value))
    else localStorage.removeItem(key)
  } catch {
    // Trình duyệt chặn lưu trữ: bỏ qua, chỉ mất tính năng lưu nháp
  }
}

export default function StudentAssignment() {
  const { id } = useParams()
  const { profile } = useAuth()

  const { data, loading, error, reload } = useAsync(async () => {
    const rec = unwrap(
      await supabase.from('assignment_recipients').select('*').eq('assignment_id', id).eq('student_id', profile.id).maybeSingle()
    )
    if (!rec) throw new Error('Không tìm thấy bài tập, hoặc bài này không được giao cho bạn.')

    const [assignment, exercises, myAnswers] = await Promise.all([
      supabase.from('assignments').select('id, title, type, due_date, lesson_id, is_exam').eq('id', id).single().then(unwrap),
      supabase.from('exercises').select('id, sort_order, kind, question_md, options').eq('assignment_id', id).order('sort_order').then(unwrap),
      supabase
        .from('submission_answers')
        .select('exercise_id, answer, is_correct, points')
        .eq('assignment_id', id)
        .eq('student_id', profile.id)
        .then(unwrap),
    ])

    // Chỉ hỏi đáp án khi đã nộp. (Dù có hỏi trước, RLS cũng trả về rỗng.)
    let keys = {}
    let images = []
    if (rec.status !== 'todo') {
      if (exercises.length) {
        const rows = unwrap(
          await supabase
            .from('answer_keys')
            .select('exercise_id, answer_md, method_md, correct')
            .in(
              'exercise_id',
              exercises.map((e) => e.id)
            )
        )
        keys = Object.fromEntries(rows.map((k) => [k.exercise_id, k]))
      }
      images = await loadSubmissionImages(rec.submission_path)
    }
    const answers = Object.fromEntries(myAnswers.map((a) => [a.exercise_id, a]))
    return { rec, assignment, exercises: exercises.map((e) => ({ ...e, kind: e.kind || 'essay' })), keys, images, answers }
  }, [id, profile.id])

  if (loading && !data) return <Loading />
  if (error)
    return (
      <div>
        <ErrorBox message={error} onRetry={reload} />
        <Link to="/student">← Về danh sách bài</Link>
      </div>
    )

  const { rec, assignment: a } = data
  const submitted = rec.status !== 'todo'

  return (
    <div>
      <Link to={submitted ? '/student/results' : '/student'} className="small">
        ← Quay lại
      </Link>
      <div className="card" style={{ marginTop: '0.5rem' }}>
        <h1>{a.title}</h1>
        <div className="row">
          {a.is_exam && <span className="badge badge-new">Đề thi</span>}
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

      {submitted ? <ReviewView data={data} /> : <AnswerView data={data} studentId={profile.id} onSubmitted={reload} />}
    </div>
  )
}

// Đang làm bài: chọn / gõ câu trả lời rồi nộp.
// Đề thi: chia Phần I / II / III, đánh số lại trong từng phần, có phiếu trả lời để nhảy nhanh.
function AnswerView({ data, studentId, onSubmitted }) {
  const { assignment: a, exercises } = data
  const isExam = !!a.is_exam
  const key = draftKey(a.id, studentId)
  // Ưu tiên bản nháp trên máy; nếu gia sư mở lại bài thì lấy câu trả lời lần trước
  const [answers, setAnswers] = useState(
    () => readDraft(key) || Object.fromEntries(Object.entries(data.answers).map(([exId, row]) => [exId, row.answer]))
  )

  useEffect(() => writeDraft(key, answers), [key, answers])

  const groups = groupExercises(exercises, isExam)

  return (
    <>
      {isExam && (
        <div className="alert alert-info">
          <strong>Đề thi chấm theo thang điểm THPT.</strong> Phần I: 0,25 điểm/câu · Phần II: mỗi câu 4 ý, đúng 1 ý 0,1 – 2 ý 0,25 – 3 ý 0,5 – cả 4 ý 1 điểm ·
          Phần III: 0,25 điểm/câu.
        </div>
      )}
      {isExam && exercises.length > 0 && <ExamNav groups={groups} answers={answers} />}
      <div className="card">
        <h2>Đề bài</h2>
        {exercises.length === 0 && <p className="muted">Bài này chưa có câu hỏi.</p>}
        {groups.map((g) => (
          <Fragment key={g.part?.kind || 'all'}>
            {isExam && <PartHeading part={g.part} count={g.items.length} />}
            {g.items.map(({ ex, no }) => (
              <div key={ex.id} className="question" id={`q-${ex.id}`}>
                <div className="question-label">
                  Câu {no} {!isExam && <span className="badge">{KIND_LABEL[ex.kind]}</span>}
                </div>
                <ExerciseBody
                  ex={ex}
                  mode="answer"
                  name={`q-${ex.id}`}
                  value={answers[ex.id]}
                  onChange={(v) => setAnswers((prev) => ({ ...prev, [ex.id]: v }))}
                />
              </div>
            ))}
          </Fragment>
        ))}
      </div>
      <SubmitPanel
        assignmentId={a.id}
        studentId={studentId}
        exercises={exercises}
        answers={answers}
        labels={questionLabels(exercises, isExam)}
        onSubmitted={() => {
          writeDraft(key, null)
          window.scrollTo({ top: 0, behavior: 'smooth' })
          onSubmitted()
        }}
      />
    </>
  )
}

// Đã nộp: kết quả tự chấm, đáp án, phương pháp giải, điểm của gia sư
function ReviewView({ data }) {
  const { rec, assignment: a, exercises, keys, images, answers } = data
  const isExam = !!a.is_exam
  const sum = autoSummary(exercises, answers)
  const groups = groupExercises(exercises, isExam)

  return (
    <>
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
      {isExam ? (
        <ExamScoreCard exercises={exercises} answers={answers}>
          {rec.status === 'done' && (
            <p className="muted small" style={{ margin: '0.5rem 0 0' }}>
              Đây là điểm máy chấm. Điểm chính thức do gia sư xác nhận.
            </p>
          )}
        </ExamScoreCard>
      ) : (
        sum.autoTotal > 0 && (
          <div className="card auto-score">
            <span className="auto-score-num">
              {sum.correct}/{sum.autoTotal}
            </span>
            <span>câu đúng, máy chấm phần trắc nghiệm và điền khuyết</span>
            <span className="muted small" style={{ flexBasis: '100%' }}>
              Ý điền khuyết viết khác đáp án nhưng vẫn đúng nghĩa sẽ được gia sư xem lại.
            </span>
          </div>
        )
      )}

      <div className="card">
        <h2>Đề bài và đáp án</h2>
        {groups.map((g) => (
          <Fragment key={g.part?.kind || 'all'}>
            {isExam && <PartHeading part={g.part} count={g.items.length} />}
            {g.items.map(({ ex, no }) => {
              const k = keys[ex.id]
              const mine = answers[ex.id]
              return (
                <div key={ex.id} className="question" id={`q-${ex.id}`}>
                  <div className="question-label">
                    Câu {no} {!isExam && <span className="badge">{KIND_LABEL[ex.kind]}</span>}
                    {isExam ? (
                      <PointsBadge ex={ex} answer={mine} />
                    ) : (
                      <>
                        {mine?.is_correct === true && <span className="badge badge-ok">Đúng</span>}
                        {mine?.is_correct === false && <span className="badge badge-danger">Sai</span>}
                      </>
                    )}
                  </div>
                  <ExerciseBody ex={ex} mode="review" name={`r-${ex.id}`} value={mine?.answer} correct={k?.correct ?? null} />
                  {ex.kind === 'essay' && k?.answer_md && (
                    <div className="answer-box">
                      <div className="box-label">Đáp án</div>
                      <Markdown>{k.answer_md}</Markdown>
                    </div>
                  )}
                  {k?.method_md && (
                    <div className="method-box">
                      <div className="box-label">Phương pháp giải</div>
                      <Markdown>{k.method_md}</Markdown>
                    </div>
                  )}
                  {!k && <p className="muted small">Gia sư chưa nhập đáp án cho câu này.</p>}
                </div>
              )
            })}
          </Fragment>
        ))}
      </div>

      {images.length > 0 && (
        <div className="card">
          <h2>Ảnh bạn đã nộp</h2>
          <ImageGallery images={images} />
        </div>
      )}
    </>
  )
}
