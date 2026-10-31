// @ts-nocheck — nợ kiểu: xóa dòng này rồi chạy npm run typecheck để sửa
import { useCallback, useEffect, useRef, useState } from 'react'
import { INK, starPath } from '../PandaArt.jsx'
import { ANCHORS, raisedPoint } from './outfitLooks.jsx'
import { playActSound, stopActSound, unlockSfx } from '../../lib/pandaSfx.js'

// ===== Hoạt cảnh tương tác của trang phục (từ Hiếm ⭐⭐): GIỮ chuột / ngón tay trên gấu → gấu DIỄN một đoạn rồi về idle =====
// Dữ liệu: catalog lib/outfits.js `interaction` → INTERACTIONS[id] { ms, line, sound, Layer }.
// sound = tên kịch bản tiếng trong lib/pandaSfx.js (mốc giây khớp Layer); usePandaAct phát / dừng.
// Hai phần chạy cùng một mốc 0 (lúc gắn class + lớp vào trang):
//  1. Động tác của gấu: CSS keyframes trên bộ phận SVG có sẵn (.pd-front cả người, .pd-head, .pd-arm-l/-r, .pd-prop-*)
//     theo class `act-<id> is-acting` gắn ở khung chứa — styles/panda-act.css (thời lượng = ms).
//  2. Cảnh đi kèm (bàn DJ, vệt kiếm, hành tinh, tàu, ngân hà): 2 lớp SVG <PandaActLayer part="back|front"> kẹp gấu ở giữa
//     (sau lưng: ngân hà, tinh vân, vòng phép, equalizer; trước mặt: bàn DJ, vệt kiếm, tàu...), toạ độ trùng khung gấu 120×120,
//     SMIL chạy một lần (fill="freeze"). Layer({ lite, part }).
//  3. Biểu cảm: FrontPanda actFaces gắn thêm mặt phụ (PandaArt ActFaces), CSS bật / tắt theo thời gian; .pd-look quay mặt 3/4.
// Sân diễn = outfit.stage (px desktop, gấu luôn PANDA_PX): DJ 350×330 · Kiếm Sĩ 460×380 · Pháp Sư 430×420
//  · Phi Hành Gia 480×430 · Ngân Hà 540×470. Lớp cảnh phủ đúng chữ nhật sân (stageRect), Layer nhận box để vụ nổ / chớp sáng
//  lan tới mép sân. Phòng thử đồ: khung cố định 560×480 co đều theo màn hình. Linh vật: gấu bước ra khỏi góc (stageOverflow)
//  để cả sân nằm trong màn hình.
//  Toạ độ khi tay / thân đang xoay: rotAround (tay trái), bodyAt (cả người) — khớp số với keyframes.
// lite (Cài đặt "Tối ưu" / tắt "Animation gấu"): giữ nguyên động tác chính của gấu, bớt hạt / lớp phụ.
// Thêm hoạt cảnh mới = 1 mục INTERACTIONS + keyframes `act-<id>` + `interaction` trong catalog.

const COOLDOWN = 900

const sparkle = (x, y, r) => `M${x} ${y - r} Q${x} ${y} ${x + r} ${y} Q${x} ${y} ${x} ${y + r} Q${x} ${y} ${x - r} ${y} Q${x} ${y} ${x} ${y - r} Z`
const CRYSTAL = 'M0 -3.6 L2.2 0 L0 3.6 L-2.2 0 Z'
const NOTE = 'M0 0 v-8.5 l6 -1.8 v8.2 M0 0 a2.4 2 0 1 1 -0.1 0 M6 -2.1 a2.4 2 0 1 1 -0.1 0'
const rad = (d) => (d * Math.PI) / 180
const f1 = (n) => +n.toFixed(1)
const ellipsePath = (cx, cy, rx, ry) => `M${cx - rx} ${cy} a${rx} ${ry} 0 1 0 ${rx * 2} 0 a${rx} ${ry} 0 1 0 ${-rx * 2} 0`
const s = (t) => `${t}s`

// Hiện – giữ – tắt trong [begin, begin + dur]
function Fade({ begin, dur, peak = 1, hold = 0.7 }) {
  return <animate attributeName="opacity" values={`0;${peak};${peak};0`} keyTimes={`0;0.12;${hold};1`} begin={s(begin)} dur={s(dur)} fill="freeze" />
}
// Chỉ hiện (giữ nguyên) từ begin; tắt ở `out` (nếu có)
function Show({ begin, out, dur = 0.25, outDur = 0.35, peak = 1 }) {
  return (
    <>
      <animate attributeName="opacity" from="0" to={peak} begin={s(begin)} dur={s(dur)} fill="freeze" />
      {out != null && <animate attributeName="opacity" from={peak} to="0" begin={s(out)} dur={s(outDur)} fill="freeze" />}
    </>
  )
}
// boom: nở nhanh rồi chậm dần (sóng chấn động của vụ nổ)
function Ring({ cx, cy, from, to, begin, dur = 0.9, color, width = 1.6, ry, boom = false }) {
  const k = ry ? ry : 1
  const ease = boom ? { calcMode: 'spline', keyTimes: '0;1', keySplines: '0.1 0.75 0.3 1' } : null
  return (
    <ellipse cx={cx} cy={cy} rx={from} ry={from * k} fill="none" stroke={color} strokeWidth={width} opacity="0">
      <animate attributeName="rx" values={`${from};${to}`} begin={s(begin)} dur={s(dur)} fill="freeze" {...ease} />
      <animate attributeName="ry" values={`${from * k};${to * k}`} begin={s(begin)} dur={s(dur)} fill="freeze" {...ease} />
      <animate attributeName="opacity" values="0;0.9;0" keyTimes="0;0.15;1" begin={s(begin)} dur={s(dur)} fill="freeze" />
    </ellipse>
  )
}
// Hạt bay toả ra từ (cx, cy)
function Burst({ cx, cy, n, dist, begin, dur = 1, offset = 0, children }) {
  return Array.from({ length: n }, (_, i) => {
    const a = rad((360 / n) * i + offset)
    return (
      <g key={i} transform={`translate(${cx} ${cy})`}>
        <g opacity="0">
          {typeof children === 'function' ? children(i) : children}
          <animateMotion path={`M0 0 L${f1(Math.cos(a) * dist)} ${f1(Math.sin(a) * dist)}`} begin={s(begin)} dur={s(dur)} fill="freeze" />
          <Fade begin={begin} dur={dur} hold={0.5} />
        </g>
      </g>
    )
  })
}
// Hạt hút về (cx, cy)
function Converge({ cx, cy, n, dist, begin, dur = 0.7, children }) {
  return Array.from({ length: n }, (_, i) => {
    const a = rad((360 / n) * i + 20)
    return (
      <g key={i} transform={`translate(${cx} ${cy})`}>
        <g opacity="0">
          {children}
          <animateMotion path={`M${f1(Math.cos(a) * dist)} ${f1(Math.sin(a) * dist)} L0 0`} begin={s(begin)} dur={s(dur)} fill="freeze" />
          <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.2;0.85;1" begin={s(begin)} dur={s(dur)} fill="freeze" />
        </g>
      </g>
    )
  })
}
// Phóng to từ 0 tại (cx, cy) rồi (tuỳ chọn) thu lại; con vẽ quanh gốc 0,0
function Grow({ cx, cy, begin, dur = 0.5, out, outDur = 0.6, to = 1, children }) {
  return (
    <g transform={`translate(${cx} ${cy})`}>
      <g transform="scale(0)">
        <animateTransform attributeName="transform" type="scale" values={`0;${to * 1.08};${to}`} keyTimes="0;0.7;1" begin={s(begin)} dur={s(dur)} fill="freeze" />
        {out != null && <animateTransform attributeName="transform" type="scale" values={`${to};0`} begin={s(out)} dur={s(outDur)} fill="freeze" />}
        {children}
      </g>
    </g>
  )
}
function Spin({ dur, from = 0, to = 360, begin = 0 }) {
  return <animateTransform attributeName="transform" type="rotate" values={`${from};${to}`} begin={s(begin)} dur={s(dur)} fill="freeze" />
}

// ---- Sân diễn (catalog lib/outfits.js `stage` = [rộng, cao] px desktop) ----
// Gấu luôn PANDA_PX (khung 120 đơn vị) ở cùng một chỗ; sân căn giữa theo chiều ngang, đáy sân thấp hơn chân gấu 30px.
// stageRect → { x, y, w, h } theo đơn vị khung gấu (gấu 0..120) — dùng cho viewBox, chớp sáng, vị trí hạt.
export const PANDA_PX = 180
const U = 120 / PANDA_PX
export function stageRect([w, h]) {
  return { x: f1(60 - (w * U) / 2), y: f1(120 + 30 * U - h * U), w: f1(w * U), h: f1(h * U) }
}
const SHOULDER = [40, 80] // vai trái (transform-origin của .pd-arm-l)
// Xoay điểm p quanh vai theo deg (giống CSS rotate của .pd-arm-l)
function rotAround([x, y], deg, [ox, oy] = SHOULDER) {
  const a = rad(deg)
  const dx = x - ox
  const dy = y - oy
  return [f1(ox + dx * Math.cos(a) - dy * Math.sin(a)), f1(oy + dx * Math.sin(a) + dy * Math.cos(a))]
}
// Điểm p sau khi cả người (.pd-front, gốc 50% 88%) bị CSS translate(tx%, ty%) rotate(rot) scale(sx, sy)
function bodyAt([x, y], tx = 0, ty = 0, rot = 0, sx = 1, sy = sx) {
  const [ox, oy] = [60, 105.6]
  const dx = (x - ox) * sx
  const dy = (y - oy) * sy
  const a = rad(rot)
  return [f1(ox + dx * Math.cos(a) - dy * Math.sin(a) + tx * 1.2), f1(oy + dx * Math.sin(a) + dy * Math.cos(a) + ty * 1.2)]
}
const unit = ([x1, y1], [x2, y2]) => {
  const l = Math.hypot(x2 - x1, y2 - y1)
  return [(x2 - x1) / l, (y2 - y1) / l]
}
const pt = (p) => p.join(' ')
const triPts = (r, rot) =>
  [0, 120, 240].map((d) => `${f1(r * Math.cos(rad(d + rot - 90)))},${f1(r * Math.sin(rad(d + rot - 90)))}`).join(' ')

// Chớp sáng phủ gần cả sân diễn: quầng tròn tâm (cx, cy) mờ dần ra mép — không có cạnh vuông đè lên trang
function StageFlash({ box, cx, cy, begin, color = '#fff', peak = 0.5, dur = 0.35 }) {
  const id = `act-flash-${color.replace(/[^a-z0-9]/gi, '')}`
  return (
    <>
      <defs>
        <radialGradient id={id}>
          <stop offset="0" stopColor={color} />
          <stop offset="0.45" stopColor={color} stopOpacity="0.75" />
          <stop offset="1" stopColor={color} stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx={cx} cy={cy} r={f1(Math.max(box.w, box.h) * 0.6)} fill={`url(#${id})`} opacity="0">
        <animate attributeName="opacity" values={`0;${peak};0`} keyTimes="0;0.15;1" begin={s(begin)} dur={s(dur)} fill="freeze" />
      </circle>
    </>
  )
}
// Lõi vụ nổ: nở rất nhanh rồi tắt dần. color = quầng một màu mờ dần ra mép (không có cạnh cứng); fill = gradient riêng
function Blast({ cx, cy, from = 3, to, begin, grow = 0.4, dur = 0.9, fill, color }) {
  const id = color && `act-blast-${color.replace(/[^a-z0-9]/gi, '')}`
  return (
    <>
      {color && (
        <defs>
          <radialGradient id={id}>
            <stop offset="0" stopColor={color} />
            <stop offset="0.5" stopColor={color} stopOpacity="0.85" />
            <stop offset="1" stopColor={color} stopOpacity="0" />
          </radialGradient>
        </defs>
      )}
      <BlastCircle cx={cx} cy={cy} from={from} to={to} begin={begin} grow={grow} dur={dur} fill={color ? `url(#${id})` : fill} />
    </>
  )
}
function BlastCircle({ cx, cy, from, to, begin, grow, dur, fill }) {
  return (
    <circle cx={cx} cy={cy} r={from} fill={fill} opacity="0">
      <animate attributeName="r" values={`${from};${to}`} begin={s(begin)} dur={s(grow)} fill="freeze" calcMode="spline" keyTimes="0;1" keySplines="0.1 0.8 0.3 1" />
      <animate attributeName="opacity" values="0;1;0" keyTimes="0;0.12;1" begin={s(begin)} dur={s(dur)} fill="freeze" />
    </circle>
  )
}
// Tia loé 4 cánh dài (lens flare) ở tâm vụ nổ
function Flare({ cx, cy, r, begin, dur = 0.6, rot = 0, fill = '#fff' }) {
  return (
    <g transform={`translate(${cx} ${cy}) rotate(${rot})`}>
      <g transform="scale(0)">
        <animateTransform attributeName="transform" type="scale" values="0;1;0" keyTimes="0;0.3;1" begin={s(begin)} dur={s(dur)} fill="freeze" />
        <path d={sparkle(0, 0, r)} fill={fill} />
      </g>
    </g>
  )
}
// Pháo hoa nhỏ: vòng sáng + hạt lấp lánh toả ra
function Firework({ cx, cy, begin, color, n = 10, dist = 24 }) {
  return (
    <>
      <Ring cx={cx} cy={cy} from={2} to={dist + 4} begin={begin} dur={0.6} color={color} width={1.3} />
      <Burst cx={cx} cy={cy} n={n} dist={dist} begin={begin} dur={0.85} offset={9}>
        {(i) => <path d={sparkle(0, 0, i % 2 ? 1.6 : 2.4)} fill={i % 3 ? color : '#fff'} />}
      </Burst>
    </>
  )
}

// ================= Panda DJ — Hiếm ⭐⭐ (3s): chỉnh tai nghe → bàn DJ hiện ra → scratch + lắc theo beat → giơ tay "drop" → thu bàn =================
function DjSet({ lite, part }) {
  const bars = lite ? 5 : 9
  if (part === 'back')
    return (
    <>
      <defs>
        <linearGradient id="act-dj-bar" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" stopColor="#22d3ee" />
          <stop offset="1" stopColor="#e879f9" />
        </linearGradient>
      </defs>
      {/* Equalizer sau lưng: nảy theo beat, sáng bừng ở nhịp drop */}
      <g opacity="0">
        <Show begin={0.45} out={2.6} />
        {Array.from({ length: bars }, (_, i) => {
          const x = -14 + (i * 148) / (bars - 1)
          const h = 26 + ((i * 7) % 4) * 6
          return (
            <g key={i} transform={`translate(${f1(x)} 120)`}>
              <rect x="-4" y={-h} width="8" height={h} rx="3" fill="url(#act-dj-bar)" opacity="0.75" transform="scale(1 0.2)">
                <animateTransform attributeName="transform" type="scale" values={`1 0.2;1 ${0.5 + (i % 3) * 0.2};1 0.35;1 ${0.9 - (i % 2) * 0.3};1 0.4;1 0.8;1 1.45;1 1.3;1 0.2`} keyTimes="0;0.15;0.3;0.45;0.6;0.72;0.8;0.88;1" begin="0.45s" dur="2.4s" fill="freeze" />
              </rect>
            </g>
          )
        })}
      </g>
      {/* Tai nghe nháy sóng xanh / tím */}
      {[0.05, 0.75, 1.45].map((b, i) => (
        <Ring key={b} cx={60} cy={44} from={30} to={50} begin={b} dur={0.8} color={i % 2 ? '#e879f9' : '#22d3ee'} width={1.6} ry={0.74} />
      ))}
    </>
    )
  return (
    <>
      {/* Bàn DJ: trồi lên trước gấu, hai mâm đĩa quay */}
      <g opacity="0">
        <Show begin={0.35} out={2.6} dur={0.2} />
        <Grow cx={60} cy={108} begin={0.35} dur={0.35} out={2.6} outDur={0.35}>
          <rect x="-36" y="-11" width="72" height="20" rx="6" fill="#1e1b4b" stroke="#22d3ee" strokeWidth="1.4" />
          <path d="M-32 6 H32" stroke="#e879f9" strokeWidth="1.6" opacity="0.9" />
          {[-19, 19].map((x, i) => (
            <g key={x} transform={`translate(${x} -1)`}>
              <circle r="8" fill="#0f0f1a" stroke="#818cf8" strokeWidth="1" />
              <g>
                <Spin dur={2.4} to={i ? -720 : 900} begin={0.4} />
                <circle r="5.2" fill="none" stroke="#334155" strokeWidth="0.6" />
                <circle r="2.4" fill={i ? '#22d3ee' : '#ec4899'} />
                <path d="M0 -7 V-4.5" stroke="#fff" strokeWidth="0.8" />
              </g>
            </g>
          ))}
          <rect x="-4" y="-7" width="8" height="10" rx="1.5" fill="#312e81" stroke="#818cf8" strokeWidth="0.6" />
          <path d="M-1.5 -4 V0 M1.5 -5 V1" stroke="#22d3ee" strokeWidth="1" />
        </Grow>
      </g>
      {/* Nốt nhạc bay lên theo beat */}
      {(lite ? [0.9, 1.6] : [0.8, 1.15, 1.5, 1.85]).map((b, i) => (
        <g key={b} transform={`translate(${[30, 92, 18, 100][i]} 70)`}>
          <g opacity="0">
            <path d={NOTE} fill={['#22d3ee', '#e879f9', '#c084fc', '#22d3ee'][i]} stroke={['#22d3ee', '#e879f9', '#c084fc', '#22d3ee'][i]} strokeWidth="1.5" strokeLinecap="round" />
            <animateMotion path={`M0 0 q${i % 2 ? 8 : -8} -14 ${i % 2 ? -2 : 2} -34`} begin={s(b)} dur="1.2s" fill="freeze" />
            <Fade begin={b} dur={1.2} hold={0.6} />
          </g>
        </g>
      ))}
      {/* Drop: vòng sáng toả ra từ tay giơ cao */}
      <Ring cx={60} cy={60} from={20} to={88} begin={2.1} dur={0.7} color="#e879f9" width={2} />
      {!lite && <Ring cx={60} cy={60} from={14} to={70} begin={2.2} dur={0.7} color="#22d3ee" width={1.4} />}
    </>
  )
}

// ================= Kiếm Sĩ Tinh Hệ — Hiếm ⭐⭐⭐ (4.6s, sân 2×): tốc độ → im lặng → tra kiếm → đại bùng nổ =================
// Khớp keyframes act-duel-* (panda-act.css):
//  0–0.5 nghiêm mặt, xoay người thủ thế nhìn sang trái, chĩa kiếm; hành tinh mục tiêu hiện ra
//  · 0.6–1.48 combo 8 nhát (0,11s/nhát): gấu lao vụt quanh mục tiêu để lại bóng mờ, mỗi nhát một vệt kiếm cắt ngang hành tinh
//  · 1.5–2.2 về chỗ, quay mặt đi, nhắm mắt; bao kiếm tinh thể hiện bên hông · 2.2–2.75 tra kiếm chậm rãi → "cạch"
//  · 2.86 hành tinh MỚI nổ: chớp sân, lõi sáng, 3 vòng chấn động, tia loé, mảnh tinh thể + bụi sao, pháo hoa phụ · 3.05 nháy mắt
//  · 3.6 bao kiếm tan, 3.75–4.6 về idle (kiếm hiện lại trên tay)
const DUEL_P = [-14, 20] // hành tinh: bên trái (linh vật ở góc phải màn hình → bên trái còn chỗ)
const DUEL_BEATS = [0.6, 0.71, 0.82, 0.93, 1.04, 1.15, 1.26, 1.37]
const DUEL_CUTS = [24, -38, 78, -12, 52, -66, 6, 36] // góc vệt chém từng nhát
// Tư thế thân ở từng nhát — PHẢI khớp act-duel-body: [dịch x %, dịch y %, xoay °, lật ngang]
const DUEL_POSES = [
  [-26, -2, -12, 0.86],
  [-12, -16, 10, -0.86],
  [-34, -10, -18, 0.86],
  [-20, -22, 14, -0.86],
  [-30, 2, -8, 0.86],
  [-8, -10, 16, -0.86],
  [-28, -18, -14, 0.86],
  [-18, -4, 6, 0.86],
]
const DUEL_BOOM = 2.86
// Tra kiếm: tay trái xoay -80° (act-duel-arm) → lưỡi kiếm nằm chếch xuống bên hông trái; bao kiếm vẽ đúng đường đó.
// Trước khi tra, tay lùi ngược 22 đơn vị dọc lưỡi = translate(20.7px, -7.5px) trong keyframes.
const SHEATH_G = rotAround(raisedPoint(ANCHORS.blade.g), -80)
const SHEATH_U = unit(SHEATH_G, rotAround(raisedPoint(ANCHORS.blade.t), -80))
const along = (k) => [f1(SHEATH_G[0] + SHEATH_U[0] * k), f1(SHEATH_G[1] + SHEATH_U[1] * k)]
// Bóng gấu (tai, đầu, thân) — để lại bóng mờ ở chỗ vừa lao qua
const SILHOUETTE = (
  <>
    <circle cx="36" cy="32" r="10" />
    <circle cx="84" cy="32" r="10" />
    <circle cx="60" cy="52" r="27" />
    <ellipse cx="60" cy="92" rx="29" ry="23" />
  </>
)
function Ghost({ pose: [tx, ty, r, sx], begin }) {
  return (
    <g transform={`translate(${f1(tx * 1.2)} ${f1(ty * 1.2)}) translate(60 105.6) rotate(${r}) scale(${sx} 1) translate(-60 -105.6)`} fill="#c084fc" opacity="0">
      {SILHOUETTE}
      <animate attributeName="opacity" values="0;0.42;0" keyTimes="0;0.1;1" begin={s(begin)} dur="0.32s" fill="freeze" />
    </g>
  )
}
// Vệt chém lưỡi liềm nhọn hai đầu: vụt qua tâm (cx, cy) trong 0,06s rồi tan
function Slash({ cx, cy, angle, begin, len = 76, w = 5 }) {
  const a = rad(angle)
  const x0 = f1(cx - (Math.cos(a) * len) / 2)
  const y0 = f1(cy - (Math.sin(a) * len) / 2)
  const crescent = (k) => `M0 0 Q${len / 2} ${f1(-w * k)} ${len} 0 Q${len / 2} ${f1(-w * k * 0.25)} 0 0 Z`
  return (
    <g transform={`translate(${x0} ${y0}) rotate(${angle})`} opacity="0">
      <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.08;0.35;1" begin={s(begin)} dur="0.42s" fill="freeze" />
      <g transform="scale(0.05 1)">
        <animateTransform attributeName="transform" type="scale" values="0.05 1;1 1" begin={s(begin)} dur="0.06s" fill="freeze" />
        <path d={crescent(2.6)} fill="#a855f7" opacity="0.55" />
        <path d={crescent(1)} fill="#fdf4ff" />
      </g>
    </g>
  )
}
function StarDuel({ lite, part, box }) {
  const [px, py] = DUEL_P
  const cut = (i) => {
    const a = rad(DUEL_CUTS[i])
    const o = ((i % 3) - 1) * 3 // lệch khỏi tâm một chút cho vết cắt không trùng nhau
    return [f1(-Math.sin(a) * o), f1(Math.cos(a) * o), f1(Math.cos(a) * 22), f1(Math.sin(a) * 22)]
  }
  if (part === 'back')
    return (
      <>
        <defs>
          <radialGradient id="act-duel-planet" cx="0.35" cy="0.3" r="0.85">
            <stop offset="0" stopColor="#c4b5fd" />
            <stop offset="0.5" stopColor="#6d28d9" />
            <stop offset="1" stopColor="#1e1b4b" />
          </radialGradient>
          <radialGradient id="act-duel-halo">
            <stop offset="0" stopColor="#a855f7" stopOpacity="0.5" />
            <stop offset="1" stopColor="#a855f7" stopOpacity="0" />
          </radialGradient>
          <clipPath id="act-duel-clip">
            <circle r="17" />
          </clipPath>
        </defs>
        {/* Bóng mờ ở chỗ gấu vừa lao qua (chỉ thấy silhouette + vệt kiếm) */}
        {!lite && DUEL_POSES.slice(0, 7).map((p, i) => <Ghost key={i} pose={p} begin={DUEL_BEATS[i] + 0.09} />)}
        {/* Hành tinh mục tiêu: hiện ra → rung theo từng nhát, hằn vết cắt sáng → im lặng run nhẹ → nóng rực → nổ (lớp trước) */}
        <g opacity="0">
          <Show begin={0.1} out={DUEL_BOOM} dur={0.2} outDur={0.04} />
          <Grow cx={px} cy={py} begin={0.1} dur={0.45} to={1.2}>
            <g>
              <animateTransform attributeName="transform" type="translate" values="0 0;-2.4 1;2 -1.6;-1.4 -2;2.4 1.6;-2 0.4;1.4 -2;-1.6 1.4;1.6 0.6;0 0" begin="0.6s" dur="0.92s" fill="freeze" />
              <animateTransform attributeName="transform" type="translate" values="0 0;0.8 -0.6;-0.8 0.5;0.6 0.8;-0.6 -0.8;0 0" begin="2.3s" dur="0.14s" repeatCount="4" fill="freeze" />
              <circle r="32" fill="url(#act-duel-halo)" />
              <ellipse rx="29" ry="7" transform="rotate(-22)" fill="none" stroke="#e9d5ff" strokeWidth="1.3" opacity="0.6" />
              <circle r="17" fill="url(#act-duel-planet)" stroke="#f5d0fe" strokeWidth="0.8" />
              <g clipPath="url(#act-duel-clip)">
                <path d="M-17 -5 Q0 -10 17 -5" fill="none" stroke="#c4b5fd" strokeWidth="2" opacity="0.4" />
                <path d="M-17 7 Q0 2 17 7" fill="none" stroke="#312e81" strokeWidth="2.6" opacity="0.5" />
                <circle cx="6" cy="-6" r="2.4" fill="#312e81" opacity="0.5" />
                <circle cx="-7" cy="5" r="1.6" fill="#312e81" opacity="0.5" />
                {DUEL_BEATS.map((b, i) => {
                  const [ox, oy, cx, cy] = cut(i)
                  return (
                    <path key={b} d={`M${f1(ox - cx)} ${f1(oy - cy)} L${f1(ox + cx)} ${f1(oy + cy)}`} stroke="#fdf4ff" strokeWidth="1.2" opacity="0">
                      <animate attributeName="opacity" values="0;1" begin={s(b + 0.04)} dur="0.05s" fill="freeze" />
                      {!lite && <animate attributeName="stroke-width" values="1.2;2.2;1.2" begin="1.7s" dur="0.55s" repeatCount="2" />}
                    </path>
                  )
                })}
              </g>
              <path d="M-29 0 A29 7 0 0 0 29 0" transform="rotate(-22)" fill="none" stroke="#f5d0fe" strokeWidth="1.6" />
              <circle cx="-5" cy="-6" r="4" fill="#fff" opacity="0.3" />
              {/* Nóng rực ngay khi kiếm vào bao */}
              <circle r="17" fill="#fdf4ff" opacity="0">
                <animate attributeName="opacity" values="0;0.9" begin="2.74s" dur="0.12s" fill="freeze" />
              </circle>
            </g>
          </Grow>
        </g>
      </>
    )
  // Tia sáng chạy dọc lưỡi lúc thủ thế (tay -55°, thân xoay như act-duel-body 9.8%)
  const shineA = bodyAt(rotAround(raisedPoint(ANCHORS.blade.g), -55), -4, 1, -6, 0.88, 1)
  const shineB = bodyAt(rotAround(raisedPoint(ANCHORS.blade.t), -55), -4, 1, -6, 0.88, 1)
  const [mx, my] = along(3.5)
  const [ex, ey] = along(45)
  const sheath = `M${mx} ${my} L${ex} ${ey}`
  return (
    <>
      <defs>
        <radialGradient id="act-duel-core">
          <stop offset="0" stopColor="#fff" />
          <stop offset="0.3" stopColor="#f5d0fe" stopOpacity="0.95" />
          <stop offset="0.65" stopColor="#a855f7" stopOpacity="0.5" />
          <stop offset="1" stopColor="#7e22ce" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle r="2.2" fill="#fff" opacity="0">
        <animateMotion path={`M${pt(shineA)} L${pt(shineB)}`} begin="0.38s" dur="0.2s" fill="freeze" />
        <Fade begin={0.38} dur={0.22} hold={0.6} />
      </circle>
      {/* Combo 8 nhát: vệt chém đan chéo qua hành tinh, đổi chiều liên tục */}
      {DUEL_BEATS.map((b, i) => (
        <Slash key={b} cx={px + ((i % 3) - 1) * 3} cy={py + ((i % 2) * 2 - 1) * 2} angle={DUEL_CUTS[i] + (i % 2 ? 180 : 0)} begin={b} len={i === 7 ? 96 : 76} w={i === 7 ? 6.5 : 5} />
      ))}
      {!lite &&
        DUEL_BEATS.map((b, i) => (
          <Burst key={b} cx={px} cy={py} n={3} dist={16} begin={b + 0.03} dur={0.35} offset={DUEL_CUTS[i] + 60}>
            <circle r="1.1" fill="#f5d0fe" />
          </Burst>
        ))}
      {/* Bao kiếm tinh thể hiện bên hông → kiếm trượt vào → "cạch" → tan */}
      <g opacity="0">
        <Show begin={1.85} out={3.6} dur={0.25} outDur={0.3} />
        <path d={sheath} stroke="#0b0a1a" strokeWidth="7.6" />
        <path d={sheath} stroke="#2e1065" strokeWidth="5.4" />
        <path d={sheath} stroke="#c084fc" strokeWidth="0.8" opacity="0.9" />
        <path d={`M${pt(along(2.6))} L${pt(along(6))}`} stroke="#e2e8f0" strokeWidth="9" />
        <path d={`M${pt(along(41.5))} L${pt(along(45))}`} stroke="#e2e8f0" strokeWidth="8" />
        <circle cx={ex} cy={ey} r="2.4" fill="#a855f7" stroke="#f5d0fe" strokeWidth="0.7" />
        <path d={starPath(...along(24), 2)} fill="#f5d0fe" />
        <path d={sheath} stroke="#fff" strokeWidth="2" pathLength="100" strokeDasharray="0 100" opacity="0">
          <animate attributeName="stroke-dasharray" values="0 100;100 0" begin="1.85s" dur="0.25s" fill="freeze" />
          <animate attributeName="opacity" values="0;1;0" begin="1.85s" dur="0.45s" fill="freeze" />
        </path>
      </g>
      <Blast cx={along(4)[0]} cy={along(4)[1]} from={1.5} to={9} begin={2.74} grow={0.1} dur={0.25} color="#fff" />
      <Ring cx={along(4)[0]} cy={along(4)[1]} from={2} to={15} begin={2.75} dur={0.32} color="#f5d0fe" width={1.2} />
      {[10, 24, 38].map((k, i) => (
        <path key={k} d={sparkle(...along(k), 3)} fill="#f5d0fe" opacity="0">
          <Fade begin={3.6 + i * 0.06} dur={0.5} />
        </path>
      ))}
      {/* ĐẠI BÙNG NỔ: pháo hoa tinh hệ phủ gần hết sân */}
      <StageFlash box={box} cx={px + 20} cy={py + 10} begin={DUEL_BOOM} color="#fdf4ff" peak={0.55} dur={0.42} />
      <Blast cx={px} cy={py} from={4} to={98} begin={DUEL_BOOM} grow={0.45} dur={1.1} fill="url(#act-duel-core)" />
      <Blast cx={px} cy={py} from={2} to={46} begin={DUEL_BOOM} grow={0.2} dur={0.5} color="#fff" />
      <Flare cx={px} cy={py} r={72} begin={DUEL_BOOM} dur={0.6} rot={12} />
      {!lite && <Flare cx={px} cy={py} r={44} begin={DUEL_BOOM + 0.05} dur={0.55} rot={57} fill="#f5d0fe" />}
      <Ring cx={px} cy={py} from={8} to={112} begin={DUEL_BOOM} dur={0.9} color="#f5d0fe" width={3} boom />
      <Ring cx={px} cy={py} from={6} to={92} begin={DUEL_BOOM + 0.08} dur={0.9} color="#a855f7" width={2.2} boom />
      {!lite && <Ring cx={px} cy={py} from={14} to={118} begin={DUEL_BOOM + 0.18} dur={1} color="#67e8f9" width={1.2} ry={0.85} boom />}
      <Burst cx={px} cy={py} n={lite ? 7 : 14} dist={112} begin={DUEL_BOOM + 0.02} dur={1.3}>
        {(i, n = lite ? 7 : 14) => <path d={CRYSTAL} transform={`rotate(${(360 / n) * i + 90}) scale(1.7)`} fill={['#f5d0fe', '#a855f7', '#fff'][i % 3]} />}
      </Burst>
      <Burst cx={px} cy={py} n={lite ? 8 : 18} dist={62} begin={DUEL_BOOM + 0.05} dur={1.1} offset={10}>
        {(i) => <circle r={i % 2 ? 0.9 : 1.4} fill={i % 3 ? '#f5d0fe' : '#fff'} />}
      </Burst>
      {!lite && (
        <>
          <Firework cx={px - 26} cy={py - 46} begin={3.2} color="#f0abfc" />
          <Firework cx={px + 42} cy={py - 58} begin={3.42} color="#67e8f9" />
          <Firework cx={px - 44} cy={py + 18} begin={3.62} color="#fde68a" n={8} dist={20} />
        </>
      )}
      {[
        [px + 30, py - 20],
        [px - 30, py - 30],
        [px + 6, py + 34],
        [px + 52, py + 12],
      ]
        .slice(0, lite ? 2 : 4)
        .map(([x, y], i) => (
          <path key={i} d={sparkle(f1(x), f1(y), 3)} fill={i % 2 ? '#f5d0fe' : '#fff'} opacity="0">
            <Fade begin={3.3 + i * 0.18} dur={0.8} />
          </path>
        ))}
    </>
  )
}

// ================= Pháp Sư Sao — Hiếm ⭐⭐⭐ (5s, sân 2×): khởi phép → năng lượng hình thành → triệu hồi → điều khiển → ra lệnh → phá huỷ =================
// Khớp keyframes act-summon-* (panda-act.css):
//  0–0.5 nhắm mắt niệm chú, bay lên, vung trượng; vòng phép dưới chân · 0.5–1.45 ấn chú xoay ở Q, hạt sáng hút về, tay phải khuấy
//  · 1.45 mở mắt — hành tinh bung ra · 1.75–3.15 trượng dẫn hành tinh bay vòng lên đỉnh đầu (mắt dõi theo), lớn dần
//  · 3.2–3.92 trừng mắt ra lệnh: chĩa trượng, giơ nắm tay; ấn lục giác quanh hành tinh, tia sáng dồn vào, hành tinh nén lại rung bần bật
//  · 3.95 nổ nhiều lớp (chớp sân, lõi trắng, ấn phép bung to, vòng vàng / tím / trắng, sao vỡ, tia loé) · 4–5 mưa bụi sao, mỉm cười, về idle
const SUM_Q = [-12, -6] // nơi triệu hồi (trên trái)
const SUM_T = [58, -36] // trên đỉnh đầu: nơi ra lệnh + nổ
const SUM_BOOM = 3.95
const STAFF_ORB = (() => {
  const [x, y] = raisedPoint(ANCHORS.staffHead)
  return [x, y - 2.5]
})()
// Đầu trượng khi tay xoay deg (act-summon-arm) và cả người ở tư thế body (act-summon-body)
const staffAt = (deg, ...body) => bodyAt(rotAround(STAFF_ORB, deg), ...body)
function StarSummon({ lite, part, box }) {
  const [qx, qy] = SUM_Q
  const [tx, ty] = SUM_T
  if (part === 'back')
    return (
      <>
        <defs>
          <radialGradient id="act-sum-aura">
            <stop offset="0" stopColor="#fde68a" stopOpacity="0.6" />
            <stop offset="1" stopColor="#a855f7" stopOpacity="0" />
          </radialGradient>
        </defs>
        {/* Vòng phép dưới chân (nằm nghiêng) xoay, lớn dần */}
        <g transform="translate(60 116) scale(1 0.32)" opacity="0">
          <Show begin={0.05} out={4.5} dur={0.3} outDur={0.5} />
          <Grow cx={0} cy={0} begin={0.05} dur={0.5} to={1.3}>
            <g fill="none" stroke="#fde68a">
              <Spin dur={5} to={260} />
              <circle r="52" strokeWidth="2" />
              <circle r="44" strokeWidth="1.2" strokeDasharray="3 4" />
              <polygon points={triPts(40, 0)} strokeWidth="1.4" />
              <polygon points={triPts(40, 60)} strokeWidth="1.4" />
            </g>
          </Grow>
        </g>
        {!lite && (
          <g transform="translate(60 64)" opacity="0">
            <Show begin={0.3} out={4.3} peak={0.4} />
            <g fill="none" stroke="#c4b5fd">
              <Spin dur={5} from={0} to={-160} />
              <circle r="58" strokeWidth="0.9" />
              <polygon points={triPts(58, 30)} strokeWidth="0.7" />
            </g>
          </g>
        )}
        {/* Hào quang sau lưng khi ra lệnh */}
        <circle cx="60" cy="66" r="56" fill="url(#act-sum-aura)" opacity="0">
          <animate attributeName="opacity" values="0;0.9;0.7;0" keyTimes="0;0.3;0.75;1" begin="3.2s" dur="1.1s" fill="freeze" />
        </circle>
      </>
    )
  const beamFrom = staffAt(46, 0, -7, 3, 1.04)
  const castFrom = staffAt(2, 0, -3.5, -1)
  const flight = `M${qx} ${qy} C${qx - 6} ${qy - 40} ${tx - 50} ${ty - 22} ${tx} ${ty}`
  return (
    <>
      <defs>
        <radialGradient id="act-planet" cx="0.35" cy="0.3" r="0.8">
          <stop offset="0" stopColor="#fef9c3" />
          <stop offset="0.5" stopColor="#c084fc" />
          <stop offset="1" stopColor="#4338ca" />
        </radialGradient>
        <radialGradient id="act-staff">
          <stop offset="0" stopColor="#fef9c3" stopOpacity="0.95" />
          <stop offset="1" stopColor="#facc15" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="act-sum-core">
          <stop offset="0" stopColor="#fff" />
          <stop offset="0.3" stopColor="#fef9c3" stopOpacity="0.95" />
          <stop offset="0.65" stopColor="#facc15" stopOpacity="0.45" />
          <stop offset="1" stopColor="#a855f7" stopOpacity="0" />
        </radialGradient>
        <clipPath id="act-sum-clip">
          <circle r="18" />
        </clipPath>
      </defs>
      {/* 1 Năng lượng hình thành: ấn chú xoay ở Q, hạt sáng hút về, sợi sáng nối đầu trượng */}
      <Grow cx={qx} cy={qy} begin={0.5} dur={0.4} out={1.45} outDur={0.15}>
        <g fill="none">
          <Spin dur={0.95} to={240} begin={0.5} />
          <circle r="21" stroke="#fde68a" strokeWidth="1.3" strokeDasharray="2 3" />
          <circle r="15" stroke="#c4b5fd" strokeWidth="0.8" />
          <polygon points={triPts(15, 0)} stroke="#fde68a" strokeWidth="0.8" />
          {[0, 60, 120, 180, 240, 300].map((d) => (
            <path key={d} d={sparkle(f1(18 * Math.cos(rad(d))), f1(18 * Math.sin(rad(d))), 1.6)} fill="#fef9c3" />
          ))}
        </g>
      </Grow>
      <Converge cx={qx} cy={qy} n={lite ? 5 : 10} dist={56} begin={0.55} dur={0.75}>
        <path d={sparkle(0, 0, 2)} fill="#fde68a" />
      </Converge>
      {!lite && (
        <Converge cx={qx} cy={qy} n={8} dist={42} begin={0.85} dur={0.55}>
          <circle r="1.2" fill="#e9d5ff" />
        </Converge>
      )}
      <circle cx={qx} cy={qy} r="3" fill="url(#act-staff)" opacity="0">
        <Show begin={0.55} out={1.5} outDur={0.1} />
        <animate attributeName="r" values="3;8;6;11;9;14" begin="0.55s" dur="0.9s" fill="freeze" />
      </circle>
      <path d={`M${pt(castFrom)} L${qx} ${qy}`} stroke="#fde68a" strokeWidth="1.2" opacity="0">
        <animate attributeName="opacity" values="0;0.8;0.3;0.9;0.4;0.8;0" begin="0.6s" dur="0.85s" fill="freeze" />
      </path>
      {/* 2 Triệu hồi: bung sáng, hành tinh hiện ra */}
      <Blast cx={qx} cy={qy} from={2} to={30} begin={1.45} grow={0.25} dur={0.45} fill="url(#act-sum-core)" />
      <Ring cx={qx} cy={qy} from={6} to={46} begin={1.45} dur={0.6} color="#fde68a" width={2} />
      <Burst cx={qx} cy={qy} n={lite ? 5 : 8} dist={28} begin={1.47} dur={0.6}>
        <path d={starPath(0, 0, 1.8)} fill="#fde68a" />
      </Burst>
      {/* 3 Điều khiển: hành tinh theo trượng bay vòng lên đỉnh đầu, lớn dần · 4 ra lệnh: nén lại, rung, nóng trắng */}
      <g opacity="0">
        <animate attributeName="opacity" values="0;1" begin="1.45s" dur="0.05s" fill="freeze" />
        <animate attributeName="opacity" values="1;0" begin={s(SUM_BOOM)} dur="0.05s" fill="freeze" />
        <g>
          <animateMotion path={flight} begin="1.45s" dur="1.7s" fill="freeze" calcMode="spline" keyPoints="0;0;1" keyTimes="0;0.18;1" keySplines="0 0 1 1;0.45 0 0.3 1" />
          <g>
            <animateTransform attributeName="transform" type="scale" values="1;1.35" begin="1.75s" dur="1.4s" fill="freeze" />
            <g>
              <animateTransform attributeName="transform" type="scale" values="1;0.78" begin="3.3s" dur="0.62s" fill="freeze" />
              <g>
                <animateTransform attributeName="transform" type="translate" values="0 0;1.5 -1;-1.5 1;1 1.5;-1 -1.5;0 0" begin="3.3s" dur="0.16s" repeatCount="4" fill="freeze" />
                <Grow cx={0} cy={0} begin={1.45} dur={0.4}>
                  <circle r="30" fill="url(#act-staff)" opacity="0.45" />
                  <ellipse rx="32" ry="8" transform="rotate(-18)" fill="none" stroke="#fde68a" strokeWidth="1.5" opacity="0.75" />
                  <circle r="18" fill="url(#act-planet)" stroke="#fef3c7" strokeWidth="0.7" />
                  <g clipPath="url(#act-sum-clip)">
                    <path d="M-18 -4 Q0 -9 18 -4" fill="none" stroke="#e9d5ff" strokeWidth="1.8" opacity="0.5" />
                    <path d="M-18 7 Q0 2 18 7" fill="none" stroke="#4338ca" strokeWidth="2.4" opacity="0.5" />
                    {/* Vết nứt sáng khi bị nén */}
                    <path d="M-4 -18 L1 -6 L-3 2 L3 18 M18 -5 L6 -1 L-2 2 M-18 4 L-7 6" fill="none" stroke="#fff" strokeWidth="1.1" opacity="0">
                      <animate attributeName="opacity" values="0;1" begin="3.55s" dur="0.15s" fill="freeze" />
                    </path>
                  </g>
                  <path d="M-32 0 A32 8 0 0 0 32 0" transform="rotate(-18)" fill="none" stroke="#fde68a" strokeWidth="1.8" />
                  <circle cx="-6" cy="-7" r="4.5" fill="#fff" opacity="0.35" />
                  <circle r="2.6" fill="#fef9c3">
                    <animateMotion path={ellipsePath(0, 0, 36, 11)} begin="1.6s" dur="1.1s" repeatCount="2" fill="freeze" />
                  </circle>
                  <circle r="18" fill="#fff" opacity="0">
                    <animate attributeName="opacity" values="0;0.85" begin="3.3s" dur="0.62s" fill="freeze" />
                  </circle>
                </Grow>
              </g>
            </g>
          </g>
        </g>
      </g>
      {!lite &&
        [0.12, 0.24].map((d, i) => (
          <g key={d} opacity="0">
            <Show begin={1.8 + d} out={3.2} />
            <path d={starPath(0, 0, i ? 1.8 : 2.4)} fill="#fde68a">
              <animateMotion path={flight} begin={s(1.75 + d)} dur="1.4s" fill="freeze" calcMode="spline" keyTimes="0;1" keySplines="0.45 0 0.3 1" />
            </path>
          </g>
        ))}
      {/* 4 Ra lệnh: ấn lục giác xoay nhanh quanh hành tinh, tia sáng dồn vào, sợi sáng từ trượng */}
      <g opacity="0">
        <Show begin={3.22} out={SUM_BOOM} dur={0.2} outDur={0.05} />
        <Grow cx={tx} cy={ty} begin={3.22} dur={0.3}>
          <g fill="none">
            <Spin dur={0.73} to={300} begin={3.22} />
            <circle r="38" stroke="#fde68a" strokeWidth="1.6" />
            <circle r="33" stroke="#c4b5fd" strokeWidth="0.9" strokeDasharray="2 3" />
            <polygon points={triPts(33, 0)} stroke="#fde68a" strokeWidth="1.2" />
            <polygon points={triPts(33, 60)} stroke="#fde68a" strokeWidth="1.2" />
          </g>
        </Grow>
      </g>
      {Array.from({ length: lite ? 4 : 8 }, (_, i) => {
        const a = rad((360 / (lite ? 4 : 8)) * i + 22)
        const d = `M${f1(tx + Math.cos(a) * 80)} ${f1(ty + Math.sin(a) * 80)} L${f1(tx + Math.cos(a) * 24)} ${f1(ty + Math.sin(a) * 24)}`
        return (
          <path key={i} d={d} stroke={i % 2 ? '#e9d5ff' : '#fde68a'} strokeWidth="1.4" strokeLinecap="round" pathLength="100" strokeDasharray="18 100" strokeDashoffset="18" opacity="0">
            <Show begin={3.3} out={3.9} dur={0.1} outDur={0.05} />
            <animate attributeName="stroke-dashoffset" values="18;-100" begin={s(3.3 + (i % 2) * 0.12)} dur="0.36s" repeatCount="2" />
          </path>
        )
      })}
      <g opacity="0">
        <animate attributeName="opacity" values="0;0.9;0.4;1;0.5;1;0.6;1" begin="3.28s" dur="0.66s" fill="freeze" />
        <animate attributeName="opacity" values="1;0" begin={s(SUM_BOOM)} dur="0.05s" fill="freeze" />
        <path d={`M${pt(beamFrom)} L${tx} ${ty}`} stroke="#fde68a" strokeWidth="3.4" opacity="0.6" strokeLinecap="round" />
        <path d={`M${pt(beamFrom)} L${tx} ${ty}`} stroke="#fff" strokeWidth="1.1" strokeLinecap="round" />
        <path d={sparkle(...beamFrom, 5)} fill="#fff" />
      </g>
      {/* 5 PHÁ HUỶ: nhiều lớp, ấn phép bung to là dấu hiệu riêng của pháp sư */}
      <StageFlash box={box} cx={tx} cy={ty + 30} begin={SUM_BOOM} color="#fef9c3" peak={0.55} dur={0.42} />
      <Blast cx={tx} cy={ty} from={6} to={96} begin={SUM_BOOM} grow={0.45} dur={1.1} fill="url(#act-sum-core)" />
      <Blast cx={tx} cy={ty} from={3} to={44} begin={SUM_BOOM} grow={0.22} dur={0.5} color="#fff" />
      <g transform={`translate(${tx} ${ty})`} opacity="0">
        <animate attributeName="opacity" values="0;0.95;0" keyTimes="0;0.15;1" begin={s(SUM_BOOM)} dur="0.75s" fill="freeze" />
        <g fill="none" stroke="#fde68a" strokeWidth="0.9">
          <animateTransform attributeName="transform" type="scale" values="1;3.4" begin={s(SUM_BOOM)} dur="0.75s" fill="freeze" calcMode="spline" keyTimes="0;1" keySplines="0.1 0.7 0.3 1" />
          <circle r="38" />
          <polygon points={triPts(33, 0)} />
          <polygon points={triPts(33, 60)} />
        </g>
      </g>
      <Flare cx={tx} cy={ty} r={64} begin={SUM_BOOM} dur={0.6} fill="#fef9c3" />
      <Ring cx={tx} cy={ty} from={10} to={118} begin={SUM_BOOM} dur={0.9} color="#fde68a" width={3} boom />
      <Ring cx={tx} cy={ty} from={8} to={96} begin={SUM_BOOM + 0.08} dur={0.9} color="#a855f7" width={2.2} boom />
      {!lite && <Ring cx={tx} cy={ty} from={20} to={128} begin={SUM_BOOM + 0.17} dur={1} color="#fff" width={1.2} boom />}
      <Burst cx={tx} cy={ty} n={lite ? 7 : 14} dist={104} begin={SUM_BOOM + 0.02} dur={1.3}>
        {(i) => <path d={starPath(0, 0, i % 2 ? 2 : 2.8)} fill={['#fde68a', '#e9d5ff', '#fff'][i % 3]} />}
      </Burst>
      {!lite && (
        <Burst cx={tx} cy={ty} n={10} dist={56} begin={SUM_BOOM + 0.05} dur={0.9} offset={18}>
          <path d={sparkle(0, 0, 2)} fill="#fff" />
        </Burst>
      )}
      {/* Mưa bụi sao rơi xuống */}
      {Array.from({ length: lite ? 6 : 14 }, (_, i) => {
        const x = tx - 75 + ((i * 53) % 150)
        const y = ty - 30 + ((i * 29) % 50)
        const b = SUM_BOOM + 0.1 + (i % 5) * 0.07
        return (
          <g key={i} transform={`translate(${x} ${y})`}>
            <g opacity="0">
              <path d={starPath(0, 0, i % 3 ? 1.4 : 2)} fill={i % 2 ? '#fde68a' : '#fff'} />
              <animateMotion path={`M0 0 l${i % 2 ? 6 : -6} ${70 + (i % 4) * 12}`} begin={s(b)} dur="0.95s" fill="freeze" />
              <Fade begin={b} dur={0.95} hold={0.6} />
            </g>
          </g>
        )
      })}
    </>
  )
}

// ================= Phi Hành Gia — Cực phẩm (7s): cảm giác một chuyến bay thật — không gian phản ứng theo từng chuyển động của tàu =================
// Khớp keyframes act-trip-* (panda-act.css) và kịch bản tiếng 'space-trip' (lib/pandaSfx.js), mốc trong TR:
//  0.15 hạt sáng tụ lại, không gian sau gấu méo nhẹ · 0.4 viền hologram vẽ thân tàu · 0.75 tàu hiện hẳn, xung sáng chạy dọc thân,
//    đèn bật; gấu quay sang nhìn (mắt tròn) · 1.15 cửa mở: ánh sáng cabin hắt lên gấu, hơi nước mỏng · gấu bị luồng khí đẩy nhẹ,
//    nhún, 1.7 nhảy vào · 2.0 cửa đóng, đèn chuyển vàng, đường năng lượng sáng dần
//  · 2.15–2.85 NẠP: quầng sáng dưới tàu tăng dần, tàu rung mạnh dần, hạt dưới tàu bị đẩy ra, vòng gió lan, sao nền rung
//  · 2.85 PHÓNG: chớp, sóng chấn động, hạt bắn ra, sao bị đẩy; bay lên → tăng tốc (tàu kéo dài, vệt phản lực) → 3.05 sao kéo thành vệt
//    → 3.3 warp (nền sâu hơn, tinh vân, hành tinh lướt qua) → 3.4 tàu thu thành một điểm sáng, loé; vệt sao chạy thêm rồi tắt
//  · 3.95 điểm sáng xa (trên trái) sáng dần, vệt sao lao về phía người xem, không gian co lại · 4.3 loé, tàu lao ra (vệt warp, nghiêng),
//    vượt quá chỗ đáp rồi chỉnh lại · 4.8 lơ lửng: thruster thổi hạt sang hai bên, vòng năng lượng · 5.1 chạm đất: nảy nhẹ, bụi bung,
//    vài hạt bay lên rồi rơi, động cơ lịm · 5.25 cửa mở, 5.35 gấu bước ra lảo đảo · 5.85 quay lại nhìn tàu, vẫy tay; tàu sáng lên,
//    tan thành bụi sao hút về một điểm, loé 6.4 · 6.45 ngôi sao nhỏ rơi xuống, gấu ngước nhìn · 7 về idle
const TR = { holo: 0.4, ship: 0.75, door: 1.15, close: 2.0, charge: 2.15, launch: 2.85, streak: 3.05, warp: 3.3, gone: 3.4, ping: 3.95, back: 4.3, hover: 4.8, land: 5.1, open: 5.25, bye: 5.85, star: 6.45 }
const TRIP_GO = [100, 70] // tàu đi: bên phải gấu (đơn vị gấu, tàu phóng 1,3)
const TRIP_HOME = [12, 70] // tàu về: đáp bên trái
const TRIP_FAR = [-40, -85] // điểm sáng ở xa — tàu lao ra từ đây
const TRIP_GROUND = 119
const TRIP_UP = -125 // tàu đi bay lên tới đây (đơn vị trong tàu) rồi thu thành điểm sáng
const SHIP_K = 1.3
const HULL = 'M0 -32 C12 -22 14 2 12 32 H-12 C-14 2 -12 -22 0 -32 Z'
const FINS = 'M-12 22 L-20 34 L-10 32 Z M12 22 L20 34 L10 32 Z'
const ENERGY = 'M-8.5 -14 Q-10.5 6 -9.5 29 M8.5 -14 Q10.5 6 9.5 29'
const SHIP_LIGHTS = [
  [0, -25],
  [-16, 30.5],
  [16, 30.5],
]
// Điểm trên viền tàu (đơn vị trong tàu) — nơi tàu tan thành bụi sao
const SHIP_OUTLINE = [[0, -32], [9, -20], [12.5, 0], [12, 30], [-12, 30], [-12.5, 0], [-9, -20], [-20, 34], [20, 34], [0, 37]]
const TRIP_STARS = Array.from({ length: 18 }, (_, i) => [-85 + ((i * 53) % 290), -135 + ((i * 71) % 205)])

function Rocket({ face, children }) {
  return (
    <g strokeLinejoin="round">
      <path d={FINS} fill="#a855f7" stroke={INK} strokeWidth="1.1" />
      <path d={HULL} fill="url(#act-hull)" stroke={INK} strokeWidth="1.3" />
      <path d="M-8 -20 Q0 -28 8 -20" fill="none" stroke="#f472b6" strokeWidth="2" />
      <circle cy="-6" r="6.2" fill="#0e7490" stroke="#94a3b8" strokeWidth="1.4" />
      <path d="M-3 -9 q2 -2 4.5 -1.2" fill="none" stroke="#fff" strokeWidth="0.9" opacity="0.7" />
      {face}
      <path d="M-7 32 H7 L5 37 H-5 Z" fill="#475569" stroke={INK} strokeWidth="1" />
      {children}
    </g>
  )
}
// Mặt gấu nhỏ nhìn qua cửa sổ tàu
const WINDOW_PANDA = (
  <g>
    <circle cx="-3.4" cy="-10" r="1.8" fill={INK} />
    <circle cx="3.4" cy="-10" r="1.8" fill={INK} />
    <circle cy="-6" r="4.4" fill="#fff" />
    <circle cx="-1.6" cy="-6.4" r="1.1" fill={INK} />
    <circle cx="1.6" cy="-6.4" r="1.1" fill={INK} />
    <ellipse cy="-4.6" rx="0.8" ry="0.5" fill={INK} />
  </g>
)
function TripDefs() {
  return (
    <defs>
      <linearGradient id="act-hull" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stopColor="#cbd5e1" />
        <stop offset="0.45" stopColor="#ffffff" />
        <stop offset="1" stopColor="#cbd5e1" />
      </linearGradient>
      <clipPath id="act-hull-clip">
        <path d={HULL} />
      </clipPath>
      <linearGradient id="act-pulse" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#fff" stopOpacity="0" />
        <stop offset="0.5" stopColor="#fff" />
        <stop offset="1" stopColor="#a5f3fc" stopOpacity="0" />
      </linearGradient>
      <linearGradient id="act-thrust-core" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#fff" />
        <stop offset="0.5" stopColor="#a5f3fc" />
        <stop offset="1" stopColor="#38bdf8" stopOpacity="0" />
      </linearGradient>
      <linearGradient id="act-thrust-glow" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#c4b5fd" stopOpacity="0.9" />
        <stop offset="0.5" stopColor="#a855f7" stopOpacity="0.5" />
        <stop offset="1" stopColor="#a855f7" stopOpacity="0" />
      </linearGradient>
      <radialGradient id="act-engine">
        <stop offset="0" stopColor="#fff" />
        <stop offset="0.45" stopColor="#67e8f9" stopOpacity="0.8" />
        <stop offset="1" stopColor="#67e8f9" stopOpacity="0" />
      </radialGradient>
      <radialGradient id="act-ground">
        <stop offset="0" stopColor="#e0f2fe" stopOpacity="0.95" />
        <stop offset="0.5" stopColor="#38bdf8" stopOpacity="0.5" />
        <stop offset="1" stopColor="#38bdf8" stopOpacity="0" />
      </radialGradient>
      <linearGradient id="act-cabin" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#fffbeb" />
        <stop offset="1" stopColor="#fcd34d" />
      </linearGradient>
      {['l', 'r'].map((d) => (
        <linearGradient key={d} id={`act-spill-${d}`} x1={d === 'l' ? 1 : 0} y1="0" x2={d === 'l' ? 0 : 1} y2="0">
          <stop offset="0" stopColor="#fef3c7" stopOpacity="0.9" />
          <stop offset="1" stopColor="#fef3c7" stopOpacity="0" />
        </linearGradient>
      ))}
    </defs>
  )
}
// Phản lực dưới miệng ống: lõi trắng xanh + quầng tím mềm, rung liên tục; len = độ dài theo thời gian [[giây, hệ số]...]
function Thrust({ on, off, len }) {
  const t0 = len[0][0]
  const span = len[len.length - 1][0] - t0
  return (
    <g transform="translate(0 37)">
      <g opacity="0">
        <Show begin={on} out={off} dur={0.1} outDur={0.25} />
        <g>
          <animateTransform
            attributeName="transform"
            type="scale"
            values={len.map(([, k]) => `1 ${k}`).join(';')}
            keyTimes={len.map(([t]) => +((t - t0) / span).toFixed(3)).join(';')}
            begin={s(t0)}
            dur={s(span)}
            fill="freeze"
          />
          <path d="M-8 0 Q0 30 8 0 Z" fill="url(#act-thrust-glow)" />
          <path d="M-4.2 0 Q0 17 4.2 0 Z" fill="url(#act-thrust-core)">
            <animateTransform attributeName="transform" type="scale" values="1 0.75;1 1.15;1 0.85;1 1.2;1 0.75" begin={s(on)} dur="0.24s" repeatCount={Math.ceil((off - on) / 0.24)} />
          </path>
        </g>
      </g>
    </g>
  )
}
// Quầng sáng của động cơ ngay miệng ống; keys = [[giây, rx, opacity]...]
function EngineGlow({ keys }) {
  const t0 = keys[0][0]
  const span = keys[keys.length - 1][0] - t0
  const kt = keys.map(([t]) => +((t - t0) / span).toFixed(3)).join(';')
  const anim = (attr, f) => <animate attributeName={attr} values={keys.map(f).join(';')} keyTimes={kt} begin={s(t0)} dur={s(span)} fill="freeze" />
  return (
    <ellipse cy="40" rx="3" ry="2" fill="url(#act-engine)" opacity="0">
      {anim('rx', (k) => k[1])}
      {anim('ry', (k) => f1(k[1] * 0.5))}
      {anim('opacity', (k) => k[2])}
    </ellipse>
  )
}
// Đèn thân tàu: tắt → bật xanh lần lượt (on) → nháy vàng = chuẩn bị phóng (ready)
function ShipLights({ on, ready }) {
  return SHIP_LIGHTS.map(([x, y], i) => (
    <circle key={i} cx={x} cy={y} r="1.4" fill="#475569" stroke={INK} strokeWidth="0.5">
      <animate attributeName="fill" values="#475569;#67e8f9" begin={s(on + i * 0.08)} dur="0.08s" fill="freeze" />
      {ready != null && <animate attributeName="fill" values="#fbbf24;#fff7ed;#fbbf24" begin={s(ready + i * 0.05)} dur="0.24s" repeatCount="3" fill="freeze" />}
    </circle>
  ))
}
// Xung sáng chạy dọc thân tàu từ đuôi lên mũi
function HullPulse({ begin }) {
  return (
    <g clipPath="url(#act-hull-clip)">
      <rect x="-15" y="30" width="30" height="9" fill="url(#act-pulse)" opacity="0">
        <animate attributeName="y" values="30;-42" begin={s(begin)} dur="0.42s" fill="freeze" />
        <Fade begin={begin} dur={0.42} peak={0.9} hold={0.75} />
      </rect>
    </g>
  )
}
// Cửa tàu: ô cabin sáng ấm phía sau tấm cửa trượt sang phải
function Hatch({ open, close }) {
  return (
    <>
      <rect x="-6" y="8" width="12" height="18" rx="3" fill="url(#act-cabin)" opacity="0">
        <animate attributeName="opacity" values="0;1" begin={s(open)} dur="0.15s" fill="freeze" />
        {close != null && <animate attributeName="opacity" values="1;0" begin={s(close)} dur="0.18s" fill="freeze" />}
      </rect>
      <rect x="-6" y="8" width="12" height="18" rx="3" fill="#e2e8f0" stroke={INK} strokeWidth="1">
        <animateTransform attributeName="transform" type="translate" values="0 0;11 0" begin={s(open)} dur="0.2s" fill="freeze" />
        {close != null && <animateTransform attributeName="transform" type="translate" values="11 0;0 0" begin={s(close)} dur="0.18s" fill="freeze" />}
      </rect>
    </>
  )
}
// Ánh sáng cabin hắt ra cửa phủ lên gấu (dir -1: sang trái, 1: sang phải) + hơi nước mỏng thoát ra
function CabinSpill({ dir, begin, out, lite }) {
  const x = 6 * dir
  const far = 52 * dir
  return (
    <>
      <polygon points={`${x},8 ${x},26 ${far},52 ${far},-30`} fill={`url(#act-spill-${dir < 0 ? 'l' : 'r'})`} opacity="0">
        <Show begin={begin + 0.05} out={out} dur={0.3} outDur={0.3} peak={0.55} />
      </polygon>
      {!lite &&
        [0, 1, 2, 3].map((i) => {
          const t = begin + 0.05 + i * 0.12
          return (
            <circle key={i} cx={x} cy={22 - i * 3} r="1.5" fill="#f1f5f9" opacity="0">
              <animate attributeName="r" values="1.5;5.5" begin={s(t)} dur="0.9s" fill="freeze" />
              <animateMotion path={`M0 0 q${dir * 8} -2 ${dir * (14 + i * 4)} ${-6 - i * 2}`} begin={s(t)} dur="0.9s" fill="freeze" />
              <Fade begin={t} dur={0.9} peak={0.4} hold={0.4} />
            </circle>
          )
        })}
    </>
  )
}
// Hạt sát mặt đất bị luồng phản lực thổi sang hai bên
function GroundPush({ cx, n, begin, span, dist, dur = 0.5, lift = 3, r = 1, color = '#e0f2fe' }) {
  return Array.from({ length: n }, (_, i) => {
    const dir = i % 2 ? 1 : -1
    const d = f1(dist * (0.55 + ((i * 37) % 45) / 100))
    const t = begin + (span * i) / n
    return (
      <circle key={i} cx={cx + dir * 3} cy={TRIP_GROUND - (i % 3)} r={r} fill={color} opacity="0">
        <animateMotion path={`M0 0 Q${f1(dir * d * 0.5)} ${-lift - (i % 3)} ${dir * d} ${-(i % 2)}`} begin={s(t)} dur={s(dur)} fill="freeze" calcMode="spline" keyPoints="0;1" keyTimes="0;1" keySplines="0.1 0.7 0.3 1" />
        <Fade begin={t} dur={dur} hold={0.55} />
      </circle>
    )
  })
}
// Quầng sáng in xuống mặt đất dưới tàu; keys = [[giây, rx, opacity]...]
function GroundGlow({ cx, keys }) {
  const t0 = keys[0][0]
  const span = keys[keys.length - 1][0] - t0
  const kt = keys.map(([t]) => +((t - t0) / span).toFixed(3)).join(';')
  const anim = (attr, f) => <animate attributeName={attr} values={keys.map(f).join(';')} keyTimes={kt} begin={s(t0)} dur={s(span)} fill="freeze" />
  return (
    <ellipse cx={cx} cy={TRIP_GROUND} rx="4" ry="1.5" fill="url(#act-ground)" opacity="0">
      {anim('rx', (k) => k[1])}
      {anim('ry', (k) => f1(k[1] * 0.2))}
      {anim('opacity', (k) => k[2])}
    </ellipse>
  )
}
// Sao nền: rung khi nạp, bị đẩy khi phóng, kéo thành vệt lao xuống khi tăng tốc / warp, rồi trở lại thành chấm
function TripStar({ x, y, i }) {
  const peak = i % 3 ? 0.55 : 0.9
  const [ux, uy] = unit([TRIP_GO[0], TRIP_GROUND], [x, y])
  const pushed = `${f1(ux * 5)} ${f1(uy * 5)}`
  const fallen = `${f1(ux * 5)} ${f1(uy * 5 + 95)}`
  const line = (l) => `M${x} ${y} v${l}`
  const reset = TR.ping - 0.02
  return (
    <path d={line(-0.01)} stroke={i % 4 ? '#e0f2fe' : '#c4b5fd'} strokeWidth={i % 3 ? 1.1 : 1.6} strokeLinecap="round" opacity="0">
      <animate attributeName="opacity" values={`0;${peak}`} begin={s(0.25 + (i % 5) * 0.07)} dur="0.4s" fill="freeze" />
      <animateTransform attributeName="transform" type="translate" values="0 0;0.6 -0.4;-0.6 0.3;0.5 0.4;-0.4 -0.3;0 0" begin={s(TR.charge + 0.25)} dur="0.22s" repeatCount="2" />
      <animateTransform attributeName="transform" type="translate" values={`0 0;${pushed}`} begin={s(TR.launch)} dur="0.3s" fill="freeze" calcMode="spline" keyTimes="0;1" keySplines="0.1 0.7 0.3 1" />
      <animateTransform attributeName="transform" type="translate" values={`${pushed};${fallen}`} begin={s(TR.streak)} dur="0.85s" fill="freeze" calcMode="spline" keyTimes="0;1" keySplines="0.55 0 0.85 0.6" />
      <animate attributeName="d" values={[-0.01, -7, -30, -14].map(line).join(';')} keyTimes="0;0.3;0.7;1" begin={s(TR.streak)} dur="0.85s" fill="freeze" />
      <animate attributeName="opacity" values={`${peak};0`} begin={s(3.75)} dur="0.2s" fill="freeze" />
      <animateTransform attributeName="transform" type="translate" values="0 0;0 0" begin={s(reset)} dur="0.01s" fill="freeze" />
      <animate attributeName="d" values={`${line(-0.01)};${line(-0.01)}`} begin={s(reset)} dur="0.01s" fill="freeze" />
      <animate attributeName="opacity" values={`0;${peak}`} begin={s(TR.ping + (i % 5) * 0.05)} dur="0.35s" fill="freeze" />
      <animate attributeName="opacity" values={`${peak};0`} begin={s(6.4)} dur="0.5s" fill="freeze" />
    </path>
  )
}
// Sau lưng gấu: nền không gian, sao, méo không gian lúc triệu hồi, tinh vân / hành tinh khi warp, điểm sáng xa lúc tàu quay về
function TripSky({ lite }) {
  const [gx, gy] = TRIP_GO
  const [fx, fy] = TRIP_FAR
  const nStreak = lite ? 6 : 10
  const spaceT = [0, 0.5, 2.85, 3.3, 3.9, 4.4, 6.3, 6.95]
  return (
    <>
      <defs>
        <radialGradient id="act-trip-space">
          <stop offset="0" stopColor="#0b1030" stopOpacity="0.85" />
          <stop offset="0.6" stopColor="#131b4a" stopOpacity="0.6" />
          <stop offset="1" stopColor="#131b4a" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="act-trip-neb-v">
          <stop offset="0" stopColor="#8b5cf6" stopOpacity="0.55" />
          <stop offset="1" stopColor="#8b5cf6" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="act-trip-neb-b">
          <stop offset="0" stopColor="#38bdf8" stopOpacity="0.5" />
          <stop offset="1" stopColor="#38bdf8" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="act-ping">
          <stop offset="0" stopColor="#fff" />
          <stop offset="0.4" stopColor="#c4b5fd" stopOpacity="0.7" />
          <stop offset="1" stopColor="#c4b5fd" stopOpacity="0" />
        </radialGradient>
      </defs>
      {/* Nền không gian: nhạt lúc đầu, sâu nhất khi warp, nhạt lại khi tàu về */}
      <circle cx="60" cy="0" r="175" fill="url(#act-trip-space)" opacity="0">
        <animate attributeName="opacity" values="0;0.22;0.22;0.6;0.6;0.3;0.3;0" keyTimes={spaceT.map((t) => +(t / 6.95).toFixed(3)).join(';')} begin="0s" dur="6.95s" fill="freeze" />
      </circle>
      {/* Triệu hồi: không gian sau gấu méo nhẹ quanh chỗ tàu sắp hiện */}
      {[0, 1, 2].slice(0, lite ? 1 : 3).map((i) => (
        <ellipse key={i} cx={gx} cy={gy} rx="14" ry="30" fill="none" stroke="#bae6fd" strokeWidth="0.8" opacity="0">
          <animate attributeName="rx" values={[12, 28, 18, 32].map((v) => v + i * 6).join(';')} begin={s(0.2 + i * 0.08)} dur="0.65s" fill="freeze" />
          <animate attributeName="ry" values={[34, 24, 38, 28].map((v) => v + i * 5).join(';')} begin={s(0.2 + i * 0.08)} dur="0.65s" fill="freeze" />
          <Fade begin={0.2 + i * 0.08} dur={0.65} peak={0.35} hold={0.6} />
        </ellipse>
      ))}
      {TRIP_STARS.slice(0, lite ? 10 : 18).map(([x, y], i) => (
        <TripStar key={i} x={x} y={y} i={i} />
      ))}
      {/* Warp: tinh vân thoáng qua, hành tinh xa lướt vụt xuống */}
      <ellipse cx="-30" cy="-70" rx="70" ry="38" fill="url(#act-trip-neb-v)" opacity="0">
        <animateMotion path="M0 0 v70" begin={s(TR.warp - 0.05)} dur="0.6s" fill="freeze" />
        <Fade begin={TR.warp - 0.05} dur={0.6} peak={0.8} hold={0.55} />
      </ellipse>
      {!lite && (
        <ellipse cx="150" cy="-100" rx="55" ry="30" fill="url(#act-trip-neb-b)" opacity="0">
          <animateMotion path="M0 0 v60" begin={s(TR.warp + 0.05)} dur="0.55s" fill="freeze" />
          <Fade begin={TR.warp + 0.05} dur={0.55} peak={0.8} hold={0.5} />
        </ellipse>
      )}
      <g opacity="0">
        <animateMotion path="M190 -150 L130 160" begin={s(TR.warp + 0.05)} dur="0.32s" fill="freeze" />
        <Fade begin={TR.warp + 0.05} dur={0.32} hold={0.7} />
        <circle r="6" fill="#a78bfa" stroke="#ede9fe" strokeWidth="0.6" />
        <ellipse rx="11" ry="2.6" fill="none" stroke="#f0abfc" strokeWidth="1.2" transform="rotate(-20)" />
      </g>
      {!lite && (
        <circle r="3" fill="#7dd3fc" opacity="0">
          <animateMotion path="M-70 -140 L-50 140" begin={s(TR.warp + 0.15)} dur="0.28s" fill="freeze" />
          <Fade begin={TR.warp + 0.15} dur={0.28} hold={0.7} />
        </circle>
      )}
      {/* Trước khi tàu về: điểm sáng xa sáng dần, vệt sao lao về phía người xem, không gian co lại */}
      <circle cx={fx} cy={fy} r="4" fill="url(#act-ping)" opacity="0">
        <animate attributeName="opacity" values="0;0.35;1" keyTimes="0;0.4;1" begin={s(TR.ping)} dur={s(TR.back - TR.ping)} fill="freeze" />
        <animate attributeName="r" values="4;7;12" keyTimes="0;0.4;1" begin={s(TR.ping)} dur={s(TR.back - TR.ping)} fill="freeze" />
        <animate attributeName="r" values="12;30" begin={s(TR.back)} dur="0.15s" fill="freeze" />
        <animate attributeName="opacity" values="1;0" begin={s(TR.back)} dur="0.22s" fill="freeze" />
      </circle>
      <circle cx={fx} cy={fy} r="1" fill="#fff" opacity="0">
        <animate attributeName="opacity" values="0;1" begin={s(TR.ping)} dur={s(TR.back - TR.ping)} fill="freeze" />
        <animate attributeName="r" values="1;2.6" begin={s(TR.ping)} dur={s(TR.back - TR.ping)} fill="freeze" />
        <animate attributeName="opacity" values="1;0" begin={s(TR.back + 0.05)} dur="0.1s" fill="freeze" />
      </circle>
      {Array.from({ length: nStreak }, (_, i) => {
        const a = rad(i * (360 / nStreak) + 12)
        const p = (d) => `${f1(fx + Math.cos(a) * d)} ${f1(fy + Math.sin(a) * d)}`
        const t = TR.ping + 0.08 + (i % 3) * 0.07
        return (
          <path key={i} d={`M${p(5)} L${p(7)}`} stroke={i % 2 ? '#e0f2fe' : '#c4b5fd'} strokeWidth="1.2" strokeLinecap="round" opacity="0">
            <animate attributeName="d" values={`M${p(5)} L${p(7)};M${p(50)} L${p(90)}`} begin={s(t)} dur="0.3s" fill="freeze" calcMode="spline" keyTimes="0;1" keySplines="0.5 0 0.9 0.6" />
            <Fade begin={t} dur={0.3} peak={0.85} hold={0.6} />
          </path>
        )
      })}
      {[0, 1].map((i) => (
        <ellipse key={i} cx={fx} cy={fy} rx="36" ry="20" fill="none" stroke="#c4b5fd" strokeWidth="0.9" opacity="0">
          <animate attributeName="rx" values="36;20;24;5" begin={s(TR.ping + 0.05 + i * 0.12)} dur="0.3s" fill="freeze" />
          <animate attributeName="ry" values="20;26;12;4" begin={s(TR.ping + 0.05 + i * 0.12)} dur="0.3s" fill="freeze" />
          <Fade begin={TR.ping + 0.05 + i * 0.12} dur={0.3} peak={0.5} hold={0.7} />
        </ellipse>
      ))}
    </>
  )
}
function SpaceTrip({ lite, part, box }) {
  if (part === 'back') return <TripSky lite={lite} />
  const [gx, gy] = TRIP_GO
  const [hx, hy] = TRIP_HOME
  const [fx, fy] = TRIP_FAR
  const G = TRIP_GROUND
  const top = [gx, f1(gy + TRIP_UP * SHIP_K)] // chỗ tàu đi thu thành điểm sáng
  const loc = (v) => f1(v / SHIP_K) // đơn vị gấu → đơn vị trong tàu
  const over = [hx + 14, hy - 30] // tàu về lao quá chỗ đáp rồi mới chỉnh lại
  const sink = [hx, 48] // bụi sao của tàu về hút vào đây
  const lerp = (k) => `${f1(fx + (over[0] - fx) * k)} ${f1(fy + (over[1] - fy) * k)}`
  const warpTrail = [[0, 0], [0.08, 0.75], [0.6, 0.95], [1, 1]].map(([a, b]) => `M${lerp(a)} L${lerp(b)}`).join(';')
  return (
    <>
      <TripDefs />
      {/* 1. Triệu hồi: hạt sáng tụ lại, vòng hologram dưới đáy, tàu hiện hẳn thì sóng sáng lan ra */}
      <Converge cx={gx} cy={gy} n={lite ? 5 : 9} dist={46} begin={0.15} dur={0.45}>
        <circle r="1.3" fill="#e0f2fe" />
      </Converge>
      <ellipse cx={gx} cy={G} rx="26" ry="5" fill="none" stroke="#67e8f9" strokeWidth="1" strokeDasharray="3 2.4" opacity="0">
        <Fade begin={TR.holo - 0.05} dur={0.75} peak={0.8} />
      </ellipse>
      <Ring cx={gx} cy={gy} from={4} to={44} begin={TR.ship} dur={0.6} color="#a5f3fc" width={1.2} />
      {/* 3. Nạp: quầng sáng dưới tàu tăng dần, vòng gió lan, hạt bị đẩy ra — bùng lên lúc phóng rồi tắt */}
      <GroundGlow cx={gx} keys={[[TR.charge, 4, 0], [TR.launch, 28, 0.8], [TR.launch + 0.17, 44, 1], [TR.launch + 0.7, 10, 0]]} />
      <Ring cx={gx} cy={G} from={5} to={30} ry={0.25} begin={TR.charge + 0.3} dur={0.5} color="#7dd3fc" width={1} />
      {!lite && <Ring cx={gx} cy={G} from={5} to={34} ry={0.25} begin={TR.charge + 0.52} dur={0.45} color="#7dd3fc" width={1} />}
      <GroundPush cx={gx} n={lite ? 4 : 8} begin={TR.charge + 0.2} span={0.5} dist={34} dur={0.45} />
      {/* 4. Phóng: chớp, sóng chấn động, hạt bắn mạnh ra, khói */}
      <StageFlash box={box} cx={gx} cy={108} begin={TR.launch} color="#e0f2fe" peak={0.32} dur={0.32} />
      <circle cx={gx} cy={G - 3} r="3" fill="#fff" opacity="0">
        <animate attributeName="r" values="3;20" begin={s(TR.launch)} dur="0.25s" fill="freeze" />
        <Fade begin={TR.launch} dur={0.28} hold={0.3} />
      </circle>
      <Ring cx={gx} cy={G} from={8} to={100} ry={0.22} begin={TR.launch} dur={0.75} color="#bae6fd" width={2.2} boom />
      <Ring cx={gx} cy={G} from={6} to={62} ry={0.3} begin={TR.launch + 0.06} dur={0.6} color="#c4b5fd" width={1.4} boom />
      <GroundPush cx={gx} n={lite ? 6 : 12} begin={TR.launch} span={0.12} dist={88} dur={0.6} lift={7} r={1.3} />
      {!lite &&
        Array.from({ length: 5 }, (_, i) => (
          <circle key={i} cx={gx - 4 + (i % 3) * 4} cy={G - 1} r="3" fill="#e2e8f0" opacity="0">
            <animate attributeName="r" values="3;14" begin={s(TR.launch + i * 0.06)} dur="0.9s" fill="freeze" />
            <animate attributeName="opacity" values="0;0.6;0" keyTimes="0;0.2;1" begin={s(TR.launch + i * 0.06)} dur="0.9s" fill="freeze" />
            <animateMotion path={`M0 0 l${(i % 2 ? -1 : 1) * (10 + i * 5)} -4`} begin={s(TR.launch + i * 0.06)} dur="0.9s" fill="freeze" />
          </circle>
        ))}
      {/* Tàu đi (bên phải): hologram → hiện hẳn → cửa mở đón gấu → đóng, nạp, rung → phóng, tăng tốc → thu thành điểm sáng */}
      <g transform={`translate(${gx} ${gy}) scale(${SHIP_K})`}>
        <g opacity="0">
          <animate attributeName="opacity" values="0;0.9;0.9;0" keyTimes="0;0.15;0.75;1" begin={s(TR.holo)} dur="0.6s" fill="freeze" />
          <path d={`${HULL} ${FINS}`} fill="#67e8f9" fillOpacity="0.12" stroke="#67e8f9" strokeWidth="1" pathLength="1" strokeDasharray="1" strokeDashoffset="1">
            <animate attributeName="stroke-dashoffset" values="1;0" begin={s(TR.holo)} dur="0.35s" fill="freeze" />
          </path>
          <path d="M-14 0 H14" stroke="#a5f3fc" strokeWidth="0.8">
            <animateMotion path="M0 36 V-32" begin={s(TR.holo)} dur="0.35s" fill="freeze" />
          </path>
        </g>
        <g opacity="0">
          <animate attributeName="opacity" values="0;1" begin={s(TR.ship)} dur="0.25s" fill="freeze" />
          {/* Rung mạnh dần khi nạp, rồi bay lên → tăng tốc */}
          <animateTransform attributeName="transform" type="translate" values="0 0;-0.3 0;0.3 0;-0.5 0.1;0.5 0;-0.7 0.2;0.7 0;-0.9 0.2;0.9 0;-1.1 0.3;1.1 0;0 0" begin={s(TR.charge + 0.05)} dur={s(TR.launch - TR.charge - 0.05)} fill="freeze" />
          <animateTransform attributeName="transform" type="translate" values="0 0;0 -26" begin={s(TR.launch)} dur="0.25s" fill="freeze" calcMode="spline" keyTimes="0;1" keySplines="0.5 0 0.85 0.6" />
          <animateTransform attributeName="transform" type="translate" values={`0 -26;0 ${TRIP_UP}`} begin={s(TR.launch + 0.25)} dur={s(TR.gone - TR.launch - 0.25)} fill="freeze" calcMode="spline" keyTimes="0;1" keySplines="0.55 0 1 0.7" />
          {/* Vệt phản lực kéo dài theo tốc độ, tàu biến mất thì thu lại */}
          <g opacity="0">
            <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.1;0.6;1" begin={s(TR.launch + 0.05)} dur="0.85s" fill="freeze" />
            {[
              ['#a5f3fc', 6, 0.35],
              ['#fff', 1.6, 0.9],
            ].map(([c, w, o]) => (
              <path key={c} d="M0 40 V40" stroke={c} strokeWidth={w} strokeLinecap="round" opacity={o}>
                <animate attributeName="d" values={`M0 40 V40;M0 40 V64;M0 40 V${40 - TRIP_UP}`} keyTimes="0;0.4;1" begin={s(TR.launch + 0.05)} dur={s(TR.gone - TR.launch - 0.05)} fill="freeze" />
                <animate attributeName="d" values={`M0 40 V${40 - TRIP_UP};M0 40 V52`} begin={s(TR.gone)} dur="0.35s" fill="freeze" />
              </path>
            ))}
          </g>
          <g>
            <animateTransform attributeName="transform" type="scale" values="1 1;0.9 1.16" begin={s(TR.launch + 0.2)} dur="0.3s" fill="freeze" />
            <animateTransform attributeName="transform" type="scale" values="0.9 1.16;0.05 0.25" begin={s(TR.gone - 0.06)} dur="0.1s" fill="freeze" />
            <animate attributeName="opacity" values="1;0" begin={s(TR.gone - 0.02)} dur="0.08s" fill="freeze" />
            <EngineGlow keys={[[TR.charge, 3, 0], [TR.launch - 0.1, 13, 0.9], [TR.launch, 18, 1], [TR.gone, 20, 1]]} />
            <Thrust on={TR.charge + 0.45} off={TR.gone} len={[[TR.charge + 0.45, 0.45], [TR.launch, 1.3], [TR.launch + 0.25, 1.7], [TR.gone, 2.6]]} />
            <Rocket
              face={
                <g opacity="0">
                  <Show begin={TR.close - 0.05} out={TR.gone} dur={0.15} />
                  <g>
                    <animateTransform attributeName="transform" type="translate" values="0 0;0.5 0.3;-0.5 0;0.4 0.4;-0.3 0.1;0 0" begin={s(TR.charge + 0.2)} dur="0.25s" repeatCount="2" />
                    <animateTransform attributeName="transform" type="translate" values="0 0;0 1.2" begin={s(TR.launch)} dur="0.15s" fill="freeze" />
                    {WINDOW_PANDA}
                  </g>
                </g>
              }
            >
              <path d={ENERGY} fill="none" stroke="#22d3ee" strokeWidth="1" strokeLinecap="round" opacity="0">
                <animate attributeName="opacity" values="0;0.4;0.9;0.6;1" keyTimes="0;0.3;0.6;0.8;1" begin={s(TR.close + 0.1)} dur={s(TR.launch - TR.close - 0.1)} fill="freeze" />
              </path>
              <ShipLights on={TR.ship + 0.25} ready={TR.close + 0.1} />
              <HullPulse begin={TR.ship + 0.2} />
              <Hatch open={TR.door} close={TR.close} />
              {/* Vật chất hoá: thân tàu loé trắng rồi hiện màu thật */}
              <path d={`${HULL} ${FINS}`} fill="#fff" opacity="0">
                <animate attributeName="opacity" values="0.9;0.9;0" keyTimes="0;0.4;1" begin={s(TR.ship)} dur="0.45s" fill="freeze" />
              </path>
            </Rocket>
            <CabinSpill dir={-1} begin={TR.door} out={TR.close} lite={lite} />
          </g>
        </g>
      </g>
      {/* 5. Tàu thu thành một điểm sáng rồi loé */}
      <Grow cx={top[0]} cy={top[1]} begin={TR.gone - 0.02} dur={0.1} out={TR.gone + 0.1} outDur={0.25}>
        <path d={sparkle(0, 0, 10)} fill="#fff" />
      </Grow>
      <Ring cx={top[0]} cy={top[1]} from={2} to={24} begin={TR.gone} dur={0.45} color="#e0f2fe" width={1.4} />
      <StageFlash box={box} cx={top[0]} cy={top[1]} begin={TR.gone} color="#bae6fd" peak={0.2} dur={0.32} />
      {/* 7. Tàu về: loé ở điểm xa, vệt warp phía sau ngắn dần khi giảm tốc */}
      <StageFlash box={box} cx={fx} cy={fy} begin={TR.back} color="#ddd6fe" peak={0.28} dur={0.32} />
      <Ring cx={fx} cy={fy} from={3} to={30} begin={TR.back} dur={0.4} color="#ede9fe" width={1.6} boom />
      {[
        ['#c4b5fd', 7, 0.4],
        ['#fff', 1.6, 0.95],
      ].map(([c, w, o]) => (
        <path key={c} d={`M${lerp(0)} L${lerp(0)}`} stroke={c} strokeWidth={w} strokeLinecap="round" opacity="0">
          <animate attributeName="d" values={warpTrail} keyTimes="0;0.4;0.75;1" begin={s(TR.back)} dur="0.4s" fill="freeze" />
          <animate attributeName="opacity" values={`0;${o};${o};0`} keyTimes="0;0.1;0.6;1" begin={s(TR.back)} dur="0.45s" fill="freeze" />
        </path>
      ))}
      {/* 8. Lơ lửng + đáp: quầng sáng dưới tàu, hạt bị thổi sang hai bên, vòng năng lượng, chạm đất */}
      <GroundGlow cx={hx} keys={[[TR.hover - 0.1, 4, 0], [TR.hover + 0.15, 20, 0.7], [TR.land, 26, 0.9], [TR.land + 0.1, 34, 1], [TR.land + 0.6, 6, 0]]} />
      <GroundPush cx={hx} n={lite ? 4 : 8} begin={TR.hover + 0.05} span={0.3} dist={42} dur={0.5} />
      <Ring cx={hx} cy={G} from={5} to={26} ry={0.25} begin={TR.hover + 0.15} dur={0.5} color="#7dd3fc" width={1} />
      <Ring cx={hx} cy={G} from={6} to={52} ry={0.25} begin={TR.land} dur={0.6} color="#bae6fd" width={1.7} boom />
      {Array.from({ length: lite ? 3 : 6 }, (_, i) => {
        const dir = i % 2 ? 1 : -1
        return (
          <circle key={i} cx={hx + dir * 4} cy={G - 1} r="2" fill="#e2e8f0" opacity="0">
            <animate attributeName="r" values="2;7" begin={s(TR.land)} dur="0.55s" fill="freeze" />
            <animateMotion path={`M0 0 l${dir * (8 + i * 2.5)} -3`} begin={s(TR.land)} dur="0.55s" fill="freeze" />
            <Fade begin={TR.land} dur={0.55} peak={0.6} hold={0.4} />
          </circle>
        )
      })}
      {[
        [-14, 14],
        [-6, 22],
        [5, 18],
        [13, 12],
        [20, 8],
      ]
        .slice(0, lite ? 3 : 5)
        .map(([dx, h], i) => (
          <circle key={i} cx={hx} cy={G - 1} r="1" fill={i % 2 ? '#fde68a' : '#e0f2fe'} opacity="0">
            <animateMotion path={`M0 0 Q${dx} ${-h * 2} ${dx * 2} -1`} begin={s(TR.land + 0.02 + i * 0.03)} dur="0.65s" fill="freeze" />
            <Fade begin={TR.land + 0.02 + i * 0.03} dur={0.65} hold={0.75} />
          </circle>
        ))}
      {/* Tàu về (bên trái): lao ra từ điểm xa, nghiêng, vượt quá rồi chỉnh lại → lơ lửng → chạm đất nảy nhẹ → mở cửa → tan thành bụi sao */}
      <g transform={`translate(${hx} ${hy}) scale(${SHIP_K})`}>
        <g opacity="0" transform={`translate(${loc(fx - hx)} ${loc(fy - hy)})`}>
          <animate attributeName="opacity" values="0;1" begin={s(TR.back)} dur="0.06s" fill="freeze" />
          <animate attributeName="opacity" values="1;0" begin={s(TR.bye + 0.15)} dur="0.15s" fill="freeze" />
          <animateTransform attributeName="transform" type="translate" values={`${loc(fx - hx)} ${loc(fy - hy)};${loc(over[0] - hx)} ${loc(over[1] - hy)}`} begin={s(TR.back)} dur="0.32s" fill="freeze" calcMode="spline" keyTimes="0;1" keySplines="0.1 0.8 0.3 1" />
          <animateTransform attributeName="transform" type="translate" values={`${loc(over[0] - hx)} ${loc(over[1] - hy)};0 -20`} begin={s(TR.back + 0.32)} dur={s(TR.hover - TR.back - 0.32)} fill="freeze" calcMode="spline" keyTimes="0;1" keySplines="0.4 0 0.6 1" />
          <animateTransform attributeName="transform" type="translate" values="0 -20;0 -15;0 -16.5;0 0" keyTimes="0;0.35;0.55;1" begin={s(TR.hover)} dur={s(TR.land - TR.hover)} fill="freeze" calcMode="spline" keySplines="0.4 0 0.6 1;0.4 0 0.6 1;0.5 0 0.9 0.6" />
          <animateTransform attributeName="transform" type="translate" values="0 0;0 -1.8;0 0" begin={s(TR.land)} dur="0.28s" fill="freeze" />
          <g>
            <animateTransform attributeName="transform" type="rotate" values="22;-14;6;0" keyTimes="0;0.45;0.8;1" begin={s(TR.back)} dur="0.6s" fill="freeze" />
            <g transform="scale(0.12)">
              <animateTransform attributeName="transform" type="scale" values="0.12;1.08;1" keyTimes="0;0.6;1" begin={s(TR.back)} dur="0.42s" fill="freeze" />
              <animateTransform attributeName="transform" type="scale" values="1 1;1.07 0.9;0.97 1.04;1 1" begin={s(TR.land)} dur="0.32s" fill="freeze" />
              <EngineGlow keys={[[TR.back, 18, 1], [TR.back + 0.3, 10, 0.8], [TR.hover - 0.05, 5, 0.5], [TR.hover + 0.1, 11, 0.9], [TR.land, 14, 1], [TR.land + 0.4, 3, 0]]} />
              <Thrust on={TR.back} off={TR.land + 0.35} len={[[TR.back, 2.4], [TR.back + 0.25, 1.5], [TR.hover - 0.05, 0.6], [TR.hover + 0.05, 1.15], [TR.land, 1.25], [TR.land + 0.35, 0.35]]} />
              <Rocket
                face={
                  <g opacity="0">
                    <Show begin={TR.back} out={TR.open + 0.1} outDur={0.1} />
                    {WINDOW_PANDA}
                  </g>
                }
              >
                <path d={ENERGY} fill="none" stroke="#22d3ee" strokeWidth="1" strokeLinecap="round" opacity="0.9">
                  <animate attributeName="opacity" values="0.9;0.3" begin={s(TR.land + 0.15)} dur="0.4s" fill="freeze" />
                </path>
                <ShipLights on={TR.back - 0.05} />
                <Hatch open={TR.open} />
                {/* Tan biến: thân tàu sáng rực trước khi vỡ thành bụi sao */}
                <path d={`${HULL} ${FINS}`} fill="#fff" opacity="0">
                  <animate attributeName="opacity" values="0;0.9" begin={s(TR.bye)} dur="0.22s" fill="freeze" />
                </path>
              </Rocket>
              <CabinSpill dir={1} begin={TR.open} out={TR.bye + 0.1} lite={lite} />
            </g>
          </g>
        </g>
      </g>
      {/* 10. Viền tàu vỡ thành bụi sao, hút về một điểm, loé rồi tắt */}
      {SHIP_OUTLINE.slice(0, lite ? 6 : 10).map(([x, y], i) => {
        const px = f1(hx + x * SHIP_K)
        const py = f1(hy + y * SHIP_K)
        const [sx, sy] = sink
        const t = TR.bye + 0.12 + (i % 4) * 0.02
        return (
          <path key={i} d={sparkle(px, py, 1.8)} fill={i % 3 ? '#e0f2fe' : '#f0abfc'} opacity="0">
            <animateMotion path={`M0 0 Q${f1((px - sx) * 0.35)} ${f1((py - sy) * 0.35 - 4)} ${f1(sx - px)} ${f1(sy - py)}`} begin={s(t)} dur="0.42s" fill="freeze" calcMode="spline" keyPoints="0;1" keyTimes="0;1" keySplines="0.5 0 0.8 0.5" />
            <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.15;0.85;1" begin={s(t)} dur="0.42s" fill="freeze" />
          </path>
        )
      })}
      <Grow cx={sink[0]} cy={sink[1]} begin={TR.bye + 0.55} dur={0.1} out={TR.bye + 0.65} outDur={0.22}>
        <path d={sparkle(0, 0, 7)} fill="#fff" />
      </Grow>
      <Ring cx={sink[0]} cy={sink[1]} from={2} to={16} begin={TR.bye + 0.57} dur={0.4} color="#e0f2fe" width={1.2} />
      {/* Kết: một ngôi sao nhỏ rơi xuống cạnh tai gấu rồi tắt */}
      <g opacity="0">
        <animateMotion path="M0 0 L-8 52" begin={s(TR.star)} dur="0.32s" fill="freeze" calcMode="spline" keyPoints="0;1" keyTimes="0;1" keySplines="0.4 0 0.7 1" />
        <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.15;0.8;1" begin={s(TR.star)} dur="0.5s" fill="freeze" />
        <path d="M100 -26 l3 -18" stroke="#fde68a" strokeWidth="1.2" strokeLinecap="round" opacity="0.6" />
        <path d={sparkle(100, -26, 3.2)} fill="#fef9c3" />
      </g>
      <Grow cx={92} cy={26} begin={TR.star + 0.36} dur={0.08} out={TR.star + 0.44} outDur={0.16}>
        <path d={sparkle(0, 0, 5)} fill="#fff" />
      </Grow>
    </>
  )
}

// ================= Ngân Hà — Cực phẩm top (6.4s, sân 2,4×): "Ngân Hà Giáng Lâm" =================
// Khớp keyframes act-galaxy-* (panda-act.css):
//  0–0.9 nhắm mắt, khoanh tay nạp năng lượng vào ngực · 0.9–1.3 mắt sáng, dang tay bay lên trong cột sáng
//  · 1.3–1.6 gấu TAN thành bụi sao bay lên tâm ngân hà · 1.45–3.8 sang "thế giới khác": sân tối như vũ trụ sâu,
//    ngân hà xoắn ốc khổng lồ + tinh vân; bụi sao kết thành CHÒM SAO GẤU TRÚC (nối nét), chòm sao nháy mắt
//  · 3.35–3.8 chòm sao hút vào lõi · 3.8 siêu tân tinh → cột sáng giáng xuống, gấu hiện lại trong trạng thái quyền năng
//    (mắt sáng, vầng hào quang), đáp đất 4.5: sóng chấn động, sao toả khắp sân
//  · 4.65 giơ tay điều khiển · 5.0–5.55 ngân hà xoáy co lại thành MỘT ĐIỂM, gấu thu tay gom lực · 5.55–5.75 im lặng
//  · 5.75 GALAXY BURST: chớp trắng + hồng, lõi phủ gần cả sân, 3 tia loé, 4 vòng chấn động, 24 mảnh sao, bụi sao rơi khắp sân
//    (gấu dang tay bung lực) · 6.6 ngân hà mini hiện trên tay · 7.4 về idle
const GAL_G = [60, -20] // tâm ngân hà: trên đầu (đủ xa để Galaxy Burst không che gấu quá lâu)
const GAL_LAND = 4.5
const GAL_SUCK = 5.0 // ngân hà bắt đầu co lại
const GAL_BURST = 5.75
const GAL_MINI = 6.6
// Toạ độ thân gấu → chòm sao trên trời (phóng 1,5 quanh tâm ngân hà)
const toSky = ([x, y]) => [f1(60 + (x - 60) * 1.5), f1(-10 + (y - 70) * 1.5)]
const ringPt = (d) => [60 + 27 * Math.cos(rad(d)), 52 + 27 * Math.sin(rad(d))]
const HEAD_RING = [180, -135, -90, -45, 0, 45, 90, 135].map(ringPt)
const SKY_HEAD = HEAD_RING.map(toSky)
const SKY_EARS = [toSky([34, 28]), toSky([86, 28])]
const SKY_BODY = [
  [33, 90],
  [42, 112],
  [78, 112],
  [87, 90],
].map(toSky)
const SKY_EYES = [toSky([49, 53]), toSky([71, 53])]
const SKY_STARS = [...SKY_EARS, ...SKY_HEAD, ...SKY_BODY]
const SKY_LINES = [
  `M${SKY_HEAD.map(pt).join(' L')} Z`,
  `M${pt(SKY_EARS[0])} L${pt(SKY_HEAD[1])} M${pt(SKY_EARS[1])} L${pt(SKY_HEAD[3])}`,
  `M${pt(SKY_HEAD[7])} L${SKY_BODY.map(pt).join(' L')} L${pt(SKY_HEAD[5])}`,
]
// Điểm trên thân gấu (tai, viền đầu, thân) — nơi bụi sao bay ra khi gấu tan
const DISSOLVE = [[34, 28], [86, 28], ...HEAD_RING, [36, 92], [50, 110], [70, 110], [84, 92], [60, 90], [60, 52]].map(([x, y]) => [f1(x), f1(y)])
function GalaxyDefs() {
  return (
    <defs>
      <radialGradient id="act-core">
        <stop offset="0" stopColor="#fff" />
        <stop offset="0.4" stopColor="#f0abfc" stopOpacity="0.85" />
        <stop offset="1" stopColor="#38bdf8" stopOpacity="0" />
      </radialGradient>
      <radialGradient id="act-space">
        <stop offset="0" stopColor="#050816" stopOpacity="0.94" />
        <stop offset="0.62" stopColor="#0b1030" stopOpacity="0.86" />
        <stop offset="1" stopColor="#0b1030" stopOpacity="0" />
      </radialGradient>
      <radialGradient id="act-neb-pink">
        <stop offset="0" stopColor="#ec4899" stopOpacity="0.55" />
        <stop offset="1" stopColor="#ec4899" stopOpacity="0" />
      </radialGradient>
      <radialGradient id="act-neb-blue">
        <stop offset="0" stopColor="#38bdf8" stopOpacity="0.5" />
        <stop offset="1" stopColor="#38bdf8" stopOpacity="0" />
      </radialGradient>
      <radialGradient id="act-neb-violet">
        <stop offset="0" stopColor="#8b5cf6" stopOpacity="0.5" />
        <stop offset="1" stopColor="#8b5cf6" stopOpacity="0" />
      </radialGradient>
      <radialGradient id="act-pillar">
        <stop offset="0" stopColor="#fff" stopOpacity="0.9" />
        <stop offset="0.45" stopColor="#f0abfc" stopOpacity="0.5" />
        <stop offset="1" stopColor="#7dd3fc" stopOpacity="0" />
      </radialGradient>
    </defs>
  )
}
function SpiralArms({ width = 2.2 }) {
  return [0, 90, 180, 270].map((r, i) => (
    <path
      key={r}
      d="M0 0 C10 -14 30 -14 38 2 C44 16 34 30 20 30"
      transform={`rotate(${r})`}
      fill="none"
      stroke={['#f0abfc', '#7dd3fc', '#fde68a', '#c4b5fd'][i]}
      strokeWidth={i % 2 ? width * 0.7 : width}
      strokeLinecap="round"
      opacity="0.85"
    />
  ))
}
function GalaxyDescent({ lite, part, box }) {
  const [gx, gy] = GAL_G
  const [bx, by] = GAL_G // tâm Galaxy Burst
  if (part === 'back')
    return (
      <>
        <GalaxyDefs />
        {/* Sân tối lại như vũ trụ sâu: gấu đã sang "thế giới khác" */}
        <circle cx="60" cy="34" r="150" fill="url(#act-space)" opacity="0">
          <Show begin={1.2} out={6.4} dur={0.5} outDur={0.8} />
        </circle>
        {Array.from({ length: lite ? 10 : 22 }, (_, i) => {
          const a = rad(i * 67)
          const r = 40 + ((i * 37) % 95)
          return (
            <circle key={i} cx={f1(60 + Math.cos(a) * r)} cy={f1(34 + Math.sin(a) * r * 0.85)} r={i % 4 ? 0.8 : 1.4} fill="#fff" opacity="0">
              <Fade begin={1.5 + (i % 7) * 0.08} dur={4.9} peak={i % 3 ? 0.7 : 1} hold={0.9} />
            </circle>
          )
        })}
        {!lite && (
          <>
            <ellipse cx="4" cy="14" rx="92" ry="70" fill="url(#act-neb-pink)" opacity="0">
              <Fade begin={1.55} dur={4.6} hold={0.88} />
            </ellipse>
            <ellipse cx="122" cy="4" rx="84" ry="66" fill="url(#act-neb-blue)" opacity="0">
              <Fade begin={1.7} dur={4.5} hold={0.88} />
            </ellipse>
            <ellipse cx="60" cy="-52" rx="80" ry="44" fill="url(#act-neb-violet)" opacity="0">
              <Fade begin={1.85} dur={4.3} hold={0.88} />
            </ellipse>
          </>
        )}
        {/* Ngân hà xoắn ốc khổng lồ: mở ra → quay → (siêu tân tinh) → xoáy co lại thành một điểm → (Galaxy Burst) */}
        <g opacity="0">
          <Show begin={1.45} out={GAL_BURST - 0.2} dur={0.3} outDur={0.15} peak={0.7} />
          <g transform={`translate(${gx} ${gy})`}>
            <g transform="scale(0)">
              <animateTransform attributeName="transform" type="scale" values="0;2.9;2.6" keyTimes="0;0.7;1" begin="1.45s" dur="1s" fill="freeze" />
              <animateTransform attributeName="transform" type="scale" values="2.6;3.1;2.6" begin="3.8s" dur="0.5s" fill="freeze" />
              <animateTransform attributeName="transform" type="scale" values="2.6;0.08" begin={s(GAL_SUCK)} dur="0.55s" fill="freeze" calcMode="spline" keyTimes="0;1" keySplines="0.6 0 0.9 0.5" />
              <g>
                <Spin dur={3.4} to={420} begin={1.45} />
                <Spin dur={0.55} from={420} to={1300} begin={GAL_SUCK} />
                <circle r="9" fill="url(#act-core)" />
                <SpiralArms width={2.2} />
                <g transform="rotate(45) scale(0.62)">
                  <SpiralArms width={1.8} />
                </g>
                {Array.from({ length: lite ? 6 : 14 }, (_, i) => {
                  const a = rad(i * 47)
                  const r = 10 + ((i * 9) % 32)
                  return <circle key={i} cx={f1(Math.cos(a) * r)} cy={f1(Math.sin(a) * r)} r={i % 3 ? 0.5 : 0.9} fill="#fff" />
                })}
              </g>
            </g>
          </g>
        </g>
        {/* Chòm sao Gấu Trúc: sao hiện lần lượt → nối nét → nháy mắt → hút vào lõi */}
        <g fill="none" strokeLinejoin="round" strokeLinecap="round" opacity="0">
          <Show begin={2.0} out={3.3} dur={0.1} outDur={0.25} />
          {SKY_LINES.flatMap((d, i) =>
            [4, 1.5].map((w) => (
              <path key={i * 10 + w} d={d} pathLength="100" strokeDasharray="0 100" stroke={w > 2 ? '#f0abfc' : '#fff'} strokeWidth={w} opacity={w > 2 ? 0.35 : 1}>
                <animate attributeName="stroke-dasharray" values="0 100;100 0" begin={s(2.05 + i * 0.22)} dur="0.6s" fill="freeze" />
              </path>
            ))
          )}
        </g>
        {SKY_STARS.map(([x, y], i) => (
          <g key={i} transform={`translate(${x} ${y})`}>
            <g opacity="0">
              <Show begin={1.85 + i * 0.035} out={3.75} dur={0.15} outDur={0.08} />
              <path d={sparkle(0, 0, i < 2 ? 3.8 : 3)} fill={i % 3 ? '#fff' : '#fde68a'} />
              <animateMotion path={`M0 0 L${f1(gx - x)} ${f1(gy - y)}`} begin={s(3.35 + (i % 4) * 0.04)} dur="0.4s" fill="freeze" calcMode="spline" keyTimes="0;1" keySplines="0.6 0 0.9 0.6" />
            </g>
          </g>
        ))}
        {SKY_EYES.map(([x, y], i) => (
          <g key={i} transform={`translate(${x} ${y})`}>
            <g opacity="0">
              <Show begin={2.6} out={3.75} outDur={0.08} />
              <g>
                <animateTransform attributeName="transform" type="scale" values="1;2.2;1" begin="3.0s" dur="0.35s" fill="freeze" />
                <path d={sparkle(0, 0, 3.2)} fill="#f0abfc" />
                <circle r="1.3" fill="#fff" />
              </g>
              <animateMotion path={`M0 0 L${f1(gx - x)} ${f1(gy - y)}`} begin="3.4s" dur="0.4s" fill="freeze" calcMode="spline" keyTimes="0;1" keySplines="0.6 0 0.9 0.6" />
            </g>
          </g>
        ))}
        {!lite &&
          [
            ['act-neb-pink', -30, 0.9],
            ['act-neb-blue', 30, 1],
            ['act-neb-violet', 0, 1.1],
          ].map(([g, dx, k], i) => (
            <g key={g} transform={`translate(${gx + dx} ${gy})`}>
              <ellipse rx="90" ry="70" fill={`url(#${g})`} opacity="0" transform="scale(0.3)">
                <animateTransform attributeName="transform" type="scale" values={`0.3;${k * 1.6}`} begin={s(GAL_BURST + i * 0.06)} dur="1.4s" fill="freeze" calcMode="spline" keyTimes="0;1" keySplines="0.1 0.7 0.3 1" />
                <animate attributeName="opacity" values="0;1;0" keyTimes="0;0.15;1" begin={s(GAL_BURST + i * 0.06)} dur="1.4s" fill="freeze" />
              </ellipse>
            </g>
          ))}
        {/* Siêu tân tinh ở lõi + cột sáng giáng xuống chỗ gấu */}
        <Blast cx={gx} cy={gy} from={6} to={96} begin={3.8} grow={0.45} dur={0.85} fill="url(#act-core)" />
        <ellipse cx="60" cy={f1((gy + 120) / 2)} rx="30" ry={f1((126 - gy) / 2 + 10)} fill="url(#act-pillar)" opacity="0">
          <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.15;0.6;1" begin="3.85s" dur="0.8s" fill="freeze" />
        </ellipse>
        {/* Vầng hào quang của trạng thái quyền năng */}
        <g transform="translate(60 52)" opacity="0">
          <Show begin={4.2} out={5.55} dur={0.3} outDur={0.4} />
          <g fill="none">
            <Spin dur={1.35} to={160} begin={4.2} />
            <circle r="43" stroke="#fde68a" strokeWidth="1.2" strokeDasharray="2 3.5" />
            <circle r="48" stroke="#f0abfc" strokeWidth="0.8" />
            {Array.from({ length: 8 }, (_, i) => (
              <path key={i} d={sparkle(f1(45.5 * Math.cos(rad(i * 45))), f1(45.5 * Math.sin(rad(i * 45))), 2.2)} fill="#fff" />
            ))}
          </g>
        </g>
      </>
    )
  return (
    <>
      <GalaxyDefs />
      {/* 1 Nạp năng lượng vào ngực */}
      <Converge cx={60} cy={84} n={lite ? 4 : 8} dist={46} begin={0.15} dur={0.7}>
        <path d={sparkle(0, 0, 2)} fill="#fff" />
      </Converge>
      <circle cx="60" cy="84" r="2" fill="url(#act-core)" opacity="0">
        <Show begin={0.1} out={1.35} dur={0.4} outDur={0.1} />
        <animate attributeName="r" values="2;9;7;12" begin="0.1s" dur="1.1s" fill="freeze" />
      </circle>
      {/* 2 Bay lên trong cột sáng → 3 tan thành bụi sao bay về tâm ngân hà */}
      <ellipse cx="60" cy="30" rx="32" ry="112" fill="url(#act-pillar)" opacity="0">
        <animate attributeName="opacity" values="0;0.9;0.9;0" keyTimes="0;0.3;0.65;1" begin="0.95s" dur="0.95s" fill="freeze" />
      </ellipse>
      {DISSOLVE.filter((_, i) => !lite || i % 2 === 0).map(([x, y], i) => (
        <g key={i} transform={`translate(${x} ${y})`}>
          <g opacity="0">
            {i % 3 ? <circle r="1.4" fill={i % 2 ? '#f0abfc' : '#fff'} /> : <path d={sparkle(0, 0, 2.2)} fill="#fde68a" />}
            <animateMotion path={`M0 0 Q${f1((x - 60) * 0.5)} ${f1(-30 - (y - gy) * 0.2)} ${f1(gx - x)} ${f1(gy - y)}`} begin={s(1.32 + i * 0.025)} dur="0.7s" fill="freeze" calcMode="spline" keyTimes="0;1" keySplines="0.4 0 0.6 1" />
            <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.1;0.8;1" begin={s(1.32 + i * 0.025)} dur="0.7s" fill="freeze" />
          </g>
        </g>
      ))}
      {/* 4 Siêu tân tinh, giáng xuống, đáp đất */}
      <StageFlash box={box} cx={gx} cy={gy + 30} begin={3.8} color="#fdf4ff" peak={0.5} dur={0.45} />
      <Ring cx={gx} cy={gy} from={10} to={130} begin={3.8} dur={0.9} color="#f0abfc" width={2.4} boom />
      {!lite && <Ring cx={gx} cy={gy} from={8} to={104} begin={3.9} dur={0.9} color="#7dd3fc" width={1.6} boom />}
      <StageFlash box={box} cx={60} cy={70} begin={GAL_LAND} color="#f0abfc" peak={0.25} dur={0.35} />
      <Ring cx={60} cy={118} from={10} to={150} begin={GAL_LAND} dur={0.9} color="#f0abfc" width={2.4} ry={0.22} boom />
      {!lite && <Ring cx={60} cy={118} from={8} to={120} begin={GAL_LAND + 0.1} dur={0.9} color="#7dd3fc" width={1.4} ry={0.22} boom />}
      <Burst cx={60} cy={70} n={lite ? 8 : 16} dist={124} begin={GAL_LAND} dur={1.2} offset={11}>
        {(i) => <path d={sparkle(0, 0, i % 2 ? 1.8 : 2.8)} fill={['#fff', '#f0abfc', '#7dd3fc'][i % 3]} />}
      </Burst>
      {/* Sao chổi bay vòng quanh trạng thái quyền năng */}
      {Array.from({ length: lite ? 2 : 4 }, (_, i) => (
        <g key={i} transform={`rotate(${i % 2 ? 12 : -14} 60 80)`}>
          <g opacity="0">
            <Show begin={GAL_LAND + 0.05 + i * 0.1} out={5.5 + i * 0.05} dur={0.2} outDur={0.2} />
            <path d={i % 2 ? CRYSTAL : starPath(0, 0, 3)} fill={i % 2 ? '#f0abfc' : '#fde68a'} stroke="#fff" strokeWidth="0.4">
              <animateMotion path={ellipsePath(60, 80, 64 - i * 6, 16)} begin={s(GAL_LAND + 0.05 + i * 0.1)} dur="0.9s" repeatCount="2" fill="freeze" />
            </path>
          </g>
        </g>
      ))}
      {/* 5 GALAXY BURST: ngân hà co thành một điểm → im lặng một nhịp → bùng nổ phủ gần cả sân */}
      <Converge cx={bx} cy={by} n={lite ? 6 : 14} dist={130} begin={GAL_SUCK} dur={0.5}>
        <path d={sparkle(0, 0, 2.4)} fill="#fff" />
      </Converge>
      <circle cx={bx} cy={by} r="2" fill="#fff" opacity="0">
        <Show begin={GAL_BURST - 0.25} out={GAL_BURST} dur={0.05} outDur={0.05} />
        <animate attributeName="r" values="2;4.5;2.5;5" begin={s(GAL_BURST - 0.25)} dur="0.25s" fill="freeze" />
      </circle>
      <StageFlash box={box} cx={bx} cy={by + 20} begin={GAL_BURST} color="#fff" peak={0.75} dur={0.6} />
      <StageFlash box={box} cx={bx} cy={by + 20} begin={GAL_BURST + 0.12} color="#f0abfc" peak={0.4} dur={0.8} />
      <Blast cx={bx} cy={by} from={6} to={135} begin={GAL_BURST} grow={0.55} dur={1.3} fill="url(#act-core)" />
      <Blast cx={bx} cy={by} from={3} to={58} begin={GAL_BURST} grow={0.25} dur={0.6} color="#fff" />
      <Flare cx={bx} cy={by} r={170} begin={GAL_BURST} dur={0.8} />
      {!lite && (
        <>
          <Flare cx={bx} cy={by} r={120} begin={GAL_BURST + 0.04} dur={0.75} rot={45} fill="#f0abfc" />
        </>
      )}
      <Ring cx={bx} cy={by} from={12} to={170} begin={GAL_BURST} dur={1.1} color="#f0abfc" width={3.4} boom />
      <Ring cx={bx} cy={by} from={10} to={145} begin={GAL_BURST + 0.08} dur={1.1} color="#7dd3fc" width={2.4} boom />
      {!lite && (
        <>
          <Ring cx={bx} cy={by} from={16} to={180} begin={GAL_BURST + 0.18} dur={1.2} color="#fde68a" width={1.6} ry={0.8} boom />
          <Ring cx={bx} cy={by} from={8} to={120} begin={GAL_BURST + 0.28} dur={1} color="#fff" width={1.2} boom />
        </>
      )}
      <Ring cx={60} cy={118} from={10} to={170} begin={GAL_BURST + 0.05} dur={1} color="#f0abfc" width={2.4} ry={0.22} boom />
      <Burst cx={bx} cy={by} n={lite ? 10 : 24} dist={172} begin={GAL_BURST + 0.02} dur={1.5}>
        {(i) =>
          i % 2 ? (
            <path d={CRYSTAL} transform={`rotate(${(360 / (lite ? 10 : 24)) * i + 90}) scale(1.8)`} fill={['#f0abfc', '#7dd3fc', '#fff'][i % 3]} />
          ) : (
            <path d={starPath(0, 0, 3)} fill={['#fde68a', '#fff', '#f0abfc'][i % 3]} />
          )
        }
      </Burst>
      {!lite && (
        <Burst cx={bx} cy={by} n={16} dist={110} begin={GAL_BURST + 0.08} dur={1.2} offset={11}>
          {(i) => <path d={sparkle(0, 0, i % 2 ? 1.8 : 2.8)} fill={['#fff', '#f0abfc', '#7dd3fc'][i % 3]} />}
        </Burst>
      )}
      {/* Bụi sao rơi chậm khắp sân sau vụ nổ */}
      {Array.from({ length: lite ? 6 : 16 }, (_, i) => {
        const x = box.x + 20 + ((i * 67) % (box.w - 40))
        const y = box.y + 20 + ((i * 41) % 120)
        const b = GAL_BURST + 0.3 + (i % 6) * 0.08
        return (
          <g key={i} transform={`translate(${f1(x)} ${f1(y)})`}>
            <g opacity="0">
              <path d={sparkle(0, 0, i % 3 ? 1.6 : 2.4)} fill={['#fff', '#f0abfc', '#7dd3fc', '#fde68a'][i % 4]} />
              <animateMotion path={`M0 0 l${i % 2 ? 8 : -8} ${60 + (i % 4) * 14}`} begin={s(b)} dur="1.3s" fill="freeze" />
              <Fade begin={b} dur={1.3} hold={0.6} />
            </g>
          </g>
        )
      })}
      {/* 6 Ngân hà mini hiện trên tay */}
      <Blast cx={88.5} cy={95} from={2} to={18} begin={GAL_MINI} grow={0.25} dur={0.6} fill="url(#act-core)" />
      <Ring cx={88.5} cy={95} from={4} to={26} begin={GAL_MINI + 0.05} dur={0.5} color="#f0abfc" width={1.2} />
      <g transform="translate(88.5 95)" opacity="0">
        <Show begin={GAL_MINI} out={GAL_MINI + 0.7} dur={0.15} outDur={0.3} />
        <g transform="scale(0.32)">
          <Spin dur={1} to={300} begin={GAL_MINI} />
          <SpiralArms width={3} />
        </g>
      </g>
      {[
        [10, 24],
        [112, 18],
        [-8, 80],
        [128, 92],
        [60, -18],
      ]
        .slice(0, lite ? 3 : 5)
        .map(([x, y], i) => (
          <path key={i} d={sparkle(x, y, 3.2)} fill={i % 2 ? '#f0abfc' : '#fff'} opacity="0">
            <Fade begin={GAL_MINI + i * 0.1} dur={0.7} hold={0.5} />
          </path>
        ))}
    </>
  )
}

export const INTERACTIONS = {
  'dj-set': { ms: 3000, line: 'Lên nhạc nào! 🎧', sound: 'dj-set', Layer: DjSet },
  'star-duel': { ms: 4600, line: 'Ánh sáng tinh hệ — xuất kiếm! ⚔️', sound: 'star-duel', Layer: StarDuel },
  'star-summon': { ms: 5000, line: 'Sao trời ơi, nghe lệnh ta! 🪄', sound: 'star-summon', Layer: StarSummon },
  'space-trip': { ms: 7000, line: '3… 2… 1… Cất cánh! 🚀', sound: 'space-trip', Layer: SpaceTrip },
  'galaxy-descent': { ms: 7400, line: 'Ngân Hà Giáng Lâm! 🌌', sound: 'galaxy-descent', Layer: GalaxyDescent },
}

// Lớp cảnh của hoạt cảnh đang chạy (run = { id, key }); đổi key để chạy lại từ đầu.
// part="back": đặt TRƯỚC hình gấu trong DOM (nằm sau lưng); part="front": đặt SAU hình gấu (nằm trước mặt)
// stage: outfit.stage. frame: [toạ độ góc, cạnh] của khung chứa theo đơn vị gấu — linh vật [0, 120] (khung = gấu),
// phòng thử đồ [-30, 180] (.opanda rộng 1,5× gấu). Lớp cảnh đặt đúng chữ nhật sân diễn quanh gấu.
export function PandaActLayer({ run, lite, part = 'front', stage, frame = [0, 120] }) {
  const def = run && INTERACTIONS[run.id]
  if (!def || !stage) return null
  const { Layer } = def
  const box = stageRect(stage)
  const [o, size] = frame
  const pct = (v) => `${+((v / size) * 100).toFixed(2)}%`
  return (
    <svg
      key={run.key}
      className={`act-layer act-${part}`}
      viewBox={`${box.x} ${box.y} ${box.w} ${box.h}`}
      style={{ left: pct(box.x - o), top: pct(box.y - o), width: pct(box.w), height: pct(box.h) }}
      aria-hidden="true"
    >
      <Layer lite={lite} part={part} box={box} />
    </svg>
  )
}

// Linh vật góc phải dưới: sân tràn quá mép phải / dưới của gấu bao nhiêu (theo cỡ gấu) → gấu bước ra ngần ấy khi diễn
export function stageOverflow(stage) {
  const b = stageRect(stage)
  return { right: f1((b.x + b.w - 120) / 120), bottom: f1((b.y + b.h - 120) / 120) }
}

// Class gắn vào khung chứa gấu để chạy động tác (panda-act.css)
export const actClass = (run, lite) => (run ? ` act-${run.id} is-acting${lite ? ' act-lite' : ''}` : '')

// Vòng đời một hoạt cảnh: idle → playing → cooldown → idle. play() trả false nếu không chạy được
// (bộ không có hoạt cảnh / đang chạy / đang hồi). Đổi bộ thì dừng ngay. onEnd gọi khi diễn xong.
// Giữ chuột / ngón tay HOLD_MS trên gấu = xem hoạt cảnh (bấm thường vẫn là hành vi cũ). Trả handlers gắn vào phần tử,
// cờ holding (đang "nạp", CSS .is-holding) và consumeClick(): true nếu cú click này là lúc thả tay sau khi giữ → bỏ qua.
export const HOLD_MS = 550
export function useHold(onHold, enabled = true) {
  const [holding, setHolding] = useState(false)
  const timer = useRef(null)
  const fired = useRef(false)
  useEffect(() => () => clearTimeout(timer.current), [])
  const stop = () => {
    clearTimeout(timer.current)
    setHolding(false)
  }
  const handlers = enabled
    ? {
        onPointerDown: (e) => {
          if (e.button !== 0) return
          unlockSfx() // mở tiếng ngay trong cú chạm: lúc giữ đủ lâu hoạt cảnh mới có tiếng
          fired.current = false
          clearTimeout(timer.current)
          setHolding(true)
          timer.current = setTimeout(() => {
            fired.current = true
            setHolding(false)
            onHold()
          }, HOLD_MS)
        },
        onPointerUp: stop,
        onPointerLeave: stop,
        onPointerCancel: stop, // vuốt cuộn trang trên điện thoại
        onContextMenu: (e) => e.preventDefault(), // nhấn giữ trên điện thoại không bật menu
      }
    : {}
  const consumeClick = () => {
    const f = fired.current
    fired.current = false
    return f
  }
  return { holding, handlers, consumeClick }
}

export function usePandaAct(outfit) {
  const [run, setRun] = useState(null)
  const phase = useRef('idle')
  const timer = useRef(null)
  const sfx = useRef(null)
  const id = outfit?.interaction

  useEffect(() => {
    clearTimeout(timer.current)
    phase.current = 'idle'
    setRun(null)
    stopActSound(sfx.current)
  }, [id])
  useEffect(
    () => () => {
      clearTimeout(timer.current)
      stopActSound(sfx.current)
    },
    []
  )

  const play = useCallback(
    (onEnd) => {
      const def = INTERACTIONS[id]
      if (!def || phase.current !== 'idle') return false
      phase.current = 'playing'
      setRun({ id, key: Date.now() })
      sfx.current = playActSound(def.sound)
      timer.current = setTimeout(() => {
        phase.current = 'cooldown'
        setRun(null)
        onEnd?.()
        timer.current = setTimeout(() => (phase.current = 'idle'), COOLDOWN)
      }, def.ms)
      return true
    },
    [id]
  )

  return { run, play, has: !!INTERACTIONS[id], playing: !!run }
}
