import { supabase, unwrap } from './supabase.js'
import { autoSummary } from './assignments.js'
import { daysUntil } from './format.js'
import { examSummary } from './exam.js'

// Trạng thái hiển thị của một bài: chưa nộp còn hạn / quá hạn / chờ chấm / đã chấm
export function recState(rec, dueDate) {
  if (rec.status === 'checked') return 'checked'
  if (rec.status === 'done') return 'done'
  const n = daysUntil(dueDate)
  return n !== null && n < 0 ? 'overdue' : 'todo'
}

export const STATE_LABEL = { todo: 'Chưa nộp', overdue: 'Quá hạn', done: 'Chờ chấm', checked: 'Đã chấm' }
export const STATE_TONE = { todo: 'warn', overdue: 'danger', done: 'primary', checked: 'ok' }

const round1 = (n) => Math.round(n * 10) / 10

// Đếm nhanh cho bảng học sinh: { [student_id]: { lessons, total, todo, overdue, done, checked, avg } }
export async function fetchStudentStats() {
  const [recs, lessonRecs] = await Promise.all([
    supabase.from('assignment_recipients').select('student_id, status, score, assignment:assignments(due_date)').then(unwrap),
    supabase.from('lesson_recipients').select('student_id').then(unwrap),
  ])
  const stats = {}
  const get = (id) => (stats[id] ??= { lessons: 0, total: 0, todo: 0, overdue: 0, done: 0, checked: 0, scores: [] })
  for (const r of lessonRecs) get(r.student_id).lessons++
  for (const r of recs) {
    const s = get(r.student_id)
    s.total++
    s[recState(r, r.assignment?.due_date)]++
    if (r.status === 'checked' && r.score !== null) s.scores.push(Number(r.score))
  }
  for (const s of Object.values(stats)) s.avg = s.scores.length ? round1(s.scores.reduce((a, b) => a + b, 0) / s.scores.length) : null
  return stats
}

// Hồ sơ đầy đủ một học sinh: bài tập (kèm điểm máy chấm + điểm gia sư) và bài giảng được giao
export async function fetchStudentReport(studentId) {
  const [student, recs, lessonRecs, answers] = await Promise.all([
    supabase.from('profiles').select('id, full_name, group_name, grade, subjects, role').eq('id', studentId).maybeSingle().then(unwrap),
    supabase
      .from('assignment_recipients')
      .select('status, score, feedback, submitted_at, started_at, assigned_at, assignment:assignments(id, title, type, due_date, is_exam, time_limit_minutes, chapter_id, created_at)')
      .eq('student_id', studentId)
      .then(unwrap),
    supabase
      .from('lesson_recipients')
      .select('assigned_at, lesson:lessons(id, title, chapter_id, created_at)')
      .eq('student_id', studentId)
      .then(unwrap),
    supabase.from('submission_answers').select('assignment_id, exercise_id, is_correct, points').eq('student_id', studentId).then(unwrap),
  ])
  if (!student) throw new Error('Không tìm thấy học sinh này.')

  const assignmentIds = recs.map((r) => r.assignment?.id).filter(Boolean)
  const exercises = assignmentIds.length
    ? unwrap(await supabase.from('exercises').select('id, assignment_id, kind').in('assignment_id', assignmentIds))
    : []
  const exByAssignment = {}
  for (const e of exercises) (exByAssignment[e.assignment_id] ??= []).push(e)
  const ansByExercise = Object.fromEntries(answers.map((a) => [a.exercise_id, a]))

  const assignments = recs
    .filter((r) => r.assignment)
    .map((r) => {
      const a = r.assignment
      const exs = exByAssignment[a.id] || []
      const state = recState(r, a.due_date)
      // Điểm máy chấm: đề thi → thang 10 THPT; bài thường → số câu đúng phần chấm máy
      let machine = null
      if (r.status !== 'todo') {
        if (a.is_exam) {
          const sum = examSummary(exs, ansByExercise)
          if (sum.max) machine = { kind: 'exam', score10: sum.score10, got: sum.got, max: sum.max }
        } else {
          const sum = autoSummary(exs, ansByExercise)
          if (sum.autoTotal) machine = { kind: 'auto', correct: sum.correct, total: sum.autoTotal }
        }
      }
      return { ...r, assignment: a, state, count: exs.length, machine, score: r.score === null ? null : Number(r.score) }
    })
    .sort((x, y) => String(y.assigned_at || y.assignment.created_at).localeCompare(String(x.assigned_at || x.assignment.created_at)))

  const lessons = lessonRecs
    .filter((r) => r.lesson)
    .sort((x, y) => String(y.assigned_at || y.lesson.created_at).localeCompare(String(x.assigned_at || x.lesson.created_at)))

  const scores = assignments.filter((r) => r.state === 'checked' && r.score !== null)
  const counts = { todo: 0, overdue: 0, done: 0, checked: 0 }
  for (const r of assignments) counts[r.state]++
  const submitted = counts.done + counts.checked
  return {
    student,
    assignments,
    lessons,
    summary: {
      total: assignments.length,
      ...counts,
      submitted,
      submitRate: assignments.length ? Math.round((submitted / assignments.length) * 100) : null,
      avg: scores.length ? round1(scores.reduce((n, r) => n + r.score, 0) / scores.length) : null,
      lessons: lessons.length,
    },
  }
}
