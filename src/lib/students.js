import { supabase, unwrap } from './supabase.js'

import { groupLabel } from './studentGroups.js'

// Các nhóm đã lưu (tên, ghi chú, thứ tự); chỉ gia sư đọc được (RLS)
export async function fetchGroupRows() {
  return unwrap(await supabase.from('student_groups').select('name, note, sort_order'))
}

// Tạo nhóm mới hoặc sửa ghi chú
export async function saveGroupNote(name, note) {
  unwrap(await supabase.from('student_groups').upsert({ name, note: note || null }, { onConflict: 'name' }))
}

// Đổi tên nhóm: cập nhật cả hồ sơ các em trong nhóm trong một lần (RPC)
export async function renameGroup(oldName, newName) {
  unwrap(await supabase.rpc('rename_student_group', { p_old: oldName, p_new: newName }))
}

// Danh sách học sinh (chỉ gia sư đọc được tất cả, nhờ RLS)
export async function fetchStudents() {
  return unwrap(
    await supabase
      .from('profiles')
      .select('id, full_name, group_name, grade, subjects')
      .eq('role', 'student')
      .order('group_name', { ascending: true, nullsFirst: false })
      .order('full_name', { ascending: true })
  )
}

export function studentLabel(s) {
  if (!s) return '(học sinh đã bị xóa)'
  const parts = [s.full_name || '(chưa đặt tên)']
  if (s.group_name) parts.push(groupLabel(s.group_name))
  if (s.grade) parts.push(`Lớp ${s.grade}`)
  return parts.join(' · ')
}

// Mã tạm cho phần tử trong danh sách (key của React)
let counter = 0
export function tempKey() {
  counter += 1
  return `k${Date.now().toString(36)}${counter}`
}
