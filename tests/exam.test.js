// Đề thi thang THPT: cộng điểm từng phần, quy về thang 10
import { describe, expect, it } from 'vitest'
import { clockText, examStructure, examSummary, maxPoints, minutesUsed, questionLabels, viNum } from '../src/lib/exam.js'

const make = (kind, n) => Array.from({ length: n }, (_, i) => ({ id: `${kind}${i}`, kind }))
const standard = [...make('mcq', 18), ...make('true_false', 4), ...make('short', 6)]

describe('điểm đề thi', () => {
  it('điểm tối đa từng loại câu', () => {
    expect(maxPoints({ kind: 'mcq' })).toBe(0.25)
    expect(maxPoints({ kind: 'short' })).toBe(0.25)
    expect(maxPoints({ kind: 'true_false' })).toBe(1)
    expect(maxPoints({ kind: 'essay' })).toBe(0)
  })

  it('đề chuẩn 18 – 4 – 6 = 10 điểm', () => {
    const s = examStructure(standard)
    expect(s.standard).toBe(true)
    expect(s.max).toBe(10)
  })

  it('làm đúng hết được 10, không làm gì được 0', () => {
    const all = Object.fromEntries(standard.map((ex) => [ex.id, { points: maxPoints(ex) }]))
    expect(examSummary(standard, all).score10).toBe(10)
    expect(examSummary(standard, {}).score10).toBe(0)
  })

  it('cộng điểm lẻ không bị sai số dấu phẩy động', () => {
    // 3 câu trắc nghiệm đúng (0,75) + câu đúng/sai đúng 1 ý (0,1) + câu đúng 2 ý (0,25)
    const answers = { mcq0: { points: 0.25 }, mcq1: { points: 0.25 }, mcq2: { points: 0.25 }, true_false0: { points: 0.1 }, true_false1: { points: 0.25 } }
    const r = examSummary(standard, answers)
    expect(r.got).toBe(1.1)
    expect(r.score10).toBe(1.1)
  })

  it('đề rút gọn được quy về thang 10', () => {
    const r = examSummary(make('mcq', 4), { mcq0: { points: 0.25 }, mcq1: { points: 0.25 } })
    expect(r.max).toBe(1)
    expect(r.score10).toBe(5)
  })

  it('câu tự luận không tính vào điểm máy', () => {
    const list = [...make('mcq', 2), { id: 'e', kind: 'essay' }]
    expect(examSummary(list, { e: { points: 5 } }).got).toBe(0)
  })
})

describe('nhãn và hiển thị', () => {
  it('đánh số lại theo phần I, II, III', () => {
    const list = [{ id: 's', kind: 'short' }, { id: 'm1', kind: 'mcq' }, { id: 't', kind: 'true_false' }, { id: 'm2', kind: 'mcq' }]
    expect(questionLabels(list, true)).toEqual({ m1: 'I.1', m2: 'I.2', t: 'II.1', s: 'III.1' })
    expect(questionLabels(list, false)).toEqual({ s: '1', m1: '2', t: '3', m2: '4' })
  })

  it('đồng hồ và số kiểu Việt Nam', () => {
    expect(clockText(125)).toBe('02:05')
    expect(clockText(3725)).toBe('1:02:05')
    expect(clockText(-5)).toBe('00:00')
    expect(viNum(7.35)).toBe('7,35')
    expect(viNum('abc')).toBe('0')
  })

  it('thời gian làm bài làm tròn lên phút', () => {
    expect(minutesUsed('2026-10-30T08:00:00Z', '2026-10-30T08:10:01Z')).toBe(11)
    expect(minutesUsed(null, '2026-10-30T08:10:00Z')).toBeNull()
  })
})
