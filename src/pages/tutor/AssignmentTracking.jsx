// @ts-nocheck — nợ kiểu: xóa dòng này rồi chạy npm run typecheck để sửa
import { Fragment, memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
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
import { askConfirm, confirmDelete, notifyDeleted, notifyDone } from '../../lib/dialog.js'
import AnswerKey from '../../components/AnswerKey.jsx'
import ResultProgress from '../../components/ResultProgress.jsx'
import { NOTE_LABEL, saveAnswerNotes } from '../../lib/answerNotes.js'
import { PartHeading, PointsBadge } from '../../components/ExamParts.jsx'
import { examStructure, examSummary, groupExercises, minutesUsed, questionLabels, viNum } from '../../lib/exam.js'
import { retryScore } from '../../lib/retries.js'
import { toggleGradeDock, useGradeDockOpen, useGradingMode } from '../../lib/gradeDock.js'
import ListLink, { RESTORE } from '../../components/ListLink.jsx'
import { listUrl } from '../../lib/navMemory.js'

const STATUS_ORDER = { done: 0, todo: 1, checked: 2 }

// Bảng theo dõi một bài tập: trạng thái từng học sinh, ảnh bài nộp, chấm điểm
export default function AssignmentTracking() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [actionError, setActionError] = useState(null)
  const [deleting, setDeleting] = useState(false)

  // Vào từ trang một học sinh / thông báo (?hs=<id>): mở thẳng bài làm của bạn đó thay vì bạn đầu danh sách
  const [params] = useSearchParams()
  const fromStudent = params.get('hs')
  const [picked, setPicked] = useState(fromStudent) // student_id đang chấm; null = học sinh đầu danh sách
  useEffect(() => setPicked(fromStudent), [id, fromStudent])
  const cardRef = useRef(null)

  const { data, loading, error, reload } = useAsync(() => fetchAssignmentFull(id), [id])
  // Có học sinh để chấm: bấm gấu = ẩn / hiện Sổ chấm bài, gấu im lặng (lib/gradeDock.js)
  useGradingMode(!!data?.recipients.length)

  // Khi tải lại sau lúc chấm, giữ dữ liệu cũ trên màn hình thay vì hiện loading
  if (loading && !data) return <Loading />
  if (error)
    return (
      <div>
        <ErrorBox message={error} onRetry={reload} />
        <ListLink to="/tutor/assignments">← Về danh sách bài tập</ListLink>
      </div>
    )

  const { assignment: a, exercises, recipients } = data
  // Bài chờ chấm lên đầu
  const sorted = [...recipients].sort(
    (x, y) => STATUS_ORDER[x.status] - STATUS_ORDER[y.status] || (x.student?.full_name || '').localeCompare(y.student?.full_name || '')
  )
  const counts = { todo: 0, done: 0, checked: 0 }
  recipients.forEach((r) => (counts[r.status] += 1))
  const current = sorted.find((r) => r.student_id === picked) || sorted[0]
  const backStudent = fromStudent && recipients.find((r) => r.student_id === fromStudent)

  function pick(r) {
    if (r.student_id === current?.student_id) return
    setPicked(r.student_id)
    // Đang ở giữa bài làm dài của bạn trước: đưa về đầu thẻ chấm của bạn mới
    requestAnimationFrame(() => cardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
  }

  async function handleDelete() {
    if (!(await confirmDelete('bài tập', a.title, 'Toàn bộ câu hỏi, đáp án, bài nộp và điểm sẽ mất.'))) return
    setDeleting(true)
    setActionError(null)
    try {
      await deleteAssignment(a.id)
      navigate(listUrl('/tutor/assignments'), { replace: true, state: RESTORE })
      notifyDeleted('bài tập')
    } catch (e) {
      setActionError(errMsg(e))
      setDeleting(false)
    }
  }

  return (
    <div>
      {backStudent ? (
        <Link to={`/tutor/students/${fromStudent}`} className="small">
          ← Về {backStudent.student?.full_name || 'học sinh'}
        </Link>
      ) : (
        <ListLink to="/tutor/assignments" className="small">
          ← Danh sách bài tập
        </ListLink>
      )}
      <div className="card" style={{ marginTop: '0.5rem' }}>
        <h1>{a.title}</h1>
        <div className="row" style={{ marginBottom: '0.5rem' }}>
          {a.is_exam && <span className="badge badge-new">Đề thi · thang THPT</span>}
          {a.is_exam && (
            <span className="badge">
              <Icon name="clock" /> {a.time_limit_minutes ? `${a.time_limit_minutes} phút` : 'Không tính giờ'}
            </span>
          )}
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

      {recipients.length === 0 ? (
        <div className="empty">
          Bài này chưa giao cho ai. <Link to={`/tutor/assignments/${a.id}/edit`}>Chọn học sinh</Link>
        </div>
      ) : (
        <>
          <GradeDock list={sorted} currentId={current.student_id} onPick={pick} />
          <div ref={cardRef} className="grade-card">
            <GradeCard
              key={current.student_id}
              rec={current}
              exercises={exercises}
              isExam={!!a.is_exam}
              limit={a.is_exam ? a.time_limit_minutes : null}
              answers={data.answersByStudent[current.student_id] || {}}
              retries={data.retriesByStudent[current.student_id] || []}
              notes={data.notesByStudent[current.student_id] || {}}
              onChanged={() => {
                // Chấm xong danh sách sắp xếp lại: giữ nguyên học sinh đang xem
                setPicked(current.student_id)
                reload()
              }}
            />
          </div>
        </>
      )}

      {a.is_exam && <ExamStructureNote exercises={exercises} />}
      <AnswerKey exercises={exercises} isExam={!!a.is_exam} />
    </div>
  )
}

// ----- Sổ chấm bài: bảng đen nhỏ nổi ở góc phải, ngay trên gấu (cùng kiểu bảng đen gấu giảng bài) -----
const STATUS_TEXT = { todo: 'chưa nộp', done: 'chờ chấm', checked: 'đã chấm' }

// Sổ gọn: mỗi dòng = chấm màu trạng thái + tên + điểm (nếu đã chấm); bấm tên là chuyển sang bài bạn đó.
// Ẩn / hiện bằng cách bấm gấu (Mascot) hoặc nút ở đầu sổ; trạng thái mở dùng chung qua lib/gradeDock.js
function GradeDock({ list, currentId, onPick }) {
  const open = useGradeDockOpen()
  const listRef = useRef(null)
  const waiting = list.filter((r) => r.status === 'done').length

  // Bạn đang chấm luôn nằm giữa danh sách (chỉ cuộn trong sổ, không kéo cả trang)
  useEffect(() => {
    const box = listRef.current
    const row = box?.querySelector('.gd-row.active')
    if (row) box.scrollTop = row.offsetTop - box.clientHeight / 2 + row.offsetHeight / 2
  }, [open, currentId])

  // Portal ra <body>: khung trang có animation transform làm position: fixed neo theo khung thay vì màn hình
  return createPortal(
    <aside className={open ? 'grade-dock is-open' : 'grade-dock'} aria-label="Sổ chấm bài: chọn học sinh">
      <div className="gd-head">
        <span className="gd-title">Sổ chấm bài</span>
        <span className="gd-count">{waiting ? `${waiting} chờ chấm` : 'hết bài chờ'}</span>
        <button type="button" className="gd-toggle" onClick={toggleGradeDock} aria-expanded={open} title="Bấm gấu cũng ẩn / hiện sổ được">
          {open ? 'Ẩn' : 'Hiện'}
        </button>
      </div>

      {open && (
        <ul ref={listRef} className="gd-list">
          {list.map((r) => {
            const active = r.student_id === currentId
            return (
              <li key={r.student_id}>
                <button
                  type="button"
                  className={active ? 'gd-row active' : 'gd-row'}
                  aria-current={active || undefined}
                  title={`${studentLabel(r.student)} · ${STATUS_TEXT[r.status]}`}
                  onClick={() => onPick(r)}
                >
                  <span className={`gd-dot is-${r.status}`} aria-hidden="true" />
                  <span className="gd-name">{r.student?.full_name || '(đã xóa)'}</span>
                  <span className="sr-only">, {STATUS_TEXT[r.status]}</span>
                  {r.status === 'checked' && r.score != null && <span className="gd-score">{formatScore(r.score)}</span>}
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </aside>,
    document.body
  )
}

// Bài làm học sinh gõ / chọn trong app, kèm kết quả máy chấm từng câu.
// Đề thi: chia phần, hiện điểm từng câu. Đáp án + phương pháp giải đặt ngay dưới bài làm để so (như học sinh thấy sau khi nộp),
// ẩn / hiện được bằng nút ở đầu. Đã nộp: thanh câu sai dính đầu trang (bấm để nhảy), mỗi câu có ô lời phê "Giáo viên chấm:".
// memo + onNote ổn định: gõ điểm / nhận xét không vẽ lại cả bài làm.
const AnswerSheet = memo(function AnswerSheet({ exercises, answers, studentId, isExam, submitted, notes, onNote }) {
  const [showKey, setShowKey] = useState(true)
  const labels = useMemo(() => questionLabels(exercises, isExam), [exercises, isExam])
  const groups = useMemo(() => groupExercises(exercises, isExam), [exercises, isExam])
  return (
    <div className="answer-sheet">
      {submitted && <ResultProgress exercises={exercises} answers={answers} labels={labels} notes={notes} idPrefix="g-" />}
      <div className="row" style={{ marginBottom: '0.5rem' }}>
        <button type="button" className="btn btn-small btn-ghost" onClick={() => setShowKey((v) => !v)} aria-pressed={showKey}>
          <Icon name="eye" />
          {showKey ? 'Ẩn đáp án' : 'Hiện đáp án'}
        </button>
      </div>
      {groups.map((g) => (
        <Fragment key={g.part?.kind || 'all'}>
          {isExam && <PartHeading part={g.part} count={g.items.length} />}
          {g.items.map(({ ex, no }) => (
            <SheetQuestion
              key={ex.id}
              ex={ex}
              no={no}
              a={answers[ex.id]}
              studentId={studentId}
              isExam={isExam}
              showKey={showKey}
              note={notes[ex.id] || ''}
              onNote={onNote}
            />
          ))}
        </Fragment>
      ))}
    </div>
  )
})

// Một câu trong bài làm. memo: gõ lời phê ở câu này không vẽ lại các câu khác (đề + đáp án có KaTeX rất nặng)
const SheetQuestion = memo(function SheetQuestion({ ex, no, a, studentId, isExam, showKey, note, onNote }) {
  return (
    <div className="question" id={`g-${ex.id}`}>
      <div className="question-label">
        Câu {no} <span className="badge">{KIND_LABEL[ex.kind]}</span>
        {isExam && a && <PointsBadge ex={ex} answer={a} />}
        {!isExam && a?.is_correct === true && <span className="badge badge-ok">Đúng</span>}
        {!isExam && a?.is_correct === false && <span className="badge badge-danger">Sai</span>}
        {ex.kind === 'fill_blank' && a && a.is_correct == null && <span className="badge badge-warn">Cần xem</span>}
        {!a && <span className="badge badge-muted">Không trả lời</span>}
      </div>
      <ExerciseBody ex={ex} mode="review" name={`s-${studentId}-${ex.id}`} value={a?.answer} correct={showKey ? ex.correct : null} />
      {showKey && ex.answer_md && (
        <div className="answer-box">
          <div className="box-label">Đáp án</div>
          <Markdown>{ex.answer_md}</Markdown>
        </div>
      )}
      {showKey && ex.method_md && (
        <div className="method-box">
          <div className="box-label">Phương pháp giải</div>
          <Markdown>{ex.method_md}</Markdown>
        </div>
      )}
      {showKey && ex.correct == null && !ex.answer_md && !ex.method_md && (
        <p className="muted small">Câu này chưa nhập đáp án.</p>
      )}
      <label className="field teacher-note-field">
        <span>{NOTE_LABEL}</span>
        <textarea
          rows={note ? 2 : 1}
          value={note}
          onChange={(e) => onNote(ex.id, e.target.value)}
          placeholder="Lời phê cho câu này (học sinh sẽ thấy)"
        />
      </label>
    </div>
  )
})

// Cấu trúc đề thi so với chuẩn 18 – 4 – 6
function ExamStructureNote({ exercises }) {
  const st = examStructure(exercises)
  return (
    <div className={st.standard ? 'alert alert-ok' : 'alert alert-info'}>
      Đề thi: {st.counts.mcq} câu trắc nghiệm · {st.counts.true_false} câu đúng/sai · {st.counts.short} câu trả lời ngắn
      {st.other ? ` · ${st.other} câu tự chấm` : ''} – tối đa {viNum(st.max)} điểm máy chấm.
      {!st.standard && ' Đề không đúng chuẩn 18 – 4 – 6 nên điểm máy chấm được quy về thang 10.'}
    </div>
  )
}

function GradeCard({ rec, exercises, isExam, limit, answers, retries, notes: savedNotes, onChanged }) {
  const used = minutesUsed(rec.started_at, rec.submitted_at)
  const sum = autoSummary(exercises, answers)
  const exam = isExam ? examSummary(exercises, answers) : null
  // Điểm gợi ý: đề thi = tổng điểm THPT (quy về thang 10 nếu đề không chuẩn); bài thường = tỉ lệ câu đúng × 10, làm tròn 0,25
  const suggested = exam ? (exam.max === 10 ? exam.got : exam.score10) : sum.autoTotal ? Math.round((sum.correct / sum.autoTotal) * 40) / 4 : null
  const answeredCount = Object.keys(answers).length
  // Mở thẳng bài làm khi đã nộp: chọn tên là xem được ngay
  const [showSheet, setShowSheet] = useState(rec.status !== 'todo')
  const [score, setScore] = useState(rec.score ?? '')
  const [feedback, setFeedback] = useState(rec.feedback ?? '')
  // Lời phê từng câu đang gõ; ghi cùng lúc "Lưu chấm" / "Cho nộp lại"
  const [notes, setNotes] = useState(savedNotes)
  const setNote = useCallback((id, v) => setNotes((prev) => ({ ...prev, [id]: v })), [])
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
    const num = score === '' ? null : Number(score)
    if (num !== null && (Number.isNaN(num) || num < 0)) return setError('Điểm không hợp lệ.')
    if (
      rec.status === 'todo' &&
      !(await askConfirm({
        title: 'Học sinh chưa nộp bài',
        message: 'Vẫn chấm và đánh dấu "Đã chấm"?',
        say: 'Bạn này chưa nộp bài đâu nha. Vẫn chấm luôn chứ?',
        confirmText: 'Vẫn chấm',
      }))
    )
      return
    setBusy(true)
    setError(null)
    setSaved(false)
    try {
      await saveAnswerNotes(rec.assignment_id, rec.student_id, notes, savedNotes)
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

  // Cho học sinh nộp lại: lưu nhận xét + lời phê từng câu (học sinh vẫn thấy khi sửa bài), xóa ảnh cũ, đưa về trạng thái chưa nộp.
  // Dùng hộp thoại của app: window.confirm bị chặn trong app cài trên điện thoại nên trước đây bấm không có tác dụng.
  async function reopen() {
    const ok = await askConfirm({
      title: `Cho ${rec.student?.full_name || 'học sinh'} nộp lại?`,
      message:
        'Câu trả lời đã gõ/chọn được giữ để học sinh sửa; ảnh nộp kèm sẽ bị xóa. Nhận xét và lời phê từng câu được lưu lại để học sinh xem khi sửa. Lần nộp tới sẽ thành bài chính thức. (Học sinh đã xem đáp án.)',
      say: 'Cho bạn ấy thêm một cơ hội sửa bài nhé!',
      confirmText: 'Cho nộp lại',
    })
    if (!ok) return
    setBusy(true)
    setError(null)
    try {
      await saveAnswerNotes(rec.assignment_id, rec.student_id, notes, savedNotes)
      await removeSubmissionFiles(rec.submission_path)
      unwrap(
        await supabase
          .from('assignment_recipients')
          .update({ status: 'todo', feedback: feedback.trim() || null, submission_path: null, submitted_at: null, started_at: null })
          .eq('assignment_id', rec.assignment_id)
          .eq('student_id', rec.student_id)
      )
      notifyDone({ title: 'Đã mở lại bài', say: 'Học sinh đã có thể sửa và nộp lại bài rồi ✍️' })
      onChanged()
    } catch (err) {
      setError(errMsg(err))
      setBusy(false)
    }
  }

  return (
    <form className="card" onSubmit={saveGrade}>
      <div className="row row-between" style={{ marginBottom: '0.5rem' }}>
        <strong>{rec.student ? <Link to={`/tutor/students/${rec.student_id}`} className="student-link">{studentLabel(rec.student)}</Link> : studentLabel(rec.student)}</strong>
        <StatusBadge status={rec.status} />
      </div>
      {rec.submitted_at && (
        <p className="muted small" style={{ margin: '0 0 0.5rem' }}>
          Nộp lúc {formatDateTime(rec.submitted_at)}
          {limit && used !== null && (
            <>
              {' · '}
              <Icon name="clock" /> Làm trong {used}/{limit} phút
              {used > limit + 1 && <span className="badge badge-warn" style={{ marginLeft: '0.4rem' }}>Quá giờ {used - limit} phút</span>}
            </>
          )}
        </p>
      )}
      {rec.status === 'checked' && (
        <p className="small" style={{ margin: '0 0 0.5rem' }}>
          Điểm hiện tại: <strong>{formatScore(rec.score)}</strong>
        </p>
      )}

      {rec.status !== 'todo' && exam && exam.parts.length > 0 && (
        <div className="exam-mini">
          <span>
            Máy chấm (THPT): <strong>{viNum(suggested)}</strong>/10
          </span>
          {exam.parts.map((p) => (
            <span key={p.part.kind} className="badge">
              Phần {p.part.roman}: {viNum(p.got)}/{viNum(p.max)}
            </span>
          ))}
        </div>
      )}
      {rec.status !== 'todo' && !exam && sum.autoTotal > 0 && (
        <p className="small" style={{ margin: '0 0 0.5rem' }}>
          Máy chấm: <strong>{sum.correct}/{sum.autoTotal}</strong> câu trắc nghiệm / điền khuyết đúng
        </p>
      )}
      {retries.length > 0 && (
        <p className="retry-line" style={{ margin: '0 0 0.5rem' }} title="Học sinh tự làm lại để luyện, không tính vào điểm chính thức">
          ↻ Tự làm lại: {retries.map((r) => `lần ${r.attempt_no} ${retryScore(r, isExam)}`).join(' · ')}
        </p>
      )}

      <div className="row" style={{ marginBottom: '0.75rem' }}>
        {(answeredCount > 0 || rec.status !== 'todo') && (
          <button type="button" className="btn btn-small" onClick={() => setShowSheet((s) => !s)}>
            <Icon name="eye" />
            {showSheet ? 'Ẩn bài làm' : `Xem bài làm & đáp án (${answeredCount}/${exercises.length} câu)`}
          </button>
        )}
        {rec.submission_path && (
          <button type="button" className="btn btn-small" onClick={toggleImages} disabled={imgLoading}>
            <Icon name="image" />
            {imgLoading ? 'Đang tải ảnh...' : images ? 'Ẩn ảnh' : 'Xem ảnh nộp kèm'}
          </button>
        )}
      </div>
      {showSheet && (
        <AnswerSheet
          exercises={exercises}
          answers={answers}
          studentId={rec.student_id}
          isExam={isExam}
          submitted={rec.status !== 'todo'}
          notes={notes}
          onNote={setNote}
        />
      )}
      {images && (
        <div style={{ marginBottom: '0.75rem' }}>
          <ImageGallery images={images} />
        </div>
      )}

      <div className="grid-2">
        <label className="field">
          <span>Điểm (thang 10)</span>
          <input type="number" inputMode="decimal" step={isExam ? '0.05' : '0.25'} min="0" max="10" value={score} onChange={(e) => setScore(e.target.value)} />
        </label>
        {rec.status !== 'todo' && suggested !== null && (exam ? exam.parts.length > 0 : sum.autoTotal > 0) && (
          <div className="field" style={{ justifyContent: 'flex-end' }}>
            <button
              type="button"
              className="btn btn-small"
              title={exam ? 'Tổng điểm theo thang THPT của phần trắc nghiệm, đúng/sai, trả lời ngắn' : 'Điểm = số câu đúng / số câu máy chấm × 10, làm tròn 0,25'}
              onClick={() => setScore(String(suggested))}
            >
              <Icon name="zap" />
              Dùng điểm máy chấm ({viNum(suggested)})
            </button>
          </div>
        )}
      </div>
      <label className="field">
        <span>Nhận xét</span>
        <textarea rows={3} value={feedback} onChange={(e) => setFeedback(e.target.value)} style={{ fontFamily: 'inherit' }} />
      </label>

      <ErrorBox message={error} />
      {saved && <div className="alert alert-ok">Đã lưu điểm, nhận xét và lời phê từng câu.</div>}
      {rec.status === 'todo' && Object.keys(answers).length > 0 && (
        <p className="muted small">↻ Đã mở lại cho học sinh nộp lại, đang chờ học sinh sửa bài.</p>
      )}

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
