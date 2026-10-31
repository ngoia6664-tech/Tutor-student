// @ts-nocheck — nợ kiểu: xóa dòng này rồi chạy npm run typecheck để sửa
import { useEffect, useRef, useState } from 'react'
import { isAnswered } from './ExerciseBody.jsx'
import Icon from './Icon.jsx'

const OPEN_KEY = 'answer-progress-open'

function readOpen() {
  try {
    return localStorage.getItem(OPEN_KEY) !== '0'
  } catch {
    return true
  }
}

// Chiều cao header (thay đổi khi xoay máy / menu xuống dòng) để thanh dính ngay bên dưới.
// Đồng thời ghi --answer-offset = header + thanh tiến độ lên <html>: .question dùng làm scroll-margin-top,
// nên nhảy tới câu thì đầu câu không bị hai thanh che.
export function useStickyTop(selfRef) {
  const [h, setH] = useState(0)
  useEffect(() => {
    const topbar = document.querySelector('.topbar')
    const self = selfRef.current
    const root = document.documentElement
    const update = () => {
      const top = topbar?.offsetHeight || 0
      setH(top)
      root.style.setProperty('--answer-offset', `${top + (self?.offsetHeight || 0)}px`)
    }
    update()
    const ro = new ResizeObserver(update)
    if (topbar) ro.observe(topbar)
    if (self) ro.observe(self)
    return () => {
      ro.disconnect()
      root.style.removeProperty('--answer-offset')
    }
  }, [selfRef])
  return h
}

/**
 * Thanh tiến độ khi làm bài: dính dưới header, luôn thấy khi cuộn.
 * Hiện số câu đã làm / chưa làm / tổng; mở ra thì liệt kê câu chưa làm, bấm để nhảy tới câu đó.
 * Thu gọn / mở được, nhớ lựa chọn trên máy.
 * - labels: { exercise_id: "3" | "I.3" } (nhãn câu như trong đề)
 */
export default function AnswerProgress({ exercises, answers, labels }) {
  const [open, setOpen] = useState(readOpen)
  const selfRef = useRef(null)
  const top = useStickyTop(selfRef)
  const missing = exercises.filter((ex) => !isAnswered(ex, answers[ex.id]))
  const done = exercises.length - missing.length
  const pct = exercises.length ? (done / exercises.length) * 100 : 0

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

  // block 'start' + scroll-margin-top: đầu câu nằm ngay dưới thanh này (kể cả câu cao hơn màn hình)
  const jump = (id) => document.getElementById(`q-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })

  if (!exercises.length) return null

  return (
    <div ref={selfRef} className={open ? 'answer-progress' : 'answer-progress is-closed'} style={{ top }}>
      <div className="ap-head">
        <span className="ap-stat ap-done">
          <Icon name="check" size={15} /> Đã làm <strong>{done}</strong>
        </span>
        <span className={missing.length ? 'ap-stat ap-missing' : 'ap-stat'}>
          Chưa làm <strong>{missing.length}</strong>
        </span>
        <span className="ap-stat muted">/ {exercises.length} câu</span>
        <button type="button" className="btn btn-small btn-ghost ap-toggle" onClick={toggle} aria-expanded={open}>
          <Icon name={open ? 'up' : 'down'} size={15} />
          {open ? 'Ẩn' : 'Hiện'}
        </button>
      </div>
      <div className="ap-track">
        <div className="ap-fill" style={{ width: `${pct}%` }} />
      </div>
      {open &&
        (missing.length ? (
          <div className="ap-list">
            <span className="muted small">Câu chưa làm:</span>
            {missing.map((ex) => (
              <button key={ex.id} type="button" className="ap-chip" onClick={() => jump(ex.id)}>
                {labels?.[ex.id] || exercises.indexOf(ex) + 1}
              </button>
            ))}
          </div>
        ) : (
          <p className="ap-list small" style={{ margin: 0 }}>
            🎉 Đã làm đủ các câu, kiểm tra lại rồi nộp bài nhé.
          </p>
        ))}
    </div>
  )
}
