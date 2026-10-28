import { usePandaShop } from '../contexts/PandaShopContext.jsx'

const number = new Intl.NumberFormat('vi-VN')

// Xu (tiêu được: mua trang phục, thẻ bảo vệ chuỗi) + Sao (tích luỹ, không tiêu: mở khu vực kính viễn vọng) + 🔥 chuỗi Ôn tập (chỉ bản hud;
// ngoài cửa hàng chuỗi hiện ở ngọn lửa trên thanh trên cùng, StreakFlame).
// Số thật từ máy chủ (lib/pandaShop.js); lỗi / đang tải thì "—". Gia sư không có ví: hiện ∞ (toàn quyền, không phải số dư).
// Hiển thị như một bảng đèn LED nhỏ (.led-panel): nền tối, số phát sáng — Xu vàng, Sao xanh băng, chuỗi cam.
// variant: 'hud' (đầu trang cửa hàng) | 'compact' (cụm góc màn hình, PandaDock)
export default function CoinStarBadge({ variant = 'hud' }) {
  const { data, loading, error, reload } = usePandaShop()
  const tutor = data?.isTutor
  const show = (n) => (loading || error ? '—' : tutor ? '∞' : number.format(n ?? 0))
  const streak = !tutor && !loading && !error ? data?.streak : null
  return (
    <div className={`coin-star led-panel coin-star-${variant}`} aria-label="Xu, Sao và chuỗi của bạn" aria-busy={loading}>
      <span className="coin-star-item is-coin" title={tutor ? 'Gia sư: mở khoá mọi bộ, không dùng Xu' : 'Xu: dùng mua trang phục, thẻ bảo vệ chuỗi'}>
        <span className="coin-star-icon" aria-hidden="true">
          🪙
        </span>
        <b>{show(data?.coins)}</b>
        <span className="coin-star-unit">Xu</span>
      </span>
      <span className="coin-star-item is-star" title="Sao: tích luỹ để mở khu vực kính viễn vọng, không bị tiêu">
        <span className="coin-star-icon" aria-hidden="true">
          ⭐
        </span>
        <b>{show(data?.stars)}</b>
        <span className="coin-star-unit">Sao</span>
      </span>
      {streak && variant === 'hud' && (
        <span
          className={`coin-star-item is-streak${streak.done_today ? ' is-done' : ''}`}
          title={`Chuỗi Ôn tập mỗi ngày${streak.done_today ? ' (hôm nay đã xong)' : ' — làm Ôn tập hôm nay để giữ chuỗi'} · dài nhất ${streak.longest} ngày · ${data.shields} khiên`}
        >
          <span className="coin-star-icon" aria-hidden="true">
            🔥
          </span>
          <b>{number.format(streak.current)}</b>
          <span className="coin-star-unit">ngày</span>
          {variant === 'hud' && data.shields > 0 && <span className="coin-star-shield">🛡️{data.shields}</span>}
        </span>
      )}
      {error && variant === 'hud' && (
        <button type="button" className="coin-star-retry" onClick={reload}>
          Tải lại
        </button>
      )}
    </div>
  )
}
