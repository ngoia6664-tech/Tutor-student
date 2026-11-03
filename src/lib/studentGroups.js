// Nhóm học sinh (thuần, không gọi CSDL): tên nhóm tự do, ghi chú + thứ tự lưu ở bảng student_groups.

/** Tên hiển thị: tên một chữ cái cũ (A–E) → "Nhóm A"; tên tự đặt giữ nguyên. */
export function groupLabel(name) {
  return /^[A-Za-z]$/.test(name) ? `Nhóm ${name}` : name
}

/**
 * Gom học sinh theo nhóm. Nhóm = dòng student_groups (kể cả rỗng) + tên nhóm có trong hồ sơ học sinh.
 * Sắp: sort_order tăng dần (nhóm chưa có dòng đứng cuối) rồi theo tên.
 * @param {{ group_name?: string | null }[]} students
 * @param {{ name: string, note?: string | null, sort_order?: number | null }[]} rows
 * @returns {{ groups: { name: string, note: string, students: any[] }[], ungrouped: any[] }}
 */
export function buildGroups(students, rows) {
  const map = new Map()
  for (const r of rows || []) map.set(r.name, { name: r.name, note: r.note || '', order: r.sort_order ?? 0, students: [] })
  const ungrouped = []
  for (const s of students || []) {
    if (!s.group_name) {
      ungrouped.push(s)
      continue
    }
    if (!map.has(s.group_name)) map.set(s.group_name, { name: s.group_name, note: '', order: Infinity, students: [] })
    map.get(s.group_name).students.push(s)
  }
  const groups = [...map.values()]
    .sort((a, b) => (a.order === b.order ? 0 : a.order < b.order ? -1 : 1) || a.name.localeCompare(b.name, 'vi'))
    .map(({ name, note, students: list }) => ({ name, note, students: list }))
  return { groups, ungrouped }
}
