// Bay tự do trong Kính thiên văn (components/telescope/FreeFlight.jsx): vật lý thuần, không đụng DOM.
// Đơn vị mô phỏng: đv (1 đv = 1 px của bản đồ ở tỉ lệ 1), đv/s. Khoảng cách, tốc độ đã thu nhỏ để chơi được.
// Công thức thật:
//   gia tốc trọng trường      a = GM / r²  (cộng của mọi thiên thể)
//   vận tốc thoát khỏi hệ     v = √(2 · Σ GMᵢ / rᵢ)   (tức năng lượng ½v² − Σ GMᵢ/rᵢ ≥ 0)
// Tỉ lệ khối lượng TRONG một hệ là số thật → sao giữ gần như toàn bộ lực hút, hành tinh chỉ kéo rất nhẹ.
// Giữa các hệ, GM được chỉnh để vận tốc thoát ở mép hệ bằng V_EDGE (mỗi hệ một tỉ lệ thu nhỏ khác nhau).
// Chuyển động của hành tinh dùng lại quỹ đạo trong lib/starSystems.js (bán kính = d/2, chu kỳ, góc đầu).
//
// Điều khiển: người lái chọn HƯỚNG (núm kéo / phím mũi tên) và VẬN TỐC MONG MUỐN (thanh tốc độ / phím + −).
// Động cơ đẩy dọc mũi tàu để vận tốc tiến dần tới vận tốc mong muốn, lực đẩy có giới hạn (ENGINE) và không chống trọng lực;
// vận tốc mong muốn = 0 là tắt máy: tàu trôi theo quán tính và bị hút.
// sát sao, lực hút mạnh hơn động cơ → tàu bị kéo vào nếu chưa đủ nhanh. Ra ngoài mép hệ, lực hút gần như không còn
// nên tàu dùng chế độ lái nhẹ (ENGINE_OUT, phản ứng nhanh): kéo hướng nào tàu gần như đi ngay hướng đó.
// Vùng bay có viền (WALL × mép hệ): chạm viền thì không ra được nữa, phải quay về.
import { SYSTEMS } from './starSystems.js'
import { SOLAR_ID } from './telescope.js'

// Hệ Mặt Trời cho bay tự do: cùng dạng SYSTEMS (lib/starSystems.js). Quỹ đạo khớp PLANETS trong components/SpaceBackdrop.jsx
// (đường kính px, cỡ px, chu kỳ giây, góc đầu) — đổi ở đó thì đổi ở đây. Mặt Trăng đặt xa Trái Đất hơn bản nền (22 thay 13 px)
// để không dính vào Trái Đất khi xét va chạm.
const sun = (c) => ({ type: 'star', c })
const rock = (c) => ({ type: 'rock', c })
const SOLAR = {
  center: { key: 'sun', size: 160 },
  orbits: [
    { key: 'mercury', d: 230, size: 7, period: 36, start: 40 },
    { key: 'venus', d: 330, size: 11, period: 60, start: 200 },
    { key: 'earth', d: 450, size: 12, period: 95, start: 310, moon: { key: 'moon', r: 22, size: 4, period: 24 } },
    { key: 'mars', d: 580, size: 9, period: 150, start: 120 },
    { key: 'jupiter', d: 760, size: 26, period: 260, start: 250 },
    { key: 'saturn', d: 960, size: 21, period: 400, start: 20 },
  ],
  bodies: {
    sun: { name: 'Mặt Trời', look: sun(['#fff7d6', '#fbbf24', '#ea580c']) },
    mercury: { name: 'Sao Thủy', look: rock(['#d6d3d1', '#a8a29e', '#57534e']) },
    venus: { name: 'Sao Kim', look: rock(['#fef3c7', '#d6a756', '#8a5a1c']) },
    earth: { name: 'Trái Đất', look: rock(['#7dd3fc', '#2563eb', '#166534']) },
    moon: { name: 'Mặt Trăng', look: rock(['#f3f4f6', '#d1d5db', '#6b7280']) },
    mars: { name: 'Sao Hỏa', look: rock(['#fca5a5', '#c2410c', '#7c2d12']) },
    jupiter: { name: 'Sao Mộc', look: rock(['#fde68a', '#d4a373', '#8b5e34']) },
    saturn: { name: 'Sao Thổ', look: rock(['#fef3c7', '#e9c46a', '#a27b2c']) },
  },
}

const ME = 3.0e-6 // khối lượng Trái Đất tính theo Mặt Trời
// Khối lượng (lần Mặt Trời). Hành tinh Kepler-90 b…f chưa đo được khối lượng: ước tính theo bán kính, chỉ dùng cho mô phỏng
// (không hiển thị). Kepler-90 g, h: đo nhờ biến thiên thời điểm đi qua (TTV) ≈ 15 và ≈ 203 lần Trái Đất.
const MASS = {
  [SOLAR_ID]: { sun: 1, mercury: 0.055 * ME, venus: 0.815 * ME, earth: ME, moon: 0.0123 * ME, mars: 0.107 * ME, jupiter: 317.8 * ME, saturn: 95.2 * ME },
  'alpha-centauri': { 'alpha-a': 1.1, 'alpha-b': 0.9, proxima: 0.12, 'proxima-b': 1.07 * ME },
  'trappist-1': { 'trappist-1': 0.09, b: 1.37 * ME, c: 1.31 * ME, d: 0.39 * ME, e: 0.69 * ME, f: 1.04 * ME, g: 1.32 * ME, h: 0.33 * ME },
  'kepler-90': { 'kepler-90': 1.2, b: 2 * ME, c: 1.6 * ME, i: 2 * ME, d: 8 * ME, e: 7 * ME, f: 8 * ME, g: 15 * ME, h: 203 * ME },
}

export const FLIGHT_PLACES = Object.keys(MASS)
// Xu khi bay = ngưỡng Sao × 5 → Hệ Mặt Trời (0 Sao) không có Xu
export const hasFlightCoins = (id) => id !== SOLAR_ID
export const V_EDGE = 55 // vận tốc thoát khỏi hệ ở mép (đv/s)
export const V_MAX = 400 // vận tốc mong muốn tối đa trên thanh tốc độ (đv/s)
export const ENGINE = 30 // gia tốc tối đa của động cơ trong hệ (đv/s²) — sát sao lực hút lớn hơn số này
const ENGINE_OUT = 260 // ngoài mép hệ: chế độ lái nhẹ
const RESPONSE = 0.8 // giây: động cơ đưa vận tốc về vận tốc mong muốn (trong hệ)
const RESPONSE_OUT = 0.12
const COAST = 0.15 // nhả "Duy trì": vận tốc giảm dần theo e^(−COAST·t) (≈ 4,6 s giảm một nửa), lực hút bẻ cong đường bay
const TURN = 5 // tốc độ quay mũi tàu (rad/s)
export const WALL = 1.7 // viền vùng bay = 1,7 × bán kính mép hệ
export const SHIP_SCALE = 0.9 // cỡ hình tàu theo đv (tàu dài ≈ 29 đv): zoom thì tàu to / nhỏ theo bản đồ
export const SHIP_R = 10 // bán kính va chạm của tàu (đv), khớp cỡ hình tàu
export const COIN_R = 16 // nhặt Xu khi tàu cách đồng Xu dưới chừng này (đv)
const STAR_R = 0.3 // bán kính sao trên bản đồ bay = size × 0.3 (nhỏ hơn bản 3D để hành tinh trong cùng không nằm trong vùng nóng)
const HEAT = 1.6 // vùng nóng = 1,6 × bán kính sao (quy ước trò chơi: thật ra sao chỉ nguy hiểm sát bề mặt)
const WARN = 1.7 // vùng cảnh báo nhiệt = 1,7 × vùng nóng
const DT = 1 / 120

// Dựng thế giới bay cho một địa điểm (null nếu hệ chưa có dữ liệu bay)
export function buildWorld(id) {
  const sys = id === SOLAR_ID ? SOLAR : SYSTEMS[id]
  const mass = MASS[id]
  if (!sys || !mass) return null
  const bodies = []
  const add = (key, size, orbit) => {
    const info = sys.bodies[key]
    const star = info.look.type === 'star'
    const radius = star ? size * STAR_R : Math.max(5, size / 2)
    const b = { key, name: info.name, look: info.look, star, radius, heat: star ? radius * HEAT : 0, m: mass[key] || 0, mu: 0, orbit, x: 0, y: 0 }
    bodies.push(b)
    return b
  }
  if (sys.center) add(sys.center.key, sys.center.size, null)
  for (const o of sys.orbits) {
    const b = add(o.key, o.size, { r: o.d / 2, period: o.period, start: o.start, parent: null })
    if (o.moon) {
      // Mặt trăng / hành tinh của sao vệ tinh (Proxima b): đẩy ra ngoài vùng nóng của "cha" nếu bản 3D vẽ quá sát
      const r = Math.max(o.moon.r, b.heat + 14)
      add(o.moon.key, o.moon.size, { r, period: o.moon.period, start: 0, parent: b })
    }
  }
  const far = Math.max(...bodies.map((b) => (b.orbit ? b.orbit.r + (b.orbit.parent ? b.orbit.parent.orbit?.r || 0 : 0) : 0)))
  const edge = far + 70
  // GM tổng: vận tốc thoát ở mép hệ = V_EDGE (coi toàn bộ khối lượng ở tâm)
  const total = bodies.reduce((s, b) => s + b.m, 0)
  const muTotal = (V_EDGE * V_EDGE * edge) / 2
  for (const b of bodies) b.mu = (muTotal * b.m) / total
  const world = { id, bodies, edge, wall: edge * WALL, coins: [] }
  placeBodies(world, 0)
  return world
}

// Vị trí thiên thể tại thời điểm t (giây): quay theo chiều kim đồng hồ trên màn hình (y hướng xuống), như CSS rotate
function posAt(b, t) {
  if (!b.orbit) return [0, 0]
  const { r, period, start, parent } = b.orbit
  const a = ((start + (360 * t) / period) * Math.PI) / 180
  const [px, py] = parent ? posAt(parent, t) : [0, 0]
  return [px + r * Math.cos(a), py + r * Math.sin(a)]
}
export function placeBodies(world, t) {
  for (const b of world.bodies) [b.x, b.y] = posAt(b, t)
}

// Số ngẫu nhiên cố định theo tên hệ: đồng Xu số i luôn nằm cùng một chỗ ở mọi lần bay / mọi máy
function seeded(text) {
  let h = 2166136261
  for (const ch of text) h = Math.imul(h ^ ch.charCodeAt(0), 16777619)
  return () => {
    h = (h + 0x6d2b79f5) | 0
    let t = Math.imul(h ^ (h >>> 15), 1 | h)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
// Vị trí `total` đồng Xu (đứng yên): khoảng 2/3 trong hệ, 1/3 ở vùng trống ngoài mép (để có lý do bay ra ngoài).
// Tránh vùng nóng của sao (kể cả đường đi của sao quay quanh khối tâm) và tâm hệ.
export function coinSpots(world, total) {
  const rnd = seeded(world.id)
  const stars = world.bodies.filter((b) => b.star)
  const safe = (x, y) =>
    stars.every((s) => {
      const ring = s.orbit ? Math.abs(Math.hypot(x - (s.orbit.parent ? s.orbit.parent.x : 0), y - (s.orbit.parent ? s.orbit.parent.y : 0)) - s.orbit.r) : Math.hypot(x, y)
      return ring > s.heat * 1.9 + 14
    })
  const spots = []
  for (let i = 0, tries = 0; i < total && tries < total * 60; tries++) {
    const outside = i % 3 === 2
    const r = outside ? world.edge + 30 + rnd() * (world.wall - world.edge - 60) : 50 + rnd() * (world.edge - 70)
    const a = rnd() * Math.PI * 2
    const x = r * Math.cos(a)
    const y = r * Math.sin(a)
    if (!safe(x, y) || spots.some((p) => Math.hypot(p.x - x, p.y - y) < 30)) continue
    spots.push({ i, x, y })
    i++
  }
  return spots
}

// Tàu xuất phát ở 65 % bán kính mép, bay quỹ đạo tròn (không bị hút ngay), chỗ xa thiên thể nhất
export function startShip(world) {
  const r = world.edge * 0.65
  let best = 0
  let bestGap = -1
  for (let deg = 0; deg < 360; deg += 15) {
    const a = (deg * Math.PI) / 180
    const x = r * Math.cos(a)
    const y = r * Math.sin(a)
    const gap = Math.min(...world.bodies.map((b) => Math.hypot(b.x - x, b.y - y) - b.radius - b.heat))
    if (gap > bestGap) [best, bestGap] = [a, gap]
  }
  const x = r * Math.cos(best)
  const y = r * Math.sin(best)
  const v = Math.sqrt(world.bodies.reduce((s, b) => s + b.mu, 0) / r)
  // Tiếp tuyến cùng chiều quay của hành tinh
  const vx = -Math.sin(best) * v
  const vy = Math.cos(best) * v
  return { x, y, vx, vy, heading: Math.atan2(vy, vx), engine: 0 }
}

export function gravity(world, x, y) {
  let ax = 0
  let ay = 0
  for (const b of world.bodies) {
    const dx = b.x - x
    const dy = b.y - y
    const r2 = dx * dx + dy * dy
    const r = Math.sqrt(r2)
    const k = b.mu / (r2 * r)
    ax += dx * k
    ay += dy * k
  }
  return [ax, ay]
}

// Chạm vùng nguy hiểm: sao = vùng nóng, hành tinh = bề mặt
function hitAt(world, x, y) {
  for (const b of world.bodies) {
    const lim = b.star ? b.heat : b.radius + SHIP_R
    if ((b.x - x) ** 2 + (b.y - y) ** 2 < lim * lim) return b
  }
  return null
}

// Vận tốc thoát khỏi hệ tại (x, y)
export function escapeSpeed(world, x, y) {
  let s = 0
  for (const b of world.bodies) s += b.mu / Math.max(1, Math.hypot(b.x - x, b.y - y))
  return Math.sqrt(2 * s)
}

// Thiên thể kéo mạnh nhất tại (x, y) (GM/r² lớn nhất)
export function strongest(world, x, y) {
  let best = null
  let max = -1
  for (const b of world.bodies) {
    const g = b.mu / Math.max(1, (b.x - x) ** 2 + (b.y - y) ** 2)
    if (g > max) [best, max] = [b, g]
  }
  return best
}

// Mức nóng 0–1 theo ngôi sao gần nhất (0 = ngoài vùng cảnh báo, 1 = chạm vùng nóng)
export function heatLevel(world, x, y) {
  let h = 0
  let star = null
  for (const b of world.bodies) {
    if (!b.star) continue
    const d = Math.hypot(b.x - x, b.y - y)
    const warn = b.heat * WARN
    const v = Math.min(1, Math.max(0, (warn - d) / (warn - b.heat)))
    if (v > h) [h, star] = [v, b]
  }
  return { level: h, star }
}

// Một bước vật lý cho tàu (dùng chung cho mô phỏng thật và đường dự đoán).
// input = { aim: hướng mong muốn (rad) | null = giữ hướng mũi tàu, speed: vận tốc mong muốn (đv/s),
//           hold: đang giữ "Duy trì vận tốc" (hoặc đang vuốt thanh tốc độ) }
function advance(world, ship, input, h) {
  const outside = ship.x * ship.x + ship.y * ship.y > world.edge * world.edge
  if (input.aim != null) {
    let d = input.aim - ship.heading
    d = Math.atan2(Math.sin(d), Math.cos(d))
    const turn = (outside ? TURN * 3 : TURN) * h
    ship.heading += Math.abs(d) <= turn ? d : Math.sign(d) * turn
  }
  const [gx, gy] = gravity(world, ship.x, ship.y)
  // Động cơ KHÔNG chống trọng lực: lực hút luôn kéo tàu.
  //   chỉ chạy khi giữ "Duy trì"; nhả ra (hoặc vận tốc mong muốn = 0) → tắt máy, quán tính giảm dần, tàu trôi và rơi theo lực hút
  //   trong hệ: chỉ đẩy / hãm dọc mũi tàu (tối đa ENGINE) → phần vận tốc ngang vẫn trôi theo quán tính
  //   ngoài hệ: lái nhẹ, đẩy cả vector vận tốc về hướng kéo (tối đa ENGINE_OUT)
  const want = input.hold ? Math.max(0, Math.min(V_MAX, input.speed || 0)) : 0
  let ex = 0
  let ey = 0
  const lim = outside ? ENGINE_OUT : ENGINE
  if (want > 0) {
    if (outside) {
      const dir = input.aim != null ? input.aim : ship.heading
      ex = (want * Math.cos(dir) - ship.vx) / RESPONSE_OUT
      ey = (want * Math.sin(dir) - ship.vy) / RESPONSE_OUT
    } else {
      const nx = Math.cos(ship.heading)
      const ny = Math.sin(ship.heading)
      const f = (want - (ship.vx * nx + ship.vy * ny)) / RESPONSE
      ex = f * nx
      ey = f * ny
    }
  }
  const e = Math.hypot(ex, ey)
  if (e > lim) [ex, ey] = [(ex / e) * lim, (ey / e) * lim]
  ship.engine = Math.min(e, lim) / lim // 0–1: độ mạnh lửa đuôi
  ship.vx += (gx + ex) * h
  ship.vy += (gy + ey) * h
  if (!input.hold) {
    const k = Math.exp(-COAST * h)
    ship.vx *= k
    ship.vy *= k
  }
  ship.x += ship.vx * h
  ship.y += ship.vy * h
  // Viền vùng bay: không ra được nữa, bỏ phần vận tốc hướng ra ngoài
  const r = Math.hypot(ship.x, ship.y)
  if (r > world.wall) {
    const nx = ship.x / r
    const ny = ship.y / r
    ship.x = nx * world.wall
    ship.y = ny * world.wall
    const out = ship.vx * nx + ship.vy * ny
    if (out > 0) {
      ship.vx -= out * nx
      ship.vy -= out * ny
    }
    return true
  }
  return false
}

// Một khung hình mô phỏng (chia bước nhỏ). Đổi ship tại chỗ, trả { t, hit, wall, coins: [số thứ tự Xu vừa nhặt] }.
export function step(world, ship, input, t, dt) {
  let left = Math.min(dt, 0.05) // tab bị treo lâu: không nhảy cóc
  let wall = false
  const coins = []
  while (left > 1e-6) {
    const h = Math.min(DT, left)
    left -= h
    t += h
    placeBodies(world, t)
    wall = advance(world, ship, input, h) || wall
    const hit = hitAt(world, ship.x, ship.y)
    if (hit) return { t, hit, wall, coins }
    for (let i = world.coins.length - 1; i >= 0; i--) {
      const c = world.coins[i]
      if ((c.x - ship.x) ** 2 + (c.y - ship.y) ** 2 < COIN_R * COIN_R) {
        coins.push(c.i)
        world.coins.splice(i, 1)
      }
    }
  }
  return { t, hit: null, wall, coins }
}

// Đường bay dự đoán nếu giữ nguyên tay lái hiện tại: điểm mỗi 1/15 s trong `horizon` giây, kèm va chạm đầu tiên.
// Tính trên bản sao, có cả chuyển động của hành tinh.
export function predict(world, ship, input, t, horizon = 5) {
  const ghost = { bodies: world.bodies.map((b) => ({ ...b })), edge: world.edge, wall: world.wall }
  // bản sao giữ liên kết cha → con cho mặt trăng
  for (const b of ghost.bodies) if (b.orbit?.parent) b.orbit = { ...b.orbit, parent: ghost.bodies[world.bodies.indexOf(b.orbit.parent)] }
  const s = { ...ship }
  const pts = []
  const h = 1 / 30
  for (let i = 1; i <= horizon * 30; i++) {
    t += h
    placeBodies(ghost, t)
    advance(ghost, s, input, h)
    if (i % 2 === 0) pts.push(s.x, s.y)
    const hit = hitAt(ghost, s.x, s.y)
    if (hit) {
      pts.push(s.x, s.y)
      return { pts, hit: world.bodies[ghost.bodies.indexOf(hit)], time: i * h }
    }
  }
  return { pts, hit: null, time: 0 }
}
