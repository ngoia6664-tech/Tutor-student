import { supabase, unwrap, SUBMISSION_BUCKET } from './supabase.js'

// Xóa ảnh bài nộp trong một thư mục <student_id>/<assignment_id>
export async function removeSubmissionFiles(folder) {
  if (!folder) return
  const files = unwrap(await supabase.storage.from(SUBMISSION_BUCKET).list(folder, { limit: 1000 }))
  const paths = (files || []).filter((f) => f.id).map((f) => `${folder}/${f.name}`)
  if (paths.length) unwrap(await supabase.storage.from(SUBMISSION_BUCKET).remove(paths))
}

// Xóa bài tập + ảnh bài nộp của mọi học sinh (câu hỏi, đáp án xóa theo cascade)
export async function deleteAssignment(id) {
  const recs = unwrap(await supabase.from('assignment_recipients').select('submission_path').eq('assignment_id', id))
  for (const r of recs) {
    try {
      await removeSubmissionFiles(r.submission_path)
    } catch (e) {
      console.warn('Không xóa được ảnh bài nộp', r.submission_path, e)
    }
  }
  unwrap(await supabase.from('assignments').delete().eq('id', id))
}

// Tải bài tập đầy đủ (kể cả đáp án) cho trang sửa / theo dõi của gia sư
export async function fetchAssignmentFull(id) {
  const assignment = unwrap(await supabase.from('assignments').select('*').eq('id', id).maybeSingle())
  if (!assignment) throw new Error('Không tìm thấy bài tập (có thể đã bị xóa).')
  const exercises = unwrap(
    await supabase
      .from('exercises')
      .select('id, sort_order, question_md, answer_keys(answer_md, method_md)')
      .eq('assignment_id', id)
      .order('sort_order')
  )
  const recipients = unwrap(
    await supabase
      .from('assignment_recipients')
      .select('*, student:profiles(id, full_name, group_name, grade)')
      .eq('assignment_id', id)
  )
  return {
    assignment,
    // answer_keys là quan hệ 1-1 nên có thể trả về object hoặc mảng tùy phiên bản
    exercises: exercises.map((e) => {
      const k = Array.isArray(e.answer_keys) ? e.answer_keys[0] : e.answer_keys
      return { id: e.id, question_md: e.question_md, answer_md: k?.answer_md || '', method_md: k?.method_md || '' }
    }),
    recipients,
  }
}
