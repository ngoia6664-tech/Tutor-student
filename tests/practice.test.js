// Chấm trên máy khi ôn câu sai — phải cùng quy tắc với grade_answer trong schema.sql
import { describe, expect, it } from 'vitest'
import { gradeLocal } from '../src/lib/practice.js'

describe('gradeLocal', () => {
  it('trắc nghiệm: không phân biệt hoa thường', () => {
    expect(gradeLocal('mcq', 'B', { choice: 'b' })).toBe(true)
    expect(gradeLocal('mcq', 'B', { choice: 'C' })).toBe(false)
    expect(gradeLocal('mcq', 'B', {})).toBe(false)
  })

  it('trả lời ngắn: số so theo giá trị, dấu phẩy = dấu chấm', () => {
    expect(gradeLocal('short', '1,89', { text: '1.890' })).toBe(true)
    expect(gradeLocal('short', '1,89', { text: ' 1,89 ' })).toBe(true)
    expect(gradeLocal('short', '-2', { text: '−2' })).toBe(true)
    expect(gradeLocal('short', '1,89', { text: '1,8' })).toBe(false)
  })

  it('trả lời ngắn: nhiều cách viết ngăn bằng ";"', () => {
    expect(gradeLocal('short', '0,5; 1/2', { text: '1/2' })).toBe(true)
    expect(gradeLocal('short', '0,5; 1/2', { text: '0.5' })).toBe(true)
    expect(gradeLocal('short', '0,5; 1/2', { text: '2' })).toBe(false)
  })

  it('trả lời ngắn: bỏ trống là sai', () => {
    expect(gradeLocal('short', '3', { text: '   ' })).toBe(false)
  })

  it('đúng/sai: phải đúng cả 4 ý, thiếu ý là sai', () => {
    const correct = { a: true, b: false, c: true, d: false }
    expect(gradeLocal('true_false', correct, { tf: { a: true, b: false, c: true, d: false } })).toBe(true)
    expect(gradeLocal('true_false', correct, { tf: { a: true, b: false, c: true, d: true } })).toBe(false)
    expect(gradeLocal('true_false', correct, { tf: { a: true, b: false, c: true } })).toBe(false)
  })

  it('điền khuyết: bỏ khoảng trắng thừa, dấu câu cuối, hoa thường', () => {
    const correct = { a: 'Vận tốc', b: '10 m/s' }
    expect(gradeLocal('fill_blank', correct, { blanks: { a: ' vận   tốc.', b: '10 m/s' } })).toBe(true)
    expect(gradeLocal('fill_blank', correct, { blanks: { a: 'gia tốc', b: '10 m/s' } })).toBe(false)
    expect(gradeLocal('fill_blank', correct, { blanks: { a: 'vận tốc' } })).toBe(false)
  })

  it('tự luận hoặc thiếu đáp án: không chấm được (null)', () => {
    expect(gradeLocal('essay', 'abc', { text: 'abc' })).toBeNull()
    expect(gradeLocal('mcq', null, { choice: 'A' })).toBeNull()
    expect(gradeLocal('mcq', 'A', null)).toBeNull()
  })
})
