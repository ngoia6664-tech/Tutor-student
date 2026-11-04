import { describe, expect, it } from 'vitest'
import { filterHelp } from '../src/lib/help/filter.js'
import { STUDENT_HELP } from '../src/lib/help/student.js'
import { TUTOR_HELP } from '../src/lib/help/tutor.js'

const SECTIONS = [
  { title: 'A', icon: 'help', items: [{ q: 'Nộp lại thế nào?', a: 'Bấm **Cho nộp lại**.' }] },
  { title: 'B', icon: 'help', items: [{ q: 'Chuỗi là gì?', a: 'Làm **Ôn tập** mỗi ngày.' }] },
]

describe('filterHelp', () => {
  it('không có từ khóa: giữ nguyên tất cả', () => {
    expect(filterHelp(SECTIONS, '')).toHaveLength(2)
  })

  it('gõ không dấu vẫn khớp, nhóm không còn câu nào thì bỏ', () => {
    expect(filterHelp(SECTIONS, 'nop lai').map((s) => s.title)).toEqual(['A'])
  })

  it('tìm được trong câu trả lời, kể cả cụm từ bị in đậm', () => {
    expect(filterHelp(SECTIONS, 'on tap moi ngay').map((s) => s.title)).toEqual(['B'])
  })

  it('không khớp câu nào: trả về rỗng', () => {
    expect(filterHelp(SECTIONS, 'học phí')).toEqual([])
  })
})

describe('nội dung Hỏi đáp', () => {
  it('học sinh đọc "giáo viên", không còn chữ "gia sư"', () => {
    expect(JSON.stringify(STUDENT_HELP).toLowerCase()).not.toContain('gia sư')
  })

  it('không trùng câu hỏi trong một bộ (câu hỏi là key của React)', () => {
    for (const set of [STUDENT_HELP, TUTOR_HELP]) {
      const qs = set.flatMap((s) => s.items.map((it) => it.q))
      expect(new Set(qs).size).toBe(qs.length)
    }
  })
})
