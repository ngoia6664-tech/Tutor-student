import { describe, expect, it } from 'vitest'
import {
  FLAME_SALTS,
  ORRERY_PLANETS,
  gravityDrop,
  keplerRatio,
  massEnergyJ,
  solarMatches,
  spectrumX,
  tntTons,
  wavelengthColor,
  wavelengthNm,
} from '../src/lib/labPhysics.js'

describe('số liệu thí nghiệm Phòng Khoa học', () => {
  it('cả 3 hành tinh đều cho T²/a³ ≈ 1 (định luật III Kepler)', () => {
    for (const p of ORRERY_PLANETS) expect(keplerRatio(p.a, p.T)).toBeCloseTo(1, 1)
  })

  it('khoảng cách gấp đôi thì lực giảm 4 lần', () => {
    expect(gravityDrop(2)).toBe(4)
  })

  it('đổi tần số ra bước sóng', () => {
    expect(wavelengthNm(500)).toBeCloseTo(599.6, 1)
  })

  it('1 gam vật chất tương đương khoảng 21.500 tấn TNT', () => {
    expect(massEnergyJ(1)).toBeCloseTo(8.988e13, -11)
    expect(tntTons(massEnergyJ(1))).toBeGreaterThan(21000)
    expect(tntTons(massEnergyJ(1))).toBeLessThan(22000)
  })

  it('màu theo bước sóng: đỏ, lục, lam đúng vùng', () => {
    expect(wavelengthColor(660)).toBe('rgb(255,0,0)')
    expect(wavelengthColor(530)).toMatch(/^rgb\(\d+,255,0\)$/)
    expect(wavelengthColor(450)).toMatch(/^rgb\(0,\d+,255\)$/)
  })

  it('dải phổ chạy từ 0 đến 1', () => {
    expect(spectrumX(380)).toBe(0)
    expect(spectrumX(780)).toBe(1)
  })

  it('chỉ vạch natri trùng vạch tối Mặt Trời trong danh sách', () => {
    const na = FLAME_SALTS.find((s) => s.id === 'na')
    expect(solarMatches(na?.lines ?? [])).toEqual([589.0, 589.6])
    for (const s of FLAME_SALTS.filter((x) => x.id !== 'na')) expect(solarMatches(s.lines)).toEqual([])
  })
})
