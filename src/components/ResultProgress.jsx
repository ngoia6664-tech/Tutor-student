import { useRef, useState } from 'react'
import { isAnswered } from './ExerciseBody.jsx'
import { useStickyTop } from './AnswerProgress.jsx'
import Icon from './Icon.jsx'

const OPEN_KEY = 'result-progress-open'

function readOpen() {
  try {
    return localStorage.getItem(OPEN_KEY) !== '0'
  } catch {
    return true
  }
}

/**
 * Thanh kết quả khi xem bài đã nộp / chấm bài: dính dưới header như thanh "chưa làm" lúc làm bài.
 * Hiện số câu đúng / sai / bỏ trống; mở ra thì liệt kê câu sai, câu bỏ trống, câu có lời phê — bấm để nhảy tới câu.
 * - answers: { exercise_id: { answer, is_correct } }
 * - labels: { exercise_id: "3" | "I.3" } · notes: { exercise_id: lời phê }
 * - idPrefix: id của khối câu là `${idPrefix}${exercise_id}`
 */
export default function ResultProgress({ exercises, answers, labels, notes = {}, idPrefix = 'q-' }) {
  const [open, setOpen] = useState(readOpen)
  const selfRef = useRef(null)
  const top = useStickyTop(selfRef)

  const wrong = exercises.filter((ex) => answers[ex.id]?.is_correct === false)
  const missing = exercises.filter((ex) => !isAnswered(ex, answers[ex.id]?.answer))
  const noted = exercises.filter((ex) => notes[ex.id])
  const right = exercises.filter((ex) => answers[ex.id]?.is_correct === true).length
  const pct = exercises.length ? (right / exercises.length) * 100 : 0

  function toggle() {
    setOpen((v) => {
      try {
        localStorage.setItem(OPEN_KEY, v ? '0' : '1')
      } catch {
        // Trình duyệt chặn lưu: chỉ không nhớ được lựa chọn
      }
      return !v
    })
  }

  const jump = (id) => document.getElementById(`${idPrefix}${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  const label = (ex) => labels?.[ex.id] || exercises.indexOf(ex) + 1

  if (!exercises.length) return null

  const groups = [
    { key: 'wrong', title: 'Câu sai:', items: wrong, cls: 'ap-chip is-wrong' },
    { key: 'missing', title: 'Bỏ trống:', items: missing, cls: 'ap-chip' },
    { key: 'noted', title: 'Có lời phê:', items: noted, cls: 'ap-chip is-noted' },
  ].filter((g) => g.items.length)

  return (
    <div ref={selfRef} className={open ? 'answer-progress' : 'answer-progress is-closed'} style={{ top }}>
      <div className="ap-head">
        <span className="ap-stat ap-done">
          <Icon name="check" size={15} /> Đúng <strong>{right}</strong>
        </span>
        <span className={wrong.length ? 'ap-stat ap-wrong' : 'ap-stat'}>
          Sai <strong>{wrong.length}</strong>
        </span>
        {missing.length > 0 && (
          <span className="ap-stat ap-missing">
            Bỏ trống <strong>{missing.length}</strong>
          </span>
        )}
        <span className="ap-stat muted">/ {exercises.length} câu</span>
        <button type="button" className="btn btn-small btn-ghost ap-toggle" onClick={toggle} aria-expanded={open}>
          <Icon name={open ? 'up' : 'down'} size={15} />
          {open ? 'Ẩn' : 'Hiện'}
        </button>
      </div>
      <div className="ap-track">
        <div className="ap-fill is-ok" style={{ width: `${pct}%` }} />
      </div>
      {open &&
        (groups.length ? (
          groups.map((g) => (
            <div key={g.key} className="ap-list">
              <span className="muted small">{g.title}</span>
              {g.items.map((ex) => (
                <button key={ex.id} type="button" className={g.cls} onClick={() => jump(ex.id)}>
                  {label(ex)}
                </button>
              ))}
            </div>
          ))
        ) : (
          <p className="ap-list small" style={{ margin: 0 }}>
            🎉 Không có câu sai nào.
          </p>
        ))}
    </div>
  )
}
