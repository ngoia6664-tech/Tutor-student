import { memo, useCallback, useState } from 'react'
import { useAuth } from '../contexts/AuthContext.jsx'
import { useAsync } from '../lib/useAsync.js'
import { answerDailyReview, fetchDailyReview, keyFromAnswer } from '../lib/dailyReview.js'
import { loadMarks } from '../lib/marks.js'
import { loadMyReports } from '../lib/reports.js'
import { economyChanged } from '../lib/pandaShop.js'
import { mascotSay } from '../lib/celebrate.js'
import { errMsg } from '../lib/errors.js'
import ExerciseBody, { isAnswered, KIND_LABEL } from './ExerciseBody.jsx'
import ErrorBox from './ErrorBox.jsx'
import Loading from './Loading.jsx'
import Icon from './Icon.jsx'
import MarkHard from './MarkHard.jsx'
import ReportQuestion from './ReportQuestion.jsx'

/** @param {string} studentId */
async function loadDaily(studentId) {
  const daily = await fetchDailyReview()
  const ids = (daily?.items || []).map((/** @type {any} */ it) => it.exercise_id)
  const [marks, reports] = await Promise.all([loadMarks(ids, studentId), loadMyReports(ids, studentId)])
  return { ...daily, marks, reports }
}

// Ôn tập mỗi ngày (bảng nổi mở từ nút dưới ngọn lửa chuỗi, StreakFlame): tối đa 5 câu máy chấm từ bài đã nộp, cố định trong ngày (giờ VN).
// Sai thì thử lại tới khi đúng; đúng hết → máy chủ cộng Xu + chuỗi 🔥 một lần (gấu báo qua PandaShopContext).
export default function DailyReview() {
  const { profile } = useAuth()
  const studentId = profile.id
  const { data, loading, error, reload } = useAsync(() => loadDaily(studentId), [studentId])
  // Câu vừa làm đúng trên trang này: { exercise_id: answer }
  const [solved, setSolved] = useState(/** @type {Record<string, any>} */ ({}))

  const onSolved = useCallback(
    (/** @type {string} */ id, /** @type {any} */ answer, /** @type {any} */ res) => {
      if (res.expired) {
        mascotSay('Sang ngày mới rồi, thầy đổi bộ câu Ôn tập mới cho bạn nhé 🌅')
        setSolved({})
        return reload()
      }
      if (res.correct) setSolved((prev) => ({ ...prev, [id]: answer }))
      if (res.just_completed) economyChanged()
    },
    [reload]
  )

  if (loading) return <Loading />
  if (error) return <ErrorBox message={error} onRetry={reload} />
  if (!data?.items?.length) {
    return (
      <div className="daily-card is-empty">
        <p className="muted small">Nộp bài có câu trắc nghiệm để mở Ôn tập mỗi ngày. Hôm nay không tính vào chuỗi.</p>
      </div>
    )
  }

  const items = data.items.map((/** @type {any} */ it) => (solved[it.exercise_id] ? { ...it, solved: true, answer: it.answer || solved[it.exercise_id] } : it))
  const done = items.filter((/** @type {any} */ it) => it.solved).length
  const complete = data.completed || done === items.length

  return (
    <section className={`daily-card${complete ? ' is-done' : ''}`} aria-label="Ôn tập mỗi ngày">
      <div className="daily-head">
        <span className="muted small">{complete ? `Hoàn thành · +${data.coins} Xu · chuỗi đã giữ 🔥` : `${done}/${items.length} câu · xong được +${data.coins} Xu`}</span>
        <span className="daily-dots" aria-hidden="true">
          {items.map((/** @type {any} */ it) => (
            <span key={it.exercise_id} className={it.solved ? 'is-on' : ''} />
          ))}
        </span>
      </div>
      <p className="muted small daily-note">Câu chọn từ các bài bạn đã nộp. Sai thì sửa và thử lại tới khi đúng; không tính vào điểm bài.</p>
      {items.map((/** @type {any} */ it, /** @type {number} */ i) => (
        <DailyQuestion
          key={it.exercise_id}
          item={it}
          n={i + 1}
          onResult={onSolved}
          studentId={studentId}
          marked={data.marks.has(it.exercise_id)}
          hasNote={!!data.marks.get(it.exercise_id)}
          report={data.reports[it.exercise_id]}
        />
      ))}
    </section>
  )
}

const DailyQuestion = memo(/** @param {{ item: any, n: number, onResult: (id: string, answer: any, res: any) => void, studentId: string, marked: boolean, hasNote: boolean, report: any }} props */ function DailyQuestion({ item, n, onResult, studentId, marked, hasNote, report }) {
  const [value, setValue] = useState(/** @type {any} */ (null))
  const [wrong, setWrong] = useState(false)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(/** @type {string | null} */ (null))
  const ex = { id: item.exercise_id, kind: item.kind, question_md: item.question_md, options: item.options }

  async function check() {
    setBusy(true)
    setErr(null)
    try {
      const res = await answerDailyReview(item.exercise_id, value)
      setWrong(!res.correct && !res.expired)
      onResult(item.exercise_id, value, res)
    } catch (e) {
      setErr(errMsg(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="question daily-q">
      <div className="question-label">
        <span className="badge">Câu {n} · {KIND_LABEL[ex.kind]}</span>
        {item.solved && <span className="badge badge-ok">Đúng rồi!</span>}
        {wrong && !item.solved && <span className="badge badge-danger">Chưa đúng, thử lại</span>}
        <span className="muted small daily-from">{item.assignment_title}</span>
        <MarkHard exerciseId={ex.id} studentId={studentId} marked={marked} hasNote={hasNote} />
        <ReportQuestion exerciseId={ex.id} report={report} />
      </div>
      <ExerciseBody
        ex={ex}
        mode={item.solved ? 'review' : 'answer'}
        name={`d-${ex.id}`}
        photoHint={false}
        value={item.solved ? item.answer : value}
        onChange={(/** @type {any} */ v) => {
          setValue(v)
          setWrong(false)
        }}
        correct={item.solved ? keyFromAnswer(ex.kind, item.answer) : null}
      />
      <ErrorBox message={err} />
      {!item.solved && (
        <div className="row" style={{ marginTop: '0.5rem' }}>
          <button type="button" className="btn btn-primary btn-small" onClick={check} disabled={busy || !isAnswered(ex, value)}>
            <Icon name="check" /> Kiểm tra
          </button>
        </div>
      )}
    </div>
  )
})
