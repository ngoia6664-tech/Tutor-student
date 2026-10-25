import { Fragment, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link, useParams } from 'react-router-dom'
import { supabase, unwrap } from '../../lib/supabase.js'
import { useAsync } from '../../lib/useAsync.js'
import { formatDate, formatDateTime, formatScore } from '../../lib/format.js'
import { loadSubmissionImages } from '../../lib/submissions.js'
import { autoSummary } from '../../lib/assignments.js'
import { clockText, examSummary, groupExercises, minutesUsed, questionLabels, viNum } from '../../lib/exam.js'
import { loadMarks } from '../../lib/marks.js'
import { loadRetries, MAX_RETRIES, retryScore, submitRetry } from '../../lib/retries.js'
import { errMsg } from '../../lib/errors.js'
import Icon from '../../components/Icon.jsx'
import { useAuth } from '../../contexts/AuthContext.jsx'
import Loading from '../../components/Loading.jsx'
import ErrorBox from '../../components/ErrorBox.jsx'
import Markdown from '../../components/Markdown.jsx'
import ImageGallery from '../../components/ImageGallery.jsx'
import ExerciseBody, { KIND_LABEL } from '../../components/ExerciseBody.jsx'
import { notifyDone } from '../../lib/dialog.js'
import { UNLOCK_PRAISE, useStudyLock } from '../../lib/studyLock.js'
import { setStudyChapter, useStudyChapterId } from '../../lib/studyNow.js'
import { DueBadge, StatusBadge, TypeBadge } from '../../components/Badges.jsx'
import { ExamNav, ExamScoreCard, PartHeading, PointsBadge } from '../../components/ExamParts.jsx'
import SubmitPanel from './SubmitPanel.jsx'
import ReportQuestion from '../../components/ReportQuestion.jsx'
import MarkHard from '../../components/MarkHard.jsx'
import AnswerProgress from '../../components/AnswerProgress.jsx'

// Bản nháp câu trả lời lưu trên máy (lỡ tắt trình duyệt không mất bài)
const draftKey = (assignmentId, studentId, retry = false) => `${retry ? 'draft-retry' : 'draft-answers'}:${studentId}:${assignmentId}`
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
  // Đang làm lại bài đã nộp (không đổi điểm chính thức)
  const [retrying, setRetrying] = useState(false)
  // Lần đang xem ở phần kết quả: 0 = lần nộp chính thức, n = lần làm lại thứ n
  const [view, setView] = useState(0)

  const { data, loading, error, reload } = useAsync(async () => {
    // Lượt 1: mọi thứ chỉ cần id bài (chạy song song)
    const [rec, assignment, exercises, myAnswers] = await Promise.all([
      supabase.from('assignment_recipients').select('*').eq('assignment_id', id).eq('student_id', profile.id).maybeSingle().then(unwrap),
      supabase.from('assignments').select('id, title, type, due_date, lesson_id, chapter_id, is_exam, time_limit_minutes').eq('id', id).maybeSingle().then(unwrap),
      supabase.from('exercises').select('id, sort_order, kind, question_md, options').eq('assignment_id', id).order('sort_order').then(unwrap),
      supabase
        .from('submission_answers')
        .select('exercise_id, answer, is_correct, points')
        .eq('assignment_id', id)
        .eq('student_id', profile.id)
        .then(unwrap),
    ])
    if (!rec || !assignment) throw new Error('Không tìm thấy bài tập, hoặc bài này không được giao cho bạn.')

    // Lượt 2: phần cần danh sách câu / trạng thái nộp.
    // Chỉ hỏi đáp án khi đã nộp. (Dù có hỏi trước, RLS cũng trả về rỗng.)
    const submitted = rec.status !== 'todo'
    const ids = exercises.map((e) => e.id)
    const [keyRows, images, reports, marks, retries] = await Promise.all([
      submitted && ids.length
        ? supabase.from('answer_keys').select('exercise_id, answer_md, method_md, correct').in('exercise_id', ids).then(unwrap)
        : [],
      submitted ? loadSubmissionImages(rec.submission_path) : [],
      loadMyReports(ids, profile.id),
      loadMarks(ids, profile.id),
      submitted ? loadRetries({ assignment_id: id, student_id: profile.id }) : [],
    ])
    const keys = Object.fromEntries(keyRows.map((k) => [k.exercise_id, k]))
    const answers = Object.fromEntries(myAnswers.map((a) => [a.exercise_id, a]))
    return { rec, assignment, exercises: exercises.map((e) => ({ ...e, kind: e.kind || 'essay' })), keys, images, answers, reports, marks, retries }
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
  const retryNo = data.retries.length + 1

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
          {submitted && retrying && <span className="badge badge-warn">Đang làm lại lần {retryNo}</span>}
          {!submitted && <DueBadge date={a.due_date} />}
          <span className="muted small">Hạn: {formatDate(a.due_date)}</span>
        </div>
        {a.lesson_id && (
          <p className="small" style={{ marginBottom: 0 }}>
            <Link to={`/student/lessons/${a.lesson_id}`}>📘 Xem bài giảng liên quan</Link>
          </p>
        )}
      </div>

      {submitted && retrying ? (
        <>
          <div className="alert alert-info">
            Bạn đang <strong>làm lại lần {retryNo}/{MAX_RETRIES}</strong>. Kết quả lần này chỉ để luyện, không thay điểm chính thức (lần nộp đầu).{' '}
            <button type="button" className="btn btn-small btn-ghost" onClick={() => setRetrying(false)}>
              Thôi, không làm lại
            </button>
          </div>
          <AnswerView
            key="retry"
            data={data}
            studentId={profile.id}
            retry
            onSubmitted={(row) => {
              setRetrying(false)
              setView(row?.attempt_no || 0)
              reload()
            }}
          />
        </>
      ) : submitted ? (
        <ReviewView
          data={data}
          studentId={profile.id}
          view={view}
          setView={setView}
          onRetry={() => {
            setRetrying(true)
            window.scrollTo({ top: 0, behavior: 'smooth' })
          }}
        />
      ) : (
        <AnswerView data={data} studentId={profile.id} onSubmitted={reload} />
      )}
    </div>
  )
}

// Báo lỗi đề gần nhất của học sinh cho từng câu. Bảng chưa có (chưa chạy lại schema.sql) thì bỏ qua, không làm hỏng trang.
async function loadMyReports(exerciseIds, studentId) {
  if (!exerciseIds.length) return {}
  const { data, error } = await supabase
    .from('question_reports')
    .select('id, exercise_id, note, status, created_at, resolved_at')
    .eq('student_id', studentId)
    .in('exercise_id', exerciseIds)
    .order('created_at', { ascending: true })
  if (error) return {}
  return Object.fromEntries(data.map((r) => [r.exercise_id, r]))
}

// Giữ tập câu khó đã tải khớp với nút vừa bấm, để chuyển giữa làm lại / xem kết quả không hiện trạng thái cũ
function syncMark(marks, exerciseId, on) {
  if (on) marks.set(exerciseId, marks.get(exerciseId) ?? '')
  else marks.delete(exerciseId)
}

// Đang làm bài: chọn / gõ câu trả lời rồi nộp.
// Đề thi: chia Phần I / II / III, đánh số lại trong từng phần, có phiếu trả lời để nhảy nhanh.
// Đồng hồ làm đề: giờ bắt đầu do máy chủ ghi (tải lại trang / đổi máy không được thêm giờ).
// skew = giờ máy học sinh − giờ máy chủ, để máy để sai giờ vẫn đếm đúng.
function useExamClock(assignmentId, initialStarted, limitMinutes) {
  const [startedAt, setStartedAt] = useState(initialStarted ? new Date(initialStarted) : null)
  const [skew, setSkew] = useState(0)
  const [now, setNow] = useState(() => Date.now())
  const [starting, setStarting] = useState(false)
  const [error, setError] = useState(null)

  async function callStart() {
    const r = unwrap(await supabase.rpc('start_assignment', { p_assignment_id: assignmentId }))
    setSkew(Date.now() - new Date(r.now).getTime())
    if (r.started_at) setStartedAt(new Date(r.started_at))
  }

  // Đã bắt đầu từ trước: hỏi giờ máy chủ một lần để bù lệch (lỗi mạng thì dùng giờ máy)
  useEffect(() => {
    if (limitMinutes && initialStarted) callStart().catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assignmentId])

  useEffect(() => {
    if (!limitMinutes || !startedAt) return
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [limitMinutes, startedAt])

  async function start() {
    setStarting(true)
    setError(null)
    try {
      await callStart()
      setNow(Date.now())
    } catch (e) {
      setError(errMsg(e))
    } finally {
      setStarting(false)
    }
  }

  const remaining = limitMinutes && startedAt ? (startedAt.getTime() + limitMinutes * 60000 - (now - skew)) / 1000 : null
  return { timed: !!limitMinutes, startedAt, remaining, timeUp: remaining !== null && remaining <= 0, start, starting, error }
}

// retry: làm lại bài đã nộp (không tính giờ, không ảnh, bắt đầu từ bài trống, nộp qua submit_retry)
function AnswerView({ data, studentId, onSubmitted, retry = false }) {
  // Đang làm bài: khóa chế độ ngắm vũ trụ, gấu ngồi đợi. Nộp xong (sang ReviewView) tự mở khóa
  useStudyLock()
  const { rec, assignment: a, exercises } = data
  // Mở bài chưa nộp để làm = đang học chương của bài này (lưu làm chương đang học, lỗi thì bỏ qua)
  const studyId = useStudyChapterId()
  useEffect(() => {
    if (a.chapter_id) setStudyChapter(studentId, a.chapter_id, studyId).catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [a.chapter_id, studentId])
  const isExam = !!a.is_exam
  const key = draftKey(a.id, studentId, retry)
  // Ưu tiên bản nháp trên máy; nếu gia sư mở lại bài thì lấy câu trả lời lần trước. Làm lại thì bắt đầu từ bài trống
  const [answers, setAnswers] = useState(
    () => readDraft(key) || (retry ? {} : Object.fromEntries(Object.entries(data.answers).map(([exId, row]) => [exId, row.answer])))
  )
  const clock = useExamClock(a.id, rec.started_at, isExam && !retry ? a.time_limit_minutes : null)

  useEffect(() => writeDraft(key, answers), [key, answers])

  const groups = groupExercises(exercises, isExam)
  const labels = questionLabels(exercises, isExam)

  if (clock.timed && !clock.startedAt) {
    return <StartGate minutes={a.time_limit_minutes} count={exercises.length} clock={clock} />
  }

  return (
    <>
      <AnswerProgress exercises={exercises} answers={answers} labels={labels} />
      {clock.timed && <TimerBar remaining={clock.remaining} total={a.time_limit_minutes * 60} />}
      {clock.timeUp && (
        <div className="alert alert-warn">
          <strong>Hết giờ làm bài.</strong> Bài đang được nộp tự động với các câu bạn đã làm. Nếu mạng lỗi, hãy bấm "Nộp bài" ở cuối trang.
        </div>
      )}
      {isExam && (
        <div className="alert alert-info">
          <strong>Đề thi chấm theo thang điểm THPT.</strong> Phần I: 0,25 điểm/câu · Phần II: mỗi câu 4 ý, đúng 1 ý 0,1 – 2 ý 0,25 – 3 ý 0,5 – cả 4 ý 1 điểm ·
          Phần III: 0,25 điểm/câu.
        </div>
      )}
      {isExam && exercises.length > 0 && <ExamNav groups={groups} answers={answers} />}
      <fieldset className="card exam-fieldset" disabled={clock.timeUp}>
        <h2>Đề bài</h2>
        {exercises.length === 0 && <p className="muted">Bài này chưa có câu hỏi.</p>}
        {groups.map((g) => (
          <Fragment key={g.part?.kind || 'all'}>
            {isExam && <PartHeading part={g.part} count={g.items.length} />}
            {g.items.map(({ ex, no }) => (
              <div key={ex.id} className="question" id={`q-${ex.id}`}>
                <div className="question-label">
                  Câu {no} {!isExam && <span className="badge">{KIND_LABEL[ex.kind]}</span>}
                  <MarkHard exerciseId={ex.id} studentId={studentId} marked={data.marks.has(ex.id)} hasNote={!!data.marks.get(ex.id)} onChange={(on) => syncMark(data.marks, ex.id, on)} />
                  <ReportQuestion exerciseId={ex.id} report={data.reports[ex.id]} />
                </div>
                <ExerciseBody
                  ex={ex}
                  mode="answer"
                  name={`q-${ex.id}`}
                  photoHint={!retry}
                  value={answers[ex.id]}
                  onChange={(v) => setAnswers((prev) => ({ ...prev, [ex.id]: v }))}
                />
              </div>
            ))}
          </Fragment>
        ))}
      </fieldset>
      <SubmitPanel
        assignmentId={a.id}
        studentId={studentId}
        exercises={exercises}
        answers={answers}
        labels={labels}
        autoSubmit={clock.timeUp}
        retry={retry ? (payload) => submitRetry(a.id, payload) : null}
        onSubmitted={(row) => {
          writeDraft(key, null)
          window.scrollTo({ top: 0, behavior: 'smooth' })
          notifyDone({
            title: retry ? 'Nộp lần làm lại thành công!' : 'Nộp bài thành công!',
            say: retry ? 'So với lần đầu xem tiến bộ chưa nào 🚀' : UNLOCK_PRAISE,
            confetti: true,
          })
          onSubmitted(row)
        }}
      />
    </>
  )
}

// Đề tính giờ chưa bắt đầu: chưa hiện đề, bấm "Bắt đầu" thì đồng hồ chạy
function StartGate({ minutes, count, clock }) {
  return (
    <div className="card exam-start">
      <div className="exam-start-icon">
        <Icon name="clock" />
      </div>
      <h2>Thời gian làm bài: {minutes} phút</h2>
      <p className="muted">Đề gồm {count} câu, chấm theo thang điểm THPT.</p>
      <ul className="exam-start-rules">
        <li>Bấm "Bắt đầu làm bài" thì đề hiện ra và đồng hồ bắt đầu đếm ngược.</li>
        <li>Đồng hồ vẫn chạy khi bạn tắt trang hoặc tải lại; câu đã làm được lưu trên máy.</li>
        <li>Hết giờ, bài tự nộp với các câu bạn đã làm. Bạn có thể nộp sớm bất cứ lúc nào.</li>
      </ul>
      <ErrorBox message={clock.error} />
      <button type="button" className="btn btn-primary btn-big" onClick={clock.start} disabled={clock.starting}>
        <Icon name="play" />
        {clock.starting ? 'Đang bắt đầu...' : 'Bắt đầu làm bài'}
      </button>
    </div>
  )
}

// Đồng hồ đếm ngược: thẻ đầu trang + ô nổi góc màn hình (luôn thấy khi cuộn).
// Ô nổi gắn vào body: khung trang có hiệu ứng transform làm position: fixed bám theo khung thay vì màn hình.
function TimerBar({ remaining, total }) {
  const left = Math.max(0, remaining ?? total)
  const level = left <= 60 ? 'danger' : left <= 5 * 60 ? 'warn' : 'ok'
  const pct = Math.max(0, Math.min(100, (left / total) * 100))
  return (
    <>
      <div className={`card exam-timer exam-timer-${level}`} role="timer" aria-live="off">
        <div className="exam-timer-row">
          <Icon name="clock" />
          <span>Thời gian còn lại</span>
          <strong className="exam-timer-num">{clockText(left)}</strong>
        </div>
        <div className="exam-timer-track">
          <div className="exam-timer-fill" style={{ width: `${pct}%` }} />
        </div>
        {level === 'warn' && <p className="small" style={{ margin: '0.4rem 0 0' }}>Còn dưới 5 phút, hãy kiểm tra lại bài.</p>}
      </div>
      {createPortal(
        <div className={`exam-timer-float exam-timer-${level}`} aria-hidden="true">
          <Icon name="clock" />
          {clockText(left)}
        </div>,
        document.body
      )}
    </>
  )
}

// Đã nộp: kết quả tự chấm, đáp án, phương pháp giải, điểm của gia sư
// view: 0 = lần nộp chính thức, n = lần làm lại thứ n (chỉ đổi câu trả lời / điểm máy chấm đang hiện)
function ReviewView({ data, studentId, view, setView, onRetry }) {
  const { rec, assignment: a, exercises, keys, images, retries } = data
  const isExam = !!a.is_exam
  const attempt = view ? retries.find((r) => r.attempt_no === view) : null
  const answers = attempt ? attempt.answers || {} : data.answers
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
      {a.time_limit_minutes && minutesUsed(rec.started_at, rec.submitted_at) !== null && (
        <p className="muted small">
          <Icon name="clock" /> Thời gian làm bài: {Math.min(minutesUsed(rec.started_at, rec.submitted_at), a.time_limit_minutes)}/{a.time_limit_minutes} phút
        </p>
      )}
      <RetryCard data={data} view={attempt ? view : 0} setView={setView} onRetry={onRetry} />
      {attempt && (
        <div className="alert alert-info">
          Đang xem <strong>lần làm lại {attempt.attempt_no}</strong> (nộp lúc {formatDateTime(attempt.submitted_at)}). Điểm chính thức vẫn là lần nộp đầu.
        </div>
      )}
      {isExam ? (
        <ExamScoreCard exercises={exercises} answers={answers} title={attempt ? `Lần làm lại ${attempt.attempt_no} – máy chấm (thang THPT)` : undefined}>
          {!attempt && rec.status === 'done' && (
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
                    <MarkHard exerciseId={ex.id} studentId={studentId} marked={data.marks.has(ex.id)} hasNote={!!data.marks.get(ex.id)} onChange={(on) => syncMark(data.marks, ex.id, on)} />
                    <ReportQuestion exerciseId={ex.id} report={data.reports[ex.id]} />
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

      {!attempt && images.length > 0 && (
        <div className="card">
          <h2>Ảnh bạn đã nộp</h2>
          <ImageGallery images={images} />
        </div>
      )}
    </>
  )
}

// Lần nộp chính thức (nổi bật) + các lần làm lại (nhỏ, nhạt); bấm để xem lại từng lần. Nút làm lại tối đa 3 lần.
function RetryCard({ data, view, setView, onRetry }) {
  const { rec, assignment: a, exercises, retries } = data
  const isExam = !!a.is_exam
  const left = MAX_RETRIES - retries.length
  const exam = isExam ? examSummary(exercises, data.answers) : null
  const auto = autoSummary(exercises, data.answers)
  let official
  if (rec.status === 'checked' && rec.score !== null) official = `${formatScore(rec.score)} điểm`
  else if (exam?.parts.length) official = `${viNum(exam.max === 10 ? exam.got : exam.score10)}/10`
  else official = auto.autoTotal ? `${auto.correct}/${auto.autoTotal} câu đúng` : 'chờ gia sư chấm'
  return (
    <div className="card">
      <div className="row row-between">
        <h2 style={{ margin: 0 }}>Các lần làm</h2>
        <span className="muted small">Điểm chính thức: lần nộp đầu</span>
      </div>
      <div className="retry-tabs">
        <button type="button" className={view === 0 ? 'chip active retry-official' : 'chip retry-official'} onClick={() => setView(0)}>
          Chính thức<span className="score-inline">{official}</span>
        </button>
        {retries.map((r) => (
          <button
            key={r.attempt_no}
            type="button"
            className={view === r.attempt_no ? 'chip retry-try active' : 'chip retry-try'}
            onClick={() => setView(r.attempt_no)}
            title={`Nộp lúc ${formatDateTime(r.submitted_at)}`}
          >
            Lần {r.attempt_no}: {retryScore(r, isExam)}
          </button>
        ))}
      </div>
      {left > 0 ? (
        <button type="button" className="btn btn-small" onClick={onRetry}>
          <Icon name="refresh" />
          Làm lại bài (còn {left}/{MAX_RETRIES} lần)
        </button>
      ) : (
        <p className="muted small" style={{ margin: 0 }}>
          Bạn đã làm lại đủ {MAX_RETRIES} lần. Muốn luyện thêm, ôn câu sai / câu khó ở trang Ôn tập.
        </p>
      )}
    </div>
  )
}
