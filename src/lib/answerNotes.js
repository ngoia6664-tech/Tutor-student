import { supabase, unwrap } from './supabase.js'

// Lời phê từng câu của gia sư ("Giáo viên chấm:"), bảng answer_comments.
// Bảng chưa có (chưa chạy lại schema.sql) thì coi như chưa có lời phê, không làm hỏng trang.

export const NOTE_LABEL = 'Giáo viên chấm:'

// Trả về { student_id: { exercise_id: note } } (gia sư: cả bài; học sinh: truyền studentId)
export async function loadAnswerNotes(assignmentId, studentId) {
  let q = supabase.from('answer_comments').select('student_id, exercise_id, note').eq('assignment_id', assignmentId)
  if (studentId) q = q.eq('student_id', studentId)
  const { data, error } = await q
  if (error) return {}
  const out = {}
  for (const r of data) (out[r.student_id] ??= {})[r.exercise_id] = r.note
  return out
}

// Ghi lời phê của một học sinh: câu có chữ → upsert, câu xóa trắng → xóa dòng. Không đổi thì không gửi gì.
export async function saveAnswerNotes(assignmentId, studentId, notes, prev = {}) {
  const ids = new Set([...Object.keys(notes), ...Object.keys(prev)])
  const upserts = []
  const removed = []
  for (const id of ids) {
    const v = (notes[id] || '').trim()
    if (v === (prev[id] || '').trim()) continue
    if (v) upserts.push({ assignment_id: assignmentId, student_id: studentId, exercise_id: id, note: v, updated_at: new Date().toISOString() })
    else removed.push(id)
  }
  await Promise.all([
    upserts.length && supabase.from('answer_comments').upsert(upserts).then(unwrap),
    removed.length &&
      supabase.from('answer_comments').delete().eq('student_id', studentId).in('exercise_id', removed).then(unwrap),
  ])
}
