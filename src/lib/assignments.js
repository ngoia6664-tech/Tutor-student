import { supabase, unwrap, SUBMISSION_BUCKET } from './supabase.js'
import { loadRetries } from './retries.js'
import { loadAnswerNotes } from './answerNotes.js'

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
  await Promise.all(
    recs.map((r) => removeSubmissionFiles(r.submission_path).catch((e) => console.warn('Không xóa được ảnh bài nộp', r.submission_path, e)))
  )
  unwrap(await supabase.from('assignments').delete().eq('id', id))
}

// Dữ liệu một câu gửi lên hàm save_assignment
export function toExercisePayload(ex) {
  const kind = ex.kind || 'essay'
  return {
    id: ex.id || null,
    kind,
    question_md: ex.question_md,
    options: kind === 'essay' || kind === 'short' ? null : ex.options,
    correct: kind === 'essay' ? null : ex.correct,
    answer_md: ex.answer_md || '',
    method_md: ex.method_md || '',
  }
}

// answer_keys là quan hệ 1-1 nên PostgREST có thể trả về object hoặc mảng
function firstKey(k) {
  return Array.isArray(k) ? k[0] : k
}

// Tải bài tập đầy đủ (kể cả đáp án và câu trả lời) cho trang sửa / theo dõi của gia sư
export async function fetchAssignmentFull(id) {
  const [assignment, exercises, recipients, answers, retries, notesByStudent] = await Promise.all([
    supabase.from('assignments').select('*').eq('id', id).maybeSingle().then(unwrap),
    supabase
      .from('exercises')
      .select('id, sort_order, kind, question_md, options, answer_keys(answer_md, method_md, correct)')
      .eq('assignment_id', id)
      .order('sort_order')
      .then(unwrap),
    supabase.from('assignment_recipients').select('*, student:profiles(id, full_name, group_name, grade)').eq('assignment_id', id).then(unwrap),
    supabase.from('submission_answers').select('student_id, exercise_id, answer, is_correct, points').eq('assignment_id', id).then(unwrap),
    loadRetries({ assignment_id: id }),
    loadAnswerNotes(id),
  ])
  if (!assignment) throw new Error('Không tìm thấy bài tập (có thể đã bị xóa).')
  // Các lần học sinh tự làm lại (không phải điểm chính thức): { student_id: [lần 1, lần 2, ...] }
  const retriesByStudent = {}
  for (const r of retries) (retriesByStudent[r.student_id] ??= []).push(r)
  // Gom câu trả lời theo học sinh: { student_id: { exercise_id: {answer, is_correct} } }
  const answersByStudent = {}
  for (const a of answers) {
    answersByStudent[a.student_id] ??= {}
    answersByStudent[a.student_id][a.exercise_id] = a
  }
  return {
    assignment,
    exercises: exercises.map((e) => {
      const k = firstKey(e.answer_keys)
      return {
        id: e.id,
        kind: e.kind || 'essay',
        question_md: e.question_md,
        options: e.options || null,
        correct: k?.correct ?? null,
        answer_md: k?.answer_md || '',
        method_md: k?.method_md || '',
      }
    }),
    recipients,
    answersByStudent,
    retriesByStudent,
    notesByStudent,
  }
}

// Loại câu máy chấm được
export const AUTO_KINDS = ['mcq', 'fill_blank', 'true_false', 'short']

// Thống kê chấm tự động (bài thường): số câu máy chấm được và số câu đúng hoàn toàn
export function autoSummary(exercises, answers = {}) {
  const auto = exercises.filter((e) => AUTO_KINDS.includes(e.kind))
  const mcq = exercises.filter((e) => e.kind === 'mcq')
  const correct = auto.filter((e) => answers[e.id]?.is_correct === true).length
  return { autoTotal: auto.length, mcqTotal: mcq.length, correct, allAuto: auto.length === exercises.length && exercises.length > 0 }
}
