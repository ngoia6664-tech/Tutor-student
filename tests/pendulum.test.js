import { describe, expect, it } from 'vitest'
import { DEFAULT_LENGTH, EARTH_G, MOON_G, clockHands, clockRate, clockSpeedText, pendulumPeriod } from '../src/lib/pendulum.js'

describe('con lắc đồng hồ', () => {
  it('tính đúng chu kì trên Trái Đất và Mặt Trăng', () => {
    expect(pendulumPeriod(DEFAULT_LENGTH, EARTH_G)).toBeCloseTo(2.0, 2)
    expect(pendulumPeriod(1, MOON_G)).toBeCloseTo(4.94, 2)
  })

  it('dây dài gấp 4 lần thì chu kì gấp đôi, đồng hồ chậm đi 2 lần', () => {
    const l = 0.3
    expect(pendulumPeriod(4 * l, EARTH_G) / pendulumPeriod(l, EARTH_G)).toBeCloseTo(2, 6)
    expect(clockRate(DEFAULT_LENGTH * 4, EARTH_G)).toBeCloseTo(0.5, 6)
  })

  it('độ dài chuẩn thì đúng giờ, lệch thì báo nhanh / chậm', () => {
    expect(clockRate(DEFAULT_LENGTH, EARTH_G)).toBe(1)
    expect(clockSpeedText(1)).toBe('Đồng hồ chạy đúng giờ')
    expect(clockSpeedText(2)).toBe('Đồng hồ chạy nhanh gấp 2,00 lần')
    expect(clockSpeedText(0.5)).toBe('Đồng hồ chạy chậm đi 2,00 lần')
  })

  it('đặt đúng 3 kim', () => {
    const atThree = clockHands(3 * 3600)
    expect(atThree.hour).toBeCloseTo(Math.PI / 2, 6)
    expect(atThree.minute).toBe(0)
    expect(atThree.second).toBe(0)
    // 15 giờ cũng chỉ số III; kim giây nhảy nấc, không trôi giữa hai vạch
    expect(clockHands(15 * 3600).hour).toBeCloseTo(Math.PI / 2, 6)
    expect(clockHands(30.9).second).toBeCloseTo(Math.PI, 6)
  })
})
