import { supabase, unwrap } from './supabase.js'

const collator = new Intl.Collator('vi', { numeric: true, sensitivity: 'base' })
const LAST = '￿' // giá trị trống xếp cuối

// Nhãn hiển thị cho từng cấp khi chưa điền
export const NO_GRADE = 'Chưa rõ lớp'
export const NO_SUBJECT = 'Chưa rõ môn'
export const NO_SECTION = 'Chưa có chuyên đề'

export const gradeLabel = (g) => (g ? `Lớp ${g}` : NO_GRADE)
export const subjectLabel = (s) => s || NO_SUBJECT
export const sectionLabel = (s) => s || NO_SECTION

// Sắp chương: lớp → môn → chuyên đề → thứ tự → tên ("Chủ đề 4" đứng trước "Chủ đề 10")
export function sortChapters(list) {
  return [...list].sort(
    (a, b) =>
      (a.grade ?? 99) - (b.grade ?? 99) ||
      collator.compare(a.subject || LAST, b.subject || LAST) ||
      collator.compare(a.section || LAST, b.section || LAST) ||
      (a.sort_order ?? 0) - (b.sort_order ?? 0) ||
      collator.compare(a.title, b.title)
  )
}

export async function fetchChapters() {
  return sortChapters(unwrap(await supabase.from('chapters').select('id, title, section, grade, subject, sort_order, created_at')))
}

// Nhãn nhóm ngắn gọn cho ô chọn: "Lớp 11 · Vật lý · Chuyên đề 2: Sóng"
export function chapterGroupLabel(c) {
  return [c.grade ? `Lớp ${c.grade}` : '', c.subject || '', c.section || ''].filter(Boolean).join(' · ') || 'Khác'
}

// Gom chương theo (lớp, môn, chuyên đề) cho ô chọn: [{ key, label, chapters }]
export function groupBySection(chapters) {
  const groups = []
  for (const c of sortChapters(chapters)) {
    const label = chapterGroupLabel(c)
    let g = groups.find((x) => x.label === label)
    if (!g) groups.push((g = { key: label, label, chapters: [] }))
    g.chapters.push(c)
  }
  return groups
}

// ----- Cây Lớp › Môn › Chuyên đề › Chương -----
// Mỗi cấp có "key" để đưa lên URL; giá trị trống dùng key '-'
export const keyOf = (v) => (v === null || v === undefined || v === '' ? '-' : String(v))
const same = (v, key) => keyOf(v) === key

// [{ key, grade, subjects: [{ key, subject, sections: [{ key, section, chapters }] }] }]
export function buildTree(chapters) {
  const tree = []
  for (const c of sortChapters(chapters)) {
    let g = tree.find((x) => same(c.grade, x.key))
    if (!g) tree.push((g = { key: keyOf(c.grade), grade: c.grade ?? null, subjects: [] }))
    let s = g.subjects.find((x) => same(c.subject, x.key))
    if (!s) g.subjects.push((s = { key: keyOf(c.subject), subject: c.subject || null, sections: [] }))
    let sec = s.sections.find((x) => same(c.section, x.key))
    if (!sec) s.sections.push((sec = { key: keyOf(c.section), section: c.section || null, chapters: [] }))
    sec.chapters.push(c)
  }
  return tree
}

// Giá trị thật từ key trên URL ('-' → null)
export const fromKey = (k) => (k === undefined || k === null || k === '-' ? null : k)
export const gradeFromKey = (k) => (fromKey(k) === null ? null : Number(k))

// Gom bài (bài giảng / bài tập) theo chương, giữ thứ tự chương; bài chưa xếp chương để cuối.
// items cần có chapter_id. Trả về [{ chapter | null, items }]
export function groupByChapter(items, chapters) {
  const ordered = sortChapters(chapters)
  const groups = ordered.map((c) => ({ chapter: c, items: items.filter((it) => it.chapter_id === c.id) })).filter((g) => g.items.length)
  const loose = items.filter((it) => !it.chapter_id || !ordered.some((c) => c.id === it.chapter_id))
  if (loose.length) groups.push({ chapter: null, items: loose })
  return groups
}

const norm = (v) => (v || '').toString().trim().toLowerCase()

// Tìm chương khớp file nhập: đúng tên + lớp + môn; không có thì chương cũ cùng tên chưa ghi lớp/môn
// (giống hàm ensure_chapter trên CSDL)
export function findChapter(chapters, { title, grade = null, subject = null } = {}) {
  const t = norm(title)
  if (!t) return null
  const sameName = chapters.filter((c) => norm(c.title) === t)
  return (
    sameName.find((c) => (c.grade ?? null) === (grade ?? null) && norm(c.subject) === norm(subject)) ||
    sameName.find(
      (c) =>
        (c.grade == null || grade == null || c.grade === grade) &&
        (!c.subject || !subject || norm(c.subject) === norm(subject))
    ) ||
    null
  )
}
