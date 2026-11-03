import { isAnswered } from './ExerciseBody.jsx'
import ContextPanel from './ContextPanel.jsx'

/**
 * Cột phải trang làm bài (học sinh): ô số mọi câu, câu đã làm tô tím, bấm để nhảy tới câu.
 * Màn rộng thay cho thanh tiến độ dính trên (shell.css ẩn .answer-progress khi cột phải hiện).
 * @param {{ exercises: { id: string, kind: string }[], answers: Record<string, any>, labels?: Record<string, string> }} props
 */
export default function QuestionGrid({ exercises, answers, labels }) {
  if (!exercises.length) return null
  const done = exercises.filter((ex) => isAnswered(ex, answers[ex.id])).length
  // block 'start' + scroll-margin-top của .question: đầu câu nằm ngay dưới thanh trên cùng
  const jump = (/** @type {string} */ id) => document.getElementById(`q-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })

  return (
    <ContextPanel title="Các câu trong bài" replace>
      <p className="small ctx-qstat">
        Đã làm <strong>{done}</strong>/{exercises.length} câu
      </p>
      <div className="ctx-track" aria-hidden="true">
        <div className="ctx-fill" style={{ width: `${(done / exercises.length) * 100}%` }} />
      </div>
      <div className="qgrid">
        {exercises.map((ex, i) => {
          const ok = isAnswered(ex, answers[ex.id])
          const label = labels?.[ex.id] || String(i + 1)
          return (
            <button
              key={ex.id}
              type="button"
              className={ok ? 'qcell is-done' : 'qcell'}
              onClick={() => jump(ex.id)}
              aria-label={`Câu ${label}${ok ? ', đã làm' : ', chưa làm'}`}
            >
              {label}
            </button>
          )
        })}
      </div>
      <p className="muted small ctx-legend">
        <span className="qdot is-done" /> Đã làm <span className="qdot" /> Chưa làm
      </p>
    </ContextPanel>
  )
}
