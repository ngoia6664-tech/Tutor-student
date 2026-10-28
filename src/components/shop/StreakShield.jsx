import { useState } from 'react'
import { usePandaShop } from '../../contexts/PandaShopContext.jsx'
import { notifyError } from '../../lib/dialog.js'

const number = new Intl.NumberFormat('vi-VN')

// Chuỗi Ôn tập + mua khiên (học sinh). Máy chủ kiểm Xu / số khiên tối đa; khiên tự dùng khi lỡ một ngày.
export default function StreakShield() {
  const { data, buyShield } = usePandaShop()
  const [busy, setBusy] = useState(false)
  if (!data || data.isTutor || !data.shield) return null
  const { price, max_held: max, cooldown_days: cooldown } = data.shield
  const s = data.streak
  const full = data.shields >= max
  const missing = Math.max(0, price - data.coins)

  async function buy() {
    setBusy(true)
    try {
      await buyShield()
    } catch (e) {
      notifyError(e.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="streak-card" aria-label="Chuỗi Ôn tập và khiên bảo vệ">
      <div className="streak-card-main">
        <span className="streak-card-fire" aria-hidden="true">🔥</span>
        <div>
          <b>Chuỗi {number.format(s.current)} ngày</b>
          <span className="muted small">
            {s.done_today ? 'Hôm nay đã Ôn tập ✓' : 'Hôm nay chưa Ôn tập'} · dài nhất {number.format(s.longest)} ngày
          </span>
        </div>
      </div>
      <div className="streak-card-shield">
        <span className="streak-card-held" title={`Giữ tối đa ${max} khiên`} aria-label={`Đang có ${data.shields} / ${max} khiên`}>
          {Array.from({ length: max }, (_, i) => (
            <span key={i} className={i < data.shields ? 'is-on' : ''} aria-hidden="true">🛡️</span>
          ))}
        </span>
        <button type="button" className="btn btn-small" onClick={buy} disabled={busy || full || missing > 0}>
          {full ? 'Đủ khiên' : missing ? `Thiếu ${number.format(missing)} Xu` : `Mua khiên · ${number.format(price)} Xu`}
        </button>
      </div>
      <p className="muted small streak-card-note">
        Lỡ một ngày, khiên tự giữ chuỗi (không cộng ngày, không nhận Xu). Tối đa 1 khiên mỗi {cooldown} ngày; bỏ 2 ngày liền thì chuỗi vẫn đứt.
      </p>
    </section>
  )
}
