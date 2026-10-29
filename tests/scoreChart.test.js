// Điểm trên biểu đồ học tập
import { describe, expect, it } from 'vitest'
import { chartStats, pointScore } from '../src/lib/scoreChart.js'

describe('pointScore', () => {
  it('ưu tiên điểm gia sư đã chấm', () => {
    expect(pointScore({ status: 'checked', score: 7.5, machine: { allAuto: true, total: 10, correct: 10 } })).toBe(7.5)
  })

  it('chưa chấm: chỉ lấy điểm máy khi cả bài chấm máy', () => {
    expect(pointScore({ status: 'done', machine: { allAuto: true, total: 4, correct: 3 } })).toBe(7.5)
    expect(pointScore({ status: 'done', machine: { allAuto: true, kind: 'exam', score10: 8.25 } })).toBe(8.25)
    expect(pointScore({ status: 'done', machine: { allAuto: false, total: 4, correct: 4 } })).toBeNull()
    expect(pointScore({ status: 'done', machine: { allAuto: true, total: 0, correct: 0 } })).toBeNull()
  })

  it('gia sư chấm 0 điểm vẫn là 0, không bị coi là chưa chấm', () => {
    expect(pointScore({ status: 'checked', score: 0 })).toBe(0)
  })
})

describe('chartStats', () => {
  it('không có bài nào', () => {
    expect(chartStats([])).toEqual({ avg: null, max: null, count: 0, trend: null })
  })

  it('xu hướng = TB 3 bài gần nhất trừ TB 3 bài trước', () => {
    const pts = [4, 5, 6, 8, 8, 8].map((score) => ({ score }))
    expect(chartStats(pts)).toEqual({ avg: 6.5, max: 8, count: 6, trend: 3 })
    expect(chartStats(pts.slice(0, 3)).trend).toBeNull()
  })
})
