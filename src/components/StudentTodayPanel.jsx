import { useState } from 'react'
import { usePandaShop } from '../contexts/PandaShopContext.jsx'
import { CtxCard } from './ContextPanel.jsx'
import { DailyDialog } from './StreakFlame.jsx'

// Khối mặc định cột phải của học sinh (Layout → ContextDefault): chuỗi Ôn tập, Xu, Sao + nút mở Ôn tập mỗi ngày.
// Số lấy từ PandaShopContext (cùng nguồn với ngọn lửa và cụm Xu / Sao), không tải thêm.
export default function StudentTodayPanel() {
  const data = usePandaShop()?.data
  const [open, setOpen] = useState(false)
  if (!data || data.isTutor) return null
  const streak = data.streak?.current || 0
  const doneToday = !!data.streak?.done_today
  const canReview = data.dailyAvailable && !doneToday

  return (
    <CtxCard title="Hôm nay" icon="calendar" className="ctx-default ctx-top">
      <dl className="ctx-stats">
        <div className={doneToday ? 'ctx-stat is-lit' : 'ctx-stat'}>
          <dt>Chuỗi ngày</dt>
          <dd>
            <span aria-hidden="true">🔥</span> {streak}
          </dd>
        </div>
        <div className="ctx-stat is-reward">
          <dt>Xu</dt>
          <dd>{data.coins ?? 0}</dd>
        </div>
        <div className="ctx-stat is-reward">
          <dt>Sao</dt>
          <dd>{data.stars ?? 0}</dd>
        </div>
      </dl>
      {/* Chỉ một dòng ngắn khi chưa ôn hôm nay; còn lại ngọn lửa + nút đã nói đủ */}
      {canReview && <p className="small ctx-note">Chưa ôn hôm nay.</p>}
      {/* Luôn hiện: chưa ôn hôm nay thì nút chính "giữ chuỗi", đã xong / chưa có câu thì nút phụ mở lại bảng Ôn tập */}
      <button type="button" className={canReview ? 'btn btn-primary btn-small btn-block' : 'btn btn-small btn-block'} onClick={() => setOpen(true)}>
        {canReview ? 'Ôn tập giữ chuỗi' : doneToday ? 'Xem lại Ôn tập hôm nay' : 'Ôn tập mỗi ngày'}
      </button>
      {open && <DailyDialog onClose={() => setOpen(false)} />}
    </CtxCard>
  )
}
