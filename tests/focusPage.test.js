import { describe, expect, it } from 'vitest'
import { isFocusPage } from '../src/lib/focusPage.js'

describe('isFocusPage', () => {
  it('chỉ trang làm một bài / đọc một bài giảng', () => {
    expect(isFocusPage('/student/assignments/abc')).toBe(true)
    expect(isFocusPage('/student/lessons/abc')).toBe(true)
    expect(isFocusPage('/student/lessons')).toBe(false)
    expect(isFocusPage('/student/results')).toBe(false)
    expect(isFocusPage('/student')).toBe(false)
  })
})
