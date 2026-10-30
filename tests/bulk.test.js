// Sửa nhiều / Xóa nhiều (lib/bulk.js): Supabase và hàm xóa từng bài được giả lập, không đụng CSDL thật
import { beforeEach, describe, expect, it, vi } from 'vitest'

const calls = []
let updateResult = {}
let deleteChapterError = null

vi.mock('../src/lib/supabase.js', () => {
  // Chuỗi truy vấn giả: ghi lại mọi lời gọi, trả kết quả theo bảng / thao tác
  const query = (table) => {
    const q = { table, ops: [] }
    const chain = {
      update(v) {
        q.ops.push(['update', v])
        return chain
      },
      delete() {
        q.ops.push(['delete'])
        return chain
      },
      select(cols) {
        q.ops.push(['select', cols])
        return chain
      },
      in(col, vals) {
        q.ops.push(['in', col, vals])
        return chain
      },
      then(resolve) {
        calls.push(q)
        const isUpdate = q.ops.some((o) => o[0] === 'update')
        const isDelete = q.ops.some((o) => o[0] === 'delete')
        const ids = q.ops.find((o) => o[0] === 'in')?.[2] || []
        if (isUpdate) return resolve(updateResult[table] || { data: ids.map((id) => ({ id })), error: null })
        if (isDelete) return resolve({ data: null, error: deleteChapterError })
        return resolve({ data: [], error: null })
      },
    }
    return chain
  }
  return {
    supabase: { from: query },
    unwrap(r) {
      if (r.error) throw r.error
      return r.data
    },
  }
})

const deleted = []
vi.mock('../src/lib/lessons.js', () => ({
  deleteLesson: vi.fn(async (l) => {
    if (l.id === 'L-bad') throw new Error('lỗi mạng')
    deleted.push(['lesson', l.id, l.file_path])
  }),
}))
vi.mock('../src/lib/assignments.js', () => ({
  deleteAssignment: vi.fn(async (id) => {
    if (id === 'A-bad') throw new Error('bị chặn')
    deleted.push(['assignment', id])
  }),
}))

const { deleteChapters, deleteItems, deleteWarning, itemsLabel, moveToChapter } = await import('../src/lib/bulk.js')

const L = (id, extra) => ({ kind: 'lesson', id, title: `Bài giảng ${id}`, ...extra })
const A = (id, extra) => ({ kind: 'assignment', id, title: `Bài tập ${id}`, ...extra })

beforeEach(() => {
  calls.length = 0
  deleted.length = 0
  updateResult = {}
  deleteChapterError = null
})

describe('lời xác nhận', () => {
  it('đếm đúng loại và số lượng', () => {
    expect(itemsLabel([L(1), L(2), A(3)])).toBe('2 bài giảng + 1 bài tập')
    expect(itemsLabel([A(1)])).toBe('1 bài tập')
  })

  it('cảnh báo bài tập đã có học sinh nộp', () => {
    expect(deleteWarning([A(1, { submitted: 2 }), A(2, { submitted: 0 })])).toMatch(/1 bài tập đã có học sinh nộp/)
    expect(deleteWarning([L(1)])).not.toMatch(/đã có học sinh nộp/)
  })
})

describe('chuyển chương', () => {
  it('chỉ cập nhật chapter_id, đúng bảng, đúng các bài đã chọn', async () => {
    const r = await moveToChapter([L('l1'), A('a1'), A('a2')], 'ch9')
    expect(r).toEqual({ moved: 3, failed: [] })
    expect(calls.map((c) => c.table)).toEqual(['lessons', 'assignments'])
    for (const c of calls) expect(c.ops.find((o) => o[0] === 'update')[1]).toEqual({ chapter_id: 'ch9' })
    expect(calls[1].ops.find((o) => o[0] === 'in')).toEqual(['in', 'id', ['a1', 'a2']])
  })

  it('chọn "Chưa xếp chương" thì chapter_id = null', async () => {
    await moveToChapter([L('l1')], '')
    expect(calls[0].ops.find((o) => o[0] === 'update')[1]).toEqual({ chapter_id: null })
  })

  it('bài bị RLS chặn (cập nhật 0 dòng) được báo là thất bại', async () => {
    updateResult.assignments = { data: [{ id: 'a1' }], error: null }
    const r = await moveToChapter([A('a1'), A('a2')], 'ch1')
    expect(r.moved).toBe(1)
    expect(r.failed.map((f) => f.item.id)).toEqual(['a2'])
  })

  it('một bảng lỗi không làm hỏng bảng kia', async () => {
    updateResult.lessons = { data: null, error: new Error('hết phiên') }
    const r = await moveToChapter([L('l1'), A('a1')], 'ch1')
    expect(r.moved).toBe(1)
    expect(r.failed.map((f) => f.item.id)).toEqual(['l1'])
  })
})

describe('xóa nhiều', () => {
  it('xóa đúng các mục đã chọn bằng hàm xóa một bài (kèm file đính kèm)', async () => {
    const r = await deleteItems([L('l1', { file_path: 'x/a.pdf' }), A('a1')])
    expect(r).toEqual({ done: 2, failed: [] })
    expect(deleted).toEqual([
      ['lesson', 'l1', 'x/a.pdf'],
      ['assignment', 'a1'],
    ])
  })

  it('thành công một phần: bài lỗi không chặn bài khác', async () => {
    const r = await deleteItems([A('A-bad'), L('l1'), L('L-bad'), A('a2')])
    expect(r.done).toBe(2)
    expect(r.failed.map((f) => f.item.id)).toEqual(['A-bad', 'L-bad'])
    expect(deleted.map((d) => d[1])).toEqual(['l1', 'a2'])
  })

  it('không xóa loại mục lạ', async () => {
    const r = await deleteItems([{ kind: 'chapter', id: 'c1', title: 'x' }])
    expect(r.done).toBe(0)
    expect(r.failed).toHaveLength(1)
  })
})

describe('xóa nhiều chương', () => {
  it('không kèm nội dung: chỉ xóa chương, không xóa bài', async () => {
    const r = await deleteChapters(['c1', 'c2'])
    expect(r).toMatchObject({ chapters: 2, kept: 0, done: 0 })
    expect(deleted).toEqual([])
    expect(calls).toHaveLength(1)
    expect(calls[0].table).toBe('chapters')
  })

  it('kèm nội dung: chương còn bài xóa lỗi thì giữ lại', async () => {
    const content = [L('l1', { chapter_id: 'c1' }), A('A-bad', { chapter_id: 'c2' }), A('a3', { chapter_id: 'c2' })]
    const r = await deleteChapters(['c1', 'c2'], content)
    expect(r).toMatchObject({ chapters: 1, kept: 1, done: 2 })
    expect(calls.at(-1).ops.find((o) => o[0] === 'in')).toEqual(['in', 'id', ['c1']])
  })

  it('lỗi khi xóa chương được báo lại, không ném ra ngoài', async () => {
    deleteChapterError = new Error('mất mạng')
    const r = await deleteChapters(['c1'])
    expect(r.chapters).toBe(0)
    expect(r.chapterError.message).toBe('mất mạng')
  })
})
