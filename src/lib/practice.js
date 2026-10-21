// Chấm ngay trên máy khi học sinh ôn lại câu sai (không lưu điểm).
// Cùng quy tắc với hàm SQL grade_answer / short_match / normalize_answer trong schema.sql.

const normalize = (t) =>
  String(t ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[\s.,;:!]+$/, '')

const NUM = /^[-+]?([0-9]+\.?[0-9]*|\.[0-9]+)$/
const compact = (t) => String(t ?? '').replace(/\s+/g, '').toLowerCase().replace(/,/g, '.').replace(/−/g, '-')

// Trả lời ngắn: nhiều cách viết ngăn bằng ";", số so theo giá trị ("1,89" = "1.890")
function shortMatch(correct, given) {
  const g = compact(given)
  if (!g || correct == null) return false
  return String(correct)
    .split(/\s*;\s*/)
    .map(compact)
    .filter(Boolean)
    .some((c) => (NUM.test(g) && NUM.test(c) ? Number(g) === Number(c) : normalize(g) === normalize(c)))
}

// true / false; null nếu không chấm được (tự luận, thiếu đáp án)
export function gradeLocal(kind, correct, answer) {
  if (correct == null || answer == null) return null
  if (kind === 'mcq') return String(answer.choice ?? '').toUpperCase() === String(correct).toUpperCase()
  if (kind === 'short') return shortMatch(correct, answer.text)
  if (kind === 'true_false') {
    if (typeof correct !== 'object') return null
    return Object.keys(correct).every((k) => answer.tf?.[k] !== undefined && String(answer.tf[k]) === String(correct[k]))
  }
  if (kind === 'fill_blank') {
    if (typeof correct !== 'object') return null
    return Object.keys(correct).every((k) => normalize(answer.blanks?.[k]) !== '' && normalize(answer.blanks?.[k]) === normalize(correct[k]))
  }
  return null
}

// Câu đã ôn lại đúng: nhớ trên máy này để ẩn khỏi danh sách
const masteredKey = (studentId) => `mistakes-mastered-${studentId}`

export function readMastered(studentId) {
  try {
    return new Set(JSON.parse(localStorage.getItem(masteredKey(studentId)) || '[]'))
  } catch {
    return new Set()
  }
}

export function writeMastered(studentId, set) {
  try {
    localStorage.setItem(masteredKey(studentId), JSON.stringify([...set]))
  } catch {
    // Trình duyệt chặn lưu (chế độ ẩn danh): chỉ mất phần nhớ, vẫn ôn được
  }
}
