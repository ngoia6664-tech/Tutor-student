// @ts-nocheck — nợ kiểu: xóa dòng này rồi chạy npm run typecheck để sửa
import { supabase, unwrap } from './supabase.js'
import { removeSubmissionFiles } from './assignments.js'
import { SUBMISSIONS_CHANGED } from './submissions.js'

// Giao nhanh bài giảng / bài tập cho học sinh ngay từ danh sách (không qua trang Sửa).
// Gia sư được ghi thẳng bảng người nhận (RLS *_tutor_all); xóa người nhận bài tập thì bài nộp + điểm xóa theo cascade.
// course: giao cả khóa; máy chủ tự tạo / bỏ dòng giao từng bài trong khóa (from_course, xem schema.sql mục "Khóa học")
const TABLES = {
  lesson: { table: 'lesson_recipients', key: 'lesson_id' },
  assignment: { table: 'assignment_recipients', key: 'assignment_id' },
  course: { table: 'course_recipients', key: 'course_id' },
}

// Người nhận hiện tại của một bài: [{ student_id, status?, submission_path? }]
// Chỉ người nhận giao riêng: học sinh nhận bài qua khóa do khóa quản, không bỏ được ở đây
export async function fetchRecipients(kind, id) {
  const { table, key } = TABLES[kind]
  const cols = kind === 'assignment' ? 'student_id, status, submission_path' : 'student_id'
  let q = supabase.from(table).select(cols).eq(key, id)
  if (kind !== 'course') q = q.eq('from_course', false)
  return unwrap(await q)
}

// Đặt lại đúng danh sách học sinh cho một bài: bỏ người không còn chọn, thêm người mới
export async function setRecipients(kind, id, studentIds, current) {
  const { table, key } = TABLES[kind]
  const want = new Set(studentIds)
  const removed = current.filter((r) => !want.has(r.student_id))
  const have = new Set(current.map((r) => r.student_id))
  const added = studentIds.filter((sid) => !have.has(sid))

  if (removed.length) {
    unwrap(
      await supabase
        .from(table)
        .delete()
        .eq(key, id)
        .in('student_id', removed.map((r) => r.student_id)),
    )
    for (const r of removed) {
      if (!r.submission_path) continue
      try {
        await removeSubmissionFiles(r.submission_path)
      } catch (e) {
        console.warn('Không xóa được ảnh bài nộp', r.submission_path, e)
      }
    }
  }
  if (removed.length) window.dispatchEvent(new Event(SUBMISSIONS_CHANGED)) // bỏ người nhận kéo theo bài nộp của họ
  if (added.length) await addRecipients([{ kind, id }], added)
  return { added: added.length, removed: removed.length }
}

// Giao thêm nhiều bài cho nhiều học sinh một lần (học sinh đã có bài thì giữ nguyên)
// Học sinh đang có bài qua khóa (tự học, không chuông) thì chuyển thành bài giao riêng: có chuông, vào "Bài cần làm", vào hàng chấm
export async function addRecipients(items, studentIds) {
  for (const kind of Object.keys(TABLES)) {
    const { table, key } = TABLES[kind]
    const ids = items.filter((it) => it.kind === kind).map((it) => it.id)
    const rows = ids.flatMap((id) => studentIds.map((sid) => ({ [key]: id, student_id: sid })))
    if (!rows.length) continue
    unwrap(await supabase.from(table).upsert(rows, { onConflict: `${key},student_id`, ignoreDuplicates: true }))
    if (kind !== 'course')
      unwrap(
        await supabase
          .from(table)
          .update({ from_course: false, quiet: false, assigned_at: new Date().toISOString() })
          .in(key, ids)
          .in('student_id', studentIds)
          .eq('from_course', true),
      )
  }
}
