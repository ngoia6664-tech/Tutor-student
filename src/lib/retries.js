import { supabase, unwrap } from './supabase.js'
import { viNum } from './exam.js'

// Học sinh làm lại bài đã nộp tối đa 3 lần. Điểm chính thức vẫn là lần nộp đầu.
export const MAX_RETRIES = 3

// Các lần làm lại theo điều kiện lọc. Bảng chưa có (chưa chạy lại schema.sql) thì trả về rỗng, không làm hỏng trang.
export async function loadRetries(filter) {
  let q = supabase.from('assignment_retries').select('*').order('attempt_no')
  for (const [col, val] of Object.entries(filter)) q = q.eq(col, val)
  const { data, error } = await q
  return error ? [] : data
}

// Nộp một lần làm lại; máy chủ chấm và trả về dòng vừa lưu
export async function submitRetry(assignmentId, answers) {
  return unwrap(await supabase.rpc('submit_retry', { p_assignment_id: assignmentId, p_answers: answers }))
}

// Điểm ngắn gọn của một lần làm lại: đề thi "7,5/10", bài thường "7/10 câu đúng"
export function retryScore(r, isExam) {
  const max = Number(r.max_points)
  if (isExam && max > 0) return `${viNum(max === 10 ? r.points : (Number(r.points) / max) * 10)}/10`
  if (r.auto_total > 0) return `${r.correct}/${r.auto_total} câu đúng`
  return 'tự luận'
}
