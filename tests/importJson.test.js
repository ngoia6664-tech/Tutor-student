// Nhập JSON bài giảng / bài tập soạn sẵn
import { describe, expect, it } from 'vitest'
import { parseImport, SAMPLE_ASSIGNMENT, SAMPLE_LESSON } from '../src/lib/importJson.js'

const assignment = (exercises, extra = {}) => JSON.stringify({ kind: 'assignment', title: 'Bài 1', type: 'homework', exercises, ...extra })

describe('parseImport', () => {
  it('đọc được hai mẫu có sẵn trong trang', () => {
    expect(parseImport(SAMPLE_LESSON).drafts).toHaveLength(1)
    expect(parseImport(SAMPLE_ASSIGNMENT).drafts).toHaveLength(1)
  })

  it('tự sửa "\\frac" viết thiếu một dấu gạch', () => {
    const raw = String.raw`{"kind":"lesson","title":"Động năng","content_md":"$W = \frac{1}{2}mv^2$, $\theta$"}`
    const r = parseImport(raw)
    expect(r.drafts[0].content_md).toBe(String.raw`$W = \frac{1}{2}mv^2$, $\theta$`)
    expect(r.warnings.join(' ')).toMatch(/tự sửa 2/)
  })

  it('bỏ khung ```json khi dán từ chat', () => {
    const r = parseImport('```json\n{"kind":"lesson","title":"A","content_md":"x"}\n```')
    expect(r.drafts[0].title).toBe('A')
  })

  it('báo lỗi dễ hiểu khi JSON hỏng hoặc thiếu trường', () => {
    expect(() => parseImport('')).toThrow(/Chưa dán/)
    expect(() => parseImport('{"kind":')).toThrow(/JSON không hợp lệ/)
    expect(() => parseImport('[]')).toThrow(/đối tượng/)
    expect(() => parseImport('{"title":"A"}')).toThrow(/kind/)
    expect(() => parseImport(assignment([]))).toThrow(/ít nhất 1 câu/)
    expect(() => parseImport(assignment([{ question_md: 'x' }], { type: 'abc' }))).toThrow(/classwork/)
    expect(() => parseImport(assignment([{ question_md: 'x' }], { due_date: '30/10/2026' }))).toThrow(/YYYY-MM-DD/)
  })

  it('nhận đúng từng loại câu hỏi', () => {
    const ex = parseImport(
      assignment([
        { question_md: 'TN', options: ['1', '2', '3', '4'], correct: 'c' },
        { question_md: 'ĐS', statements: [{ text: 'a', answer: true }, { text: 'b', answer: 'sai' }, { text: 'c', answer: 'Đúng' }, { text: 'd', answer: false }] },
        { question_md: 'Ngắn', short_answer: 1.5 },
        { question_md: 'Điền', blanks: [{ statement: '...', answer: 'x' }] },
        { question_md: 'Tự luận', answer_md: 'giải' },
      ]),
    ).drafts[0].exercises
    expect(ex.map((e) => e.kind)).toEqual(['mcq', 'true_false', 'short', 'fill_blank', 'essay'])
    expect(ex[0].correct).toBe('C')
    expect(ex[1].correct).toEqual({ a: true, b: false, c: true, d: false })
    expect(ex[2].correct).toBe('1.5')
    expect(ex[3].correct).toEqual({ a: 'x' })
  })

  it('trắc nghiệm: đáp án không nằm trong các phương án thì báo lỗi', () => {
    expect(() => parseImport(assignment([{ question_md: 'x', options: ['1', '2'], correct: 'D' }]))).toThrow(/"correct" phải là một trong A, B/)
  })

  it('đúng/sai: ý thiếu answer thì báo lỗi, quá 4 ý thì cảnh báo', () => {
    expect(() => parseImport(assignment([{ question_md: 'x', statements: [{ text: 'a' }] }]))).toThrow(/true hoặc false/)
    const five = Array.from({ length: 5 }, () => ({ text: 's', answer: true }))
    expect(parseImport(assignment([{ question_md: 'x', statements: five }])).warnings.join(' ')).toMatch(/4 ý đầu/)
  })

  it('thời gian làm đề: bỏ trống = mặc định, null = không tính giờ', () => {
    const one = [{ question_md: 'x', short_answer: '1' }]
    expect(parseImport(assignment(one)).drafts[0].time_limit_minutes).toBeUndefined()
    expect(parseImport(assignment(one, { time_limit_minutes: null })).drafts[0].time_limit_minutes).toBeNull()
    expect(parseImport(assignment(one, { time_limit_minutes: 45, is_exam: true })).drafts[0]).toMatchObject({ time_limit_minutes: 45, is_exam: true })
  })
})
