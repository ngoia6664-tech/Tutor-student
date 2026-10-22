import { useId } from 'react'

// Chân dung hành tinh khi gấu giải thích (SpaceExplorer, chế độ focus). Vẽ SVG tay, ánh sáng chiếu từ góc trên trái.
// Mặt cầu bán kính R = 70 trong viewBox -120..120; chi tiết bề mặt nằm trong .pf-spin (trôi ngang = tự quay), vẽ 2 lần cách nhau 2R để lặp liền.
const R = 70
const LOOP = 2 * R

// Lớp tối dần về mép phải dưới (ngày → đêm) + ánh sáng nhẹ góc trên trái
function Shade({ id, night = 0.82 }) {
  return (
    <>
      <defs>
        <radialGradient id={id} cx="34%" cy="32%" r="78%">
          <stop offset="0" stopColor="#fff" stopOpacity="0.22" />
          <stop offset="0.38" stopColor="#fff" stopOpacity="0" />
          <stop offset="0.72" stopColor="#000" stopOpacity={night * 0.45} />
          <stop offset="1" stopColor="#000" stopOpacity={night} />
        </radialGradient>
      </defs>
      <circle r={R} fill={`url(#${id})`} />
    </>
  )
}

// Chi tiết bề mặt trôi ngang, lặp liền
function Spin({ children, speed = 60 }) {
  return (
    <g className="pf-spin" style={{ '--pf-loop': `${-LOOP}px`, '--pf-speed': `${speed}s` }}>
      <g>{children}</g>
      <g transform={`translate(${LOOP} 0)`}>{children}</g>
    </g>
  )
}

function Sun({ u }) {
  return (
    <>
      <defs>
        <radialGradient id={`${u}corona`}>
          <stop offset="0.55" stopColor="#fde68a" stopOpacity="0.55" />
          <stop offset="0.75" stopColor="#fb923c" stopOpacity="0.18" />
          <stop offset="1" stopColor="#f97316" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`${u}disc`} cx="45%" cy="45%" r="60%">
          <stop offset="0" stopColor="#fffbea" />
          <stop offset="0.45" stopColor="#fde047" />
          <stop offset="0.8" stopColor="#f59e0b" />
          <stop offset="1" stopColor="#c2410c" />
        </radialGradient>
        {/* Hạt sáng bề mặt (granulation): nhiễu tĩnh, chỉ tính một lần */}
        <filter id={`${u}gran`} x="-10%" y="-10%" width="120%" height="120%">
          <feTurbulence type="fractalNoise" baseFrequency="0.09" numOctaves="2" seed="7" />
          <feColorMatrix values="0 0 0 0 1  0 0 0 0 0.55  0 0 0 0 0.05  0 0 0 -2.2 1.25" />
          <feComposite in2="SourceGraphic" operator="in" />
        </filter>
      </defs>
      <circle className="pf-corona" r="118" fill={`url(#${u}corona)`} />
      <circle r={R} fill={`url(#${u}disc)`} />
      <circle r={R} fill="#000" filter={`url(#${u}gran)`} opacity="0.35" />
      <g clipPath={`url(#${u}clip)`}>
        <Spin speed={90}>
          <ellipse cx="-22" cy="14" rx="5" ry="3.5" fill="#7c2d12" opacity="0.75" />
          <ellipse cx="-14" cy="18" rx="2.6" ry="2" fill="#7c2d12" opacity="0.7" />
          <ellipse cx="30" cy="-20" rx="3.5" ry="2.6" fill="#7c2d12" opacity="0.6" />
          <ellipse cx="-50" cy="-24" rx="2.2" ry="1.6" fill="#7c2d12" opacity="0.55" />
        </Spin>
      </g>
      {/* Tối rìa (limb darkening): mép đĩa luôn tối hơn tâm */}
      <circle r={R - 1} fill="none" stroke="#9a3412" strokeOpacity="0.35" strokeWidth="3" />
    </>
  )
}

function Crater({ x, y, r }) {
  return (
    <g>
      <circle cx={x} cy={y} r={r} fill="#6b7280" />
      <circle cx={x + r * 0.15} cy={y + r * 0.15} r={r * 0.78} fill="#4b5563" />
      <path d={`M${x - r} ${y} A${r} ${r} 0 0 1 ${x} ${y - r}`} fill="none" stroke="#d1d5db" strokeWidth={Math.max(0.8, r * 0.18)} strokeOpacity="0.7" />
    </g>
  )
}

function Mercury({ u }) {
  return (
    <>
      <defs>
        <radialGradient id={`${u}base`} cx="40%" cy="40%">
          <stop offset="0" stopColor="#c4c4c4" />
          <stop offset="1" stopColor="#7d7d80" />
        </radialGradient>
      </defs>
      <circle r={R} fill={`url(#${u}base)`} />
      <g clipPath={`url(#${u}clip)`}>
        <Spin speed={140}>
          <path d="M-60 -10 Q-30 -25 0 -12 T60 -8 L60 20 Q20 30 -10 18 T-60 24Z" fill="#9b9b9f" opacity="0.5" />
          <Crater x={-30} y={-30} r={11} />
          <Crater x={10} y={-42} r={5} />
          <Crater x={25} y={8} r={14} />
          <Crater x={-12} y={30} r={7} />
          <Crater x={-48} y={10} r={4} />
          <Crater x={50} y={-26} r={6} />
          <Crater x={40} y={44} r={4} />
          <Crater x={-40} y={48} r={5} />
          <Crater x={0} y={2} r={3} />
        </Spin>
      </g>
    </>
  )
}

function Venus({ u }) {
  return (
    <>
      <defs>
        <linearGradient id={`${u}base`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f8e3b0" />
          <stop offset="0.5" stopColor="#e9c07a" />
          <stop offset="1" stopColor="#d49a52" />
        </linearGradient>
      </defs>
      <circle r={R} fill={`url(#${u}base)`} />
      <g clipPath={`url(#${u}clip)`} fill="none" strokeLinecap="round">
        {/* Mây axit sunfuric dày đặc, xoáy hình chữ V */}
        <Spin speed={45}>
          <path d="M-70 -40 Q-35 -22 0 -40 T70 -38" stroke="#fff4d6" strokeWidth="9" opacity="0.45" />
          <path d="M-70 -8 Q-30 18 0 -6 T70 -4" stroke="#c98d48" strokeWidth="7" opacity="0.4" />
          <path d="M-70 22 Q-34 46 0 24 T70 26" stroke="#fff4d6" strokeWidth="11" opacity="0.35" />
          <path d="M-70 50 Q-30 62 0 50 T70 52" stroke="#c98d48" strokeWidth="6" opacity="0.35" />
          <path d="M-40 -58 Q-10 -48 20 -60" stroke="#fffaf0" strokeWidth="4" opacity="0.5" />
        </Spin>
      </g>
    </>
  )
}

function Earth({ u }) {
  return (
    <>
      <defs>
        <radialGradient id={`${u}sea`} cx="40%" cy="38%">
          <stop offset="0" stopColor="#3b82c4" />
          <stop offset="1" stopColor="#173a7a" />
        </radialGradient>
        <radialGradient id={`${u}air`}>
          <stop offset="0.86" stopColor="#7dd3fc" stopOpacity="0" />
          <stop offset="0.9" stopColor="#7dd3fc" stopOpacity="0.55" />
          <stop offset="1" stopColor="#38bdf8" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle r={R * 1.12} fill={`url(#${u}air)`} />
      <circle r={R} fill={`url(#${u}sea)`} />
      <g clipPath={`url(#${u}clip)`}>
        <Spin speed={70}>
          {/* Lục địa giản lược */}
          <path d="M-58 -38 Q-40 -52 -22 -44 Q-12 -30 -26 -18 Q-20 -4 -32 6 Q-30 22 -40 30 Q-50 20 -48 4 Q-62 -10 -58 -38Z" fill="#4f8a3c" />
          <path d="M-30 10 Q-20 14 -18 28 Q-24 46 -34 56 Q-38 40 -36 26Z" fill="#6f9a45" />
          <path d="M8 -44 Q30 -52 52 -40 Q62 -26 50 -16 Q40 -20 30 -8 Q34 10 22 28 Q12 40 6 24 Q10 6 2 -6 Q-4 -24 8 -44Z" fill="#5b8f3e" />
          <path d="M18 -10 Q30 -12 36 0 Q30 10 22 6Z" fill="#c8a96a" />
          <path d="M42 24 Q56 22 60 34 Q50 44 40 36Z" fill="#b8955a" />
          {/* Mây */}
          <g fill="none" stroke="#fff" strokeLinecap="round" opacity="0.75">
            <path d="M-66 -20 Q-44 -28 -20 -22" strokeWidth="4" />
            <path d="M-10 -30 Q14 -36 40 -28" strokeWidth="3" />
            <path d="M-50 40 Q-26 34 0 42 Q20 48 46 40" strokeWidth="4.5" />
            <path d="M10 12 Q26 6 44 12" strokeWidth="2.5" />
            <path d="M-60 16 Q-48 12 -38 16" strokeWidth="2.5" />
          </g>
        </Spin>
        {/* Băng hai cực */}
        <ellipse cx="0" cy={-R + 4} rx="34" ry="10" fill="#f1f5f9" opacity="0.92" />
        <ellipse cx="0" cy={R - 3} rx="40" ry="9" fill="#f8fafc" opacity="0.95" />
      </g>
    </>
  )
}

function Mars({ u }) {
  return (
    <>
      <defs>
        <radialGradient id={`${u}base`} cx="42%" cy="40%">
          <stop offset="0" stopColor="#e8794a" />
          <stop offset="1" stopColor="#a8401c" />
        </radialGradient>
      </defs>
      <circle r={R} fill={`url(#${u}base)`} />
      <g clipPath={`url(#${u}clip)`}>
        <Spin speed={75}>
          <path d="M-62 -6 Q-40 -18 -18 -8 Q0 4 24 -4 Q44 -12 64 0 Q60 16 40 14 Q18 22 -4 16 Q-30 10 -60 14Z" fill="#7a2e14" opacity="0.55" />
          {/* Thung lũng Valles Marineris */}
          <path d="M-40 -22 Q-14 -28 14 -20" fill="none" stroke="#5a200c" strokeWidth="3" strokeLinecap="round" opacity="0.8" />
          {/* Núi lửa Olympus Mons */}
          <circle cx="-48" cy="-32" r="7" fill="#c9653a" />
          <circle cx="-48" cy="-32" r="2.6" fill="#7a2e14" />
          <path d="M10 30 Q30 26 50 34 Q36 44 16 40Z" fill="#8a3518" opacity="0.5" />
          <circle cx="28" cy="-38" r="3" fill="#7a2e14" opacity="0.6" />
        </Spin>
        <ellipse cx="6" cy={-R + 6} rx="26" ry="9" fill="#fdf4ee" opacity="0.92" />
        <ellipse cx="-4" cy={R - 4} rx="16" ry="6" fill="#fdf4ee" opacity="0.75" />
      </g>
    </>
  )
}

function Jupiter({ u }) {
  const bands = [
    [-70, 14, '#cfae86'],
    [-56, 10, '#efe0c2'],
    [-46, 12, '#b98558'],
    [-34, 10, '#f3e6cc'],
    [-24, 14, '#c79466'],
    [-10, 18, '#f6ecd7'],
    [8, 14, '#b67a4c'],
    [22, 10, '#ecdcbc'],
    [32, 12, '#c48e60'],
    [44, 10, '#efe2c6'],
    [54, 16, '#b78c66'],
  ]
  return (
    <>
      <g clipPath={`url(#${u}clip)`}>
        {bands.map(([y, h, c]) => (
          <rect key={y} x={-R} y={y} width={2 * R} height={h} fill={c} />
        ))}
        <Spin speed={35}>
          {/* Mép dải gợn sóng + vệt xoáy */}
          <g fill="none" strokeLinecap="round">
            <path d="M-70 -24 Q-52 -30 -34 -24 T2 -24 T38 -24 T70 -24" stroke="#a86f45" strokeWidth="2.5" opacity="0.7" />
            <path d="M-70 8 Q-54 2 -36 8 T0 8 T36 8 T70 8" stroke="#9e663d" strokeWidth="2.5" opacity="0.7" />
            <path d="M-50 -4 q8 -6 16 0" stroke="#fff8ea" strokeWidth="2" opacity="0.7" />
            <path d="M20 -6 q6 -4 12 0" stroke="#fff8ea" strokeWidth="2" opacity="0.6" />
            <path d="M-20 40 q6 -4 12 0" stroke="#fff8ea" strokeWidth="1.6" opacity="0.6" />
          </g>
          {/* Vết Đỏ Lớn */}
          <ellipse cx="22" cy="18" rx="15" ry="8" fill="#f2d5b5" />
          <ellipse cx="22" cy="18" rx="12" ry="6" fill="#c4542b" />
          <ellipse cx="20" cy="17" rx="6" ry="2.8" fill="#dc7a4d" />
          <ellipse cx="-40" cy="48" rx="4" ry="2.4" fill="#fff8ea" opacity="0.8" />
        </Spin>
      </g>
    </>
  )
}

// Vành đai Sao Thổ: vẽ 2 lần, nửa sau (bị hành tinh che) trước, nửa trước sau
function Rings({ u, half }) {
  const rings = [
    [86, 3, '#a89272', 0.55],
    [94, 6, '#e3cfa2', 0.9],
    [102, 6, '#d4bb88', 0.85],
    [110, 2, '#7d6b52', 0.5],
    [116, 5, '#cbb48a', 0.75],
  ]
  return (
    <g transform="rotate(-18)" clipPath={`url(#${u}${half})`}>
      {rings.map(([r, w, c, o]) => (
        <ellipse key={r} rx={r} ry={r * 0.3} fill="none" stroke={c} strokeWidth={w} opacity={o} />
      ))}
    </g>
  )
}

function Saturn({ u }) {
  const bands = [
    [-70, 16, '#d8c08a'],
    [-54, 14, '#ecdcae'],
    [-40, 12, '#d9be86'],
    [-28, 22, '#f2e3b8'],
    [-6, 14, '#dcc38e'],
    [8, 22, '#efdfb2'],
    [30, 14, '#d3b77f'],
    [44, 26, '#c9ad78'],
  ]
  return (
    <>
      <defs>
        <clipPath id={`${u}back`}>
          <rect x="-130" y="-60" width="260" height="60" />
        </clipPath>
        <clipPath id={`${u}front`}>
          <rect x="-130" y="0" width="260" height="60" />
        </clipPath>
      </defs>
      <Rings u={u} half="back" />
      <g clipPath={`url(#${u}clip)`}>
        {bands.map(([y, h, c]) => (
          <rect key={y} x={-R} y={y} width={2 * R} height={h} fill={c} />
        ))}
        {/* Bóng vành đai đổ lên hành tinh (chỉ cung phía trước, lệch xuống vì nắng chiếu từ trên) */}
        <path d="M-100 0 A100 30 0 0 0 100 0" transform="rotate(-18) translate(0 10)" fill="none" stroke="#5b4a33" strokeWidth="5" opacity="0.35" />
      </g>
    </>
  )
}

// Mặt Trăng: mặt gần (luôn hướng về Trái Đất) nên KHÔNG trôi như các hành tinh khác — đúng với khóa thủy triều.
// Các "biển" dung nham đặt gần đúng vị trí thật, hố Tycho phía nam có tia sáng.
function Moon({ u }) {
  return (
    <>
      <defs>
        <radialGradient id={`${u}base`} cx="42%" cy="40%">
          <stop offset="0" stopColor="#ececec" />
          <stop offset="1" stopColor="#a9a9ad" />
        </radialGradient>
      </defs>
      <circle r={R} fill={`url(#${u}base)`} />
      <g clipPath={`url(#${u}clip)`}>
        <g fill="#7b7c82" opacity="0.75">
          {/* Biển Mưa (Imbrium), Biển Trong Sáng (Serenitatis), Biển Yên Tĩnh (Tranquillitatis), Biển Khủng Hoảng (Crisium) */}
          <path d="M-34 -40 Q-14 -50 -4 -36 Q-2 -22 -16 -16 Q-34 -18 -40 -28Z" />
          <path d="M2 -34 Q16 -40 24 -28 Q22 -16 8 -16 Q0 -22 2 -34Z" />
          <path d="M8 -12 Q26 -16 32 -2 Q28 12 12 10 Q2 2 8 -12Z" />
          <ellipse cx="44" cy="-18" rx="9" ry="7" />
          {/* Đại dương Bão Tố (Procellarum) bên trái */}
          <path d="M-62 -16 Q-46 -24 -36 -10 Q-30 10 -40 30 Q-54 36 -62 20Z" opacity="0.8" />
          <path d="M-22 4 Q-8 0 -4 14 Q-12 26 -24 20Z" opacity="0.7" />
          <ellipse cx="22" cy="26" rx="10" ry="6" opacity="0.7" />
        </g>
        {/* Hố Tycho và các tia sáng */}
        <g stroke="#f5f5f5" strokeLinecap="round" opacity="0.55">
          <path d="M-8 46 L-30 18 M-8 46 L10 12 M-8 46 L30 40 M-8 46 L-44 50 M-8 46 L-2 70" strokeWidth="1.2" />
        </g>
        <circle cx="-8" cy="46" r="4" fill="#f8f8f8" />
        <circle cx="-7.5" cy="46.5" r="2.2" fill="#9a9aa0" />
        <Crater x={36} y={14} r={4} />
        <Crater x={-46} y={-44} r={3} />
        <Crater x={50} y={40} r={3.5} />
        <Crater x={-28} y={56} r={3} />
      </g>
    </>
  )
}

const ART = { sun: Sun, mercury: Mercury, venus: Venus, earth: Earth, moon: Moon, mars: Mars, jupiter: Jupiter, saturn: Saturn }

export default function PlanetPortrait({ body }) {
  const u = useId().replace(/:/g, '')
  const Art = ART[body]
  if (!Art) return null
  return (
    <svg className={`pf pf-${body}`} viewBox="-120 -120 240 240" aria-hidden="true">
      <defs>
        <clipPath id={`${u}clip`}>
          <circle r={R} />
        </clipPath>
      </defs>
      <Art u={u} />
      {body !== 'sun' && <Shade id={`${u}shade`} night={body === 'earth' ? 0.88 : 0.8} />}
      {body === 'saturn' && <Rings u={u} half="front" />}
      {body === 'earth' && (
        <g className="pf-moon">
          <circle cx="92" cy="-74" r="9" fill="#cfcfd2" />
          <circle cx="90" cy="-76" r="2" fill="#a1a1a6" />
          <circle cx="95" cy="-71" r="1.4" fill="#a1a1a6" />
          <circle cx="92" cy="-74" r="9" fill={`url(#${u}shade)`} />
        </g>
      )}
      {/* Trái Đất nhỏ ở góc khi soi Mặt Trăng ("Trái Đất mọc") */}
      {body === 'moon' && (
        <g className="pf-moon">
          <circle cx="-94" cy="-78" r="13" fill="#2f6db3" />
          <path d="M-102 -84 Q-96 -90 -90 -86 Q-92 -78 -98 -76Z M-90 -74 Q-84 -78 -82 -72 Q-86 -68 -90 -70Z" fill="#5b8f3e" />
          <path d="M-104 -76 Q-96 -80 -88 -78" stroke="#fff" strokeWidth="1.6" fill="none" opacity="0.8" />
          <circle cx="-94" cy="-78" r="13" fill={`url(#${u}shade)`} />
        </g>
      )}
    </svg>
  )
}
