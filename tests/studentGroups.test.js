import { describe, expect, it } from 'vitest'
import { buildGroups, groupLabel } from '../src/lib/studentGroups.js'

describe('studentGroups', () => {
  it('nhãn: một chữ cái cũ thành "Nhóm A", tên tự đặt giữ nguyên', () => {
    expect(groupLabel('A')).toBe('Nhóm A')
    expect(groupLabel('Lý 12 tối')).toBe('Lý 12 tối')
  })

  it('gom nhóm: nhóm rỗng còn, theo sort_order, nhóm chỉ có trong hồ sơ ở cuối, em chưa xếp riêng', () => {
    const students = [
      { id: '1', group_name: 'B' },
      { id: '2', group_name: 'Mới' },
      { id: '3', group_name: null },
      { id: '4', group_name: 'B' },
    ]
    const rows = [
      { name: 'B', note: 'ghi chú', sort_order: 2 },
      { name: 'Trống', note: null, sort_order: 1 },
    ]
    const { groups, ungrouped } = buildGroups(students, rows)
    expect(groups.map((g) => g.name)).toEqual(['Trống', 'B', 'Mới'])
    expect(groups[0].students).toHaveLength(0)
    expect(groups[1]).toMatchObject({ note: 'ghi chú' })
    expect(groups[1].students.map((s) => s.id)).toEqual(['1', '4'])
    expect(ungrouped.map((s) => s.id)).toEqual(['3'])
  })
})
