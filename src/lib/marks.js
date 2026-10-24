import { supabase, unwrap } from './supabase.js'

// Câu khó học sinh tự đánh dấu (bảng question_marks): chỉ mất khi học sinh bấm "Bỏ đánh dấu"

// Tập id các câu đã đánh dấu trong danh sách. Bảng chưa có (chưa chạy lại schema.sql) thì bỏ qua.
export async function loadMarks(exerciseIds, studentId) {
  if (!exerciseIds.length) return new Set()
  const { data, error } = await supabase
    .from('question_marks')
    .select('exercise_id')
    .eq('student_id', studentId)
    .in('exercise_id', exerciseIds)
  return new Set(error ? [] : data.map((r) => r.exercise_id))
}

export async function setMark(exerciseId, studentId, on) {
  if (on) unwrap(await supabase.from('question_marks').upsert({ exercise_id: exerciseId, student_id: studentId }, { ignoreDuplicates: true }))
  else unwrap(await supabase.from('question_marks').delete().eq('exercise_id', exerciseId).eq('student_id', studentId))
}
