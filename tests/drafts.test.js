import { describe, expect, it } from 'vitest'
import { draftCount, draftKey } from '../src/lib/drafts.js'

describe('drafts', () => {
  it('khóa nháp: bài thường và làm lại tách riêng', () => {
    expect(draftKey('a1', 's1')).toBe('draft-answers:s1:a1')
    expect(draftKey('a1', 's1', true)).toBe('draft-retry:s1:a1')
  })
  it('đếm câu đã trả lời, bỏ câu trống', () => {
    expect(draftCount(null)).toBe(0)
    expect(draftCount({})).toBe(0)
    expect(draftCount({ e1: { choice: 'A' }, e2: '', e3: null, e4: {}, e5: 'lời giải' })).toBe(2)
  })
})
