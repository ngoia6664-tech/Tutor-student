// Nhãn "Mới" của chủ đề vừa nhập: đánh dấu, tắt khi mở, tự hết sau 7 ngày
import { beforeEach, describe, expect, it } from 'vitest'
import { clearRecent, markRecent, recentIds } from '../src/lib/recentChapters.js'

const DAY = 24 * 3600 * 1000

beforeEach(() => {
  const store = {}
  globalThis.localStorage = /** @type {any} */ ({
    getItem: (/** @type {string} */ k) => (k in store ? store[k] : null),
    setItem: (/** @type {string} */ k, /** @type {unknown} */ v) => {
      store[k] = String(v)
    },
  })
})

describe('chủ đề vừa nhập', () => {
  it('đánh dấu rồi đọc lại, bỏ qua id rỗng', () => {
    markRecent(['a', '', 'b'], 1000)
    expect([...recentIds(2000)].sort()).toEqual(['a', 'b'])
  })
  it('mở chủ đề thì tắt nhãn của chủ đề đó', () => {
    markRecent(['a', 'b'])
    clearRecent('a')
    expect([...recentIds()]).toEqual(['b'])
  })
  it('hết hạn sau 7 ngày', () => {
    markRecent(['a'], 0)
    expect(recentIds(6 * DAY).has('a')).toBe(true)
    expect(recentIds(8 * DAY).has('a')).toBe(false)
  })
  it('dữ liệu lưu hỏng thì coi như không có', () => {
    localStorage.setItem('recent-chapters', '{hỏng')
    expect(recentIds().size).toBe(0)
  })
})
