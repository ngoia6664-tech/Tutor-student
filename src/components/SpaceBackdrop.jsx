import { useEffect, useRef } from 'react'
import { prefersReducedMotion, updateSettings, useSettings } from '../lib/settings.js'
import { maxScroll, onScroll as onContentScroll, scrollY } from '../lib/scroller.js'
import { useTheme } from '../lib/theme.js'
import { playClockTick } from '../lib/spaceSound.js'

// Nền phía sau toàn app:
// - Giao diện tối (Vũ trụ học): 3 lớp sao ở 3 độ xa, vài sao lấp lánh, hệ Mặt Trời 3D nghiêng theo cuộn trang, sao băng.
// - Giao diện sáng (Lớp học cổ điển): Khung cửa sổ đón nắng chiếu xiên, tán cây đung đưa, lá thu rơi chao nghiêng,
//   tường bảng phấn viết công thức Vật lý, đồng hồ treo tường chạy giờ thực, tủ gỗ + quả địa cầu,
//   đèn chao thả trần (bấm để bật/tắt), bụi phấn bay trong nắng.
// Kiểu dáng ở styles/space.css.

// Số ngẫu nhiên có hạt giống: mỗi lần mở app sao, lá rơi và bụi phấn vẫn nằm đúng chỗ cũ
function rng(seed) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function starTile(size, count, rMin, rMax, seed) {
  const rand = rng(seed)
  let dots = ''
  for (let i = 0; i < count; i++) {
    const r = rMin + rand() * (rMax - rMin)
    const o = 0.5 + rand() * 0.5
    dots += `<circle cx="${(rand() * size).toFixed(1)}" cy="${(rand() * size).toFixed(1)}" r="${r.toFixed(2)}" fill-opacity="${o.toFixed(2)}"/>`
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" fill="#fff">${dots}</svg>`
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`
}

// [tên lớp, cỡ ô, số sao, bán kính nhỏ nhất, lớn nhất]
const LAYERS = [
  ['far', 260, 70, 0.5, 0.9],
  ['mid', 420, 38, 0.8, 1.3],
  ['near', 640, 16, 1.2, 1.8],
  ['twinkle', 520, 9, 1.4, 2],
]

const TILES = LAYERS.map(([name, size, count, rMin, rMax], i) => ({
  name,
  style: { '--tile': `${size}px`, '--stars': starTile(size, count, rMin, rMax, 17 + i * 101) },
}))

// Hành tinh: [tên, đường kính quỹ đạo px, cỡ px, chu kỳ giây, góc xuất phát]. Trong quay nhanh, ngoài quay chậm.
/** @type {[string, number, number, number, number][]} */
const PLANETS = [
  ['mercury', 230, 7, 36, 40],
  ['venus', 330, 11, 60, 200],
  ['earth', 450, 12, 95, 310],
  ['mars', 580, 9, 150, 120],
  ['jupiter', 760, 26, 260, 250],
  ['saturn', 960, 21, 400, 20],
]

// 28 hạt bụi phấn cố định vị trí cho nền Lớp học cổ điển
const DUST_MOTES = (() => {
  const rand = rng(777)
  const list = []
  for (let i = 0; i < 28; i++) {
    const size = (3.0 + rand() * 4.5).toFixed(1)
    list.push({
      id: i,
      style: {
        width: `${size}px`,
        height: `${size}px`,
        left: `${(3 + rand() * 82).toFixed(1)}%`,
        top: `${(5 + rand() * 84).toFixed(1)}%`,
        '--dur': `${(8 + rand() * 10).toFixed(1)}s`,
        '--delay': `-${(rand() * 12).toFixed(1)}s`,
      },
    })
  }
  return list
})()

// 9 chiếc lá sân trường bay lữngờ từ phía cửa sổ trái qua phòng học
const LEAF_COLORS = ['#d97706', '#eab308', '#c2410c', '#65a30d', '#b45309']
const FALLING_LEAVES = (() => {
  const rand = rng(2026)
  const list = []
  for (let i = 0; i < 9; i++) {
    const size = Math.round(14 + rand() * 8)
    const color = LEAF_COLORS[i % LEAF_COLORS.length]
    list.push({
      id: i,
      color,
      style: {
        width: `${size}px`,
        height: `${size}px`,
        left: `${(-2 + rand() * 34).toFixed(1)}%`,
        top: `${(-6 + rand() * 28).toFixed(1)}%`,
        '--leaf-dur': `${(11 + rand() * 7).toFixed(1)}s`,
        '--leaf-delay': `-${(rand() * 16).toFixed(1)}s`,
        '--sway-dur': `${(2.6 + rand() * 1.6).toFixed(2)}s`,
      },
    })
  }
  return list
})()

// 14 hạt mưa xiên ngoài khung cửa sổ (chỉ hiện khi chọn thời tiết "Mưa ngoài hiên")
const RAIN_STREAKS = (() => {
  const rand = rng(909)
  const list = []
  for (let i = 0; i < 14; i++) {
    list.push({
      id: i,
      style: {
        left: `${(4 + rand() * 92).toFixed(1)}%`,
        top: `${(-20 + rand() * 40).toFixed(1)}%`,
        '--rain-dur': `${(0.75 + rand() * 0.45).toFixed(2)}s`,
        '--rain-delay': `-${(rand() * 1.2).toFixed(2)}s`,
      },
    })
  }
  return list
})()

// Góc nhìn theo vị trí cuộn: đầu trang nhìn nghiêng sát mặt phẳng quỹ đạo, cuối trang nhìn gần từ trên xuống
const TILT_TOP = 72
const TILT_BOTTOM = 28
const TURN_TOP = -14
const TURN_BOTTOM = 18

export default function SpaceBackdrop() {
  const ref = useRef(null)
  const settings = useSettings()
  const animated = settings.animatedBackground
  const theme = useTheme()

  // Cuộn trang: nghiêng Hệ Mặt Trời (bản tối) & dịch nhẹ tường lớp học (bản sáng)
  useEffect(() => {
    const rootEl = ref.current
    if (!rootEl || !animated || prefersReducedMotion()) return
    const solarEl = rootEl.querySelector('.solar')
    const wallEl = rootEl.querySelector('.classroom-backwall')
    let frame = 0
    const update = () => {
      frame = 0
      const max = maxScroll()
      const p = max > 0 ? Math.min(1, Math.max(0, scrollY() / max)) : 0
      if (solarEl) {
        solarEl.style.setProperty('--tilt', `${TILT_TOP + (TILT_BOTTOM - TILT_TOP) * p}deg`)
        solarEl.style.setProperty('--turn', `${TURN_TOP + (TURN_BOTTOM - TURN_TOP) * p}deg`)
      }
      if (wallEl) {
        wallEl.style.setProperty('--wall-shift', `${(-p * 26).toFixed(1)}px`)
      }
    }
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update)
    }
    update()
    const offScroll = onContentScroll(onScroll)
    window.addEventListener('resize', onScroll)
    return () => {
      offScroll()
      window.removeEventListener('resize', onScroll)
      cancelAnimationFrame(frame)
    }
  }, [animated])

  // Đồng hồ treo tường lớp học chạy giờ thực (cả lớp học ban ngày và gác mái ban đêm)
  useEffect(() => {
    const rootEl = ref.current
    if (!rootEl) return
    const hourEl = rootEl.querySelector('.clock-hour')
    const minEl = rootEl.querySelector('.clock-min')
    const secEl = rootEl.querySelector('.clock-sec')
    if (!hourEl || !minEl || !secEl) return

    const tick = () => {
      const now = new Date()
      const sec = now.getSeconds()
      const min = now.getMinutes()
      const hr = now.getHours() % 12
      secEl.style.transform = `rotate(${sec * 6}deg)`
      minEl.style.transform = `rotate(${min * 6 + sec * 0.1}deg)`
      hourEl.style.transform = `rotate(${hr * 30 + min * 0.5}deg)`
    }
    tick()
    if (!animated || prefersReducedMotion()) return
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [animated])

  function toggleLamp() {
    updateSettings({ ceilingLamp: !settings.ceilingLamp })
    playClockTick(true)
  }

  return (
    <>
      <div ref={ref} className="space" aria-hidden="true">
        {/* LỚP VŨ TRỤ HỌC (Giao diện tối & Chế độ Ngắm vũ trụ) */}
        {TILES.map((t) => (
          <div key={t.name} className={`space-depth space-depth-${t.name}`}>
            <div className={`space-stars space-${t.name}`} style={/** @type {import('react').CSSProperties} */ (t.style)} />
          </div>
        ))}

        <div className="solar">
          <div className="solar-plane">
            <div className="solar-face">
              <span className="solar-sun" />
            </div>
            {PLANETS.map(([name, orbit, size, period, start]) => (
              <div
                key={name}
                className="solar-orbit"
                style={/** @type {import('react').CSSProperties} */ ({ '--d': `${orbit}px`, '--period': `${period}s`, '--phase': start / 360 })}
              >
                <div className="solar-carrier">
                  <div className="solar-face">
                    <span className={`solar-planet solar-${name}`} style={/** @type {import('react').CSSProperties} */ ({ '--s': `${size}px` })}>
                      {name === 'earth' && <span className="solar-moon" />}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <span className="space-shooting" />

        {/* LỚP PHÒNG HỌC CỔ ĐIỂN (Giao diện sáng ban ngày & Giao diện tối ban đêm gác mái) */}
        <div className="classroom-scene">
          {/* Luồng ánh trăng xiên từ cửa sổ rọi vào phòng đêm */}
          <div className="moonlight-beam" />

          {/* Khung cửa sổ lớn bên trái + Vầng trăng đêm + Tán cây xanh đung đưa + Hạt mưa ngoài hiên */}
          <div className="classroom-window">
            <div className="window-moon" />
            <div className="window-pane"><div className="window-foliage" /></div>
            <div className="window-pane"><div className="window-foliage is-alt" /></div>
            <div className="window-pane"><div className="window-foliage is-alt" /></div>
            <div className="window-pane"><div className="window-foliage" /></div>
            <div className="window-rain">
              {RAIN_STREAKS.map((r) => (
                <span key={r.id} className="rain-drop" style={r.style} />
              ))}
            </div>
          </div>

          {/* Tường bảng đen than chì, Đồng hồ treo tường, Bảng lớn & Tủ gỗ */}
          <div className="classroom-backwall">
            <div
              className="wall-clock"
              role="img"
              aria-label="Đồng hồ treo tường"
              title="Đồng hồ treo tường lớp học"
              onClick={() => playClockTick(true)}
            >
              <span className="clock-num clock-12">12</span>
              <span className="clock-num clock-3">3</span>
              <span className="clock-num clock-6">6</span>
              <span className="clock-num clock-9">9</span>
              <div className="clock-ticks" aria-hidden="true" />
              <div className="clock-hand clock-hour" />
              <div className="clock-hand clock-min" />
              <div className="clock-hand clock-sec" />
              <div className="clock-dot" />
            </div>

            <div className="globe-lamp" />
            <div className="classroom-mainboard" />

            <div className="chalk-wall-notes">
              <div>ω = 2π / T = √(k / m)</div>
              <div>x = A·cos(ωt + φ)</div>
              <div className="chalk-wall-accent">Δφ = 2π·d / λ</div>
              <div className="chalk-wall-sub">Giao thoa: i = λD / a</div>
              <svg width="140" height="32" viewBox="0 0 140 32" fill="none" className="chalk-wall-wave">
                <path d="M2 16 Q 18 2, 34 16 T 66 16 T 98 16 T 130 16" stroke="#fde68a" strokeWidth="2" strokeDasharray="3 2" fill="none" />
              </svg>
            </div>

            <div className="classroom-furniture">
              <div className="wood-cabinet">
                <div className="cabinet-door" />
                <div className="cabinet-door" />
                <div className="cabinet-shelf" />
                <div className="cabinet-shelf" />
              </div>
            </div>
          </div>

          {/* Máy bay giấy thỉnh thoảng bay ngang qua lớp */}
          <div className="paper-plane">
            <svg viewBox="0 0 24 24" fill="none" stroke="#8c5828" strokeWidth="1.5">
              <path d="M22 2L11 13" />
              <path d="M22 2L15 22L11 13L2 9L22 2Z" fill="rgba(253, 249, 242, 0.88)" />
            </svg>
          </div>

          {/* Luồng tia nắng chiếu xiên qua lớp học */}
          <div className="sunbeams" />

          {/* Vệt nắng in bóng khung cửa sổ trên sàn gỗ */}
          <div className="floor-sunlight">
            <div className="floor-sun-patch" />
            <div className="floor-sun-patch" />
            <div className="floor-sun-patch" />
          </div>

          {/* Những chiếc lá vàng sân trường bay theo gió qua cửa sổ */}
          <div className="falling-leaves">
            {FALLING_LEAVES.map((l) => (
              <span key={l.id} className="falling-leaf" style={l.style}>
                <svg className="falling-leaf-svg" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M20.5 3.5C14.5 3.2 7.5 6.8 5.2 13.5C4.3 16.1 4.8 18.8 6.5 20.5C8.2 22.2 10.9 22.7 13.5 21.8C20.2 19.5 20.8 9.5 20.5 3.5Z"
                    fill={l.color}
                    fillOpacity="0.82"
                  />
                  <path
                    d="M3.5 20.5C7.5 16.5 12.5 11.5 19.2 4.8"
                    stroke="#78350f"
                    strokeWidth="1.3"
                    strokeLinecap="round"
                    strokeOpacity="0.65"
                  />
                </svg>
              </span>
            ))}
          </div>

          {/* Bóng mờ bàn học gỗ ở 2 góc dưới tạo chiều sâu */}
          <div className="foreground-desks">
            <div className="desk-silhouette" />
            <div className="desk-silhouette" />
          </div>

          {/* Hạt bụi phấn lơ lửng trong nắng */}
          <div className="chalk-dust-container">
            {DUST_MOTES.map((m) => (
              <span key={m.id} className="dust-mote" style={m.style} />
            ))}
          </div>
        </div>
      </div>

      {/* Đèn thả trần cổ điển (bấm vào chụp đèn để Bật/Tắt đèn lớp học) */}
      <button
        type="button"
        className="pendant-lamp"
        onClick={toggleLamp}
        tabIndex={-1}
        aria-hidden="true"
        title="Bấm vào đèn để Bật / Tắt ánh sáng vàng lớp học"
      >
        <svg width="50" height="69" viewBox="0 0 96 132" fill="none">
          <line x1="48" y1="0" x2="48" y2="60" stroke="#57534e" strokeWidth="3.5" />
          <path d="M30 60 H66 L80 88 H16 Z" fill="#fafaf9" stroke="#d6d3d1" strokeWidth="2.5" />
          <ellipse cx="48" cy="88" rx="32" ry="6" fill="#fef3c7" />
          <circle className="lamp-light-cone" cx="48" cy="96" r="34" fill="url(#classroomLampGlow)" />
          <defs>
            <radialGradient id="classroomLampGlow">
              <stop offset="0%" stopColor="#fde68a" stopOpacity="0.88" />
              <stop offset="100%" stopColor="#fde68a" stopOpacity="0" />
            </radialGradient>
          </defs>
        </svg>
      </button>

      {/* Luồng sáng tam giác từ đèn chao rọi xuống khối trung tâm */}
      <div className="lamp-cone-triangle" aria-hidden="true" />
    </>
  )
}
