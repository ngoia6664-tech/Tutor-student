import { describe, expect, it } from 'vitest'
import { buildBackup, parseBackup } from '../src/lib/streakBackup.js'

describe('sao lưu chuỗi', () => {
  const students = [{ id: 'a', full_name: 'An' }, { id: 'b', full_name: null }]
  const streaks = [{ student_id: 'a', current_streak: 12, longest_streak: 30 }]

  it('học sinh chưa có dòng chuỗi được ghi là 0', () => {
    const b = buildBackup(students, streaks, new Date('2026-11-01T00:00:00Z'))
    expect(b.streaks).toEqual([
      { student_id: 'a', name: 'An', current: 12, longest: 30 },
      { student_id: 'b', name: '', current: 0, longest: 0 },
    ])
  })

  it('ghi rồi đọc lại ra đúng danh sách', () => {
    const text = JSON.stringify(buildBackup(students, streaks))
    expect(parseBackup(text)).toHaveLength(2)
    expect(parseBackup(text)[0].current).toBe(12)
  })

  it('từ chối file sai định dạng, bỏ dòng số xấu', () => {
    expect(() => parseBackup('không phải json')).toThrow('JSON')
    expect(() => parseBackup('{"streaks":[]}')).toThrow('sao lưu')
    const bad = JSON.stringify({ format: 'streak-backup/v1', streaks: [{ student_id: 'a', current: -1, longest: 3 }, { student_id: 'b', current: 2, longest: 2 }] })
    expect(parseBackup(bad).map((r) => r.student_id)).toEqual(['b'])
  })
})
