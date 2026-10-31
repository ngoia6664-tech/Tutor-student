// @ts-nocheck — nợ kiểu: xóa dòng này rồi chạy npm run typecheck để sửa
import { useEffect, useRef } from 'react'
import { prefersReducedMotion, useSettings } from '../lib/settings.js'

// Nền vũ trụ phía sau toàn app: 3 lớp sao ở 3 độ xa (trôi chậm, lớp gần trôi nhanh hơn → có chiều sâu),
// vài sao lấp lánh, hệ Mặt Trời mờ ở giữa (cuộn trang thì đổi góc nhìn), thỉnh thoảng một sao băng.
// Kiểu dáng ở styles/space.css. Sao vẽ một lần thành ô SVG lặp lại (dùng làm mask) nên đổi màu theo giao diện bằng biến CSS.

// Số ngẫu nhiên có hạt giống: mỗi lần mở app sao vẫn nằm đúng chỗ cũ
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
const PLANETS = [
  ['mercury', 230, 7, 36, 40],
  ['venus', 330, 11, 60, 200],
  ['earth', 450, 12, 95, 310],
  ['mars', 580, 9, 150, 120],
  ['jupiter', 760, 26, 260, 250],
  ['saturn', 960, 21, 400, 20],
]

// Góc nhìn theo vị trí cuộn: đầu trang nhìn nghiêng sát mặt phẳng quỹ đạo, cuối trang nhìn gần từ trên xuống
const TILT_TOP = 72
const TILT_BOTTOM = 28
const TURN_TOP = -14
const TURN_BOTTOM = 18

export default function SpaceBackdrop() {
  const ref = useRef(null)
  // Tắt "Background động" (Cài đặt): nền đứng yên (CSS ở styles/settings.css), không đổi góc nhìn theo cuộn
  const animated = useSettings().animatedBackground

  useEffect(() => {
    const el = ref.current.querySelector('.solar') // chỉ hệ Mặt Trời dùng góc nhìn: đổi biến ở đây để không tính lại các lớp sao
    if (!animated || prefersReducedMotion()) return
    let frame = 0
    const update = () => {
      frame = 0
      const max = document.documentElement.scrollHeight - window.innerHeight
      const p = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0
      el.style.setProperty('--tilt', `${TILT_TOP + (TILT_BOTTOM - TILT_TOP) * p}deg`)
      el.style.setProperty('--turn', `${TURN_TOP + (TURN_BOTTOM - TURN_TOP) * p}deg`)
    }
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update)
    }
    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      cancelAnimationFrame(frame)
    }
  }, [animated])

  return (
    <div ref={ref} className="space" aria-hidden="true">
      {TILES.map((t) => (
        <div key={t.name} className={`space-depth space-depth-${t.name}`}>
          <div className={`space-stars space-${t.name}`} style={t.style} />
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
              style={{ '--d': `${orbit}px`, '--period': `${period}s`, '--phase': start / 360 }}
            >
              <div className="solar-carrier">
                <div className="solar-face">
                  <span className={`solar-planet solar-${name}`} style={{ '--s': `${size}px` }}>
                    {name === 'earth' && <span className="solar-moon" />}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <span className="space-shooting" />
    </div>
  )
}
