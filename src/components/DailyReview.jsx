// @ts-nocheck — nợ kiểu: xóa dòng này rồi chạy npm run typecheck để sửa
import { memo, useCallback, useState } from 'react'
import { useAsync } from '../lib/useAsync.js'
import { answerDailyReview, fetchDailyReview, keyFromAnswer } from '../lib/dailyReview.js'
import { economyChanged } from '../lib/pandaShop.js'
import { mascotSay } from '../lib/celebrate.js'
import { errMsg } from '../lib/errors.js'
import ExerciseBody, { isAnswered, KIND_LABEL } from './ExerciseBody.jsx'
import ErrorBox from './ErrorBox.jsx'
import Loading from './Loading.jsx'
import Icon from './Icon.jsx'

// Ôn tập mỗi ngày (bảng nổi mở từ nút dưới ngọn lửa chuỗi, StreakFlame): tối đa 5 câu máy chấm từ bài đã nộp, cố định trong ngày (giờ VN).
// Sai thì thử lại tới khi đúng; đúng hết → máy chủ cộng Xu + chuỗi 🔥 một lần (gấu báo qua PandaShopContext).
export default function DailyReview() {
  const { data, loading, error, reload } = useAsync(fetchDailyReview, [])
  // Câu vừa làm đúng trên trang này: { exercise_id: answer }
  const [solved, setSolved] = useState({})

  const onSolved = useCallback(
    (id, answer, res) => {
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

  const items = data.items.map((it) => (solved[it.exercise_id] ? { ...it, solved: true, answer: it.answer || solved[it.exercise_id] } : it))
  const done = items.filter((it) => it.solved).length
  const complete = data.completed || done === items.length

  return (
    <section className={`daily-card${complete ? ' is-done' : ''}`} aria-label="Ôn tập mỗi ngày">
      <div className="daily-head">
        <span className="muted small">{complete ? `Hoàn thành · +${data.coins} Xu · chuỗi đã giữ 🔥` : `${done}/${items.length} câu · xong được +${data.coins} Xu`}</span>
        <span className="daily-dots" aria-hidden="true">
          {items.map((it) => (
            <span key={it.exercise_id} className={it.solved ? 'is-on' : ''} />
          ))}
        </span>
      </div>
      <p className="muted small daily-note">Câu chọn từ các bài bạn đã nộp. Sai thì sửa và thử lại tới khi đúng; không tính vào điểm bài.</p>
      {items.map((it, i) => (
        <DailyQuestion key={it.exercise_id} item={it} n={i + 1} onResult={onSolved} />
      ))}
    </section>
  )
}

const DailyQuestion = memo(function DailyQuestion({ item, n, onResult }) {
  const [value, setValue] = useState(null)
  const [wrong, setWrong] = useState(false)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)
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
      </div>
      <ExerciseBody
        ex={ex}
        mode={item.solved ? 'review' : 'answer'}
        name={`d-${ex.id}`}
        photoHint={false}
        value={item.solved ? item.answer : value}
        onChange={(v) => {
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
