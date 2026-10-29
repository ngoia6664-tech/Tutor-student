import { useEffect, useRef } from 'react'
import { playShipLaunch } from '../../lib/spaceSound.js'
import '../../styles/warp.css'

// Chuyển địa điểm trong Kính thiên văn (SpaceExplorer): gấu chui vào tàu ở góc, động cơ khởi động (1,8 s)
// → tàu bay ra giữa → cả màn hình là cảnh du hành (vệt sao kéo dài) → đổi địa điểm phía sau → tàu đáp xuống góc,
// mở cửa, gấu bước ra (3 s). Tiếng: public/audio/sfx/ship-launch.mp3 (4,8 s, cùng mốc).
// Chỉ dùng transform / opacity (CSS animation, styles/warp.css), không rAF. Tắt trong Cài đặt ("Hiệu ứng du hành").
// Mốc thời gian (ms) khớp với keyframes trong warp.css: đổi --warp-dur ở đó thì đổi TRAVEL_MS ở đây.
export const TRAVEL_MS = 4800
const SWAP_MS = 2925 // giữa chặng bay: màn hình đã phủ kín, đổi địa điểm phía sau

// Vệt sao: góc + độ trễ + tốc độ cố định (không ngẫu nhiên mỗi lần render)
const STREAKS = Array.from({ length: 56 }, (_, i) => ({
  a: (i * 137.5) % 360,
  d: ((i * 0.173) % 0.6).toFixed(2),
  t: (0.45 + ((i * 7) % 5) * 0.09).toFixed(2),
  w: 1 + (i % 3),
}))

export default function WarpTravel({ to, color, onSwap, onDone }) {
  // Giữ callback mới nhất, hẹn giờ chỉ đặt một lần
  const cb = useRef({ onSwap, onDone })
  cb.current = { onSwap, onDone }
  useEffect(() => {
    const stopSound = playShipLaunch()
    const a = setTimeout(() => cb.current.onSwap(), SWAP_MS)
    const b = setTimeout(() => cb.current.onDone(), TRAVEL_MS)
    return () => {
      clearTimeout(a)
      clearTimeout(b)
      stopSound()
    }
  }, [])

  return (
    <div className="warp" style={{ '--warp-c': color }} role="status" aria-label={`Đang bay tới ${to}`}>
      <div className="warp-sky" aria-hidden="true">
        {STREAKS.map((s, i) => (
          <span key={i} className="warp-streak" style={{ '--a': `${s.a}deg` }}>
            <i style={{ '--d': `${s.d}s`, '--t': `${s.t}s`, '--w': `${s.w}px` }} />
          </span>
        ))}
      </div>
      <p className="warp-to" aria-hidden="true">
        Đang bay tới <b>{to}</b>
      </p>
      <div className="warp-ship" aria-hidden="true">
        <div className="warp-ship-shake">
          <Ship />
        </div>
      </div>
    </div>
  )
}

const INK = '#2a1f3d'
// Tàu vũ trụ nhỏ (cùng kiểu tàu Phi Hành Gia ở Panda Shop): thân trắng, cánh tím, cửa sổ có gấu, cửa sập bên hông, lửa đuôi
function Ship() {
  return (
    <svg viewBox="-40 -48 80 110" className="warp-ship-svg">
      <defs>
        <linearGradient id="warp-hull" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#cbd5e1" />
          <stop offset="0.45" stopColor="#fff" />
          <stop offset="1" stopColor="#cbd5e1" />
        </linearGradient>
        <linearGradient id="warp-fire" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" />
          <stop offset="0.45" stopColor="#a5f3fc" />
          <stop offset="1" stopColor="#38bdf8" stopOpacity="0" />
        </linearGradient>
      </defs>
      <g className="warp-fire">
        <path d="M-7 36 Q0 64 7 36 Z" fill="url(#warp-fire)" />
      </g>
      <g strokeLinejoin="round">
        <path d="M-12 8 L-24 30 L-24 38 L-11 31 Z M12 8 L24 30 L24 38 L11 31 Z" fill="#a855f7" stroke={INK} strokeWidth="1.2" />
        <path d="M0 -44 Q16 -24 13 6 L12 32 L-12 32 L-13 6 Q-16 -24 0 -44 Z" fill="url(#warp-hull)" stroke={INK} strokeWidth="1.4" />
        <path d="M-9 -26 Q0 -35 9 -26" fill="none" stroke="#f472b6" strokeWidth="2.2" />
        <circle cy="-10" r="7.5" fill="#0e7490" stroke="#94a3b8" strokeWidth="1.5" />
        {/* Gấu nhìn qua cửa sổ */}
        <g className="warp-face">
          <circle cx="-4" cy="-14.5" r="2" fill={INK} />
          <circle cx="4" cy="-14.5" r="2" fill={INK} />
          <circle cy="-10" r="5.2" fill="#fff" />
          <circle cx="-1.9" cy="-10.6" r="1.25" fill={INK} />
          <circle cx="1.9" cy="-10.6" r="1.25" fill={INK} />
          <ellipse cy="-8.4" rx="0.9" ry="0.6" fill={INK} />
        </g>
        <path d="M-12 32 H12 L9 37 H-9 Z" fill="#475569" stroke={INK} strokeWidth="1.1" />
        {/* Cửa sập: mở lúc gấu chui vào và lúc gấu bước ra */}
        <rect x="-7" y="8" width="14" height="18" rx="3" fill="#1e1b2e" />
        <rect className="warp-door" x="-7" y="8" width="14" height="18" rx="3" fill="#e2e8f0" stroke={INK} strokeWidth="1.1" />
      </g>
    </svg>
  )
}
