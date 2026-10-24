import { supabase, unwrap } from './supabase.js'

// Câu khó học sinh tự đánh dấu (bảng question_marks): chỉ mất khi học sinh bấm "Bỏ đánh dấu"

// Các câu đã đánh dấu trong danh sách: Map exercise_id → ghi chú. Bảng chưa có (chưa chạy lại schema.sql) thì bỏ qua.
export async function loadMarks(exerciseIds, studentId) {
  if (!exerciseIds.length) return new Map()
  const { data, error } = await supabase
    .from('question_marks')
    .select('exercise_id, note')
    .eq('student_id', studentId)
    .in('exercise_id', exerciseIds)
  return new Map(error ? [] : data.map((r) => [r.exercise_id, r.note || '']))
}

// Lưu ghi chú riêng cho một câu khó (tối đa 4000 ký tự, khớp ràng buộc trong schema.sql)
export const NOTE_MAX = 4000
export async function saveMarkNote(exerciseId, studentId, note) {
  unwrap(await supabase.from('question_marks').update({ note }).eq('exercise_id', exerciseId).eq('student_id', studentId))
}

export async function setMark(exerciseId, studentId, on) {
  if (on) unwrap(await supabase.from('question_marks').upsert({ exercise_id: exerciseId, student_id: studentId }, { ignoreDuplicates: true }))
  else unwrap(await supabase.from('question_marks').delete().eq('exercise_id', exerciseId).eq('student_id', studentId))
}
