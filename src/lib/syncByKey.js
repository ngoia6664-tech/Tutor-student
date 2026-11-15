// Nhập lại file JSON cùng mã bài: ghép từng câu với câu đã có (theo source_key) để save_assignment
// sửa tại chỗ, không mất bài làm của học sinh. Hàm thuần, không gọi CSDL.

/** Khóa nhận diện một phương án / ý: nhãn (A, B) hoặc id (a, b). */
const optKey = (/** @type {any} */ o) => String(o?.label ?? o?.id ?? '')
/** JSON ổn định (khóa đã sắp) để so sánh đáp án. */
const stable = (/** @type {any} */ v) => JSON.stringify(v, (_, x) => (x && typeof x === 'object' && !Array.isArray(x) ? Object.fromEntries(Object.keys(x).sort().map((k) => [k, x[k]])) : x))

/**
 * @typedef {{ id: string, kind: string, options: any, correct: any, source_key: string | null }} ExistingEx
 * @param {{ exercises: any[] }} draft  bài từ file (mỗi câu có source_key, kind, options, correct)
 * @param {ExistingEx[]} existing       câu đang có trong CSDL, đúng thứ tự
 * @returns {{ exercises: any[], conflicts: string[] }}  exercises: câu đã gắn id để lưu; conflicts: thay đổi đụng tới điểm học sinh
 */
export function planSync(draft, existing) {
  const bySource = new Map(existing.filter((e) => e.source_key).map((e) => [e.source_key, e]))
  // Bài cũ nhập trước khi có mã (không câu nào có source_key): ghép theo thứ tự nếu số câu bằng nhau
  const legacy = !existing.some((e) => e.source_key) && existing.length === draft.exercises.length
  const used = new Set()
  /** @type {string[]} */
  const conflicts = []

  const exercises = draft.exercises.map((ex, i) => {
    const old = (ex.source_key && bySource.get(ex.source_key)) || (legacy ? existing[i] : undefined)
    if (!old || used.has(old.id)) return ex
    used.add(old.id)
    const n = i + 1
    if (old.kind !== (ex.kind || 'essay')) conflicts.push(`Câu ${n}: đổi loại câu (${old.kind} → ${ex.kind})`)
    else if (stable((old.options ?? []).map(optKey)) !== stable((ex.options ?? []).map(optKey))) conflicts.push(`Câu ${n}: đổi số / nhãn phương án`)
    else if (stable(old.correct ?? null) !== stable(ex.correct ?? null)) conflicts.push(`Câu ${n}: đổi đáp án đúng`)
    return { ...ex, id: old.id }
  })
  existing.forEach((e, i) => {
    if (!used.has(e.id)) conflicts.push(`Câu cũ số ${i + 1} không còn trong file (sẽ xóa, mất bài làm của câu này)`)
  })
  return { exercises, conflicts }
}
