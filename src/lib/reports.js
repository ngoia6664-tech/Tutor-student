import { supabase } from './supabase.js'

// Sự kiện báo thanh menu cập nhật số câu bị báo lỗi đang chờ
export const REPORTS_CHANGED = 'reports-changed'

// Báo lỗi đề gần nhất của học sinh cho từng câu. Bảng chưa có (chưa chạy lại schema.sql) thì bỏ qua, không làm hỏng trang.
/** @param {string[]} exerciseIds @param {string} studentId */
export async function loadMyReports(exerciseIds, studentId) {
  if (!exerciseIds.length) return {}
  const { data, error } = await supabase
    .from('question_reports')
    .select('id, exercise_id, note, status, created_at, resolved_at')
    .eq('student_id', studentId)
    .in('exercise_id', exerciseIds)
    .order('created_at', { ascending: true })
  if (error) return {}
  return Object.fromEntries(data.map((r) => [r.exercise_id, r]))
}

// Số câu đang bị báo lỗi (chưa xử lý). Lỗi (vd. chưa chạy lại schema.sql) → 0
export async function countOpenReports() {
  const { data, error } = await supabase.from('question_reports').select('exercise_id').eq('status', 'open')
  if (error) return 0
  return new Set(data.map((r) => r.exercise_id)).size
}
