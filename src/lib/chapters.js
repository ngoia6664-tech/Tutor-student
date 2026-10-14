import { supabase, unwrap } from './supabase.js'

const collator = new Intl.Collator('vi', { numeric: true, sensitivity: 'base' })

// Sắp chương: theo chuyên đề, rồi thứ tự, rồi tên ("Chủ đề 4" đứng trước "Chủ đề 10")
export function sortChapters(list) {
  return [...list].sort(
    (a, b) =>
      collator.compare(a.section || '￿', b.section || '￿') ||
      (a.sort_order ?? 0) - (b.sort_order ?? 0) ||
      collator.compare(a.title, b.title)
  )
}

export async function fetchChapters() {
  return sortChapters(unwrap(await supabase.from('chapters').select('id, title, section, sort_order, created_at')))
}

// Gom chương theo chuyên đề: [{ section, chapters: [...] }]
export function groupBySection(chapters) {
  const groups = []
  for (const c of sortChapters(chapters)) {
    const name = c.section || 'Khác'
    let g = groups.find((x) => x.section === name)
    if (!g) groups.push((g = { section: name, chapters: [] }))
    g.chapters.push(c)
  }
  return groups
}

// Gom bài (bài giảng / bài tập) theo chương, giữ thứ tự chương; bài chưa xếp chương để cuối.
// items cần có chapter_id. Trả về [{ chapter | null, items }]
export function groupByChapter(items, chapters) {
  const ordered = sortChapters(chapters)
  const groups = ordered.map((c) => ({ chapter: c, items: items.filter((it) => it.chapter_id === c.id) })).filter((g) => g.items.length)
  const loose = items.filter((it) => !it.chapter_id || !ordered.some((c) => c.id === it.chapter_id))
  if (loose.length) groups.push({ chapter: null, items: loose })
  return groups
}

export function findChapterByTitle(chapters, title) {
  const t = (title || '').trim().toLowerCase()
  return t ? chapters.find((c) => c.title.trim().toLowerCase() === t) || null : null
}
