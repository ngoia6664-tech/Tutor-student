// @ts-nocheck — nợ kiểu: xóa dòng này rồi chạy npm run typecheck để sửa
import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useLocation } from 'react-router-dom'
import { usePandaShop } from '../contexts/PandaShopContext.jsx'
import { useStudying } from '../lib/studyLock.js'
import Loading from './Loading.jsx'
import Icon from './Icon.jsx'

// Ôn tập mỗi ngày (có ExerciseBody + Markdown): chỉ tải khi mở bảng
const DailyReview = lazy(() => import('./DailyReview.jsx'))

// Màu lửa theo mốc chuỗi (cùng các mốc thưởng chuỗi ở máy chủ): càng dài lửa càng "hiếm"
const TIERS = [
  { min: 730, id: 'rainbow', name: 'Lửa cầu vồng' },
  { min: 365, id: 'gold', name: 'Lửa vàng kim' },
  { min: 200, id: 'cyan', name: 'Lửa ngọc' },
  { min: 100, id: 'blue', name: 'Lửa xanh' },
  { min: 50, id: 'purple', name: 'Lửa tím' },
  { min: 30, id: 'pink', name: 'Lửa hồng' },
  { min: 7, id: 'red', name: 'Lửa đỏ' },
  { min: 1, id: 'orange', name: 'Lửa cam' },
]
const NEXT = [...TIERS].reverse()

// Đặt cụm lửa ngay dưới thanh trên cùng (chiều cao đổi khi xoay máy / menu xuống dòng)
function useTopbarHeight() {
  const [h, setH] = useState(0)
  useEffect(() => {
    const topbar = document.querySelector('.topbar')
    if (!topbar) return
    const update = () => setH(topbar.offsetHeight)
    update()
    const ro = new ResizeObserver(update)
    ro.observe(topbar)
    return () => ro.disconnect()
  }, [])
  return h
}

// Ngọn lửa chuỗi 🔥 nổi ở góc trên bên phải màn hình (như gấu ở góc dưới phải; chỉ học sinh). Chưa làm hôm nay:
// lửa leo lét; chuỗi 0: lửa tắt. Ngay dưới là nút icon mở Ôn tập mỗi ngày (ẩn khi đã xong / không có câu).
// Ẩn cả cụm khi đang làm bài (thanh tiến độ dính đầu trang) và trong cửa hàng (đã có bảng Xu/Sao/chuỗi ở góc phải).
export default function StreakFlame() {
  const { data, loading, error } = usePandaShop() || {}
  const studying = useStudying()
  const { pathname } = useLocation()
  const top = useTopbarHeight()
  const [open, setOpen] = useState(false)
  // Xong Ôn tập → tài khoản tải lại: bảng đang mở vẫn giữ nguyên
  const dialog = open && <DailyDialog onClose={() => setOpen(false)} />
  if (studying || pathname.startsWith('/student/shop') || loading || error || !data || data.isTutor || !data.streak) return dialog || null

  const { current, done_today, longest } = data.streak
  const tier = TIERS.find((t) => current >= t.min)
  const next = NEXT.find((t) => t.min > current)
  const canReview = data.dailyAvailable && !done_today
  const title = [
    `Chuỗi Ôn tập: ${current} ngày${tier ? ` · ${tier.name}` : ''}`,
    done_today ? 'Hôm nay đã giữ chuỗi' : data.dailyAvailable ? 'Hôm nay chưa làm Ôn tập' : 'Hôm nay chưa có câu Ôn tập',
    next && `${next.min - current} ngày nữa: ${next.name}`,
    `Dài nhất ${longest} ngày · ${data.shields} khiên 🛡️`,
  ]
    .filter(Boolean)
    .join('\n')

  return (
    <div className="streak-flame-wrap" style={{ top: `calc(${top}px + 0.6rem)` }}>
      <span
        className={`streak-flame tier-${tier?.id || 'out'}${done_today ? ' is-lit' : ''}`}
        title={title}
        aria-label={`Chuỗi ${current} ngày${done_today ? ', hôm nay đã giữ' : ''}`}
        role="img"
      >
        <FlameSvg />
        <b>{current}</b>
      </span>
      {canReview && (
        <button type="button" className="streak-review-btn" onClick={() => setOpen(true)} title="Làm Ôn tập để giữ chuỗi" aria-label="Làm Ôn tập để giữ chuỗi">
          <Icon name="todo" size={20} />
        </button>
      )}
      {dialog}
    </div>
  )
}

function FlameSvg() {
  return (
    <svg viewBox="0 0 24 32" aria-hidden="true">
      <path className="flame-outer" d="M12 1C13 7 20 11 20 20a8 8 0 0 1-16 0c0-4 2-7 4-9 0 3 1 5 3 6-1-6 1-12 1-16Z" />
      <path className="flame-mid" d="M12 10c1 4 5 6 5 11a5 5 0 0 1-10 0c0-2.4 1.2-4 2.4-5 .2 1.8.8 3 2 3.6-.6-3.6.2-7 .6-9.6Z" />
      <path className="flame-core" d="M12 18c.6 2 2.6 3 2.6 5.4a2.6 2.6 0 0 1-5.2 0c0-1.6 1-2.6 1.8-3.4.2 1 .5 1.4.8 1.6 0-1.4 0-2.6 0-3.6Z" />
    </svg>
  )
}

// Bảng nổi (giống bảng Cài đặt): không đổi trang
function DailyDialog({ onClose }) {
  const panel = useRef(null)
  const closeRef = useRef(onClose)
  closeRef.current = onClose
  useEffect(() => {
    panel.current?.focus()
    const key = (e) => e.key === 'Escape' && closeRef.current()
    window.addEventListener('keydown', key)
    return () => window.removeEventListener('keydown', key)
  }, [])

  return createPortal(
    <div className="settings-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="settings-panel daily-dialog" role="dialog" aria-modal="true" aria-labelledby="daily-title" tabIndex={-1} ref={panel}>
        <div className="settings-head">
          <h2 id="daily-title">🔥 Ôn tập giữ chuỗi</h2>
          <button type="button" className="btn btn-ghost theme-toggle" onClick={onClose} aria-label="Đóng" title="Đóng">
            <Icon name="close" />
          </button>
        </div>
        <Suspense fallback={<Loading />}>
          <DailyReview />
        </Suspense>
      </div>
    </div>,
    document.body
  )
}
