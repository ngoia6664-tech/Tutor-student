import { matchTitle } from '../format.js'

/**
 * Lọc Hỏi đáp theo từ khóa, tìm cả câu hỏi lẫn câu trả lời, gõ không dấu vẫn khớp. Nhóm không còn câu nào thì bỏ.
 * @template {{ items: { q: string, a: string }[] }} S
 * @param {S[]} sections
 * @param {string} query
 * @returns {S[]}
 */
export function filterHelp(sections, query) {
  return sections
    .map((s) => ({ ...s, items: s.items.filter((it) => matchTitle(`${it.q} ${it.a}`.replace(/\*/g, ''), query)) }))
    .filter((s) => s.items.length > 0)
}
