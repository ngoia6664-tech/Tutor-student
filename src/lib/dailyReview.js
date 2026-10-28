import { supabase, unwrap } from './supabase.js'

// Ôn tập mỗi ngày: máy chủ chọn bộ câu theo học sinh + ngày (giờ VN), chấm từng câu và trao thưởng khi xong.
// { date, pool?: 0, completed, coins, items: [{ exercise_id, kind, question_md, options, assignment_id, assignment_title, solved, tries, answer }] }
export async function fetchDailyReview() {
  return unwrap(await supabase.rpc('get_daily_review'))
}

// → { correct, completed, just_completed, streak } | { expired: true } (đã qua ngày mới)
export async function answerDailyReview(exerciseId, answer) {
  return unwrap(await supabase.rpc('answer_daily_review', { p_exercise_id: exerciseId, p_answer: answer }))
}

// Câu đã làm đúng: câu trả lời chính là đáp án → dùng để tô xanh khi xem lại
export function keyFromAnswer(kind, answer) {
  if (!answer) return null
  if (kind === 'mcq') return answer.choice ?? null
  if (kind === 'short') return answer.text ?? null
  if (kind === 'true_false') return answer.tf ?? null
  if (kind === 'fill_blank') return answer.blanks ?? null
  return null
}
