import { supabase } from './supabase.js'

// Sự kiện báo thanh menu cập nhật số câu bị báo lỗi đang chờ
export const REPORTS_CHANGED = 'reports-changed'

// Số câu đang bị báo lỗi (chưa xử lý). Lỗi (vd. chưa chạy lại schema.sql) → 0
export async function countOpenReports() {
  const { data, error } = await supabase.from('question_reports').select('exercise_id').eq('status', 'open')
  if (error) return 0
  return new Set(data.map((r) => r.exercise_id)).size
}
