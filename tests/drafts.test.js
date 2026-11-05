import { describe, expect, it } from 'vitest'
import { draftCount, draftKey, readDraft, readDraftTime, writeDraft } from '../src/lib/drafts.js'

function fakeStorage() {
  const m = new Map()
  // @ts-ignore chỉ giả lập 3 hàm drafts.js dùng
  globalThis.localStorage = { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) }
  return m
}

describe('drafts', () => {
  it('khóa nháp: bài thường và làm lại tách riêng', () => {
    expect(draftKey('a1', 's1')).toBe('draft-answers:s1:a1')
    expect(draftKey('a1', 's1', true)).toBe('draft-retry:s1:a1')
  })
  it('ghi nháp kèm giờ ghi; xóa nháp xóa cả giờ', () => {
    const m = fakeStorage()
    expect(readDraftTime('k')).toBe(0)
    writeDraft('k', { e1: 'A' })
    expect(readDraft('k')).toEqual({ e1: 'A' })
    expect(readDraftTime('k')).toBeGreaterThan(0)
    writeDraft('k', null)
    expect(m.size).toBe(0)
  })
  it('đếm câu đã trả lời, bỏ câu trống', () => {
    expect(draftCount(null)).toBe(0)
    expect(draftCount({})).toBe(0)
    expect(draftCount({ e1: { choice: 'A' }, e2: '', e3: null, e4: {}, e5: 'lời giải' })).toBe(2)
  })
})
