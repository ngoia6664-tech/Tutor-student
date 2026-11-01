// Thư mục trong chương: gom bài theo thư mục, bài lạc thư mục về "Chưa xếp"
import { describe, expect, it } from 'vitest'
import { groupByFolder } from '../src/lib/folders.js'

const F = [
  { id: 'f1', name: 'Lý thuyết' },
  { id: 'f2', name: 'Luyện tập' },
]

describe('groupByFolder', () => {
  it('giữ thứ tự thư mục, "Chưa xếp" ở cuối; thư mục rỗng vẫn có mặt', () => {
    const g = groupByFolder(F, [{ id: 'l1', folder_id: 'f1' }, { id: 'l2', folder_id: null }], [{ id: 'a1', folder_id: 'f1' }])
    expect(g.map((x) => x.folder?.id ?? null)).toEqual(['f1', 'f2', null])
    expect(g[0].lessons.map((x) => x.id)).toEqual(['l1'])
    expect(g[0].assignments.map((x) => x.id)).toEqual(['a1'])
    expect(g[1]).toEqual({ folder: F[1], lessons: [], assignments: [] })
    expect(g[2].lessons.map((x) => x.id)).toEqual(['l2'])
  })
  it('bài trỏ tới thư mục không còn (hoặc không thấy) → "Chưa xếp"', () => {
    const g = groupByFolder(F, [{ id: 'l1', folder_id: 'mất' }], [])
    expect(g[2].lessons.map((x) => x.id)).toEqual(['l1'])
  })
  it('folderOf đọc folder_id lồng bên trong (trang học sinh)', () => {
    const g = groupByFolder(F, [], [{ assignment: { id: 'a1', folder_id: 'f2' } }], (x) => (x.assignment || x).folder_id)
    expect(g[1].assignments).toHaveLength(1)
  })
})
