import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext.jsx'
import { useStudying } from '../lib/studyLock.js'
import { updateSettings, useSettings } from '../lib/settings.js'
import CoinStarBadge from './CoinStarBadge.jsx'

// Logo cửa hàng: tiệm quần áo nhỏ — biển hiệu có móc treo áo vàng, mái vải sọc tím-hồng, tủ kính trưng váy hồng,
// trước cửa là gấu trúc đeo nơ đang vẫy tay chào (.shop-wave), ngôi sao nhỏ lấp lánh trên nóc
const INK = '#241a4a'
export function ShopIcon() {
  const w = 50 / 6
  const r = w / 2
  const awning = `M12 12H52L57 24${`a${r} ${r} 0 0 1-${w} 0 `.repeat(6)}Z`
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true">
      <defs>
        <linearGradient id="shop-awning" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#a855f7" />
          <stop offset="1" stopColor="#ec4899" />
        </linearGradient>
        <linearGradient id="shop-wall" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#4c3a9a" />
          <stop offset="1" stopColor="#241a58" />
        </linearGradient>
        <linearGradient id="shop-dress" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f9a8d4" />
          <stop offset="1" stopColor="#ec4899" />
        </linearGradient>
        <clipPath id="shop-awning-clip">
          <path d={awning} />
        </clipPath>
      </defs>
      {/* Tường + tủ kính trưng váy + cửa */}
      <rect x="9" y="22" width="46" height="36" rx="2.5" fill="url(#shop-wall)" stroke="#d8b4fe" strokeWidth="1" />
      <rect x="13" y="29" width="20" height="21" rx="2" fill="#c084fc" fillOpacity=".25" stroke="#e9d5ff" strokeWidth="1.1" />
      <path d="M19.5 34.2 23 32l3.5 2.2" fill="none" stroke="#fcd34d" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M20.6 34.6h4.8l-.8 3.2 4 9.2H17.4l4-9.2Z" fill="url(#shop-dress)" />
      <rect x="38" y="33" width="13" height="25" rx="1.5" fill="#c084fc" fillOpacity=".45" stroke="#e9d5ff" strokeWidth="1" />
      <rect x="4" y="57.5" width="56" height="3" rx="1.5" fill="#7c3aed" />
      {/* Mái vải sọc */}
      <g clipPath="url(#shop-awning-clip)">
        <rect x="6" y="10" width="52" height="24" fill="url(#shop-awning)" />
        {[1, 3, 5].map((i) => (
          <rect key={i} x={7 + w * i} y="10" width={w} height="24" fill="#fff" fillOpacity=".3" />
        ))}
      </g>
      <path d={awning} fill="none" stroke="#fff" strokeOpacity=".55" strokeWidth="1" strokeLinejoin="round" />
      {/* Biển hiệu: móc treo áo */}
      <rect x="21" y="2.5" width="22" height="9" rx="4.5" fill={INK} stroke="#fcd34d" strokeWidth="1" />
      <path d="M30.8 5.4a1.2 1.2 0 1 1 1.2 1.2v.7M27.6 9.6 32 7.3l4.4 2.3Z" fill="none" stroke="#fcd34d" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round" />
      <path className="shop-sparkle" d="M56 1.5 57.2 4.6 60.3 5.8 57.2 7 56 10.1 54.8 7 51.7 5.8 54.8 4.6Z" fill="#fde68a" />
      {/* Gấu trúc trước cửa vẫy tay */}
      <g stroke={INK} strokeWidth=".8">
        <ellipse cx="43.6" cy="60" rx="2.8" ry="1.9" fill={INK} />
        <ellipse cx="50.4" cy="60" rx="2.8" ry="1.9" fill={INK} />
        <ellipse cx="47" cy="54" rx="7.5" ry="6.5" fill="#fff" />
        <ellipse cx="40.3" cy="54.2" rx="2.2" ry="3.6" transform="rotate(20 40.3 54.2)" fill={INK} />
        <path className="shop-wave" d="M53 51.5 58.5 43.5" fill="none" strokeWidth="4.4" strokeLinecap="round" />
        <circle cx="40.8" cy="36.6" r="3" fill={INK} />
        <circle cx="53.2" cy="36.6" r="3" fill={INK} />
        <circle cx="47" cy="43" r="8" fill="#fff" />
      </g>
      <path d="M44.5 50.6 47 51.9l2.5-1.3v2.6L47 51.9l-2.5 1.3Z" fill="#ec4899" />
      <ellipse cx="43.8" cy="43" rx="2.2" ry="2.8" transform="rotate(-25 43.8 43)" fill={INK} />
      <ellipse cx="50.2" cy="43" rx="2.2" ry="2.8" transform="rotate(25 50.2 43)" fill={INK} />
      <circle cx="44.2" cy="42.6" r=".9" fill="#fff" />
      <circle cx="49.8" cy="42.6" r=".9" fill="#fff" />
      <ellipse cx="47" cy="46.3" rx="1.2" ry=".8" fill={INK} />
      <path d="M45.6 47.6q1.4 1 2.8 0" fill="none" stroke={INK} strokeWidth=".7" strokeLinecap="round" />
      <circle cx="42.3" cy="46.8" r="1.3" fill="#f472b6" fillOpacity=".6" />
      <circle cx="51.7" cy="46.8" r="1.3" fill="#f472b6" fillOpacity=".6" />
    </svg>
  )
}

// Lối vào Panda Fashion Shop nổi góc trái dưới: logo tiệm quần áo + gấu vẫy tay, bảng LED Xu / Sao bên dưới,
// một nút ‹ / › thu gọn hoặc mở lại cả cụm (cài đặt `dock`). Ẩn khi đang làm bài và khi đang ở trong cửa hàng.
export default function PandaDock() {
  const { profile } = useAuth()
  const { pathname } = useLocation()
  const studying = useStudying()
  const shopPath = `/${profile.role === 'tutor' ? 'tutor' : 'student'}/shop`
  const { dock } = useSettings()

  if (studying || pathname.startsWith(shopPath)) return null

  return (
    <aside className={`panda-dock${profile.role === 'tutor' ? ' is-tutor' : ''}`} aria-label="Panda Fashion Shop">
      {dock && (
        <Link to={shopPath} className="panda-shop-icon" title="Panda Fashion Shop" aria-label="Mở Panda Fashion Shop">
          <ShopIcon />
        </Link>
      )}
      <div className="panda-dock-row">
        {dock && (
          <Link to={shopPath} className="panda-dock-tag" aria-label="Xu và Sao của bạn, mở cửa hàng">
            <CoinStarBadge variant="compact" />
          </Link>
        )}
        <button
          type="button"
          className="dock-toggle"
          aria-expanded={dock}
          aria-label={dock ? 'Thu gọn cửa hàng và Xu / Sao' : 'Hiện cửa hàng và Xu / Sao'}
          title={dock ? 'Thu gọn' : 'Hiện cửa hàng'}
          onClick={() => updateSettings({ dock: !dock })}
        >
          <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
            <path d={dock ? 'M15 6l-6 6 6 6' : 'M9 6l6 6-6 6'} fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
    </aside>
  )
}
