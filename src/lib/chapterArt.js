// Môn của chương quyết định ký hiệu và màu bìa (components/ChapterArt.jsx). Đoán từ tên môn, không phân biệt dấu / hoa thường.

/** @param {string | null | undefined} subject @returns {'physics' | 'math' | 'chem' | 'other'} */
export function subjectKind(subject) {
  const s = (subject || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .toLowerCase()
  if (/\btoan\b/.test(s)) return 'math'
  if (/vat ly|\bly\b|physics/.test(s)) return 'physics'
  if (/\bhoa\b|chem/.test(s)) return 'chem'
  return 'other'
}

/**
 * "Chương 3: Định luật Charles" → số 3 to + "Định luật Charles"; chuyên đề cũng vậy ("L11_Chuyên đề 2: Dãy số" → 2 + "Dãy số").
 * Tên khác giữ nguyên, số = thứ tự
 * @param {string} title
 * @param {number} i
 */
export function splitTitle(title, i) {
  const m = /^\s*(?:L\d+_)?\s*(?:chương|chuyên đề)\s+(\d+)\s*[:.–-]?\s*/i.exec(title)
  return m && title.length > m[0].length ? { num: m[1], name: title.slice(m[0].length) } : { num: String(i + 1), name: title }
}
