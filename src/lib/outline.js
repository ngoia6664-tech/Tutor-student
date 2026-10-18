// Đọc mục lục dán vào (chép từ giáo trình / Word) thành danh sách chương:
//   Lớp 12 · Vật lý                      → lớp + môn (môn có thể bỏ, mặc định giữ môn trước đó)
//   Chương 2: Khí lí tưởng               → chuyên đề (dòng bắt đầu "Chương", "Chuyên đề", "Phần", hoặc "##")
//   - Chủ đề 1: Mô hình động học phân tử → chương (dòng có gạch đầu dòng, thụt vào, hoặc bắt đầu "Chủ đề", "Bài")
// Trong app: Lớp › Môn › Chuyên đề › Chương, nên "Chương 2" của giáo trình là chuyên đề,
// "Chủ đề 3" là chương (giống cách nhập file JSON: "chapter" → chuyên đề, "topic" → chương).

const BULLET = /^\s*(?:[-*+•–—▪◦]|\d+[.)]|[a-zđ][.)])\s+/i
const GRADE_LINE = /^\s*#?\s*l(?:ớp|op)\s*(1[0-2]|[1-9])\b\s*[·:\-–—|,/]?\s*(.*)$/i
const SUBJECT_LINE = /^\s*m(?:ôn|on)(?:\s*học)?\s*[:\-–—]\s*(.+)$/i
// (?!\p{L}): \b của JS không nhận chữ có dấu ("chuyên đề", "bài"), nên tự kiểm tra hết từ
const SECTION_LINE = /^\s*(?:##\s*|(?=(?:chương|chuong|chuyên\s*đề|chuyen\s*de|phần|phan)(?!\p{L})))/iu
const CHAPTER_WORD = /^\s*(?:chủ\s*đề|chu\s*de|bài|bai|tiết|tiet|###)(?!\p{L})/iu

const clean = (s) => s.replace(/^#+\s*/, '').replace(BULLET, '').replace(/\s+/g, ' ').replace(/[\s.;,]+$/, '').trim()

/**
 * text → { items: [{ grade, subject, section, title, line }], warnings: [...] }
 * defaults: { grade, subject } dùng khi đoạn dán không ghi lớp / môn
 */
export function parseOutline(text, defaults = {}) {
  let grade = defaults.grade ?? null
  let subject = defaults.subject || null
  let section = null
  const items = []
  const warnings = []
  const seen = new Set()

  String(text || '')
    .split(/\r?\n/)
    .forEach((raw, i) => {
      const line = raw.replace(/\t/g, '  ')
      if (!line.trim()) return
      const n = i + 1

      const g = line.match(GRADE_LINE)
      if (g) {
        grade = Number(g[1])
        if (clean(g[2] || '')) subject = clean(g[2])
        section = null
        return
      }
      const m = line.match(SUBJECT_LINE)
      if (m) {
        subject = clean(m[1])
        section = null
        return
      }
      const indented = /^\s{2,}/.test(line)
      const bulleted = BULLET.test(line)
      if (!indented && !bulleted && SECTION_LINE.test(line) && !CHAPTER_WORD.test(line)) {
        section = clean(line)
        return
      }
      // Dòng thường không có chuyên đề phía trên và không có dấu hiệu chương → coi là chuyên đề
      if (!indented && !bulleted && !CHAPTER_WORD.test(line) && !section) {
        section = clean(line)
        return
      }
      const title = clean(line)
      if (!title) return
      if (title.length > 200) {
        warnings.push(`Dòng ${n}: tên quá dài, đã bỏ qua.`)
        return
      }
      const key = `${grade}|${(subject || '').toLowerCase()}|${title.toLowerCase()}`
      if (seen.has(key)) {
        warnings.push(`Dòng ${n}: "${title}" bị lặp, chỉ tạo một lần.`)
        return
      }
      seen.add(key)
      items.push({ grade, subject, section, title, line: n })
    })

  if (items.some((x) => !x.grade)) warnings.push('Có chương chưa rõ lớp. Thêm một dòng "Lớp 12" (hoặc lớp phù hợp) ở đầu đoạn dán.')
  return { items, warnings }
}

export const OUTLINE_SAMPLE = `Lớp 12 · Vật lý
Chương 1: Vật lí nhiệt
- Chủ đề 1: Cấu trúc của chất
- Chủ đề 2: Nội năng, định luật I nhiệt động lực học
Chương 2: Khí lí tưởng
- Chủ đề 1: Mô hình động học phân tử chất khí
- Chủ đề 2: Định luật Boyle
- Chủ đề 3: Định luật Charles`
