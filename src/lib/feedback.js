import { supabase, unwrap } from './supabase.js'

// Góp ý của người dùng (bảng feedback). Học sinh gửi, gia sư xem ở trang "Góp ý".
export const FEEDBACK_CHANGED = 'feedback-changed'

export const KINDS = [
  { id: 'idea', label: 'Ý tưởng', emoji: '💡' },
  { id: 'bug', label: 'Báo lỗi', emoji: '🐞' },
  { id: 'praise', label: 'Lời khen', emoji: '💖' },
  { id: 'other', label: 'Khác', emoji: '💬' },
]
export const KIND_BY_ID = Object.fromEntries(KINDS.map((k) => [k.id, k]))

// Mức hài lòng 1–5
export const RATINGS = [
  { value: 1, emoji: '😞', label: 'Chưa ổn' },
  { value: 2, emoji: '😕', label: 'Tạm' },
  { value: 3, emoji: '🙂', label: 'Được' },
  { value: 4, emoji: '😄', label: 'Thích' },
  { value: 5, emoji: '🤩', label: 'Rất thích' },
]

export async function sendFeedback({ kind, rating, message, page }) {
  unwrap(await supabase.from('feedback').insert({ kind, rating: rating || null, message: message.trim(), page: page || null }))
}

export async function fetchFeedback() {
  return unwrap(
    await supabase
      .from('feedback')
      .select('id, kind, rating, message, page, seen, created_at, user:profiles(id, full_name, grade)')
      .order('created_at', { ascending: false })
  )
}

export async function markFeedbackSeen(ids, seen = true) {
  if (!ids.length) return
  unwrap(await supabase.from('feedback').update({ seen }).in('id', ids))
}

export async function deleteFeedback(id) {
  unwrap(await supabase.from('feedback').delete().eq('id', id))
}

// Số góp ý gia sư chưa xem. Lỗi (vd. chưa chạy lại schema.sql) → 0
export async function countUnseenFeedback() {
  const { count, error } = await supabase.from('feedback').select('id', { count: 'exact', head: true }).eq('seen', false)
  return error ? 0 : count || 0
}
