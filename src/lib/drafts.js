// Bản nháp câu trả lời của học sinh, lưu trên máy (localStorage) để lỡ tắt trình duyệt không mất bài.
// Dùng ở trang làm bài (StudentAssignment: đọc / ghi) và cột phải Bài cần làm (StudentHome: "Đang làm dở").

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
    if (value) localStorage.setItem(key, JSON.stringify(value))
    else localStorage.removeItem(key)
  } catch {
    // Trình duyệt chặn lưu trữ: bỏ qua, chỉ mất tính năng lưu nháp
  }
}

/** Số câu đã trả lời trong bản nháp (bỏ câu trống); 0 = chưa làm câu nào @param {Record<string, any> | null} draft */
export function draftCount(draft) {
  if (!draft) return 0
  return Object.values(draft).filter((v) => v != null && v !== '' && !(typeof v === 'object' && !Object.keys(v).length)).length
}
