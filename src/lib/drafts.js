// Bản nháp câu trả lời của học sinh, lưu trên máy (localStorage) để lỡ tắt trình duyệt không mất bài,
// và bản sao trên máy chủ (assignment_drafts) để đổi thiết bị vẫn còn (hook lib/useDraftSync.js).
// Dùng ở trang làm bài (StudentAssignment: đọc / ghi) và cột phải Bài cần làm (StudentHome: "Đang làm dở").
import { supabase } from './supabase.js'

/** @param {string} assignmentId @param {string} studentId @param {boolean} [retry] làm lại bài đã nộp */
export const draftKey = (assignmentId, studentId, retry = false) => `${retry ? 'draft-retry' : 'draft-answers'}:${studentId}:${assignmentId}`

/** @param {string} key @returns {Record<string, any> | null} */
export function readDraft(key) {
  try {
    return JSON.parse(localStorage.getItem(key) || 'null')
  } catch {
    return null
  }
}

/** @param {string} key @param {Record<string, any> | null} value null = xóa nháp (đã nộp) */
export function writeDraft(key, value) {
  try {
    if (value) {
      localStorage.setItem(key, JSON.stringify(value))
      localStorage.setItem(`${key}:t`, String(Date.now()))
    } else {
      localStorage.removeItem(key)
      localStorage.removeItem(`${key}:t`)
    }
  } catch {
    // Trình duyệt chặn lưu trữ: bỏ qua, chỉ mất tính năng lưu nháp
  }
}

/** Lúc ghi bản nháp trên máy (ms); 0 = không có @param {string} key */
export function readDraftTime(key) {
  try {
    return Number(localStorage.getItem(`${key}:t`)) || 0
  } catch {
    return 0
  }
}

// ---- Bản nháp trên máy chủ (bảng assignment_drafts), để đổi thiết bị vẫn còn ----
// Bảng chưa có (chưa chạy lại schema.sql) → các hàm ném lỗi, nơi gọi bỏ qua và chỉ dùng bản trên máy.

/** @param {string} assignmentId @param {boolean} retry @returns {Promise<{ answers: Record<string, any>, at: number } | null>} */
export async function fetchServerDraft(assignmentId, retry) {
  const { data, error } = await supabase
    .from('assignment_drafts')
    .select('answers, updated_at')
    .eq('assignment_id', assignmentId)
    .eq('retry', retry)
    .maybeSingle()
  if (error) throw error
  return data ? { answers: data.answers || {}, at: new Date(data.updated_at).getTime() } : null
}

/** Số câu đã làm của mọi bản nháp (bài thường) trên máy chủ: Map assignment_id → số câu. Lỗi thì trả Map rỗng. */
export async function fetchServerDraftCounts() {
  const { data, error } = await supabase.from('assignment_drafts').select('assignment_id, answers').eq('retry', false)
  return new Map(error ? [] : data.map((r) => [r.assignment_id, draftCount(r.answers)]))
}

/** @param {string} assignmentId @param {boolean} retry @param {Record<string, any>} answers */
export async function pushServerDraft(assignmentId, retry, answers) {
  const { error } = await supabase
    .from('assignment_drafts')
    .upsert({ assignment_id: assignmentId, retry, answers, updated_at: new Date().toISOString() }, { onConflict: 'assignment_id,student_id,retry' })
  if (error) throw error
}

/** @param {string} assignmentId @param {boolean} retry */
export async function deleteServerDraft(assignmentId, retry) {
  await supabase.from('assignment_drafts').delete().eq('assignment_id', assignmentId).eq('retry', retry)
}

/** Số câu đã trả lời trong bản nháp (bỏ câu trống); 0 = chưa làm câu nào @param {Record<string, any> | null} draft */
export function draftCount(draft) {
  if (!draft) return 0
  return Object.values(draft).filter((v) => v != null && v !== '' && !(typeof v === 'object' && !Object.keys(v).length)).length
}
