import { useEffect, useState } from 'react'
import { isAnswered } from './ExerciseBody.jsx'
import ContextPanel from './ContextPanel.jsx'
import { useAnimatedNumber } from '../lib/useAnimatedNumber.js'
import { getScroller, onScroll as onContentScroll, viewTop } from '../lib/scroller.js'

/**
 * Cột phải trang làm bài (học sinh): ô số mọi câu, câu đã làm tô màu, bấm để nhảy tới câu.
 * Tích hợp ScrollSpy: viền sáng và nhịp thở hổ phách cho câu đang xem trong màn hình.
 * Màn rộng thay cho thanh tiến độ dính trên (shell.css ẩn .answer-progress khi cột phải hiện).
 * @param {{ exercises: { id: string, kind: string }[], answers: Record<string, any>, labels?: Record<string, string> }} props
 */
export default function QuestionGrid({ exercises, answers, labels }) {
  if (!exercises.length) return null
  const done = exercises.filter((ex) => isAnswered(ex, answers[ex.id])).length
  const pctTarget = Math.round((done / exercises.length) * 100)
  const animatedPct = useAnimatedNumber(pctTarget)
  const [currentId, setCurrentId] = useState(/** @type {string | null} */ (null))

  // ScrollSpy: quan sát câu hỏi đang nằm trong tầm mắt khi cuộn
  useEffect(() => {
    if (!exercises.length) return
    const ids = exercises.map((ex) => ex.id)
    const elements = ids.map((id) => document.getElementById(`q-${id}`)).filter(Boolean)
    if (!elements.length) return

    const scrollRoot = getScroller()

    // Bắt câu cuối khi học sinh cuộn sát đáy trang
    const offScroll = onContentScroll(() => {
      const scrollEl = getScroller()
      const isBottom = scrollEl
        ? scrollEl.scrollTop + scrollEl.clientHeight >= scrollEl.scrollHeight - 50
        : window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 50
      if (isBottom && ids.length) {
        setCurrentId(ids[ids.length - 1])
      }
    })

    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting)
        if (visible.length > 0) {
          const vTop = viewTop()
          visible.sort((a, b) => Math.abs(a.boundingClientRect.top - vTop) - Math.abs(b.boundingClientRect.top - vTop))
          const targetId = visible[0].target.id.replace(/^q-/, '')
          if (targetId) setCurrentId(targetId)
        }
      },
      {
        root: scrollRoot,
        rootMargin: '-8% 0px -55% 0px',
        threshold: [0, 0.2, 0.5, 0.8],
      }
    )

    elements.forEach((el) => el && io.observe(el))

    // Khởi tạo vị trí câu đầu tiên hiển thị
    const vTop = viewTop()
    const firstInView = elements.find((el) => {
      const r = el.getBoundingClientRect()
      return r.bottom > vTop + 15
    })
    if (firstInView) {
      setCurrentId(firstInView.id.replace(/^q-/, ''))
    } else if (ids.length) {
      setCurrentId(ids[0])
    }

    return () => {
      io.disconnect()
      offScroll()
    }
  }, [exercises])

  // block 'start' + scroll-margin-top của .question: đầu câu nằm ngay dưới thanh trên cùng
  const jump = (/** @type {string} */ id) => {
    setCurrentId(id)
    document.getElementById(`q-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <ContextPanel title="Các câu trong bài" icon="grid" replace>
      <p className="small ctx-qstat">
        <span>Đã làm <strong>{done}</strong>/{exercises.length} câu</span>
        <span className="badge badge-primary">{animatedPct}%</span>
      </p>
      <div className="ctx-track" aria-hidden="true">
        <div className="ctx-fill" style={{ width: `${(done / exercises.length) * 100}%` }} />
      </div>
      <div className="qgrid">
        {exercises.map((ex, i) => {
          const ok = isAnswered(ex, answers[ex.id])
          const isCurrent = ex.id === currentId
          const label = labels?.[ex.id] || String(i + 1)
          return (
            <button
              key={ex.id}
              type="button"
              className={`qcell${ok ? ' is-done' : ''}${isCurrent ? ' is-current' : ''}`}
              onClick={() => jump(ex.id)}
              aria-label={`Câu ${label}${ok ? ', đã làm' : ', chưa làm'}${isCurrent ? ', đang xem' : ''}`}
              aria-current={isCurrent ? 'location' : undefined}
            >
              {label}
            </button>
          )
        })}
      </div>
      <p className="muted small ctx-legend">
        <span className="qdot is-done" /> Đã làm
        <span className="qdot" /> Chưa làm
        <span className="qdot is-current" /> Đang xem
      </p>
    </ContextPanel>
  )
}
