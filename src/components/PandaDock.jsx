import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext.jsx'
import { useStudying } from '../lib/studyLock.js'
import CoinStarBadge from './CoinStarBadge.jsx'

// Hình ngôi cửa hàng: mái vải sọc tím-hồng, cửa kính có móc áo, cửa ra vào, ngôi sao lấp lánh
export function ShopIcon() {
  const w = 52 / 6
  const r = w / 2
  const scallops = `a${r} ${r} 0 0 1-${w} 0 `.repeat(6)
  const awning = `M12 10H52L58 26${scallops}Z`
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
        <linearGradient id="shop-door" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f9a8d4" />
          <stop offset="1" stopColor="#c084fc" />
        </linearGradient>
        <clipPath id="shop-awning-clip">
          <path d={awning} />
        </clipPath>
      </defs>
      <rect x="10" y="28" width="44" height="28" rx="3" fill="url(#shop-wall)" stroke="#d8b4fe" strokeWidth="1.2" />
      <rect x="14" y="34" width="19" height="15" rx="2" fill="#c084fc" fillOpacity=".28" stroke="#e9d5ff" strokeWidth="1.2" />
      <g fill="none" stroke="#fcd34d" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22.6 38.6a1.5 1.5 0 1 1 2.4 1.1c-.6.4-.9.8-.9 1.4v.3" />
        <path d="M23.5 42.6 18 46.5h11l-5.5-3.9Z" />
      </g>
      <rect x="38" y="34" width="12" height="22" rx="2" fill="url(#shop-door)" />
      <circle cx="47" cy="46" r="1" fill="#fff" />
      <rect x="6" y="55" width="52" height="3.4" rx="1.7" fill="#7c3aed" />
      <g clipPath="url(#shop-awning-clip)">
        <rect x="6" y="8" width="52" height="30" fill="url(#shop-awning)" />
        {[1, 3, 5].map((i) => (
          <rect key={i} x={6 + w * i} y="8" width={w} height="30" fill="#fff" fillOpacity=".3" />
        ))}
      </g>
      <path d={awning} fill="none" stroke="#fff" strokeOpacity=".55" strokeWidth="1" strokeLinejoin="round" />
      <path className="shop-sparkle" d="M56 2.5 57.4 6.1 61 7.5 57.4 8.9 56 12.5 54.6 8.9 51 7.5 54.6 6.1Z" fill="#fde68a" />
    </svg>
  )
}

// Lối vào Panda Fashion Shop nổi góc trái dưới: một hình ngôi cửa hàng nhỏ bấm vào cửa hàng, Xu / Sao nằm dưới.
// Ẩn khi đang làm bài và khi đang ở trong cửa hàng.
export default function PandaDock() {
  const { profile } = useAuth()
  const { pathname } = useLocation()
  const studying = useStudying()
  const shopPath = `/${profile.role === 'tutor' ? 'tutor' : 'student'}/shop`

  if (studying || pathname.startsWith(shopPath)) return null

  return (
    <aside className={`panda-dock${profile.role === 'tutor' ? ' is-tutor' : ''}`} aria-label="Panda Fashion Shop">
      <Link to={shopPath} className="panda-shop-icon" title="Panda Fashion Shop" aria-label="Mở Panda Fashion Shop">
        <ShopIcon />
      </Link>
      <div className="panda-dock-stats">
        <CoinStarBadge variant="compact" />
      </div>
    </aside>
  )
}
