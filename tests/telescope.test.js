// Luật mở khóa địa điểm Kính thiên văn: mọi trường hợp lạ đều phải khóa
import { describe, expect, it } from 'vitest'
import { findPlace, placeAccess, SOLAR_ID } from '../src/lib/telescope.js'

const student = (stars) => ({ data: { isTutor: false, stars } })
const alpha = findPlace('alpha-centauri') // 5 Sao
const sirius = findPlace('sirius') // chưa làm xong

describe('placeAccess', () => {
  it('Hệ Mặt Trời luôn mở, kể cả khi chưa tải được số Sao', () => {
    expect(placeAccess(findPlace(SOLAR_ID), null).state).toBe('open')
  })

  it('đủ Sao thì mở, thiếu thì khóa và báo còn thiếu bao nhiêu', () => {
    expect(placeAccess(alpha, student(5)).state).toBe('open')
    expect(placeAccess(alpha, student(3.7))).toMatchObject({ state: 'locked', missing: 2 })
  })

  it('địa điểm chưa làm xong luôn khóa, kể cả gia sư và người nhiều Sao', () => {
    expect(placeAccess(sirius, student(999)).state).toBe('soon')
    expect(placeAccess(sirius, { data: { isTutor: true } }).state).toBe('soon')
  })

  it('gia sư được xem trước địa điểm đã làm xong', () => {
    expect(placeAccess(alpha, { data: { isTutor: true } })).toMatchObject({ state: 'open', preview: true })
  })

  it('đang tải, lỗi, hoặc số Sao hỏng → khóa', () => {
    expect(placeAccess(alpha, { loading: true }).state).toBe('loading')
    expect(placeAccess(alpha, { error: 'x' }).state).toBe('unknown')
    for (const bad of [NaN, -1, '10', null, Infinity]) expect(placeAccess(alpha, student(bad)).state).toBe('unknown')
    expect(placeAccess(null, student(10)).state).toBe('missing')
  })
})
