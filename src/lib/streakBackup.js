import { supabase, unwrap } from './supabase.js'

// Sao lưu / khôi phục / sửa chuỗi 🔥 của học sinh (gia sư). Chuỗi nằm ở bảng student_streaks;
// đổi CSDL có thể làm mất nên tải file JSON về máy trước, mất thì nạp lại. Ghi chỉ qua RPC tutor_set_streak.
// TẠM THỜI: khi hết cần khôi phục thì xóa file này, tests/streakBackup.test.js, và khối chuỗi trong StudentDetail / TutorStudents.

const FORMAT = 'streak-backup/v1'

/** Chuỗi hiện tại của mọi học sinh (học sinh chưa có dòng = 0). */
export async function fetchStreaks() {
  return unwrap(await supabase.from('student_streaks').select('student_id, current_streak, longest_streak'))
}

/** Chuỗi của một học sinh. */
export async function fetchStreak(studentId) {
  const row = unwrap(
    await supabase.from('student_streaks').select('current_streak, longest_streak').eq('student_id', studentId).maybeSingle(),
  )
  return { current: row?.current_streak ?? 0, longest: row?.longest_streak ?? 0 }
}

/** Đặt chuỗi cho một học sinh (máy chủ kiểm quyền gia sư + khoảng 0..5000). */
export async function setStreak(studentId, current, longest = null) {
  unwrap(await supabase.rpc('tutor_set_streak', { p_student: studentId, p_current: current, p_longest: longest }))
}

/**
 * Nội dung file sao lưu.
 * @param {{ id: string, full_name?: string | null }[]} students
 * @param {{ student_id: string, current_streak: number, longest_streak: number }[]} streaks
 */
export function buildBackup(students, streaks, now = new Date()) {
  const by = new Map(streaks.map((r) => [r.student_id, r]))
  return {
    format: FORMAT,
    savedAt: now.toISOString(),
    streaks: students.map((s) => ({
      student_id: s.id,
      name: s.full_name || '',
      current: by.get(s.id)?.current_streak ?? 0,
      longest: by.get(s.id)?.longest_streak ?? 0,
    })),
  }
}

/**
 * Đọc file sao lưu (chuỗi JSON) → danh sách hợp lệ; ném Error tiếng Việt nếu sai định dạng.
 * @returns {{ student_id: string, name: string, current: number, longest: number }[]}
 */
export function parseBackup(text) {
  let data
  try {
    data = JSON.parse(text)
  } catch {
    throw new Error('File không phải JSON hợp lệ.')
  }
  if (data?.format !== FORMAT || !Array.isArray(data.streaks)) throw new Error('Không phải file sao lưu chuỗi của ứng dụng.')
  const ok = (n) => Number.isInteger(n) && n >= 0 && n <= 5000
  return data.streaks.filter((r) => typeof r?.student_id === 'string' && ok(r.current) && ok(r.longest))
}

/** Nạp lại từng dòng; trả về số dòng đã khôi phục và số dòng lỗi (học sinh không còn tồn tại...). */
export async function restoreStreaks(rows) {
  const results = await Promise.allSettled(rows.map((r) => setStreak(r.student_id, r.current, r.longest)))
  const failed = results.filter((r) => r.status === 'rejected').length
  return { done: rows.length - failed, failed }
}

/** Tải JSON về máy. */
export function downloadBackup(backup) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' }))
  const a = document.createElement('a')
  a.href = url
  a.download = `sao-luu-chuoi-${backup.savedAt.slice(0, 10)}.json`
  a.click()
  URL.revokeObjectURL(url)
}
