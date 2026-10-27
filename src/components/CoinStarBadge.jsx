import { usePandaShop } from '../contexts/PandaShopContext.jsx'

const number = new Intl.NumberFormat('vi-VN')

// Xu (tiêu được: mua trang phục, thẻ bảo vệ chuỗi) + Sao (tích luỹ, không tiêu: mở khu vực kính viễn vọng).
// Số lấy từ adapter (lib/pandaShop.js); chưa có backend thì là 0, lỗi / đang tải thì "—".
// variant: 'hud' (thanh nổi ở cửa hàng) | 'compact' (cụm nút Tủ đồ góc màn hình)
export default function CoinStarBadge({ variant = 'hud' }) {
  const { data, loading, error, reload } = usePandaShop()
  const show = (n) => (loading || error ? '—' : number.format(n))
  return (
    <div className={`coin-star coin-star-${variant}`} aria-label="Xu và Sao của bạn" aria-busy={loading}>
      <span className="coin-star-item is-coin" title="Xu: dùng mua trang phục, thẻ bảo vệ chuỗi">
        <span className="coin-star-icon" aria-hidden="true">
          🪙
        </span>
        <b>{show(data?.coins)}</b>
        <span className="coin-star-unit">Xu</span>
      </span>
      <span className="coin-star-sep" aria-hidden="true" />
      <span className="coin-star-item is-star" title="Sao: tích luỹ để mở khu vực kính viễn vọng, không bị tiêu">
        <span className="coin-star-icon" aria-hidden="true">
          ⭐
        </span>
        <b>{show(data?.stars)}</b>
        <span className="coin-star-unit">Sao</span>
      </span>
      {error && variant === 'hud' && (
        <button type="button" className="coin-star-retry" onClick={reload}>
          Tải lại
        </button>
      )}
    </div>
  )
}
