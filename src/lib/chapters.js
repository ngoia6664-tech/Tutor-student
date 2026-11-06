import { supabase, unwrap } from './supabase.js'

const collator = new Intl.Collator('vi', { numeric: true, sensitivity: 'base' })
const LAST = '￿' // giá trị trống xếp cuối

// Nhãn hiển thị cho từng cấp khi chưa điền
export const NO_GRADE = 'Chưa rõ lớp'
export const NO_SUBJECT = 'Chưa rõ môn'
export const NO_SECTION = 'Chưa có chương'

export const gradeLabel = (g) => (g ? `Lớp ${g}` : NO_GRADE)
export const subjectLabel = (s) => s || NO_SUBJECT
// Tên chương khi hiển thị: bỏ tiền tố dữ liệu "L12_" (dữ liệu giữ nguyên). Cây mục lục dùng bản giữ chữ thường cho gọn,
// tiêu đề dùng sectionLabel (viết hoa); gáy + bìa kệ sách dùng sectionText cho dễ đọc
// Dữ liệu cũ ghi "Chuyên đề 2: Sóng": chỉ đổi chữ hiển thị thành "Chương" (CSDL / khóa URL giữ nguyên)
export const sectionText = (s) => s?.replace(/^\s*L\d+_\s*/i, '').replace(/^\s*chuyên đề(?=\s*\d)/i, 'Chương') || NO_SECTION
export const sectionLabel = (s) => (s ? sectionText(s).toLocaleUpperCase('vi') : NO_SECTION)

// Sắp chủ đề: lớp → môn → chương → thứ tự → tên ("Chủ đề 4" đứng trước "Chủ đề 10")
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

// Học sinh: các chủ đề thuộc lớp của mình (RLS chỉ trả chủ đề có bài được giao).
// Chủ đề chưa ghi lớp cũng tính; học sinh chưa ghi lớp thì lấy hết.
// Đặt grade = lớp của học sinh để cây gom về một lớp, bắt đầu từ Môn.
export async function fetchStudentChapters(myGrade) {
  const rows = unwrap(await supabase.from('chapters').select('id, title, section, grade, subject, sort_order'))
  const mine = rows.filter((c) => myGrade == null || c.grade == null || c.grade === myGrade)
  return sortChapters(myGrade == null ? mine : mine.map((c) => ({ ...c, grade: myGrade })))
}

export async function fetchChapters() {
  return sortChapters(unwrap(await supabase.from('chapters').select('id, title, section, grade, subject, sort_order, created_at')))
}

// Nhãn nhóm ngắn gọn cho ô chọn: "Lớp 11 · Vật lý · Chương 2: Sóng"
export function chapterGroupLabel(c) {
  return [c.grade ? `Lớp ${c.grade}` : '', c.subject || '', c.section ? sectionText(c.section) : ''].filter(Boolean).join(' · ') || 'Khác'
}

// ----- Cây Lớp › Môn › Chương › Chủ đề -----
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

// Link tới một nhóm trong Thư viện: libraryUrl('11', 'Vật lý', 'Chương 2') → /tutor/library?lop=11&mon=...&cd=...
// Nhận key (đã qua keyOf); không truyền gì → trang Thư viện
export function libraryUrl(...keys) {
  const p = new URLSearchParams()
  ;['lop', 'mon', 'cd'].forEach((name, i) => keys[i] !== undefined && p.set(name, keys[i]))
  const q = p.toString()
  return q ? `/tutor/library?${q}` : '/tutor/library'
}
export const chapterUrl = (id) => `/tutor/library/${id}`
// Thư viện học sinh (/student/library?mon=...&cd=...): học sinh chỉ có một lớp nên bỏ "lop";
// cùng thứ tự tham số với libraryUrl để dùng chung GradeShelf / libraryCrumbs
export const studentLibraryUrl = (_lop, mon, cd) => libraryUrl(undefined, mon, cd).replace('/tutor/', '/student/')
// Mục "Chưa xếp chủ đề" của Thư viện gia sư (/tutor/library/chua-xep): bài có chapter_id trống
export const UNSORTED = 'chua-xep'

// Giá trị thật từ key trên URL ('-' → null)
export const fromKey = (k) => (k === undefined || k === null || k === '-' ? null : k)
export const gradeFromKey = (k) => (fromKey(k) === null ? null : Number(k))

// Đường dẫn Thư viện có menu chọn nhanh: mỗi đoạn (lớp / môn / chương) kèm các lựa chọn cùng cấp.
// Danh sách lớp có thêm lớp 6–12 chưa có chủ đề (empty) để mở lớp mới. Nhận key (đã qua keyOf).
const ALL_GRADES = ['6', '7', '8', '9', '10', '11', '12']
/**
 * @param {any[]} tree kết quả buildTree
 * @param {{ lop?: string, mon?: string, cd?: string }} keys
 * @param {(...keys: string[]) => string} [url] link của từng lựa chọn (học sinh: studentLibraryUrl)
 * @returns {{ name: 'lop' | 'mon' | 'cd', label: string, options: { key: string, label: string, to: string, current: boolean, empty?: boolean }[] }[]}
 */
export function libraryCrumbs(tree, { lop, mon, cd }, url = libraryUrl) {
  if (lop === undefined) return []
  const has = tree.map((g) => g.key)
  const grades = [...new Set([...has, ...ALL_GRADES, lop])].sort((a, b) => (gradeFromKey(a) ?? 99) - (gradeFromKey(b) ?? 99))
  /** @type {ReturnType<typeof libraryCrumbs>} */
  const segs = [
    {
      name: 'lop',
      label: gradeLabel(gradeFromKey(lop)),
      options: grades.map((k) => ({ key: k, label: gradeLabel(gradeFromKey(k)), to: url(k), current: k === lop, empty: !has.includes(k) })),
    },
  ]
  if (mon === undefined) return segs
  const subjects = tree.find((g) => g.key === lop)?.subjects || []
  segs.push({
    name: 'mon',
    label: subjectLabel(fromKey(mon)),
    options: subjects.map((s) => ({ key: s.key, label: subjectLabel(s.subject), to: url(lop, s.key), current: s.key === mon })),
  })
  if (cd === undefined) return segs
  const sections = subjects.find((s) => s.key === mon)?.sections || []
  segs.push({
    name: 'cd',
    label: sectionText(fromKey(cd)),
    options: sections.map((x) => ({ key: x.key, label: sectionText(x.section), to: url(lop, mon, x.key), current: x.key === cd })),
  })
  return segs
}

// Gom bài (bài giảng / bài tập) theo chủ đề, giữ thứ tự chủ đề; bài chưa xếp chủ đề để cuối.
// items cần có chapter_id. Trả về [{ chapter | null, items }]
export function groupByChapter(items, chapters) {
  const ordered = sortChapters(chapters)
  const groups = ordered.map((c) => ({ chapter: c, items: items.filter((it) => it.chapter_id === c.id) })).filter((g) => g.items.length)
  const loose = items.filter((it) => !it.chapter_id || !ordered.some((c) => c.id === it.chapter_id))
  if (loose.length) groups.push({ chapter: null, items: loose })
  return groups
}

const norm = (v) => (v || '').toString().trim().toLowerCase()

// Tìm chủ đề khớp file nhập: đúng tên + lớp + môn; không có thì chủ đề cũ cùng tên chưa ghi lớp/môn
// (giống hàm ensure_chapter trên CSDL)
/** @param {any[]} chapters @param {{ title?: string, grade?: number | null, subject?: string | null }} [opts] */
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
