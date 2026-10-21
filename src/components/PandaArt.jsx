// Hình vẽ Giáo sư Gấu Trúc (SVG nét mượt): mũ tốt nghiệp, kính, nơ, sách, đũa ngôi sao.
// Chuyển động (bước chân, vẫy tay, lăn...) do styles/mascot.css điều khiển qua các class pd-*.
const INK = '#2a2238'
const FUR = '#ffffff'
const BELLY = '#efe9fb'
const VIOLET = '#7c3aed'
const VIOLET_DARK = '#5b21b6'
const VIOLET_EDGE = '#4c1d95'
const GOLD = '#facc15'
const PINK = '#f9a8d4'

// Ngôi sao 5 cánh tâm (cx, cy), bán kính r
function starPath(cx, cy, r) {
  const pts = []
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5
    const rr = i % 2 ? r * 0.45 : r
    pts.push(`${(cx + rr * Math.cos(a)).toFixed(1)},${(cy + rr * Math.sin(a)).toFixed(1)}`)
  }
  return `M${pts.join('L')}Z`
}

function Cap({ back = false }) {
  return (
    <g className="pd-cap">
      <path d="M42 35 V26 Q60 20 78 26 V35 Q60 41 42 35 Z" fill={VIOLET_DARK} />
      <path d="M24 24 L60 11 L96 24 L60 37 Z" fill={VIOLET} stroke={VIOLET_EDGE} strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M31 24 L60 14 L89 24" fill="none" stroke="#a78bfa" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="60" cy="24" r="2.2" fill={GOLD} />
      {back ? (
        <g className="pd-tassel">
          <path d="M60 24 V40" stroke={GOLD} strokeWidth="1.8" />
          <path d="M57 40 h6 l1 7 h-8 z" fill={GOLD} />
        </g>
      ) : (
        <g className="pd-tassel">
          <path d="M60 24 L86 27 L88 40" fill="none" stroke={GOLD} strokeWidth="1.8" strokeLinejoin="round" />
          <path d="M85 40 h6 l1 7 h-8 z" fill={GOLD} />
        </g>
      )}
    </g>
  )
}

function Glasses({ y = 53, r = 10 }) {
  return (
    <g fill="rgba(255,255,255,0.14)" stroke={INK} strokeWidth="2" strokeLinecap="round">
      <circle cx="48" cy={y} r={r} />
      <circle cx="72" cy={y} r={r} />
      <path d={`M58 ${y - 1} q2 -2 4 0 M38 ${y - 2} L33 ${y - 5} M82 ${y - 2} L87 ${y - 5}`} fill="none" />
    </g>
  )
}

// Mắt xoáy (chóng mặt sau khi lăn)
const swirl = (cx, cy) => `M${cx} ${cy} m-1 0 a1 1 0 1 1 2 0 a2.2 2.2 0 1 1 -4.4 0 a3.4 3.4 0 1 1 6.8 0`

function Face({ dizzy = false }) {
  return (
    <>
      <ellipse cx="48" cy="54" rx="8.5" ry="10" transform="rotate(25 48 54)" fill={INK} />
      <ellipse cx="72" cy="54" rx="8.5" ry="10" transform="rotate(-25 72 54)" fill={INK} />
      {dizzy ? (
        <g className="pd-swirl" fill="none" stroke={FUR} strokeWidth="1.5" strokeLinecap="round">
          <path d={swirl(49, 53)} />
          <path d={swirl(71, 53)} />
        </g>
      ) : (
        <g className="pd-eyes">
          <circle cx="49" cy="53" r="4.4" fill={FUR} />
          <circle cx="71" cy="53" r="4.4" fill={FUR} />
          <circle className="pd-pupil" cx="49.6" cy="53.8" r="2.7" fill={INK} />
          <circle className="pd-pupil" cx="71.6" cy="53.8" r="2.7" fill={INK} />
          <circle cx="48.5" cy="52.3" r="1.1" fill={FUR} />
          <circle cx="70.5" cy="52.3" r="1.1" fill={FUR} />
        </g>
      )}
      <Glasses />
      <ellipse cx="38.5" cy="65" rx="4.5" ry="3" fill={PINK} opacity="0.85" />
      <ellipse cx="81.5" cy="65" rx="4.5" ry="3" fill={PINK} opacity="0.85" />
      <ellipse cx="60" cy="64" rx="4" ry="2.8" fill={INK} />
      <path d="M55.5 68 q4.5 4.5 9 0" fill="none" stroke={INK} strokeWidth="1.8" strokeLinecap="round" />
      <path className="pd-mouth-open" d="M55 67.5 q5 9 10 0 z" fill="#be185d" stroke={INK} strokeWidth="1.5" strokeLinejoin="round" />
    </>
  )
}

function Book({ x, y, angle }) {
  return (
    <g transform={`rotate(${angle} ${x + 10} ${y + 12})`}>
      <rect x={x} y={y} width="20" height="25" rx="2.5" fill={VIOLET} stroke={VIOLET_EDGE} strokeWidth="1.5" />
      <rect x={x + 3} y={y} width="3" height="25" fill={VIOLET_DARK} />
      <rect x={x + 9} y={y + 6} width="8" height="3" rx="1" fill="#c4b5fd" />
    </g>
  )
}

// Gấu ngồi nhìn thẳng. pose: 'sit' | 'teach' (giơ đũa chỉ bảng) | 'cheer' (giơ cả sách lẫn đũa) | 'dizzy' (chóng mặt)
//   | 'wait' (ngồi đọc sách đợi học sinh làm bài)
export function FrontPanda({ pose = 'sit' }) {
  const wandUp = pose === 'teach' || pose === 'cheer'
  return (
    <svg viewBox="0 0 120 120" aria-hidden="true">
      <circle cx="36" cy="32" r="10" fill={INK} />
      <circle cx="84" cy="32" r="10" fill={INK} />
      <g className="pd-leg pd-leg-l">
        <ellipse cx="44" cy="110" rx="12" ry="8" fill={INK} />
        <ellipse cx="44" cy="112" rx="5" ry="3" fill={PINK} />
      </g>
      <g className="pd-leg pd-leg-r">
        <ellipse cx="76" cy="110" rx="12" ry="8" fill={INK} />
        <ellipse cx="76" cy="112" rx="5" ry="3" fill={PINK} />
      </g>
      <ellipse cx="60" cy="92" rx="29" ry="23" fill={FUR} stroke={INK} strokeWidth="2.5" />
      <ellipse cx="60" cy="97" rx="16" ry="13" fill={BELLY} />
      <circle cx="60" cy="52" r="27" fill={FUR} stroke={INK} strokeWidth="2.5" />
      <Face dizzy={pose === 'dizzy'} />
      <Cap />
      {pose === 'dizzy' && (
        <g className="pd-dizzy-stars">
          <path d={starPath(38, 14, 4.5)} fill={GOLD} />
          <path d={starPath(82, 12, 4)} fill="#fde68a" />
          <path d={starPath(60, -8, 3.5)} fill={GOLD} />
        </g>
      )}
      <path d="M60 80 L48 73 L48 87 Z" fill={VIOLET} stroke={VIOLET_EDGE} strokeWidth="1.2" strokeLinejoin="round" />
      <path d="M60 80 L72 73 L72 87 Z" fill={VIOLET} stroke={VIOLET_EDGE} strokeWidth="1.2" strokeLinejoin="round" />
      <circle cx="60" cy="80" r="3.2" fill={VIOLET_DARK} />

      {/* Tay phải: ôm sách (giơ cao khi ăn mừng); khi đợi thì hai tay cầm sách mở đọc */}
      {pose === 'wait' ? (
        <ReadingArms />
      ) : pose === 'cheer' ? (
        <g className="pd-arm pd-arm-r">
          <Book x={82} y={40} angle={12} />
          <ellipse cx="87" cy="73" rx="8" ry="13" transform="rotate(43 87 73)" fill={INK} />
        </g>
      ) : (
        <g className="pd-arm pd-arm-r">
          <Book x={77} y={84} angle={-8} />
          <ellipse cx="84" cy="92" rx="8" ry="13" transform="rotate(-30 84 92)" fill={INK} />
        </g>
      )}

      {/* Tay trái: cầm đũa ngôi sao (giơ lên khi giảng / ăn mừng) */}
      {pose === 'wait' ? null : wandUp ? (
        <g className="pd-arm pd-arm-l pd-wand-up">
          <path d="M27 66 L12 40" stroke="#92400e" strokeWidth="2.6" strokeLinecap="round" />
          <path className="pd-star" d={starPath(11, 36, 7.5)} fill={GOLD} stroke="#d97706" strokeWidth="1" strokeLinejoin="round" />
          <ellipse cx="33" cy="73" rx="8" ry="13" transform="rotate(-43 33 73)" fill={INK} />
        </g>
      ) : (
        <g className="pd-arm pd-arm-l">
          <path d="M33 96 L22 62" stroke="#92400e" strokeWidth="2.6" strokeLinecap="round" />
          <path className="pd-star" d={starPath(21, 58, 7)} fill={GOLD} stroke="#d97706" strokeWidth="1" strokeLinejoin="round" />
          <ellipse cx="36" cy="92" rx="8" ry="13" transform="rotate(30 36 92)" fill={INK} />
        </g>
      )}
    </svg>
  )
}

// Hai tay cầm cuốn sách mở trước bụng (tư thế ngồi đợi); trang phải lật nhẹ bằng CSS (.pd-page)
function ReadingArms() {
  return (
    <g className="pd-reading">
      <path d="M60 90 Q49 85 37 88 L39 108 Q50 105 60 110 Z" fill="#f5f3ff" stroke={VIOLET_EDGE} strokeWidth="1.5" strokeLinejoin="round" />
      <path className="pd-page" d="M60 90 Q71 85 83 88 L81 108 Q70 105 60 110 Z" fill="#f5f3ff" stroke={VIOLET_EDGE} strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M43 93 h12 M43 97 h12 M43 101 h9 M65 93 h12 M65 97 h12 M65 101 h8" stroke="#c4b5fd" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M60 90 V110" stroke={VIOLET} strokeWidth="2" />
      <ellipse cx="37" cy="98" rx="7.5" ry="11" transform="rotate(15 37 98)" fill={INK} />
      <ellipse cx="83" cy="98" rx="7.5" ry="11" transform="rotate(-15 83 98)" fill={INK} />
    </g>
  )
}

// Gấu quay lưng (mặt hướng vào cây tre), hai tay ôm cây
export function BackPanda() {
  return (
    <svg viewBox="0 0 120 120" aria-hidden="true">
      <circle cx="37" cy="32" r="10" fill={INK} />
      <circle cx="83" cy="32" r="10" fill={INK} />
      <g className="pd-leg pd-leg-l">
        <ellipse cx="42" cy="106" rx="11" ry="9" transform="rotate(25 42 106)" fill={INK} />
      </g>
      <g className="pd-leg pd-leg-r">
        <ellipse cx="78" cy="106" rx="11" ry="9" transform="rotate(-25 78 106)" fill={INK} />
      </g>
      <ellipse cx="60" cy="90" rx="27" ry="22" fill={FUR} stroke={INK} strokeWidth="2.5" />
      <path d="M33 87 Q35 68 60 68 Q85 68 87 87 Q60 77 33 87 Z" fill={INK} />
      <circle cx="60" cy="108" r="5.5" fill={FUR} stroke={INK} strokeWidth="2" />
      {/* Hai tay vươn lên hai bên đầu ôm thân tre (vẽ trước đầu để bàn tay khuất sau đầu) */}
      <g className="pd-arm pd-arm-l">
        <ellipse cx="35" cy="60" rx="8.5" ry="17" transform="rotate(22 35 60)" fill={INK} />
      </g>
      <g className="pd-arm pd-arm-r">
        <ellipse cx="85" cy="60" rx="8.5" ry="17" transform="rotate(-22 85 60)" fill={INK} />
      </g>
      <circle cx="60" cy="52" r="26" fill={FUR} stroke={INK} strokeWidth="2.5" />
      <path d="M36 56 q-4 -2 -3 -6 M84 56 q4 -2 3 -6" fill="none" stroke={INK} strokeWidth="2" strokeLinecap="round" />
      <Cap back />
    </svg>
  )
}

// Gấu ôm gối cuộn tròn để lăn: mắt híp cười, bàn chân hồng chìa ra, vẫn đeo kính
export function BallPanda() {
  return (
    <svg viewBox="0 0 120 120" aria-hidden="true">
      <g className="pd-ball">
        <circle cx="42" cy="58" r="8.5" fill={INK} />
        <circle cx="78" cy="58" r="8.5" fill={INK} />
        <circle cx="60" cy="84" r="31" fill={FUR} stroke={INK} strokeWidth="2.5" />
        <ellipse cx="60" cy="104" rx="18" ry="8" fill={BELLY} />
        <g fill={INK}>
          <ellipse cx="41" cy="104" rx="10" ry="7.5" transform="rotate(-30 41 104)" />
          <ellipse cx="79" cy="104" rx="10" ry="7.5" transform="rotate(30 79 104)" />
        </g>
        <ellipse cx="39" cy="106" rx="4.2" ry="2.8" transform="rotate(-30 39 106)" fill={PINK} />
        <ellipse cx="81" cy="106" rx="4.2" ry="2.8" transform="rotate(30 81 106)" fill={PINK} />
        <g fill={INK}>
          <ellipse cx="50" cy="99" rx="11" ry="5.5" transform="rotate(18 50 99)" />
          <ellipse cx="70" cy="99" rx="11" ry="5.5" transform="rotate(-18 70 99)" />
        </g>
        <ellipse cx="50" cy="79" rx="6.5" ry="7.5" transform="rotate(25 50 79)" fill={INK} />
        <ellipse cx="70" cy="79" rx="6.5" ry="7.5" transform="rotate(-25 70 79)" fill={INK} />
        <path d="M46.5 80.5 q3.5 -4.5 7 0 M66.5 80.5 q3.5 -4.5 7 0" fill="none" stroke={FUR} strokeWidth="1.8" strokeLinecap="round" />
        <g fill="rgba(255,255,255,0.14)" stroke={INK} strokeWidth="1.8">
          <circle cx="50" cy="79" r="8" />
          <circle cx="70" cy="79" r="8" />
          <path d="M58 78 q2 -1.5 4 0" fill="none" />
        </g>
        <ellipse cx="41" cy="89" rx="4" ry="2.6" fill={PINK} opacity="0.85" />
        <ellipse cx="79" cy="89" rx="4" ry="2.6" fill={PINK} opacity="0.85" />
        <ellipse cx="60" cy="87" rx="3.2" ry="2.3" fill={INK} />
        <path d="M56 90.5 q4 6.5 8 0 z" fill="#be185d" stroke={INK} strokeWidth="1.3" strokeLinejoin="round" />
      </g>
    </svg>
  )
}

// Gấu nằm cuộn tròn ngủ: kính đẩy lên trán, mũ lệch
export function SleepingPanda() {
  return (
    <svg viewBox="0 0 120 120" aria-hidden="true">
      <g className="pd-breathe">
        <circle cx="106" cy="88" r="5" fill={FUR} stroke={INK} strokeWidth="2" />
        <ellipse cx="68" cy="93" rx="40" ry="21" fill={FUR} stroke={INK} strokeWidth="2.5" />
        <path d="M56 74 Q68 66 82 74 Q80 88 68 90 Q58 84 56 74 Z" fill={INK} />
        <ellipse cx="97" cy="105" rx="11" ry="7" fill={INK} />
        <ellipse cx="74" cy="109" rx="12" ry="6" fill={INK} />
      </g>
      <circle cx="22" cy="72" r="7" fill={INK} />
      <circle cx="48" cy="70" r="7" fill={INK} />
      <circle cx="35" cy="90" r="21" fill={FUR} stroke={INK} strokeWidth="2.5" />
      <ellipse cx="28" cy="92" rx="6.5" ry="5" fill={INK} />
      <ellipse cx="43" cy="92" rx="6.5" ry="5" fill={INK} />
      <path d="M25 92 q3 2.2 6 0 M40 92 q3 2.2 6 0" fill="none" stroke={FUR} strokeWidth="1.6" strokeLinecap="round" />
      <ellipse cx="35.5" cy="99" rx="2.8" ry="2" fill={INK} />
      <ellipse cx="24" cy="99" rx="3" ry="2" fill={PINK} opacity="0.85" />
      <ellipse cx="47" cy="99" rx="3" ry="2" fill={PINK} opacity="0.85" />
      <ellipse cx="52" cy="106" rx="10" ry="6" transform="rotate(-20 52 106)" fill={INK} />
      <g fill="rgba(255,255,255,0.14)" stroke={INK} strokeWidth="1.6">
        <circle cx="29" cy="79" r="5.5" />
        <circle cx="42" cy="79" r="5.5" />
        <path d="M34.5 78.5 h2" fill="none" />
      </g>
      <g transform="rotate(-18 40 64)">
        <path d="M30 66 V60 Q40 57 50 60 V66 Q40 70 30 66 Z" fill={VIOLET_DARK} />
        <path d="M20 59 L40 51 L60 59 L40 67 Z" fill={VIOLET} stroke={VIOLET_EDGE} strokeWidth="1.2" strokeLinejoin="round" />
        <path d="M40 59 L52 62 L53 70" fill="none" stroke={GOLD} strokeWidth="1.5" />
      </g>
    </svg>
  )
}

// Cây tre: thân có đốt, vệt sáng, lá dài xen trái phải; ngọn đung đưa
export function Bamboo() {
  const nodes = [44, 84, 124, 164]
  return (
    <svg className="mascot-bamboo" viewBox="0 0 60 200" aria-hidden="true">
      <defs>
        <linearGradient id="bamboo-stem" x1="0" x2="1">
          <stop offset="0" stopColor="#15803d" />
          <stop offset="0.3" stopColor="#4ade80" />
          <stop offset="0.6" stopColor="#22c55e" />
          <stop offset="1" stopColor="#166534" />
        </linearGradient>
      </defs>
      <g className="pd-bamboo-top">
        <path d="M26 200 V8 Q30 0 34 8 V200 Z" fill="url(#bamboo-stem)" />
        {nodes.map((y) => (
          <rect key={y} x="24" y={y} width="12" height="3.5" rx="1.75" fill="#166534" />
        ))}
        <path d="M34 46 q14 -10 24 -6 q-12 8 -24 6 Z" fill="#22c55e" />
        <path d="M34 48 q10 -2 18 2 q-10 2 -18 -2 Z" fill="#15803d" />
        <path d="M26 86 q-14 -10 -24 -6 q12 8 24 6 Z" fill="#22c55e" />
        <path d="M34 126 q14 -8 22 -2 q-12 6 -22 2 Z" fill="#16a34a" />
        <path d="M26 166 q-13 -9 -22 -5 q11 7 22 5 Z" fill="#22c55e" />
        <path d="M30 10 q-12 -6 -18 2 q10 2 18 -2 Z M30 12 q12 -8 20 -2 q-10 4 -20 2 Z" fill="#4ade80" />
      </g>
    </svg>
  )
}
