import { starPath, INK } from '../PandaArt.jsx'

// Trang phục vẽ đè lên Giáo sư Gấu Trúc (FrontPanda prop `look`): chỉ thay khe đồ, không đổi mặt / form / tỉ lệ gấu.
// Mỗi bộ là hàm ({ uid, up, motion }) => { palette, defs, back, body, hat, neck, glasses, overFace, propR, propL, front }.
// - palette { cloth: [trên, dưới], trim, cape?, helmet?, pack? }: áo ở tư thế leo / lăn / ngủ (PandaArt tự vẽ theo form tư thế đó).
// - body: vẽ trong khung cắt theo thân (BodyCloth) nên áo luôn ôm form; toạ độ thân: elip (60, 92) 29×23.
// - propL vẽ theo tư thế ngồi (tay cầm ở ~(33, 96), hướng lên trái); tư thế 'teach' FrontPanda tự xoay theo.
// - motion: chỉ bật ở phòng thử đồ (hiệu ứng nhỏ gắn liền trang phục, vd. áo choàng Ngân Hà lấp lánh).
// Hiệu ứng lớn (hào quang, quỹ đạo...) nằm ở SkinEffect, không ở đây.
// Bộ "Học Sinh" = gấu gốc nên không có trong bảng.

const url = (uid, n) => `url(#${uid}-${n})`

// Bóng đổ dưới thân + vệt sáng vai trái: cho áo có khối thay vì mảng phẳng
function ClothShade({ light = 0.16, dark = 0.16 }) {
  return (
    <>
      <path d="M28 102 Q60 124 92 102 V120 H28 Z" fill="#000" opacity={dark} />
      <ellipse cx="46" cy="84" rx="11" ry="5.5" transform="rotate(-18 46 84)" fill="#fff" opacity={light} />
    </>
  )
}

function Grad({ id, from, to, x2 = 0, y2 = 1 }) {
  return (
    <linearGradient id={id} x1="0" y1="0" x2={x2} y2={y2}>
      <stop offset="0" stopColor={from} />
      <stop offset="1" stopColor={to} />
    </linearGradient>
  )
}

// ---------- Thường ----------

function sport({ uid }) {
  return {
    palette: { cloth: ['#8b5cf6', '#5b21b6'], trim: '#ffffff' },
    defs: <Grad id={`${uid}-jersey`} from="#8b5cf6" to="#5b21b6" />,
    body: (
      <>
        <rect x="28" y="64" width="64" height="56" fill={url(uid, 'jersey')} />
        <path d="M33 80 Q36 96 42 116 M87 80 Q84 96 78 116" fill="none" stroke="#fff" strokeWidth="3" />
        <path d="M36.5 80 Q39 95 45 116 M83.5 80 Q81 95 75 116" fill="none" stroke="#f472b6" strokeWidth="1.2" />
        <path d="M46 75 L60 88 L74 75" fill="none" stroke="#fff" strokeWidth="3.2" strokeLinejoin="round" />
        <text x="60" y="106" textAnchor="middle" fontSize="13" fontWeight="800" fontFamily="'Be Vietnam Pro', sans-serif" fill="#fff" stroke="#4c1d95" strokeWidth="0.6">
          07
        </text>
        <ClothShade />
      </>
    ),
    hat: (
      <g>
        <path d="M34 42 Q60 20 86 42" fill="none" stroke={INK} strokeWidth="7.6" strokeLinecap="round" />
        <path d="M34 42 Q60 20 86 42" fill="none" stroke="#fff" strokeWidth="5.4" strokeLinecap="round" />
        <path d="M35 42 Q60 21 85 42" fill="none" stroke="#a855f7" strokeWidth="1.6" strokeLinecap="round" />
        <path d={starPath(60, 31, 2.8)} fill="#f472b6" />
      </g>
    ),
    neck: (
      <g>
        <path d="M49 77 Q60 92 71 77" fill="none" stroke="#fde68a" strokeWidth="1.3" />
        <rect x="56" y="88" width="8" height="5" rx="2.5" fill="#e2e8f0" stroke="#64748b" strokeWidth="1" />
        <circle cx="58.5" cy="90.5" r="1" fill="#64748b" />
      </g>
    ),
    propR: (
      <g>
        <circle cx="89" cy="96" r="10.5" fill="#fb923c" stroke={INK} strokeWidth="1.5" />
        <path d="M78.5 96 H99.5 M89 85.5 V106.5 M81.5 88.5 q6 7.5 0 15 M96.5 88.5 q-6 7.5 0 15" fill="none" stroke={INK} strokeWidth="1.1" />
        <ellipse cx="85" cy="91" rx="3.5" ry="2" transform="rotate(-30 85 91)" fill="#fff" opacity="0.35" />
      </g>
    ),
    propL: null,
  }
}

function sleep({ uid }) {
  return {
    palette: { cloth: ['#c7d2fe', '#a5b4fc'], trim: '#818cf8' },
    glasses: false,
    defs: (
      <>
        <Grad id={`${uid}-pj`} from="#c7d2fe" to="#a5b4fc" />
        <Grad id={`${uid}-cap`} from="#818cf8" to="#4f46e5" x2="1" y2="0" />
        <clipPath id={`${uid}-cone`}>
          <path d="M36 38 C38 18 56 6 74 8 C88 9 98 18 101 30 C94 24 88 22 84 25 C84 30 85 34 85 37 Z" />
        </clipPath>
      </>
    ),
    body: (
      <>
        <rect x="28" y="64" width="64" height="56" fill={url(uid, 'pj')} />
        {[
          [44, 96],
          [75, 90],
          [67, 109],
          [38, 107],
          [82, 104],
        ].map(([x, y]) => (
          <path key={`${x}-${y}`} d={starPath(x, y, 2.3)} fill="#fef3c7" />
        ))}
        <path d="M52 104 a3.2 3.2 0 1 0 3 4.4 a2.6 2.6 0 1 1 -3 -4.4 z" fill="#fef3c7" />
        <path d="M60 84 V118" stroke="#818cf8" strokeWidth="1.2" />
        {[90, 99, 108].map((y) => (
          <circle key={y} cx="60" cy={y} r="1.6" fill="#fff" stroke="#6366f1" strokeWidth="0.8" />
        ))}
        <path d="M47 76 Q51 87 60 85 Q69 87 73 76 L69 76 Q60 82 51 76 Z" fill="#eef2ff" stroke="#818cf8" strokeWidth="1" strokeLinejoin="round" />
        <ClothShade light={0.25} dark={0.1} />
      </>
    ),
    hat: (
      <g>
        <path d="M36 38 C38 18 56 6 74 8 C88 9 98 18 101 30 C94 24 88 22 84 25 C84 30 85 34 85 37 Z" fill={url(uid, 'cap')} stroke={INK} strokeWidth="1.4" strokeLinejoin="round" />
        <g clipPath={url(uid, 'cone')} fill="none" stroke="#c7d2fe" strokeWidth="2.4" opacity="0.85">
          <path d="M46 20 C52 26 54 32 54 38" />
          <path d="M62 11 C66 20 68 28 68 36" />
          <path d="M79 9 C81 16 82 22 84 30" />
        </g>
        <path d="M33 38 Q60 22 87 38 Q86.5 42.5 84.5 44 Q60 32 35.5 44 Q33.5 42 33 38 Z" fill="#eef2ff" stroke={INK} strokeWidth="1.4" strokeLinejoin="round" />
        <circle cx="101" cy="31" r="5.5" fill="#fff" stroke={INK} strokeWidth="1.2" />
        <circle cx="99.3" cy="29.3" r="1.6" fill="#e0e7ff" />
      </g>
    ),
    neck: null,
    propR: (
      <g transform="rotate(-12 88 95)">
        <rect x="76" y="86" width="25" height="18" rx="7" fill="#eef2ff" stroke="#818cf8" strokeWidth="1.3" />
        <path d="M80 89 q8.5 4 17 0 M80 101 q8.5 -4 17 0" fill="none" stroke="#c7d2fe" strokeWidth="1" />
        <circle cx="88.5" cy="95" r="1.4" fill="#a5b4fc" />
      </g>
    ),
    propL: null,
    front: (
      <g fill="#a5b4fc" fontFamily="'Patrick Hand', 'Be Vietnam Pro', sans-serif" fontWeight="700">
        <text x="90" y="17" fontSize="9">z</text>
        <text x="97" y="10" fontSize="6.5" opacity="0.7">z</text>
      </g>
    ),
  }
}

function artist({ uid }) {
  return {
    palette: { cloth: ['#f5f3ff', '#ddd6fe'], trim: '#f472b6' },
    defs: (
      <>
        <Grad id={`${uid}-beret`} from="#db2777" to="#9d174d" />
        <Grad id={`${uid}-smock`} from="#f5f3ff" to="#ddd6fe" />
      </>
    ),
    body: (
      <>
        <rect x="28" y="64" width="64" height="56" fill={url(uid, 'smock')} />
        <path d="M41 88 q3 -3 6 0 q2 3 -1 5 q-4 2 -5 -1 z" fill="#f472b6" />
        <circle cx="76" cy="88" r="2.4" fill="#38bdf8" />
        <path d="M78 88 v6 a1.2 1.2 0 0 0 2.4 0 v-4" fill="#38bdf8" />
        <circle cx="47" cy="108" r="2" fill="#facc15" />
        <circle cx="52" cy="104" r="1.2" fill="#4ade80" />
        <rect x="63" y="98" width="15" height="11" rx="2" fill="#c4b5fd" stroke="#7c3aed" strokeWidth="1" />
        <path d="M66 98 V91 M70 98 V89 M74 98 V92" stroke="#92400e" strokeWidth="1.4" strokeLinecap="round" />
        <circle cx="66" cy="90.5" r="1.2" fill="#ef4444" />
        <circle cx="70" cy="88.5" r="1.2" fill="#3b82f6" />
        <circle cx="74" cy="91.5" r="1.2" fill="#facc15" />
        <ClothShade light={0.2} dark={0.12} />
      </>
    ),
    hat: (
      <g>
        <path d="M27 34 C25 21 46 12 65 14 C83 16 93 25 89 33 C78 28.5 39 28 27 34 Z" fill={url(uid, 'beret')} stroke={INK} strokeWidth="1.4" strokeLinejoin="round" />
        <path d="M29 33 C43 28 77 28 87.5 32.5" fill="none" stroke="#831843" strokeWidth="3" strokeLinecap="round" />
        <path d="M58 14.5 q0.5 -5 4.5 -5.5" fill="none" stroke={INK} strokeWidth="2" strokeLinecap="round" />
        <ellipse cx="47" cy="20" rx="8" ry="2.6" transform="rotate(-12 47 20)" fill="#fff" opacity="0.22" />
      </g>
    ),
    neck: (
      <g stroke="#a16207" strokeWidth="1" strokeLinejoin="round">
        <path d="M44 74 Q60 86 76 74 L74 80 Q60 92 46 80 Z" fill="#facc15" />
        <path d="M58 84 L53.5 99 L59.5 95 L64.5 99.5 L62 84 Z" fill="#fbbf24" />
        <circle cx="60" cy="84" r="2.6" fill="#f59e0b" />
      </g>
    ),
    propR: (
      <g>
        <path d="M77 92 C77 83 92 81 98.5 87.5 C105 94 101 104.5 92 106.5 C86 107.5 86.5 100.5 82 101.5 C77.5 102.5 77 97 77 92 Z" fill="#d6a76c" stroke="#92400e" strokeWidth="1.2" />
        <circle cx="83" cy="96" r="2" fill="#7c5a2e" />
        <circle cx="90" cy="87.5" r="2.4" fill="#ef4444" />
        <circle cx="96.5" cy="92.5" r="2.3" fill="#3b82f6" />
        <circle cx="96" cy="100" r="2.2" fill="#facc15" />
        <circle cx="89" cy="103" r="2" fill="#a855f7" />
      </g>
    ),
    propL: (
      <g strokeLinecap="round">
        <path d="M33 96 L23.6 66" stroke="#a16207" strokeWidth="2.6" />
        <path d="M23.8 66.6 L22.6 62.6" stroke="#cbd5e1" strokeWidth="3.4" />
        <path d="M22.5 62.6 Q18.6 57.5 20.8 52.5 Q24.6 57 22.5 62.6 Z" fill="#a855f7" stroke={INK} strokeWidth="0.8" />
      </g>
    ),
  }
}

// ---------- Hiếm ⭐ ----------

function explorer({ uid }) {
  return {
    palette: { cloth: ['#a07a45', '#7a5a2f'], trim: '#5b3f1e' },
    defs: (
      <>
        <Grad id={`${uid}-crown`} from="#ead1a0" to="#c9a36b" />
        <Grad id={`${uid}-vest`} from="#a07a45" to="#7a5a2f" />
      </>
    ),
    body: (
      <>
        <rect x="28" y="64" width="64" height="56" fill="#ecdcb8" />
        <path d="M28 70 L51 80 L49 120 L28 120 Z M92 70 L69 80 L71 120 L92 120 Z" fill={url(uid, 'vest')} />
        <path d="M51 80 L49 120 M69 80 L71 120" stroke="#5b3f1e" strokeWidth="1.1" />
        {[35, 72].map((x) => (
          <g key={x}>
            <rect x={x} y="94" width="12" height="9.5" rx="1.6" fill="#8b6534" stroke="#5b3f1e" strokeWidth="0.9" />
            <path d={`M${x} 97 H${x + 12}`} stroke="#5b3f1e" strokeWidth="0.9" />
            <circle cx={x + 6} cy="98.6" r="0.9" fill="#facc15" />
          </g>
        ))}
        <rect x="28" y="108" width="64" height="4.5" fill="#5b3f1e" />
        <rect x="56.5" y="107.3" width="7" height="6" rx="1" fill="none" stroke="#facc15" strokeWidth="1.3" />
        <ClothShade />
      </>
    ),
    hat: (
      <g stroke="#7c5a2e" strokeWidth="1.4" strokeLinejoin="round">
        <ellipse cx="60" cy="31.5" rx="34" ry="7" fill="#c9a36b" />
        <path d="M40 31 C40 13.5 80 13.5 80 31 Z" fill={url(uid, 'crown')} />
        <path d="M40.4 27 C52 30.5 68 30.5 79.6 27 L80 31 C68 34.5 52 34.5 40 31 Z" fill="#7c2d12" stroke="none" />
        <circle cx="60" cy="30.4" r="2.5" fill="#facc15" stroke="#a16207" strokeWidth="0.8" />
        <path d="M60 28.6 V32.2 M58.2 30.4 H61.8" stroke="#a16207" strokeWidth="0.6" />
        <path d="M47 18 Q55 15.5 62 16.5" fill="none" stroke="#fff" strokeWidth="1.6" opacity="0.4" strokeLinecap="round" />
      </g>
    ),
    neck: (
      <g>
        <path d="M45 75 Q60 84 75 75 L60 93 Z" fill="#dc2626" stroke="#7f1d1d" strokeWidth="1.2" strokeLinejoin="round" />
        {[
          [55, 81],
          [64, 81.5],
          [59.5, 87],
        ].map(([x, y]) => (
          <circle key={x} cx={x} cy={y} r="0.9" fill="#fff" />
        ))}
      </g>
    ),
    propR: (
      <g transform="rotate(-10 88 96)">
        <rect x="78" y="86" width="20" height="21" rx="1.5" fill="#fef3c7" stroke="#a16207" strokeWidth="1.1" />
        <rect x="76.5" y="84" width="23" height="4" rx="2" fill="#e7c98f" stroke="#a16207" strokeWidth="1" />
        <rect x="76.5" y="105" width="23" height="4" rx="2" fill="#e7c98f" stroke="#a16207" strokeWidth="1" />
        <path d="M81 98 q3 -5 7 -2 t8 -4" fill="none" stroke="#dc2626" strokeWidth="1.1" strokeDasharray="2 1.6" />
        <path d="M92.5 91 l3 3 m0 -3 l-3 3" stroke="#dc2626" strokeWidth="1.3" strokeLinecap="round" />
      </g>
    ),
    propL: (
      <g strokeLinecap="round">
        <path d="M32 93 L26 74" stroke="#92400e" strokeWidth="4.6" />
        <path d="M26.5 76 L21.4 60" stroke="#d4a017" strokeWidth="6.2" />
        <path d="M25.8 73.8 L28.6 72.9 M23.4 66.4 L26.6 65.4" stroke="#7c5a2e" strokeWidth="1.2" />
        <ellipse cx="21" cy="59" rx="3.1" ry="1.5" transform="rotate(-18 21 59)" fill="#7dd3fc" stroke="#0369a1" strokeWidth="0.6" />
      </g>
    ),
  }
}

function scientist({ uid }) {
  return {
    palette: { cloth: ['#ffffff', '#dbe3ee'], trim: '#c4b5fd' },
    defs: (
      <>
        <linearGradient id={`${uid}-coat`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#dbe3ee" />
          <stop offset="0.3" stopColor="#ffffff" />
          <stop offset="0.7" stopColor="#ffffff" />
          <stop offset="1" stopColor="#dbe3ee" />
        </linearGradient>
        <radialGradient id={`${uid}-lens`} cx="0.35" cy="0.35" r="0.8">
          <stop offset="0" stopColor="#ecfeff" />
          <stop offset="1" stopColor="#67e8f9" />
        </radialGradient>
      </>
    ),
    body: (
      <>
        <rect x="28" y="64" width="64" height="56" fill={url(uid, 'coat')} />
        <path d="M48 70 L60 98 L72 70 Z" fill="#c4b5fd" />
        <path d="M47 71 L58.5 99 M73 71 L61.5 99" stroke="#b6c2d3" strokeWidth="2.2" />
        <path d="M60 99 V120" stroke="#b6c2d3" strokeWidth="1.4" />
        <circle cx="55.5" cy="105" r="1.3" fill="#94a3b8" />
        <circle cx="55.5" cy="112" r="1.3" fill="#94a3b8" />
        <path d="M69 92 V88.5 M72.5 92 V87.5" strokeWidth="1.6" strokeLinecap="round" stroke="#ef4444" />
        <path d="M72.5 92 V87.5" strokeWidth="1.6" strokeLinecap="round" stroke="#3b82f6" />
        <rect x="66" y="91" width="12" height="8.5" rx="1.2" fill="#fff" stroke="#b6c2d3" strokeWidth="1" />
        <ClothShade light={0.1} dark={0.12} />
      </>
    ),
    hat: (
      <g>
        <path d="M33.5 41 Q60 29 86.5 41" fill="none" stroke="#334155" strokeWidth="3.4" strokeLinecap="round" />
        {[49, 71].map((x) => (
          <g key={x}>
            <circle cx={x} cy="35.5" r="6.8" fill="#94a3b8" stroke={INK} strokeWidth="1.2" />
            <circle cx={x} cy="35.5" r="4.8" fill={url(uid, 'lens')} />
            <path d={`M${x - 2.6} ${33.5} q1.5 -1.6 3.4 -1.2`} fill="none" stroke="#fff" strokeWidth="1.1" strokeLinecap="round" />
          </g>
        ))}
        <path d="M55.8 35 H64.2" stroke="#334155" strokeWidth="2.2" />
      </g>
    ),
    neck: (
      <g stroke="#4c1d95" strokeWidth="0.9" strokeLinejoin="round">
        <path d="M57 77 h6 l-1 4.2 h-4 z" fill="#6d28d9" />
        <path d="M58 81.2 h4 l2.2 15 l-4.2 4.4 l-4.2 -4.4 z" fill="#7c3aed" />
        <path d="M58.6 86 l3.6 2.6 M58 91 l4.6 3.2" stroke="#c4b5fd" strokeWidth="0.8" />
      </g>
    ),
    propR: (
      <g>
        <path d="M84 83.5 h8 v8.5 l7.3 13.6 q1.4 4.4 -3.2 4.4 h-16.2 q-4.6 0 -3.2 -4.4 l7.3 -13.6 z" fill="rgba(255,255,255,0.55)" stroke="#475569" strokeWidth="1.3" strokeLinejoin="round" />
        <path d="M80.4 100.5 h15.2 l2.6 5 q1.2 3.6 -2.4 3.6 h-15.6 q-3.6 0 -2.4 -3.6 z" fill="#22d3ee" opacity="0.9" />
        <circle cx="86" cy="104" r="1.2" fill="#ecfeff" />
        <circle cx="90.5" cy="102" r="0.8" fill="#ecfeff" />
        <path d="M83 83.5 h10" stroke="#475569" strokeWidth="1.6" strokeLinecap="round" />
      </g>
    ),
    propL: (
      <g transform="rotate(-18 27 79)">
        <rect x="24" y="62" width="6" height="30" rx="3" fill="rgba(255,255,255,0.6)" stroke="#475569" strokeWidth="1.1" />
        <rect x="24.8" y="76" width="4.4" height="15.2" rx="2.2" fill="#a855f7" />
        <path d="M23 62 h8" stroke="#475569" strokeWidth="1.4" strokeLinecap="round" />
      </g>
    ),
  }
}

// ---------- Hiếm ⭐⭐ ----------

function dj({ uid }) {
  return {
    palette: { cloth: ['#312e81', '#1e1b4b'], trim: '#22d3ee' },
    defs: (
      <>
        <Grad id={`${uid}-jacket`} from="#312e81" to="#1e1b4b" />
        <Grad id={`${uid}-cup`} from="#4338ca" to="#1e1b4b" />
      </>
    ),
    body: (
      <>
        <rect x="28" y="64" width="64" height="56" fill={url(uid, 'jacket')} />
        <path d="M49 72 L60 99 L71 72 Z" fill="#0f172a" />
        {[
          [55.4, 4],
          [57.6, 7],
          [59.8, 9.5],
          [62, 6],
          [64.2, 3.5],
        ].map(([x, h], i) => (
          <rect key={x} x={x - 0.8} y={90 - h} width="1.6" height={h} rx="0.6" fill={['#22d3ee', '#a855f7', '#f472b6', '#a855f7', '#22d3ee'][i]} />
        ))}
        <path d="M49 72 L60 99 L71 72" fill="none" stroke="#22d3ee" strokeWidth="1.2" />
        <path d="M45 73 Q60 84 75 73" fill="none" stroke="#a855f7" strokeWidth="3.2" />
        <rect x="28" y="110" width="64" height="10" fill="#7c3aed" />
        <path d="M28 112.5 H92 M28 115.5 H92" stroke="#c4b5fd" strokeWidth="0.8" opacity="0.7" />
        <path d="M33 84 Q36 98 34 110 M87 84 Q84 98 86 110" fill="none" stroke="#f472b6" strokeWidth="1" opacity="0.8" />
        <ClothShade light={0.12} dark={0.2} />
      </>
    ),
    hat: (
      <g>
        <path d="M30 42 C30 11 90 11 90 42" fill="none" stroke={INK} strokeWidth="6.4" strokeLinecap="round" />
        <path d="M30 42 C30 11 90 11 90 42" fill="none" stroke="#312e81" strokeWidth="4.2" strokeLinecap="round" />
        <path d="M36 26 C44 16 76 16 84 26" fill="none" stroke="#818cf8" strokeWidth="1.1" strokeLinecap="round" />
        {[30.5, 89.5].map((x) => (
          <g key={x}>
            <rect x={x - 7} y="34" width="14" height="20" rx="7" fill={url(uid, 'cup')} stroke={INK} strokeWidth="1.4" />
            <rect x={x - 4.4} y="37.5" width="8.8" height="13" rx="4.4" fill="none" stroke="#22d3ee" strokeWidth="1.6" />
            <circle cx={x} cy="44" r="1.6" fill="#f472b6" />
          </g>
        ))}
      </g>
    ),
    neck: (
      <g>
        <path d="M47 76 Q60 91 73 76" fill="none" stroke="#facc15" strokeWidth="1.6" />
        <circle cx="60" cy="88.5" r="3.4" fill="#facc15" stroke="#a16207" strokeWidth="0.9" />
        <circle cx="60" cy="88.5" r="1.1" fill="#a16207" />
      </g>
    ),
    propR: (
      <g>
        <circle cx="89" cy="97" r="11" fill="#1a1730" stroke="#818cf8" strokeWidth="1.3" />
        <circle cx="89" cy="97" r="8.2" fill="none" stroke="#334155" strokeWidth="0.6" />
        <circle cx="89" cy="97" r="5.8" fill="none" stroke="#334155" strokeWidth="0.6" />
        <circle cx="89" cy="97" r="3.4" fill="#ec4899" />
        <circle cx="89" cy="97" r="0.8" fill="#fff" />
        <path d="M81 91 A10 10 0 0 1 89 87" fill="none" stroke="#fff" strokeWidth="1.2" opacity="0.3" strokeLinecap="round" />
      </g>
    ),
    propL: (
      <g strokeLinecap="round">
        <path d="M33 96 L25.6 71" stroke="#475569" strokeWidth="3.6" />
        <path d="M33 96 L25.6 71" stroke="#94a3b8" strokeWidth="1.2" />
        <path d="M25.9 72 L24.9 68.6" stroke="#a855f7" strokeWidth="4.6" />
        <circle cx="23.6" cy="64" r="5.2" fill="#334155" stroke={INK} strokeWidth="1" />
        <path d="M19.4 62.5 Q23.6 59.5 27.8 62.5 M18.8 65.4 H28.4 M23.6 59 V69" fill="none" stroke="#64748b" strokeWidth="0.6" />
      </g>
    ),
  }
}

// Kiếm Sĩ Tinh Hệ: lưỡi kiếm (đầu G → mũi T) dùng chung với hiệu ứng (SkinEffect cần biết vị trí kiếm khi giơ tay)
const BLADE = { g: [31.6, 91.8], t: [19.3, 53.8] }

function swordsman({ uid }) {
  const [gx, gy] = BLADE.g
  const [tx, ty] = BLADE.t
  return {
    palette: { cloth: ['#ffffff', '#cbd5e1'], trim: '#a855f7', cape: ['#ffffff', '#a9b4c6'] },
    defs: (
      <>
        <Grad id={`${uid}-coat`} from="#ffffff" to="#d5dbe6" />
        <Grad id={`${uid}-collar`} from="#ffffff" to="#c3cad8" x2="1" y2="1" />
        <Grad id={`${uid}-gem`} from="#f5d0fe" to="#9333ea" />
        <Grad id={`${uid}-cape`} from="#312e81" to="#0b0a1a" />
        <radialGradient id={`${uid}-energy`}>
          <stop offset="0" stopColor="#f5d0fe" stopOpacity="0.95" />
          <stop offset="0.45" stopColor="#c084fc" stopOpacity="0.55" />
          <stop offset="1" stopColor="#7e22ce" stopOpacity="0" />
        </radialGradient>
      </>
    ),
    back: (
      <g strokeLinejoin="round">
        {/* Áo choàng lệch vai phải: xanh đêm, mép tím, lấm tấm sao */}
        <path d="M72 70 C92 72 106 90 108 119 L86 119 C90 102 88 86 72 70 Z" fill={url(uid, 'cape')} stroke="#94a3b8" strokeWidth="1" />
        <path d="M86 119 C90 102 88 86 72 70" fill="none" stroke="#c084fc" strokeWidth="1.2" />
        {[
          [101, 104, 1.5],
          [96, 92, 1.1],
          [104, 114, 1.2],
        ].map(([x, y, r]) => (
          <path key={x} d={starPath(x, y, r)} fill="#f5d0fe" />
        ))}
        {/* Vạt áo khoác dài xòe phía sau */}
        <path d="M34 90 C25 103 23 114 25 120 L95 120 C97 114 95 103 86 90 Z" fill={url(uid, 'coat')} stroke="#94a3b8" strokeWidth="1.1" />
        <path d="M26.5 117 C45 112 75 112 93.5 117" fill="none" stroke="#141225" strokeWidth="2.4" />
        <path d="M27 114.5 C45 109.5 75 109.5 93 114.5" fill="none" stroke="#c084fc" strokeWidth="0.9" />
        {/* Cổ áo cao nhọn: ngoài trắng bạc, trong lót đen, mép tím phát sáng */}
        <path d="M33 84 C21 72 12 50 13 22 C21 37 31 52 47 68 Z" fill={url(uid, 'collar')} stroke="#94a3b8" strokeWidth="1.1" />
        <path d="M87 84 C99 72 108 50 107 22 C99 37 89 52 73 68 Z" fill={url(uid, 'collar')} stroke="#94a3b8" strokeWidth="1.1" />
        <path d="M36 79 C26 69 19 52 18.5 34 C24 45 32 55 45 68 Z" fill="#141225" />
        <path d="M84 79 C94 69 101 52 101.5 34 C96 45 88 55 75 68 Z" fill="#141225" />
        <path d="M13.6 24 C13.5 48 21 70 32.5 83 M106.4 24 C106.5 48 99 70 87.5 83" fill="none" stroke="#c084fc" strokeWidth="1.3" strokeLinecap="round" />
      </g>
    ),
    body: (
      <>
        <rect x="28" y="64" width="64" height="56" fill={url(uid, 'coat')} />
        <path d="M28 92 Q38 96 42 120 L28 120 Z M92 92 Q82 96 78 120 L92 120 Z" fill="#1e1b3a" />
        <path d="M28 92 Q38 96 42 120 M92 92 Q82 96 78 120" fill="none" stroke="#a855f7" strokeWidth="1.1" />
        <path d="M49 72 L60 104 L71 72 Z" fill="#141225" />
        <path d="M60 86 V102" stroke="#a855f7" strokeWidth="1.1" opacity="0.85" />
        <path d="M48 72 L58.6 100.5 M72 72 L61.4 100.5" stroke="#94a3b8" strokeWidth="1.7" />
        <path d="M51 74 L57 92 L53.5 75 Z M69 74 L63 92 L66.5 75 Z" fill="#e2e8f0" />
        <path d="M32 106 Q60 113.5 88 106" fill="none" stroke="#94a3b8" strokeWidth="2.2" />
        <path d="M60 107.6 L62.6 110.4 L60 113.2 L57.4 110.4 Z" fill="#a855f7" stroke="#581c87" strokeWidth="0.6" />
        {/* Chòm sao thêu trên ngực trái */}
        <path d="M37.5 87 L43 80.5 L46.5 88 L41 95" fill="none" stroke="#a855f7" strokeWidth="0.8" />
        {[
          [37.5, 87],
          [43, 80.5],
          [46.5, 88],
          [41, 95],
        ].map(([x, y]) => (
          <circle key={x} cx={x} cy={y} r="0.95" fill="#f5d0fe" />
        ))}
        <ClothShade light={0.3} dark={0.12} />
      </>
    ),
    // Dấu tinh thể tím dưới mắt phải
    overFace: <path d="M84.5 55.4 L86 58 L84.5 60.6 L83 58 Z" fill="#c084fc" stroke="#f5d0fe" strokeWidth="0.5" />,
    hat: null,
    neck: (
      <g>
        <circle cx="60" cy="82" r="6" fill={url(uid, 'energy')} />
        <path d="M60 77.4 L63.6 82 L60 86.6 L56.4 82 Z" fill={url(uid, 'gem')} stroke="#f5d0fe" strokeWidth="0.7" />
        <path d="M60 77.4 V86.6" stroke="#fff" strokeWidth="0.5" opacity="0.7" />
      </g>
    ),
    // Tay phải nâng tinh thể năng lượng tím
    propR: (
      <g>
        <circle cx="94" cy="80" r="12" fill={url(uid, 'energy')} />
        <path d="M94 70.5 L98.6 79.6 L94 89.5 L89.4 79.6 Z" fill={url(uid, 'gem')} stroke="#f5d0fe" strokeWidth="0.8" strokeLinejoin="round" />
        <path d="M94 70.5 L94 89.5 M89.4 79.6 L98.6 79.6" stroke="#fff" strokeWidth="0.5" opacity="0.6" />
        <circle cx="92.4" cy="76.4" r="0.9" fill="#fff" />
      </g>
    ),
    // Tay trái: kiếm năng lượng (lưỡi bạc, hộ thủ tím)
    propL: (
      <g strokeLinecap="round">
        <path className="pd-blade-glow" d={`M${gx} ${gy} L${tx} ${ty}`} stroke="#c084fc" strokeWidth="5" opacity="0.4" />
        <path d={`M${gx} ${gy} L${tx} ${ty}`} stroke="#f1f5f9" strokeWidth="2.2" />
        <path d={`M${gx - 0.3} ${gy - 1} L${tx + 0.2} ${ty + 0.6}`} stroke="#fff" strokeWidth="0.7" />
        <path d={`M${gx + 0.9} ${gy - 0.4} L${tx + 0.7} ${ty + 0.3}`} stroke="#c084fc" strokeWidth="0.7" />
        {/* Hộ thủ cánh cong + ngọc, chuôi đuôi sao */}
        <path d="M38 88.4 Q31.8 94.2 25 91.4" fill="none" stroke="#a855f7" strokeWidth="2.6" />
        <path d="M27.4 93.6 Q30.5 100 36.2 90.4" fill="none" stroke="#e2e8f0" strokeWidth="1.3" />
        <path d={`M${gx} ${gy} L34 99`} stroke="#141225" strokeWidth="2.6" />
        <circle cx={gx} cy={gy} r="1.5" fill="#f5d0fe" />
        <path d={starPath(34.6, 100.6, 2.6)} fill="#f5d0fe" stroke="#a855f7" strokeWidth="0.5" strokeLinejoin="round" />
      </g>
    ),
    // Cầu vai nhọn trắng bạc, mặt dưới đen, viền tím
    front: (
      <g strokeLinejoin="round">
        <path d="M25 86 L29 74 Q38 70 47 75 L40 80 Q32 82 28 89 Z" fill={url(uid, 'collar')} stroke="#94a3b8" strokeWidth="1.1" />
        <path d="M95 86 L91 74 Q82 70 73 75 L80 80 Q88 82 92 89 Z" fill={url(uid, 'collar')} stroke="#94a3b8" strokeWidth="1.1" />
        <path d="M28 89 Q32 82 40 80 M92 89 Q88 82 80 80" fill="none" stroke="#141225" strokeWidth="2" />
        <path d="M29 74 Q38 70 47 75 M91 74 Q82 70 73 75" fill="none" stroke="#c084fc" strokeWidth="1.1" />
      </g>
    ),
  }
}

// ---------- Hiếm ⭐⭐⭐ ----------

// Đầu gậy phép (tư thế ngồi); SkinEffect tính vị trí khi giơ tay
const STAFF_HEAD = [20.7, 58]

function wizard({ uid }) {
  const [hx, hy] = STAFF_HEAD
  return {
    palette: { cloth: ['#3730a3', '#1e1b4b'], trim: '#facc15', cape: ['#312e81', '#0f0a2e'] },
    defs: (
      <>
        <Grad id={`${uid}-hat`} from="#4338ca" to="#1e1b4b" />
        <Grad id={`${uid}-robe`} from="#3730a3" to="#1e1b4b" />
        <Grad id={`${uid}-cloak`} from="#312e81" to="#0f0a2e" />
        <radialGradient id={`${uid}-orb`}>
          <stop offset="0" stopColor="#fef9c3" stopOpacity="0.9" />
          <stop offset="1" stopColor="#a855f7" stopOpacity="0" />
        </radialGradient>
      </>
    ),
    back: (
      <g>
        <path d="M36 77 C16 92 14 108 19 119 L101 119 C106 108 104 92 84 77 Q60 60 36 77 Z" fill={url(uid, 'cloak')} stroke="#0f0a2e" strokeWidth="1.4" strokeLinejoin="round" />
        {[
          [24, 104],
          [96, 100],
          [30, 114],
          [92, 113],
        ].map(([x, y]) => (
          <path key={x} d={starPath(x, y, 1.8)} fill="#fde68a" />
        ))}
      </g>
    ),
    body: (
      <>
        <rect x="28" y="64" width="64" height="56" fill={url(uid, 'robe')} />
        <path d="M60 78 V120" stroke="#facc15" strokeWidth="3" />
        <path d="M60 78 V120" stroke="#a16207" strokeWidth="0.6" />
        {[
          [43, 90],
          [77, 88],
          [40, 110],
          [80, 108],
          [50, 99],
          [70, 100],
        ].map(([x, y], i) => (
          <path key={i} d={starPath(x, y, i % 2 ? 1.6 : 2.2)} fill="#fde68a" opacity="0.9" />
        ))}
        <path d="M31 101 Q60 110 89 101" fill="none" stroke="#a855f7" strokeWidth="4" />
        <path d={starPath(60, 105.5, 3.4)} fill="#facc15" stroke="#a16207" strokeWidth="0.6" />
        <ClothShade light={0.12} dark={0.2} />
      </>
    ),
    hat: (
      <g strokeLinejoin="round">
        <ellipse cx="60" cy="32" rx="30" ry="6" fill="#312e81" stroke={INK} strokeWidth="1.4" />
        <path d="M40 31 C44 20 52 8 64 3 Q72 0.5 74 6 Q68 6 68 12 C70 20 76 26 80 31 Z" fill={url(uid, 'hat')} stroke={INK} strokeWidth="1.4" />
        <path d="M41.6 27.6 C54 31 66 31 78.4 27.6 L79.6 31 C66 34.6 54 34.6 40.4 31 Z" fill="#facc15" stroke="#a16207" strokeWidth="0.7" />
        <path d={starPath(57, 19, 2.8)} fill="#fde68a" />
        <path d={starPath(66, 11, 1.9)} fill="#fde68a" />
        <path d="M51 25 a3 3 0 1 0 2.8 4 a2.4 2.4 0 1 1 -2.8 -4 z" fill="#fde68a" />
      </g>
    ),
    neck: (
      <g>
        <path d="M47 78 Q60 86 73 78" fill="none" stroke="#facc15" strokeWidth="1.2" />
        <circle cx="47" cy="78" r="3" fill="#facc15" stroke="#a16207" strokeWidth="0.8" />
        <circle cx="73" cy="78" r="3" fill="#facc15" stroke="#a16207" strokeWidth="0.8" />
      </g>
    ),
    propR: (
      <g transform="rotate(-8 87 96)">
        <rect x="77" y="84" width="21" height="26" rx="2.5" fill="#312e81" stroke="#facc15" strokeWidth="1.2" />
        <rect x="77" y="84" width="3.6" height="26" fill="#1e1b4b" />
        <path d={starPath(89, 97, 4.6)} fill="#fde68a" stroke="#d97706" strokeWidth="0.6" />
        <path d="M94 84 h4 v4 Z M94 110 h4 v-4 Z" fill="#facc15" />
      </g>
    ),
    propL: (
      <g strokeLinecap="round">
        <path d={`M35 103 L${hx} ${hy}`} stroke="#5b3416" strokeWidth="3" />
        <path d={`M34.4 102 L${hx + 0.4} ${hy + 1}`} stroke="#b07a3c" strokeWidth="0.9" />
        <circle className="pd-staff-orb" cx={hx} cy={hy - 2} r="8.5" fill={url(uid, 'orb')} />
        <path d={`M${hx - 5} ${hy + 1} a6 6 0 0 0 10 -1`} fill="none" stroke="#facc15" strokeWidth="1.6" />
        <path d={starPath(hx, hy - 2.5, 5.6)} fill="#fde68a" stroke="#d97706" strokeWidth="0.8" strokeLinejoin="round" />
      </g>
    ),
  }
}

// ---------- Cực phẩm ----------

function astronaut({ uid }) {
  return {
    palette: { cloth: ['#ffffff', '#d5dde8'], trim: '#a855f7', helmet: true, pack: true },
    defs: (
      <>
        <Grad id={`${uid}-suit`} from="#ffffff" to="#d5dde8" />
        <radialGradient id={`${uid}-glass`} cx="0.35" cy="0.3" r="0.85">
          <stop offset="0" stopColor="#e0f2fe" stopOpacity="0.05" />
          <stop offset="0.75" stopColor="#7dd3fc" stopOpacity="0.12" />
          <stop offset="1" stopColor="#a5b4fc" stopOpacity="0.32" />
        </radialGradient>
        <radialGradient id={`${uid}-planet`} cx="0.35" cy="0.3" r="0.8">
          <stop offset="0" stopColor="#fbcfe8" />
          <stop offset="1" stopColor="#9333ea" />
        </radialGradient>
      </>
    ),
    back: (
      <g>
        <rect x="24" y="64" width="72" height="42" rx="13" fill="#cbd5e1" stroke={INK} strokeWidth="1.4" />
        <path d="M26 78 h-3 a3 3 0 0 0 0 14 h3 M94 78 h3 a3 3 0 0 1 0 14 h-3" fill="none" stroke="#94a3b8" strokeWidth="2" />
      </g>
    ),
    glasses: true,
    hat: null,
    body: (
      <>
        <rect x="28" y="64" width="64" height="56" fill={url(uid, 'suit')} />
        <path d="M31 99 Q35 110 41 117 M89 99 Q85 110 79 117" fill="none" stroke="#a855f7" strokeWidth="3" />
        <path d="M31 106 Q60 114 89 106" fill="none" stroke="#94a3b8" strokeWidth="1.2" />
        <rect x="50" y="89" width="20" height="12" rx="2.5" fill="#1e293b" stroke="#94a3b8" strokeWidth="1" />
        <circle cx="54.5" cy="93.5" r="1.4" fill="#22d3ee" />
        <circle cx="59" cy="93.5" r="1.4" fill="#f472b6" />
        <circle cx="63.5" cy="93.5" r="1.4" fill="#facc15" />
        <path d="M53 97.6 H67" stroke="#38bdf8" strokeWidth="1" opacity="0.8" />
        <circle cx="40" cy="94" r="4.6" fill="#4338ca" stroke="#fde68a" strokeWidth="1" />
        <path d={starPath(40, 94, 2.2)} fill="#fde68a" />
        <ClothShade light={0.25} dark={0.12} />
      </>
    ),
    neck: null,
    propR: (
      <g>
        <circle cx="88.5" cy="96" r="7.6" fill={url(uid, 'planet')} stroke={INK} strokeWidth="1" />
        <ellipse cx="88.5" cy="96" rx="12.5" ry="3.6" transform="rotate(-20 88.5 96)" fill="none" stroke="#fde68a" strokeWidth="1.6" />
      </g>
    ),
    propL: null,
    front: (
      <g>
        <circle cx="60" cy="48" r="39" fill={url(uid, 'glass')} stroke="#e2e8f0" strokeWidth="3" />
        <circle cx="60" cy="48" r="36.6" fill="none" stroke="#94a3b8" strokeWidth="0.8" opacity="0.7" />
        <path d="M31 33 Q39 18 56 13" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" opacity="0.75" />
        <circle cx="30" cy="40" r="1.6" fill="#fff" opacity="0.7" />
        <path d="M36 82 Q60 92 84 82 L82 88 Q60 97 38 88 Z" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="1.1" strokeLinejoin="round" />
      </g>
    ),
  }
}

function galaxy({ uid, motion }) {
  return {
    palette: { cloth: ['#1e1b4b', '#581c87'], trim: '#fde68a', cape: ['#3b0764', '#0b1030'] },
    defs: (
      <>
        <linearGradient id={`${uid}-cloak`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#0b1030" />
          <stop offset="0.55" stopColor="#3b0764" />
          <stop offset="1" stopColor="#1e3a8a" />
        </linearGradient>
        <Grad id={`${uid}-robe`} from="#1e1b4b" to="#581c87" />
        <radialGradient id={`${uid}-neb1`}>
          <stop offset="0" stopColor="#ec4899" stopOpacity="0.55" />
          <stop offset="1" stopColor="#ec4899" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`${uid}-neb2`}>
          <stop offset="0" stopColor="#22d3ee" stopOpacity="0.45" />
          <stop offset="1" stopColor="#22d3ee" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`${uid}-orb`} cx="0.4" cy="0.35" r="0.75">
          <stop offset="0" stopColor="#fdf4ff" />
          <stop offset="0.45" stopColor="#c084fc" />
          <stop offset="1" stopColor="#1e1b4b" />
        </radialGradient>
        <radialGradient id={`${uid}-gem`} cx="0.4" cy="0.35" r="0.7">
          <stop offset="0" stopColor="#f0abfc" />
          <stop offset="1" stopColor="#6d28d9" />
        </radialGradient>
        <linearGradient id={`${uid}-sheen`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#fff" stopOpacity="0" />
          <stop offset="0.5" stopColor="#fff" stopOpacity="0.32" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
      </>
    ),
    back: (
      <g>
        <circle cx="60" cy="50" r="34" fill="none" stroke="#f0abfc" strokeWidth="1.3" opacity="0.55" />
        <circle cx="60" cy="50" r="37.5" fill="none" stroke="#7dd3fc" strokeWidth="0.6" strokeDasharray="1.5 3" opacity="0.6" />
        <path d="M31 80 C15 68 12 48 21 33 C26 49 35 60 47 67 Z M89 80 C105 68 108 48 99 33 C94 49 85 60 73 67 Z" fill={url(uid, 'cloak')} stroke="#c084fc" strokeWidth="1.2" strokeLinejoin="round" />
        <path d="M24 40 C26 52 33 61 43 67 M96 40 C94 52 87 61 77 67" fill="none" stroke="#f0abfc" strokeWidth="0.8" opacity="0.7" />
        <path d="M37 77 C12 92 8 110 14 119 L106 119 C112 110 108 92 83 77 Q60 60 37 77 Z" fill={url(uid, 'cloak')} stroke="#c084fc" strokeWidth="1.3" strokeLinejoin="round" />
        {[
          [22, 60, 1],
          [98, 58, 1.3],
          [21, 102, 1.4],
          [99, 98, 1],
          [26, 114, 0.9],
          [95, 112, 1.2],
          [30, 52, 0.8],
        ].map(([x, y, r]) => (
          <circle key={`${x}-${y}`} cx={x} cy={y} r={r} fill="#fff" opacity="0.85" />
        ))}
      </g>
    ),
    body: (
      <>
        <rect x="28" y="64" width="64" height="56" fill={url(uid, 'robe')} />
        <circle cx="46" cy="101" r="15" fill={url(uid, 'neb1')} />
        <circle cx="75" cy="95" r="13" fill={url(uid, 'neb2')} />
        {[
          [40, 90],
          [52, 112],
          [70, 108],
          [80, 103],
          [66, 88],
          [36, 106],
          [57, 98],
        ].map(([x, y]) => (
          <circle key={`${x}-${y}`} cx={x} cy={y} r="0.7" fill="#fff" />
        ))}
        <path d="M60 82 V120" stroke="#fde68a" strokeWidth="1.4" />
        <path d="M44 80 Q48 98 42 118 M76 80 Q72 98 78 118" fill="none" stroke="#c084fc" strokeWidth="1" opacity="0.8" />
        {/* Áo choàng lấp lánh: vệt sáng chéo lướt qua thân, chỉ chạy ở phòng thử đồ */}
        <rect x="-10" y="60" width="18" height="70" fill={url(uid, 'sheen')} transform="skewX(-18)" opacity={motion ? 1 : 0}>
          {motion && <animateTransform attributeName="transform" type="translate" values="0 0; 110 0; 110 0" keyTimes="0; 0.4; 1" dur="5.5s" repeatCount="indefinite" additive="sum" />}
        </rect>
        <ClothShade light={0.1} dark={0.25} />
      </>
    ),
    hat: (
      <g>
        <path d="M40 31 Q60 19 80 31" fill="none" stroke="#e9d5ff" strokeWidth="1.6" strokeLinecap="round" />
        {[
          [44, 25, 2.2],
          [52, 19.5, 2.9],
          [60, 17, 3.8],
          [68, 19.5, 2.9],
          [76, 25, 2.2],
        ].map(([x, y, r]) => (
          <path key={x} d={starPath(x, y, r)} fill="#fde68a" stroke="#d97706" strokeWidth="0.5" strokeLinejoin="round" />
        ))}
      </g>
    ),
    neck: (
      <g>
        <path d="M46 77 Q60 86 74 77" fill="none" stroke="#fde68a" strokeWidth="1.1" />
        <circle cx="60" cy="81" r="4.2" fill={url(uid, 'gem')} stroke="#fde68a" strokeWidth="1.2" />
        <circle cx="58.6" cy="79.6" r="1" fill="#fff" opacity="0.8" />
      </g>
    ),
    propR: (
      <g>
        <circle cx="88.5" cy="95" r="8.8" fill={url(uid, 'orb')} stroke="#e9d5ff" strokeWidth="1" />
        <path d="M83.5 95.5 q3.5 -6 9 -2.5 M93.5 94.5 q-3.5 6 -9 2.5" fill="none" stroke="#fff" strokeWidth="1" opacity="0.65" strokeLinecap="round" />
        <circle cx="88.5" cy="95" r="1.3" fill="#fff" />
      </g>
    ),
    propL: null,
  }
}

export const LOOKS = { sport, sleep, artist, explorer, scientist, dj, swordsman, wizard, astronaut, galaxy }

// Vị trí cần cho hiệu ứng (toạ độ khung gấu 120×120, tư thế ngồi)
export const ANCHORS = { blade: BLADE, staffHead: STAFF_HEAD }

// Điểm cầm đồ tay trái khi giơ lên ('teach'): giống phép xoay trong FrontPanda (xoay -12° quanh (33, 96) rồi dời (-6, -30))
export function raisedPoint([x, y]) {
  const a = (-12 * Math.PI) / 180
  const dx = x - 33
  const dy = y - 96
  return [33 + dx * Math.cos(a) - dy * Math.sin(a) - 6, 96 + dx * Math.sin(a) + dy * Math.cos(a) - 30]
}
