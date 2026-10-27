import { useId } from 'react'
import { starPath } from '../PandaArt.jsx'
import { ANCHORS, raisedPoint } from './outfitLooks.jsx'

// Hiệu ứng riêng của từng trang phục (catalog `effect` → EFFECTS), vẽ thành 2 lớp SVG trùm quanh gấu:
// Back (sau lưng gấu) và Front (trước mặt). Khung viewBox -30..150 nên toạ độ trùng khung gấu 120×120
// (gấu đặt ở giữa, cách mỗi cạnh 1/6) → điểm (x, y) trên gấu = (x, y) ở đây.
// m = có chuyển động không (tắt khi "Animation gấu" tắt / giảm chuyển động): tắt thì vẫn vẽ, chỉ đứng yên.
// Chỉ dùng transform / opacity (SMIL) — không filter, không canvas; chỉ phòng thử đồ mới gắn lớp này.

const ids = (raw) => {
  const base = 'fx' + raw.replace(/[^a-zA-Z0-9]/g, '')
  return { id: (n) => `${base}-${n}`, url: (n) => `url(#${base}-${n})` }
}

// Lấp lánh 4 cánh tâm (x, y)
const sparkle = (x, y, r) => `M${x} ${y - r} Q${x} ${y} ${x + r} ${y} Q${x} ${y} ${x} ${y + r} Q${x} ${y} ${x - r} ${y} Q${x} ${y} ${x} ${y - r} Z`

// Elip dạng path (để vật bay theo quỹ đạo bằng animateMotion): đi nửa dưới (phía trước gấu) rồi nửa trên (phía sau)
const ellipsePath = (cx, cy, rx, ry) => `M${cx - rx} ${cy} a${rx} ${ry} 0 1 0 ${rx * 2} 0 a${rx} ${ry} 0 1 0 ${-rx * 2} 0`

// Đi kèm animateMotion trên ellipsePath: sáng khi ở phía trước, mờ khi vòng ra sau lưng gấu
function Depth({ dur, begin }) {
  return <animate attributeName="opacity" values="1;1;0.12;0.12;1" keyTimes="0;0.46;0.54;0.94;1" dur={dur} begin={begin} repeatCount="indefinite" />
}

function Twinkle({ m, dur = '2.6s', begin = '0s', min = 0.15, children }) {
  return (
    <g opacity={m ? undefined : 0.8}>
      {children}
      {m && <animate attributeName="opacity" values={`${min};1;${min}`} dur={dur} begin={begin} repeatCount="indefinite" />}
    </g>
  )
}

function Glow({ id, color, opacity = 0.5 }) {
  return (
    <radialGradient id={id}>
      <stop offset="0" stopColor={color} stopOpacity={opacity} />
      <stop offset="1" stopColor={color} stopOpacity="0" />
    </radialGradient>
  )
}

// ---------- Hiếm ⭐: hào quang nhẹ + 3 tia lấp lánh ----------
const softSparkle = {
  Back() {
    const f = ids(useId())
    return (
      <>
        <defs>
          <Glow id={f.id('g')} color="#7dd3fc" opacity={0.35} />
        </defs>
        <ellipse cx="60" cy="78" rx="58" ry="54" fill={f.url('g')} />
      </>
    )
  },
  Front({ m }) {
    return (
      <g fill="#e0f2fe">
        <Twinkle m={m} begin="0s">
          <path d={sparkle(14, 36, 4.5)} />
        </Twinkle>
        <Twinkle m={m} begin="0.9s">
          <path d={sparkle(106, 26, 3.6)} />
        </Twinkle>
        <Twinkle m={m} begin="1.7s">
          <path d={sparkle(104, 100, 3)} />
        </Twinkle>
      </g>
    )
  },
}

// ---------- Panda DJ: vòng neon quanh tai nghe, cột equalizer, nốt nhạc bay lên ----------
const BARS = [0.55, 0.85, 0.4, 1, 0.65, 0.9, 0.5, 0.75, 0.45]
const djWave = {
  Back({ m }) {
    const f = ids(useId())
    return (
      <>
        <defs>
          <Glow id={f.id('g')} color="#a855f7" opacity={0.42} />
          <linearGradient id={f.id('bar')} x1="0" y1="1" x2="0" y2="0">
            <stop offset="0" stopColor="#22d3ee" />
            <stop offset="1" stopColor="#c084fc" />
          </linearGradient>
        </defs>
        <ellipse cx="60" cy="74" rx="62" ry="56" fill={f.url('g')} />
        {/* Hai vòng sóng toả ra từ tai nghe, lệch pha nhau */}
        {[0, 1.2].map((b) => (
          <ellipse key={b} cx="60" cy="42" rx="40" ry="30" fill="none" stroke="#22d3ee" strokeWidth="1.3" opacity={m ? 0 : 0.35}>
            {m && (
              <>
                <animate attributeName="rx" values="36;54" dur="2.4s" begin={`${b}s`} repeatCount="indefinite" />
                <animate attributeName="ry" values="27;40" dur="2.4s" begin={`${b}s`} repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.7;0" dur="2.4s" begin={`${b}s`} repeatCount="indefinite" />
              </>
            )}
          </ellipse>
        ))}
        {BARS.map((h, i) => (
          <g key={i} transform={`translate(${-14 + i * 18.5} 128)`} opacity="0.75">
            <rect x="-4" y={-34 * h} width="8" height={34 * h} rx="3" fill={f.url('bar')}>
              {m && (
                <animateTransform
                  attributeName="transform"
                  type="scale"
                  values={`1 1; 1 ${0.35 + (i % 3) * 0.2}; 1 1.25; 1 1`}
                  dur={`${1.6 + (i % 4) * 0.25}s`}
                  repeatCount="indefinite"
                />
              )}
            </rect>
          </g>
        ))}
      </>
    )
  },
  Front({ m }) {
    const note = 'M0 0 v-8.5 l6 -1.8 v8.2 M0 0 a2.4 2 0 1 1 -0.1 0 M6 -2.1 a2.4 2 0 1 1 -0.1 0'
    return (
      <>
        {/* Đĩa than phát sáng nhịp nhàng */}
        <circle cx="89" cy="97" r="14" fill="none" stroke="#ec4899" strokeWidth="1.4" opacity={m ? undefined : 0.45}>
          {m && <animate attributeName="opacity" values="0.15;0.75;0.15" dur="1.8s" repeatCount="indefinite" />}
        </circle>
        {m &&
          [
            [24, 34, '0s', '#22d3ee'],
            [96, 30, '1.4s', '#f472b6'],
            [104, 52, '2.6s', '#c084fc'],
          ].map(([x, y, b, c]) => (
            <g key={b} opacity="0">
              <path d={note} transform={`translate(${x} ${y})`} fill={c} stroke={c} strokeWidth="1.6" strokeLinecap="round" />
              <animateMotion path="M0 0 q-8 -12 2 -26" dur="3.8s" begin={b} repeatCount="indefinite" />
              <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.2;0.7;1" dur="3.8s" begin={b} repeatCount="indefinite" />
            </g>
          ))}
      </>
    )
  },
}

// ---------- Kiếm Sĩ Tinh Hệ (Hiếm ⭐⭐⭐): chòm sao tinh hệ sau lưng, vòng năng lượng quanh kiếm, kiếm sáng thở,
//            tinh thể tím trên tay toả nhịp + 2 tia bay quanh, tinh thể lướt quanh vạt áo, vệt chém ----------
const DUEL_STARS = [
  [-6, 30],
  [14, 2],
  [44, -12],
  [82, -10],
  [112, 8],
  [128, 44],
]
const starBlade = {
  Back({ m }) {
    const f = ids(useId())
    return (
      <>
        <defs>
          <Glow id={f.id('g')} color="#9333ea" opacity={0.45} />
        </defs>
        <ellipse cx="56" cy="76" rx="62" ry="56" fill={f.url('g')} />
        <path d={DUEL_STARS.map(([x, y], i) => `${i ? 'L' : 'M'}${x} ${y}`).join(' ')} fill="none" stroke="#e9d5ff" strokeWidth="0.5" opacity="0.45" />
        <g fill="#f5d0fe">
          {DUEL_STARS.map(([x, y], i) => (
            <Twinkle key={i} m={m} begin={`${i * 0.45}s`} dur="3s" min={0.25}>
              <path d={sparkle(x, y, i % 2 ? 2.4 : 3.4)} />
            </Twinkle>
          ))}
        </g>
      </>
    )
  },
  Front({ m }) {
    // Kiếm đang giơ (tư thế 'teach'): đổi toạ độ ngồi sang toạ độ giơ tay như FrontPanda
    const [gx, gy] = raisedPoint(ANCHORS.blade.g)
    const [tx, ty] = raisedPoint(ANCHORS.blade.t)
    const mx = (gx + tx) / 2
    const my = (gy + ty) / 2
    const len = Math.hypot(tx - gx, ty - gy)
    const ang = (Math.atan2(ty - gy, tx - gx) * 180) / Math.PI
    const rx = len / 2 + 4
    const crystal = 'M0 -3.4 L2 0 L0 3.4 L-2 0 Z'
    return (
      <>
        <path d={`M${gx} ${gy} L${tx} ${ty}`} stroke="#e9d5ff" strokeWidth="5" strokeLinecap="round" opacity={m ? undefined : 0.35}>
          {m && <animate attributeName="opacity" values="0.12;0.55;0.12" dur="2.8s" repeatCount="indefinite" />}
        </path>
        <g transform={`rotate(${ang} ${mx} ${my})`}>
          <ellipse cx={mx} cy={my} rx={rx} ry="4.5" fill="none" stroke="#c084fc" strokeWidth="0.9" opacity="0.85">
            {m && <animate attributeName="ry" values="4.5;1.2;4.5" dur="2.2s" repeatCount="indefinite" />}
          </ellipse>
          <circle r="1.5" fill="#f5d0fe" cx={m ? 0 : mx + rx} cy={m ? 0 : my}>
            {m && <animateMotion path={ellipsePath(mx, my, rx, 4.5)} dur="2.2s" repeatCount="indefinite" />}
          </circle>
        </g>
        {/* Tinh thể năng lượng trên tay phải: nhịp toả sáng + 2 tia bay quanh */}
        <circle cx="94" cy="80" r="9" fill="none" stroke="#e9d5ff" strokeWidth="1" opacity={m ? 0 : 0.5}>
          {m && (
            <>
              <animate attributeName="r" values="8;17" dur="2s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.8;0" dur="2s" repeatCount="indefinite" />
            </>
          )}
        </circle>
        {['0s', '-1.3s'].map((b) => (
          <circle key={b} r="1.2" fill="#fff" cx={m ? 0 : 106} cy={m ? 0 : 80}>
            {m && <animateMotion path={ellipsePath(94, 80, 12, 5)} dur="2.6s" begin={b} repeatCount="indefinite" />}
          </circle>
        ))}
        {/* Tinh thể lướt vòng quanh vạt áo choàng */}
        {(m ? ['0s', '2s', '4s'] : ['0s']).map((b, i) => (
          <g key={b} opacity={m ? 0 : 0.8} transform={m ? undefined : 'translate(98 112)'}>
            <path d={crystal} fill={i === 1 ? '#e9d5ff' : '#c084fc'} stroke="#fff" strokeWidth="0.4" />
            {m && (
              <>
                <animateMotion path="M8 116 C30 132 90 132 112 110" dur="6s" begin={b} repeatCount="indefinite" rotate="auto" />
                <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.15;0.8;1" dur="6s" begin={b} repeatCount="indefinite" />
              </>
            )}
          </g>
        ))}
        {/* Thỉnh thoảng một vệt chém sáng rồi tắt */}
        {m && (
          <path d="M-8 52 Q34 16 86 30" fill="none" stroke="#f5d0fe" strokeWidth="2.2" strokeLinecap="round" pathLength="100" strokeDasharray="34 100" strokeDashoffset="34" opacity="0">
            <animate attributeName="stroke-dashoffset" values="34;34;-100;-100" keyTimes="0;0.74;0.86;1" dur="7s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0;0;0.9;0" keyTimes="0;0.74;0.8;0.9" dur="7s" repeatCount="indefinite" />
          </path>
        )}
      </>
    )
  },
}

// ---------- Pháp Sư Sao: vòng phép xoay chậm sau lưng, sao bay quanh người, đầu gậy toả sáng, sao nhỏ bay lên ----------
const starOrbit = {
  Back({ m }) {
    const f = ids(useId())
    const tri = (rot) =>
      [0, 120, 240]
        .map((d) => {
          const a = ((d + rot - 90) * Math.PI) / 180
          return `${(60 + 40 * Math.cos(a)).toFixed(1)},${(84 + 40 * Math.sin(a)).toFixed(1)}`
        })
        .join(' ')
    return (
      <>
        <defs>
          <Glow id={f.id('g')} color="#facc15" opacity={0.22} />
        </defs>
        <ellipse cx="60" cy="80" rx="64" ry="58" fill={f.url('g')} />
        <g opacity="0.5" fill="none" stroke="#c4b5fd">
          <circle cx="60" cy="84" r="52" strokeWidth="1.1" />
          <circle cx="60" cy="84" r="46" strokeWidth="0.7" strokeDasharray="2 3" />
          <polygon points={tri(0)} strokeWidth="0.8" />
          <polygon points={tri(60)} strokeWidth="0.8" />
          {Array.from({ length: 12 }, (_, i) => {
            const a = (i * Math.PI) / 6
            return <circle key={i} cx={60 + 49 * Math.cos(a)} cy={84 + 49 * Math.sin(a)} r="1.2" fill="#fde68a" stroke="none" />
          })}
          {m && <animateTransform attributeName="transform" type="rotate" values="0 60 84; 360 60 84" dur="40s" repeatCount="indefinite" />}
        </g>
      </>
    )
  },
  Front({ m }) {
    const f = ids(useId())
    const [hx, hy] = raisedPoint(ANCHORS.staffHead)
    const orbit = ellipsePath(60, 78, 58, 15)
    return (
      <>
        <defs>
          <Glow id={f.id('head')} color="#fef08a" opacity={0.75} />
        </defs>
        <circle cx={hx} cy={hy - 2.5} r="11" fill={f.url('head')}>
          {m && <animate attributeName="r" values="9;14;9" dur="2.4s" repeatCount="indefinite" />}
        </circle>
        <g transform="rotate(-8 60 78)">
          <path d={orbit} fill="none" stroke="#fde68a" strokeWidth="0.6" opacity="0.35" />
          {['0s', '-3s', '-6s'].map((b, i) => (
            <path key={b} d={starPath(0, 0, [4, 3, 2.4][i])} fill="#fde68a" stroke="#d97706" strokeWidth="0.5" transform={m ? undefined : `translate(${[2, 118, 60][i]} ${[78, 78, 93][i]})`}>
              {m && <animateMotion path={orbit} dur="9s" begin={b} repeatCount="indefinite" />}
              {m && <Depth dur="9s" begin={b} />}
            </path>
          ))}
        </g>
        {m &&
          [
            [22, '0s'],
            [46, '1.1s'],
            [80, '2.2s'],
            [100, '3.3s'],
          ].map(([x, b]) => (
            <g key={x} opacity="0">
              <path d={sparkle(x, 118, 2.2)} fill="#fef9c3" />
              <animateMotion path="M0 0 v-62" dur="4.4s" begin={b} repeatCount="indefinite" />
              <animate attributeName="opacity" values="0;0.9;0" dur="4.4s" begin={b} repeatCount="indefinite" />
            </g>
          ))}
      </>
    )
  },
}

// ---------- Phi Hành Gia: hành tinh tí hon bay quanh, mũ kính loé sáng, bụi vũ trụ; cả gấu lơ lửng (float) ----------
const spaceDrift = {
  float: true,
  Back({ m }) {
    const f = ids(useId())
    const orbit = ellipsePath(60, 64, 66, 18)
    return (
      <>
        <defs>
          <Glow id={f.id('g')} color="#38bdf8" opacity={0.3} />
          <radialGradient id={f.id('p1')} cx="0.35" cy="0.3" r="0.8">
            <stop offset="0" stopColor="#fbcfe8" />
            <stop offset="1" stopColor="#c026d3" />
          </radialGradient>
          <radialGradient id={f.id('p2')} cx="0.35" cy="0.3" r="0.8">
            <stop offset="0" stopColor="#cffafe" />
            <stop offset="1" stopColor="#0891b2" />
          </radialGradient>
        </defs>
        <ellipse cx="60" cy="70" rx="64" ry="60" fill={f.url('g')} />
        <g transform="rotate(10 60 64)">
          <path d={orbit} fill="none" stroke="#bae6fd" strokeWidth="0.7" strokeDasharray="1.5 3" opacity="0.5" />
          <circle r="4.2" fill={f.url('p1')} cx={m ? 0 : -6} cy={m ? 0 : 64}>
            {m && <animateMotion path={orbit} dur="12s" repeatCount="indefinite" />}
            {m && <Depth dur="12s" begin="0s" />}
          </circle>
          <circle r="2.6" fill={f.url('p2')} cx={m ? 0 : 126} cy={m ? 0 : 64}>
            {m && <animateMotion path={orbit} dur="12s" begin="-6s" repeatCount="indefinite" />}
            {m && <Depth dur="12s" begin="-6s" />}
          </circle>
        </g>
      </>
    )
  },
  Front({ m }) {
    return (
      <>
        <path d="M74 14 Q88 21 95 35" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" opacity={m ? 0 : 0.5}>
          {m && <animate attributeName="opacity" values="0;0;0.95;0" keyTimes="0;0.6;0.72;0.9" dur="4.5s" repeatCount="indefinite" />}
        </path>
        {m &&
          [
            [110, 8, '0s'],
            [-6, 30, '1.3s'],
            [118, 70, '2.4s'],
            [4, 96, '3.1s'],
            [96, 116, '0.7s'],
          ].map(([x, y, b]) => (
            <circle key={b} cx={x} cy={y} r="0.9" fill="#e0f2fe" opacity="0">
              <animateMotion path="M0 0 l-16 10" dur="4s" begin={b} repeatCount="indefinite" />
              <animate attributeName="opacity" values="0;0.9;0" dur="4s" begin={b} repeatCount="indefinite" />
            </circle>
          ))}
      </>
    )
  },
}

// ---------- Ngân Hà (endgame): tinh vân, 2 vành quỹ đạo, tinh thể bay quanh, sao nhấp nháy, cụm thiên hà thoáng hiện ----------
const galaxyOrbit = {
  Back({ m }) {
    const f = ids(useId())
    return (
      <>
        <defs>
          <Glow id={f.id('pink')} color="#ec4899" opacity={0.42} />
          <Glow id={f.id('blue')} color="#38bdf8" opacity={0.36} />
          <Glow id={f.id('core')} color="#c084fc" opacity={0.45} />
          <linearGradient id={f.id('ring')} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#f0abfc" stopOpacity="0.1" />
            <stop offset="0.5" stopColor="#f0abfc" stopOpacity="0.85" />
            <stop offset="1" stopColor="#7dd3fc" stopOpacity="0.2" />
          </linearGradient>
        </defs>
        <ellipse cx="34" cy="70" rx="60" ry="50" fill={f.url('pink')}>
          {m && <animate attributeName="opacity" values="0.7;1;0.7" dur="6s" repeatCount="indefinite" />}
        </ellipse>
        <ellipse cx="92" cy="58" rx="56" ry="46" fill={f.url('blue')}>
          {m && <animate attributeName="opacity" values="1;0.65;1" dur="7s" repeatCount="indefinite" />}
        </ellipse>
        <ellipse cx="60" cy="80" rx="54" ry="50" fill={f.url('core')} />
        <g fill="none">
          <ellipse cx="60" cy="80" rx="66" ry="17" stroke={f.url('ring')} strokeWidth="1.2" transform="rotate(-14 60 80)">
            {m && <animateTransform attributeName="transform" type="rotate" values="-14 60 80; -8 60 80; -14 60 80" dur="10s" repeatCount="indefinite" />}
          </ellipse>
          <ellipse cx="60" cy="74" rx="54" ry="13" stroke={f.url('ring')} strokeWidth="0.8" transform="rotate(12 60 74)">
            {m && <animateTransform attributeName="transform" type="rotate" values="12 60 74; 6 60 74; 12 60 74" dur="12s" repeatCount="indefinite" />}
          </ellipse>
        </g>
      </>
    )
  },
  Front({ m }) {
    const ringA = ellipsePath(60, 80, 66, 17)
    const ringB = ellipsePath(60, 74, 54, 13)
    const crystal = 'M0 -3.6 L2.2 0 L0 3.6 L-2.2 0 Z'
    const movers = [
      [-14, ringA, '0s', 13, 'crystal'],
      [-14, ringA, '-6.5s', 13, 'star'],
      [12, ringB, '-2s', 9, 'crystal'],
      [12, ringB, '-6.5s', 9, 'star'],
    ]
    return (
      <>
        {movers.map(([rot, path, b, dur, kind], i) => (
          <g key={i} transform={`rotate(${rot} ${rot < 0 ? '60 80' : '60 74'})`}>
            {kind === 'star' ? (
              <path d={starPath(0, 0, 3)} fill="#fde68a" stroke="#fff" strokeWidth="0.4" transform={m ? undefined : `translate(${i < 2 ? 126 : 6} ${i < 2 ? 80 : 74})`}>
                {m && <animateMotion path={path} dur={`${dur}s`} begin={b} repeatCount="indefinite" />}
                {m && <Depth dur={`${dur}s`} begin={b} />}
              </path>
            ) : (
              <path d={crystal} fill="#f0abfc" stroke="#fff" strokeWidth="0.5" transform={m ? undefined : `translate(${i < 2 ? -6 : 114} ${i < 2 ? 80 : 74})`}>
                {m && <animateMotion path={path} dur={`${dur}s`} begin={b} repeatCount="indefinite" />}
                {m && <Depth dur={`${dur}s`} begin={b} />}
              </path>
            )}
          </g>
        ))}
        <g fill="#fff">
          {[
            [8, 20, 3.4, '0s'],
            [112, 14, 2.6, '0.8s'],
            [-8, 70, 2.4, '1.6s'],
            [124, 100, 3, '2.2s'],
            [30, -10, 2.2, '1.1s'],
          ].map(([x, y, r, b]) => (
            <Twinkle key={b} m={m} begin={b} dur="3.2s" min={0.05}>
              <path d={sparkle(x, y, r)} />
            </Twinkle>
          ))}
        </g>
        {/* Thiên hà xoắn ốc nhỏ: thoáng hiện ở góc trên phải, xoay chậm rồi tan */}
        <g transform="translate(110 -4)" opacity={m ? 0 : 0.6}>
          <circle r="6" fill="#f0abfc" opacity="0.18" />
          <g fill="none" strokeLinecap="round">
            <path d="M0 0 C3 -4 9 -4 10 1 C10.8 5 7 8.5 3.5 8" stroke="#f5d0fe" strokeWidth="1" />
            <path d="M0 0 C-3 4 -9 4 -10 -1 C-10.8 -5 -7 -8.5 -3.5 -8" stroke="#bae6fd" strokeWidth="1" />
          </g>
          <circle r="1.7" fill="#fff" />
          {[[6, -5], [9, 4], [-6, 5], [-9, -4], [2, 9], [-2, -9]].map(([x, y]) => (
            <circle key={x + ',' + y} cx={x} cy={y} r="0.55" fill="#fff" />
          ))}
          {m && (
            <>
              <animate attributeName="opacity" values="0;0;0.95;0.95;0" keyTimes="0;0.5;0.62;0.85;1" dur="8s" repeatCount="indefinite" />
              <animateTransform attributeName="transform" type="rotate" values="0;-60" dur="8s" repeatCount="indefinite" additive="sum" />
            </>
          )}
        </g>
      </>
    )
  },
}

export const EFFECTS = {
  'soft-sparkle': softSparkle,
  'dj-wave': djWave,
  'star-blade': starBlade,
  'star-orbit': starOrbit,
  'space-drift': spaceDrift,
  'galaxy-orbit': galaxyOrbit,
}
