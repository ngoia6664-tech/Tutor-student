import { describe, expect, it } from 'vitest'
import { matchTitle } from '../src/lib/format.js'

describe('matchTitle (ô tìm theo tên bài)', () => {
  it('ô trống: khớp mọi bài', () => {
    expect(matchTitle('Dao động cơ', '')).toBe(true)
    expect(matchTitle('Dao động cơ', '   ')).toBe(true)
  })
  it('không phân biệt hoa thường, bỏ khoảng trắng hai đầu', () => {
    expect(matchTitle('Dao động cơ', '  DAO ')).toBe(true)
  })
  it('gõ không dấu vẫn tìm được (kể cả đ)', () => {
    expect(matchTitle('Dao động điều hòa', 'dieu hoa')).toBe(true)
    expect(matchTitle('Dao động điều hòa', 'dong')).toBe(true)
  })
  it('không khớp thì false; tên trống không lỗi', () => {
    expect(matchTitle('Sóng cơ', 'điện')).toBe(false)
    expect(matchTitle(null, 'a')).toBe(false)
  })
})
