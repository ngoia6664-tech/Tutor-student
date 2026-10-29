// Vật lý bay tự do: nút Duy trì, trôi chậm dần, giới hạn tốc độ, viền vùng bay
import { describe, expect, it } from 'vitest'
import { buildWorld, coinSpots, FLIGHT_PLACES, startShip, step, V_MAX } from '../src/lib/flight.js'

// Không gian trống (không lực hút) để đo riêng động cơ và quán tính
const empty = (edge = 1e6, wall = 1e6) => ({ bodies: [], coins: [], edge, wall })
const ship = (vx = 0, x = 0) => ({ x, y: 0, vx, vy: 0, heading: 0, engine: 0 })
const speed = (s) => Math.hypot(s.vx, s.vy)
// step() tự giới hạn mỗi khung 0,05 s → chạy nhiều khung
function fly(world, s, input, seconds) {
  let t = 0
  let last
  for (let i = 0; i < Math.round(seconds / 0.05); i++) {
    last = step(world, s, input, t, 0.05)
    t = last.t
  }
  return last
}

describe('nút Duy trì', () => {
  it('nhả nút: vận tốc giảm dần theo e^(−0,15·t)', () => {
    const s = ship(100)
    fly(empty(), s, { aim: null, speed: 150, hold: false }, 1)
    expect(speed(s)).toBeCloseTo(100 * Math.exp(-0.15), 3)
  })

  it('giữ nút: động cơ đưa tàu về đúng tốc độ đã chọn', () => {
    const s = ship()
    fly(empty(), s, { aim: null, speed: 50, hold: true }, 10)
    expect(speed(s)).toBeCloseTo(50, 0)
  })

  it('giữ nút mà tốc độ = 0: động cơ tắt, tàu giữ quán tính', () => {
    const s = ship(40)
    fly(empty(), s, { aim: null, speed: 0, hold: true }, 1)
    expect(speed(s)).toBeCloseTo(40, 5)
    expect(s.engine).toBe(0)
  })

  it(`tốc độ không vượt V_MAX = ${V_MAX}`, () => {
    const s = ship()
    fly(empty(), s, { aim: null, speed: 10_000, hold: true }, 30)
    expect(speed(s)).toBeLessThanOrEqual(V_MAX + 1e-6)
    expect(speed(s)).toBeGreaterThan(V_MAX - 1)
  })
})

describe('viền vùng bay', () => {
  it('chạm viền thì bị chặn lại, không bay ra ngoài', () => {
    const s = ship(200, 95)
    const world = empty(50, 100)
    expect(step(world, s, { aim: null, speed: 0, hold: false }, 0, 0.05).wall).toBe(true)
    fly(world, s, { aim: null, speed: 0, hold: false }, 0.5)
    expect(Math.hypot(s.x, s.y)).toBeLessThanOrEqual(100 + 1e-9)
    expect(s.vx).toBeLessThanOrEqual(1e-9)
  })
})

describe('các hệ sao', () => {
  it.each(FLIGHT_PLACES)('%s: dựng được, tàu xuất phát an toàn', (id) => {
    const world = buildWorld(id)
    expect(world).not.toBeNull()
    const s = startShip(world)
    expect(step(world, s, { aim: null, speed: 0, hold: true }, 0, 0.05).hit).toBeNull()
  })

  it('vị trí Xu cố định giữa các lần bay', () => {
    const id = FLIGHT_PLACES.find((p) => p !== 'he-mat-troi')
    expect(coinSpots(buildWorld(id), 10)).toEqual(coinSpots(buildWorld(id), 10))
  })
})
