import { supabase, unwrap } from './supabase.js'

export const GROUPS = ['A', 'B', 'C', 'D', 'E']

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
  if (s.group_name) parts.push(`Nhóm ${s.group_name}`)
  if (s.grade) parts.push(`Lớp ${s.grade}`)
  return parts.join(' · ')
}

// Mã tạm cho phần tử trong danh sách (key của React)
let counter = 0
export function tempKey() {
  counter += 1
  return `k${Date.now().toString(36)}${counter}`
}
