// Đề thi chấm theo thang THPT (môn Vật lý):
//   Phần I   – trắc nghiệm nhiều phương án: 0,25 điểm / câu
//   Phần II  – đúng/sai (4 ý a, b, c, d): đúng 1 ý 0,1 · 2 ý 0,25 · 3 ý 0,5 · 4 ý 1 điểm
//   Phần III – trả lời ngắn: 0,25 điểm / câu
// Đề chuẩn 18 + 4 + 6 câu = 10 điểm. Điểm từng câu do máy chủ tính (submission_answers.points).

export const EXAM_PARTS = [
  { kind: 'mcq', roman: 'I', title: 'Trắc nghiệm nhiều phương án lựa chọn', note: '0,25 điểm / câu', standard: 18 },
  { kind: 'true_false', roman: 'II', title: 'Trắc nghiệm đúng sai', note: 'Mỗi câu 4 ý: đúng 1 ý 0,1 · 2 ý 0,25 · 3 ý 0,5 · 4 ý 1 điểm', standard: 4 },
  { kind: 'short', roman: 'III', title: 'Trắc nghiệm trả lời ngắn', note: '0,25 điểm / câu', standard: 6 },
]
const OTHER_PART = { kind: 'other', roman: '', title: 'Câu khác (gia sư tự chấm)', note: 'Tự luận, điền khuyết: không tính vào điểm máy chấm' }

export const TF_POINTS = [0, 0.1, 0.25, 0.5, 1]

// Điểm tối đa của một câu trong đề thi
export function maxPoints(ex) {
  if (ex.kind === 'mcq' || ex.kind === 'short') return 0.25
  if (ex.kind === 'true_false') return 1
  return 0
}

const partOf = (kind) => EXAM_PARTS.find((p) => p.kind === kind) || OTHER_PART

/**
 * Chia câu hỏi thành các phần, đánh số lại trong từng phần như đề thật.
 * Đề thi: Phần I → II → III → câu khác. Bài thường: một nhóm, giữ thứ tự soạn.
 * Trả về [{ part, items: [{ ex, no }] }]
 */
export function groupExercises(exercises, isExam) {
  if (!isExam) return [{ part: null, items: exercises.map((ex, i) => ({ ex, no: i + 1 })) }]
  const groups = [...EXAM_PARTS, OTHER_PART]
    .map((part) => ({ part, items: exercises.filter((ex) => partOf(ex.kind) === part) }))
    .filter((g) => g.items.length)
  return groups.map((g) => ({ part: g.part, items: g.items.map((ex, i) => ({ ex, no: i + 1 })) }))
}

// Nhãn câu ngắn gọn, vd. "I.3", "II.1" (đề thi) hoặc "3" (bài thường) – dùng cho phiếu trả lời, cảnh báo
export function questionLabels(exercises, isExam) {
  const map = {}
  for (const g of groupExercises(exercises, isExam)) for (const { ex, no } of g.items) map[ex.id] = g.part?.roman ? `${g.part.roman}.${no}` : String(no)
  return map
}

const round2 = (n) => Math.round(n * 100) / 100

/**
 * Tổng điểm máy chấm theo thang THPT. answers: { exercise_id: { points } }
 * Trả về { parts: [{ part, got, max, count }], got, max, score10 }
 * score10: quy về thang 10 nếu đề không đúng chuẩn 10 điểm (vd. đề rút gọn)
 */
export function examSummary(exercises, answers = {}) {
  const parts = EXAM_PARTS.map((part) => {
    const list = exercises.filter((ex) => ex.kind === part.kind)
    const got = list.reduce((n, ex) => n + Number(answers[ex.id]?.points || 0), 0)
    return { part, count: list.length, got: round2(got), max: round2(list.length * maxPoints({ kind: part.kind })) }
  }).filter((p) => p.count)
  const got = round2(parts.reduce((n, p) => n + p.got, 0))
  const max = round2(parts.reduce((n, p) => n + p.max, 0))
  return { parts, got, max, score10: max ? round2((got / max) * 10) : 0 }
}

// Cấu trúc đề so với chuẩn 18 – 4 – 6 (để nhắc gia sư khi soạn)
export function examStructure(exercises) {
  const counts = Object.fromEntries(EXAM_PARTS.map((p) => [p.kind, exercises.filter((ex) => ex.kind === p.kind).length]))
  const other = exercises.filter((ex) => !EXAM_PARTS.some((p) => p.kind === ex.kind)).length
  const standard = EXAM_PARTS.every((p) => counts[p.kind] === p.standard)
  const max = round2(EXAM_PARTS.reduce((n, p) => n + counts[p.kind] * maxPoints({ kind: p.kind }), 0))
  return { counts, other, standard, max }
}

// Số kiểu Việt Nam: 7.35 → "7,35"
export const viNum = (n) => String(round2(Number(n) || 0)).replace('.', ',')
