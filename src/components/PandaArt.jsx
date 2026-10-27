import { useId } from 'react'

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

// face: 'normal' | 'sad' (mắt rưng, miệng mếu, giọt nước mắt) | 'serious' (nhíu mày, miệng thẳng, giọt mồ hôi)
//       | 'happy' (mắt cười híp, miệng cười to)
function Face({ dizzy = false, face = 'normal', glasses = true }) {
  return (
    <>
      <ellipse cx="48" cy="54" rx="8.5" ry="10" transform="rotate(25 48 54)" fill={INK} />
      <ellipse cx="72" cy="54" rx="8.5" ry="10" transform="rotate(-25 72 54)" fill={INK} />
      {face === 'happy' ? (
        <g fill="none" stroke={FUR} strokeWidth="2.4" strokeLinecap="round">
          <path d="M44.5 55 q4.5 -6 9 0" />
          <path d="M66.5 55 q4.5 -6 9 0" />
        </g>
      ) : dizzy ? (
        <g className="pd-swirl" fill="none" stroke={FUR} strokeWidth="1.5" strokeLinecap="round">
          <path d={swirl(49, 53)} />
          <path d={swirl(71, 53)} />
        </g>
      ) : (
        <g className="pd-eyes">
          <circle cx="49" cy="53" r="4.4" fill={FUR} />
          <circle cx="71" cy="53" r="4.4" fill={FUR} />
          {/* Buồn: con ngươi nhìn xuống; nghiêm: nhìn thẳng chăm chú */}
          <circle className="pd-pupil" cx="49.6" cy={face === 'sad' ? 55 : 53.8} r="2.7" fill={INK} />
          <circle className="pd-pupil" cx="71.6" cy={face === 'sad' ? 55 : 53.8} r="2.7" fill={INK} />
          <circle cx="48.5" cy="52.3" r={face === 'sad' ? 1.5 : 1.1} fill={FUR} />
          <circle cx="70.5" cy="52.3" r={face === 'sad' ? 1.5 : 1.1} fill={FUR} />
        </g>
      )}
      {glasses && <Glasses />}
      <ellipse cx="38.5" cy="65" rx="4.5" ry="3" fill={PINK} opacity={face === 'serious' ? 0.35 : 0.85} />
      <ellipse cx="81.5" cy="65" rx="4.5" ry="3" fill={PINK} opacity={face === 'serious' ? 0.35 : 0.85} />
      <ellipse cx="60" cy="64" rx="4" ry="2.8" fill={INK} />
      {face === 'sad' ? (
        <path d="M55 71.5 q5 -5 10 0" fill="none" stroke={INK} strokeWidth="1.8" strokeLinecap="round" />
      ) : face === 'serious' ? (
        <path d="M55.5 70 h9" fill="none" stroke={INK} strokeWidth="2" strokeLinecap="round" />
      ) : face === 'happy' ? (
        <path d="M53.5 67 q6.5 10 13 0 z" fill="#be185d" stroke={INK} strokeWidth="1.5" strokeLinejoin="round" />
      ) : (
        <path d="M55.5 68 q4.5 4.5 9 0" fill="none" stroke={INK} strokeWidth="1.8" strokeLinecap="round" />
      )}
      {face === 'normal' && (
        <path className="pd-mouth-open" d="M55 67.5 q5 9 10 0 z" fill="#be185d" stroke={INK} strokeWidth="1.5" strokeLinejoin="round" />
      )}
    </>
  )
}

// Lông mày + giọt nước (vẽ sau mũ để không bị vành mũ che)
function Brows({ face }) {
  if (face === 'sad')
    return (
      <>
        <path d="M39 44 L52 40 M68 40 L81 44" stroke={INK} strokeWidth="2.6" strokeLinecap="round" />
        <path className="pd-tear" d="M41 61 q-3 4.5 0 6.5 q3 -2 0 -6.5 z" fill="#7dd3fc" stroke="#0284c7" strokeWidth="0.8" />
      </>
    )
  if (face === 'serious')
    return (
      <>
        <path d="M39 40 L53 44 M67 44 L81 40" stroke={INK} strokeWidth="2.8" strokeLinecap="round" />
        <path className="pd-sweat" d="M88 42 q-3.5 5 0 7.5 q3.5 -2.5 0 -7.5 z" fill="#bae6fd" stroke="#0284c7" strokeWidth="0.8" />
      </>
    )
  return null
}

// ===== Biểu cảm phụ cho hoạt cảnh tương tác (components/panda/PandaAct.jsx) =====
// Chỉ gắn khi gấu đang diễn (prop actFaces); ẩn sẵn (opacity 0), panda-act.css bật / tắt từng mặt theo thời gian
// và ẩn mặt thường (.pd-face). Mỗi mặt vẽ đủ quầng mắt, mắt, mũi, má, miệng, lông mày → thay hẳn mặt thường.
// focus nheo mắt nhìn sang trái · calm nhắm mắt thanh thản · smirk nháy mắt cười lệch · chant nhắm mắt niệm phép
// · gaze mắt tròn dõi theo (.pd-xp con ngươi di chuyển được) · fierce trừng mắt nghiến răng · power mắt phát sáng (--xf-glow)
const XF_PATCH = (
  <>
    <ellipse cx="48" cy="54" rx="8.5" ry="10" transform="rotate(25 48 54)" fill={INK} />
    <ellipse cx="72" cy="54" rx="8.5" ry="10" transform="rotate(-25 72 54)" fill={INK} />
  </>
)
const XF_NOSE = <ellipse cx="60" cy="64" rx="4" ry="2.8" fill={INK} />
const xfCheeks = (o) => (
  <>
    <ellipse cx="38.5" cy="65" rx="4.5" ry="3" fill={PINK} opacity={o} />
    <ellipse cx="81.5" cy="65" rx="4.5" ry="3" fill={PINK} opacity={o} />
  </>
)
const xfLine = (d, w = 1.8, c = INK) => <path d={d} fill="none" stroke={c} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" />
const XF_CLOSED = xfLine('M44.5 54 q4.5 3.6 9 0 M66.5 54 q4.5 3.6 9 0', 2.2, FUR)
const XF_OPEN_MOUTH = <path d="M54.5 67.5 q5.5 8.5 11 0 z" fill="#be185d" stroke={INK} strokeWidth="1.5" strokeLinejoin="round" />
function ActFaces({ glasses }) {
  const G = glasses ? <Glasses /> : null
  return (
    <>
      <g className="pd-xf pd-xf-focus" opacity="0">
        {XF_PATCH}
        <path d="M44 52.4 L54 55.4 Q53 58.6 49 58.6 Q44.6 58.4 44 52.4 Z M66 55.4 L76 52.4 Q75.4 58.4 71 58.6 Q67 58.6 66 55.4 Z" fill={FUR} />
        <circle cx="47" cy="56" r="2.3" fill={INK} />
        <circle cx="69" cy="56" r="2.3" fill={INK} />
        <circle cx="46.3" cy="55.3" r="0.8" fill={FUR} />
        <circle cx="68.3" cy="55.3" r="0.8" fill={FUR} />
        {G}
        {xfCheeks(0.3)}
        {XF_NOSE}
        {xfLine('M56 70 L64 69.2', 2)}
        {xfLine('M38.5 41 L53 46.5 M67 46.5 L81.5 41', 2.8)}
      </g>
      <g className="pd-xf pd-xf-calm" opacity="0">
        {XF_PATCH}
        {XF_CLOSED}
        {G}
        {xfCheeks(0.85)}
        {XF_NOSE}
        {xfLine('M56 68.5 q4 3 8 0')}
        {xfLine('M40 42.5 Q46 40.5 52 42 M68 42 Q74 40.5 80 42.5', 2.2)}
      </g>
      <g className="pd-xf pd-xf-smirk" opacity="0">
        {XF_PATCH}
        {xfLine('M44.5 55 q4.5 -4 9 0', 2.4, FUR)}
        <circle cx="71" cy="53" r="4.4" fill={FUR} />
        <circle cx="70.2" cy="53.8" r="2.7" fill={INK} />
        <circle cx="69.4" cy="52.6" r="1.1" fill={FUR} />
        {G}
        {xfCheeks(0.85)}
        {XF_NOSE}
        {xfLine('M54.5 68.6 q6.5 4.6 11 -2.6', 2)}
        {xfLine('M67.5 42.5 L81 39.5', 2.4)}
      </g>
      <g className="pd-xf pd-xf-chant" opacity="0">
        {XF_PATCH}
        {xfLine('M44.5 55 q4.5 2.4 9 0 M66.5 55 q4.5 2.4 9 0', 2.2, FUR)}
        {G}
        {xfCheeks(0.6)}
        {XF_NOSE}
        <ellipse cx="60" cy="69.6" rx="2.1" ry="2.5" fill="#be185d" stroke={INK} strokeWidth="1.3" />
        {xfLine('M40 43.5 Q46 41 52 43 M68 43 Q74 41 80 43.5', 2.2)}
      </g>
      <g className="pd-xf pd-xf-gaze" opacity="0">
        {XF_PATCH}
        <circle cx="49" cy="53" r="4.8" fill={FUR} />
        <circle cx="71" cy="53" r="4.8" fill={FUR} />
        <g className="pd-xp">
          <circle cx="49" cy="53" r="2.6" fill={INK} />
          <circle cx="71" cy="53" r="2.6" fill={INK} />
          <circle cx="48.2" cy="52" r="0.9" fill={FUR} />
          <circle cx="70.2" cy="52" r="0.9" fill={FUR} />
        </g>
        {G}
        {xfCheeks(0.85)}
        {XF_NOSE}
        <ellipse cx="60" cy="69.4" rx="1.9" ry="2.2" fill="#be185d" stroke={INK} strokeWidth="1.2" />
        {xfLine('M41 40 Q46 37.5 52 39 M68 39 Q74 37.5 79 40', 2.2)}
      </g>
      <g className="pd-xf pd-xf-fierce" opacity="0">
        {XF_PATCH}
        <path d="M44 51.4 L54 54.2 Q53.8 58.8 49 58.8 Q44.2 58.6 44 51.4 Z M66 54.2 L76 51.4 Q75.8 58.6 71 58.8 Q66.2 58.8 66 54.2 Z" fill={FUR} />
        <circle cx="49.4" cy="54.8" r="2.4" fill={INK} />
        <circle cx="70.6" cy="54.8" r="2.4" fill={INK} />
        {G}
        {xfCheeks(0.35)}
        {XF_NOSE}
        <rect x="54.5" y="67" width="11" height="5" rx="1.6" fill={FUR} stroke={INK} strokeWidth="1.5" />
        {xfLine('M60 67.2 V71.8', 0.9)}
        {xfLine('M38.5 40 L53.5 46 M66.5 46 L81.5 40', 3)}
      </g>
      <g className="pd-xf pd-xf-power" opacity="0">
        {XF_PATCH}
        <circle cx="49" cy="53" r="7" opacity="0.5" style={{ fill: 'var(--xf-glow, #fde68a)' }} />
        <circle cx="71" cy="53" r="7" opacity="0.5" style={{ fill: 'var(--xf-glow, #fde68a)' }} />
        <circle cx="49" cy="53" r="4.4" fill="#fffbeb" />
        <circle cx="71" cy="53" r="4.4" fill="#fffbeb" />
        {G}
        {xfCheeks(0.5)}
        {XF_NOSE}
        {XF_OPEN_MOUTH}
        {xfLine('M39 41 L53 45.5 M67 45.5 L81 41', 2.8)}
      </g>
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
// face: biểu cảm (xem Face) – dùng ở hộp thoại (components/DialogScene.jsx)
// look: trang phục (components/panda/outfitLooks.jsx) — hàm ({ uid, up }) => các khe thay đồ:
//   defs · back (sau lưng: áo choàng, ba lô) · body (áo, đã cắt theo thân) · hat (thay mũ tốt nghiệp)
//   · neck (thay nơ) · glasses (false = bỏ kính) · overFace (kính râm, kính bảo hộ) · propR (thay sách)
//   · propL (thay đũa, vẽ theo tư thế ngồi; tư thế giơ tay tự xoay theo) · front (lớp trên cùng: mũ bảo hiểm kính)
//   motion: cho trang phục chạy chuyển động nhỏ của riêng nó (chỉ phòng thử đồ).
//   Không truyền look = Giáo sư Gấu Trúc như cũ (linh vật, hộp thoại, kính viễn vọng).
// actFaces: đang diễn hoạt cảnh → gắn thêm biểu cảm phụ (ActFaces). Tai nằm trong .pd-head để quay đầu kéo theo tai;
//   mặt nằm trong .pd-look (dịch ngang = quay mặt 3/4) và .pd-face (mặt thường, ẩn khi biểu cảm phụ bật).
export function FrontPanda({ pose = 'sit', face = 'normal', look, motion = false, actFaces = false }) {
  const wandUp = pose === 'teach' || pose === 'cheer'
  const uid = 'pd' + useId().replace(/[^a-zA-Z0-9]/g, '')
  const L = look ? look({ uid, up: wandUp, motion }) : {}
  const has = (k) => L[k] !== undefined
  return (
    <svg className="pd-front" viewBox="0 0 120 120" aria-hidden="true" overflow={look ? 'visible' : undefined}>
      {L.defs && <defs>{L.defs}</defs>}
      {L.back}
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
      {L.body && <BodyCloth uid={uid}>{L.body}</BodyCloth>}
      <g className="pd-head">
        <circle cx="36" cy="32" r="10" fill={INK} />
        <circle cx="84" cy="32" r="10" fill={INK} />
        <circle cx="60" cy="52" r="27" fill={FUR} stroke={INK} strokeWidth="2.5" />
        <g className="pd-look">
          <g className="pd-face">
            <Face dizzy={pose === 'dizzy'} face={face} glasses={L.glasses !== false} />
          </g>
        </g>
        {L.overFace}
        {has('hat') ? L.hat : <Cap />}
        <g className="pd-look">
          <g className="pd-face">
            <Brows face={face} />
          </g>
          {actFaces && <ActFaces glasses={L.glasses !== false} />}
        </g>
        {pose === 'dizzy' && (
          <g className="pd-dizzy-stars">
            <path d={starPath(38, 14, 4.5)} fill={GOLD} />
            <path d={starPath(82, 12, 4)} fill="#fde68a" />
            <path d={starPath(60, -8, 3.5)} fill={GOLD} />
          </g>
        )}
      </g>
      {has('neck') ? (
        L.neck
      ) : (
        <>
          <path d="M60 80 L48 73 L48 87 Z" fill={VIOLET} stroke={VIOLET_EDGE} strokeWidth="1.2" strokeLinejoin="round" />
          <path d="M60 80 L72 73 L72 87 Z" fill={VIOLET} stroke={VIOLET_EDGE} strokeWidth="1.2" strokeLinejoin="round" />
          <circle cx="60" cy="80" r="3.2" fill={VIOLET_DARK} />
        </>
      )}

      {/* Tay phải: ôm sách (giơ cao khi ăn mừng); khi đợi thì hai tay cầm sách mở đọc */}
      {pose === 'wait' ? (
        <ReadingArms />
      ) : pose === 'cheer' ? (
        <g className="pd-arm pd-arm-r">
          <g className="pd-prop pd-prop-r">{has('propR') ? <g transform="translate(4 -44) rotate(20 87 96)">{L.propR}</g> : <Book x={82} y={40} angle={12} />}</g>
          <ellipse cx="87" cy="73" rx="8" ry="13" transform="rotate(43 87 73)" fill={INK} />
        </g>
      ) : (
        <g className="pd-arm pd-arm-r">
          <g className="pd-prop pd-prop-r">{has('propR') ? L.propR : <Book x={77} y={84} angle={-8} />}</g>
          <ellipse cx="84" cy="92" rx="8" ry="13" transform="rotate(-30 84 92)" fill={INK} />
        </g>
      )}

      {/* Tay trái: cầm đũa ngôi sao (giơ lên khi giảng / ăn mừng) */}
      {pose === 'wait' ? null : wandUp ? (
        <g className="pd-arm pd-arm-l pd-wand-up">
          {has('propL') ? (
            <g className="pd-prop pd-prop-l" transform="translate(-6 -30) rotate(-12 33 96)">{L.propL}</g>
          ) : (
            <>
              <path d="M27 66 L12 40" stroke="#92400e" strokeWidth="2.6" strokeLinecap="round" />
              <path className="pd-star" d={starPath(11, 36, 7.5)} fill={GOLD} stroke="#d97706" strokeWidth="1" strokeLinejoin="round" />
            </>
          )}
          <ellipse cx="33" cy="73" rx="8" ry="13" transform="rotate(-43 33 73)" fill={INK} />
        </g>
      ) : (
        <g className="pd-arm pd-arm-l">
          {has('propL') ? (
            <g className="pd-prop pd-prop-l">{L.propL}</g>
          ) : (
            <>
              <path d="M33 96 L22 62" stroke="#92400e" strokeWidth="2.6" strokeLinecap="round" />
              <path className="pd-star" d={starPath(21, 58, 7)} fill={GOLD} stroke="#d97706" strokeWidth="1" strokeLinejoin="round" />
            </>
          )}
          <ellipse cx="36" cy="92" rx="8" ry="13" transform="rotate(30 36 92)" fill={INK} />
        </g>
      )}
      {L.front}
    </svg>
  )
}

// Áo bám đúng form thân: cắt theo hình elip thân rồi vẽ lại viền mực để giữ nét gấu gốc
function BodyCloth({ uid, children }) {
  return (
    <>
      <clipPath id={`${uid}-body`}>
        <ellipse cx="60" cy="92" rx="27.8" ry="21.8" />
      </clipPath>
      <g clipPath={`url(#${uid}-body)`}>{children}</g>
      <ellipse cx="60" cy="92" rx="29" ry="23" fill="none" stroke={INK} strokeWidth="2.5" />
    </>
  )
}

// Trang phục ở tư thế leo / lăn / ngủ: chỉ cần palette của bộ (outfitLooks.jsx) — áo cắt theo thân tư thế đó, mũ dùng lại của bộ
function useLook(look) {
  const uid = 'pd' + useId().replace(/[^a-zA-Z0-9]/g, '')
  const L = look ? look({ uid, up: false, motion: false }) : {}
  return { uid, L, P: L.palette }
}

function PaletteDefs({ uid, P }) {
  if (!P) return null
  return (
    <defs>
      <linearGradient id={`${uid}-cloth`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor={P.cloth[0]} />
        <stop offset="1" stopColor={P.cloth[1]} />
      </linearGradient>
      {P.cape && (
        <linearGradient id={`${uid}-cape`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={P.cape[0]} />
          <stop offset="1" stopColor={P.cape[1]} />
        </linearGradient>
      )}
    </defs>
  )
}

// Áo cắt theo hình thân (shape) rồi vẽ lại viền mực (outline) cho giữ nét gấu
function PoseCloth({ uid, shape, outline, children }) {
  return (
    <>
      <clipPath id={`${uid}-pose`}>{shape}</clipPath>
      <g clipPath={`url(#${uid}-pose)`}>{children}</g>
      <g fill="none" stroke={INK} strokeWidth="2.5">
        {outline}
      </g>
    </>
  )
}

// Mũ kính phi hành gia (tư thế quay lưng / ngủ)
function Helmet({ cx, cy, r }) {
  return (
    <g>
      <circle cx={cx} cy={cy} r={r} fill="rgba(186, 230, 253, 0.14)" stroke="#e2e8f0" strokeWidth="2.6" />
      <path d={`M${cx - r * 0.7} ${cy - r * 0.45} Q${cx - r * 0.4} ${cy - r * 0.85} ${cx + r * 0.05} ${cy - r * 0.95}`} fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" opacity="0.7" />
    </g>
  )
}

export { starPath, INK, FUR }

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

// Gấu quay lưng (mặt hướng vào cây tre), hai tay ôm cây. look: trang phục (áo / áo choàng / mũ theo palette của bộ)
export function BackPanda({ look }) {
  const { uid, L, P } = useLook(look)
  return (
    <svg viewBox="0 0 120 120" aria-hidden="true" overflow={look ? 'visible' : undefined}>
      <PaletteDefs uid={uid} P={P} />
      {P?.pack && <rect x="30" y="66" width="60" height="38" rx="12" fill="#cbd5e1" stroke={INK} strokeWidth="1.4" />}
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
      {P && (
        <PoseCloth uid={uid} shape={<ellipse cx="60" cy="90" rx="25.8" ry="20.8" />} outline={<ellipse cx="60" cy="90" rx="27" ry="22" />}>
          <path d="M20 84 Q60 74 100 84 V120 H20 Z" fill={`url(#${uid}-cloth)`} />
          <path d="M33 104 Q60 112 87 104" fill="none" stroke={P.trim} strokeWidth="2" />
          <path d="M60 82 V112" stroke={P.trim} strokeWidth="1" opacity="0.6" />
        </PoseCloth>
      )}
      {P?.cape ? (
        <path d="M36 72 C29 88 27 104 29 115 L91 115 C93 104 91 88 84 72 Q60 64 36 72 Z" fill={`url(#${uid}-cape)`} stroke={P.trim} strokeWidth="1.2" strokeLinejoin="round" />
      ) : (
        <circle cx="60" cy="108" r="5.5" fill={FUR} stroke={INK} strokeWidth="2" />
      )}
      {/* Hai tay vươn lên hai bên đầu ôm thân tre (vẽ trước đầu để bàn tay khuất sau đầu) */}
      <g className="pd-arm pd-arm-l">
        <ellipse cx="35" cy="60" rx="8.5" ry="17" transform="rotate(22 35 60)" fill={INK} />
      </g>
      <g className="pd-arm pd-arm-r">
        <ellipse cx="85" cy="60" rx="8.5" ry="17" transform="rotate(-22 85 60)" fill={INK} />
      </g>
      <circle cx="60" cy="52" r="26" fill={FUR} stroke={INK} strokeWidth="2.5" />
      <path d="M36 56 q-4 -2 -3 -6 M84 56 q4 -2 3 -6" fill="none" stroke={INK} strokeWidth="2" strokeLinecap="round" />
      {L.defs && <defs>{L.defs}</defs>}
      {look ? L.hat : <Cap back />}
      {P?.helmet && <Helmet cx={60} cy={50} r={37} />}
    </svg>
  )
}

// Gấu ôm gối cuộn tròn để lăn: mắt híp cười, bàn chân hồng chìa ra, vẫn đeo kính
export function BallPanda({ look }) {
  const { uid, L, P } = useLook(look)
  return (
    <svg viewBox="0 0 120 120" aria-hidden="true" overflow={look ? 'visible' : undefined}>
      <PaletteDefs uid={uid} P={P} />
      {L.defs && <defs>{L.defs}</defs>}
      <g className="pd-ball">
        <circle cx="42" cy="58" r="8.5" fill={INK} />
        <circle cx="78" cy="58" r="8.5" fill={INK} />
        <circle cx="60" cy="84" r="31" fill={FUR} stroke={INK} strokeWidth="2.5" />
        <ellipse cx="60" cy="104" rx="18" ry="8" fill={BELLY} />
        {P && (
          <PoseCloth uid={uid} shape={<circle cx="60" cy="84" r="29.8" />} outline={<circle cx="60" cy="84" r="31" />}>
            <path d="M26 95 Q60 106 94 95 V120 H26 Z" fill={`url(#${uid}-cloth)`} />
            <path d="M28 96 Q60 107 92 96" fill="none" stroke={P.trim} strokeWidth="2" />
          </PoseCloth>
        )}
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
        {look && <g transform="translate(0 26)">{L.hat}</g>}
      </g>
    </svg>
  )
}

// Gấu nằm cuộn tròn ngủ: kính đẩy lên trán, mũ lệch. look: áo theo palette, áo choàng thành chăn đắp, mũ của bộ thu nhỏ đội lệch
export function SleepingPanda({ look }) {
  const { uid, L, P } = useLook(look)
  return (
    <svg viewBox="0 0 120 120" aria-hidden="true" overflow={look ? 'visible' : undefined}>
      <PaletteDefs uid={uid} P={P} />
      {L.defs && <defs>{L.defs}</defs>}
      <g className="pd-breathe">
        <circle cx="106" cy="88" r="5" fill={FUR} stroke={INK} strokeWidth="2" />
        <ellipse cx="68" cy="93" rx="40" ry="21" fill={FUR} stroke={INK} strokeWidth="2.5" />
        {P && (
          <PoseCloth uid={uid} shape={<ellipse cx="68" cy="93" rx="38.8" ry="19.8" />} outline={<ellipse cx="68" cy="93" rx="40" ry="21" />}>
            <rect x="26" y="70" width="86" height="46" fill={`url(#${uid}-cloth)`} />
            <path d="M40 82 Q70 96 106 84" fill="none" stroke={P.trim} strokeWidth="1.8" />
          </PoseCloth>
        )}
        {P?.cape && <path d="M44 80 Q70 66 104 80 L110 98 Q74 90 40 100 Z" fill={`url(#${uid}-cape)`} stroke={P.trim} strokeWidth="1.1" strokeLinejoin="round" />}
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
      {L.glasses !== false && (
        <g fill="rgba(255,255,255,0.14)" stroke={INK} strokeWidth="1.6">
          <circle cx="29" cy="79" r="5.5" />
          <circle cx="42" cy="79" r="5.5" />
          <path d="M34.5 78.5 h2" fill="none" />
        </g>
      )}
      {look ? (
        <g transform="translate(35 90) rotate(-18) scale(0.78) translate(-60 -52)">{L.hat}</g>
      ) : (
        <g transform="rotate(-18 40 64)">
          <path d="M30 66 V60 Q40 57 50 60 V66 Q40 70 30 66 Z" fill={VIOLET_DARK} />
          <path d="M20 59 L40 51 L60 59 L40 67 Z" fill={VIOLET} stroke={VIOLET_EDGE} strokeWidth="1.2" strokeLinejoin="round" />
          <path d="M40 59 L52 62 L53 70" fill="none" stroke={GOLD} strokeWidth="1.5" />
        </g>
      )}
      {P?.helmet && <Helmet cx={35} cy={88} r={27} />}
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
