// Dữ liệu cho biểu đồ điểm (components/ScoreChart.jsx): quy về thang 10, lọc, thống kê.
// Chỉ dùng điểm chính thức (lần nộp đầu), không tính các lần tự làm lại.
import { gradeLabel, keyOf, sectionLabel, sortChapters, subjectLabel } from './chapters.js'

const round2 = (n) => Math.round(n * 100) / 100
const avgOf = (list) => list.reduce((n, p) => n + p.score, 0) / list.length

// Điểm một bài: điểm gia sư chấm → điểm máy chấm khi cả bài chấm máy → null (chờ chấm, không vẽ)
export function pointScore(r) {
  if (r.status === 'checked' && r.score !== null && r.score !== undefined) return Number(r.score)
  const m = r.machine
  if (!m?.allAuto) return null
  if (m.kind === 'exam') return m.score10
  return m.total ? (m.correct / m.total) * 10 : null
}

// rows: bài đã giao kèm { status, score, submitted_at, assignment, machine } → điểm trên biểu đồ, cũ → mới
export function toPoints(rows, { linkOf, chapterOf }) {
  return rows
    .filter((r) => r.assignment && r.status !== 'todo' && r.submitted_at)
    .map((r) => ({ r, score: pointScore(r) }))
    .filter((x) => x.score !== null && Number.isFinite(x.score))
    .map(({ r, score }) => ({
      id: r.assignment.id,
      title: r.assignment.title,
      date: r.submitted_at,
      score: round2(score),
      isExam: !!r.assignment.is_exam,
      chapter: chapterOf?.(r) || '',
      chapterId: r.assignment.chapter_id || null,
      to: linkOf(r.assignment.id),
    }))
    .sort((x, y) => String(x.date).localeCompare(String(y.date)))
}

export const KINDS = [
  { key: 'all', label: 'Tất cả' },
  { key: 'exam', label: 'Đề thi' },
  { key: 'practice', label: 'Bài tập' },
]

export const RANGES = [
  { key: '30', label: '1 tháng', days: 30 },
  { key: '90', label: '3 tháng', days: 90 },
  { key: 'all', label: 'Tất cả', days: null },
]

export function filterPoints(points, kind, range) {
  const days = RANGES.find((r) => r.key === range)?.days
  const from = days ? Date.now() - days * 86400000 : null
  return points.filter(
    (p) => (kind === 'all' || (kind === 'exam') === p.isExam) && (from === null || new Date(p.date).getTime() >= from),
  )
}

// trend: TB 3 bài gần nhất trừ TB (tối đa) 3 bài trước đó; cần ít nhất 4 bài
export function chartStats(points) {
  if (!points.length) return { avg: null, max: null, count: 0, trend: null }
  const last = points.slice(-3)
  const prev = points.slice(-6, -3)
  return {
    avg: round2(avgOf(points)),
    max: Math.max(...points.map((p) => p.score)),
    count: points.length,
    trend: points.length >= 4 && prev.length ? Math.round((avgOf(last) - avgOf(prev)) * 10) / 10 : null,
  }
}

export const WEAK = 6 // TB chương dưới mức này → "cần ôn"

// Điểm TB theo chương, cao → thấp: [{ id, title, avg, count, weak }]
export function chapterStats(points) {
  const groups = new Map()
  for (const p of points) {
    const key = p.chapterId || 'none'
    if (!groups.has(key)) groups.set(key, { id: p.chapterId, title: p.chapter || 'Bài khác', list: [] })
    groups.get(key).list.push(p)
  }
  return [...groups.values()]
    .map((g) => {
      const sum = g.list.reduce((n, p) => n + p.score, 0)
      const avg = round2(sum / g.list.length)
      return { id: g.id, title: g.title, avg, sum, count: g.list.length, weak: avg < WEAK }
    })
    .sort((a, b) => b.avg - a.avg)
}

// Lọc theo chương đang xem: 'none' = bài chưa gắn chương
export const NO_CHAPTER = 'none'
export const inChapter = (chapterId, filter) => !filter || (filter === NO_CHAPTER ? !chapterId : chapterId === filter)

const LEVELS = [
  { field: 'grade', label: gradeLabel },
  { field: 'subject', label: subjectLabel },
  { field: 'section', label: sectionLabel },
]

// Cây Lớp › Môn › Chuyên đề › Chương cho điểm theo chương. Cấp chỉ có một nhánh thì bỏ qua cho gọn.
// Trả về [{ type: 'group', key, label, avg, count, weak, children } | { type: 'chapter', id, title, avg, count, weak }]
// "Bài khác" (chưa gắn chương) đứng cuối, ở cấp ngoài cùng.
export function chapterTree(points, chapterById) {
  const stats = chapterStats(points)
  const order = new Map(sortChapters([...chapterById.values()]).map((c, i) => [c.id, i]))
  const leaves = stats
    .filter((s) => s.id)
    .map((s) => ({ type: 'chapter', ...s, meta: chapterById.get(s.id) || {}, rank: order.get(s.id) ?? 1e9 }))
    .sort((a, b) => a.rank - b.rank)

  const build = (list, level, path) => {
    if (level >= LEVELS.length) return list
    const { field, label } = LEVELS[level]
    const groups = new Map()
    for (const leaf of list) {
      const k = keyOf(leaf.meta[field])
      if (!groups.has(k)) groups.set(k, [])
      groups.get(k).push(leaf)
    }
    if (groups.size === 1) return build(list, level + 1, path)
    return [...groups.entries()].map(([k, items]) => {
      const key = `${path}/${k}`
      const count = items.reduce((n, c) => n + c.count, 0)
      const avg = round2(items.reduce((n, c) => n + c.sum, 0) / count)
      const children = build(items, level + 1, key)
      return { type: 'group', key, label: label(items[0].meta[field] ?? null), avg, count, weak: items.some((c) => c.weak), children }
    })
  }

  const tree = build(leaves, 0, '')
  const none = stats.find((s) => !s.id)
  if (none) tree.push({ type: 'chapter', ...none, id: null, title: 'Bài khác' })
  return tree
}

// Các nhóm có chương "cần ôn" (để mở sẵn)
export function weakGroupKeys(tree, out = []) {
  for (const n of tree) if (n.type === 'group') {
    if (n.weak) out.push(n.key)
    weakGroupKeys(n.children, out)
  }
  return out
}

const pick = (list) => list[Math.floor(Math.random() * list.length)]
const vi = (n) => String(Math.round(n * 10) / 10).replace('.', ',')

// Lời gấu khi mở biểu đồ. voice: 'student' (nói với học sinh) | 'tutor' (báo gia sư về học sinh)
// Trả về { text, cheer } | null; cheer = bài mới nhất là điểm cao nhất từ trước tới giờ (≥ 3 bài)
export function chartComment(points, voice) {
  if (!points.length) return null
  const st = chartStats(points)
  const last = points[points.length - 1]
  const best = points.length >= 3 && last.score >= st.max && points.slice(0, -1).every((p) => p.score < last.score)
  const weakest = chapterStats(points).filter((c) => c.weak && c.id).pop()

  if (voice === 'tutor') {
    if (best) return { text: `Bài mới nhất đạt ${vi(last.score)} điểm — cao nhất từ trước tới giờ của bạn này! 🏆` }
    if (st.trend !== null && st.trend >= 0.5) return { text: `Đang tiến bộ: TB 3 bài gần nhất tăng ${vi(st.trend)} điểm 📈` }
    if (st.trend !== null && st.trend <= -0.5)
      return { text: `3 bài gần nhất giảm ${vi(-st.trend)} điểm${weakest ? `, chương "${weakest.title}" đang yếu nhất` : ''} — nên kèm thêm nhé.` }
    if (weakest) return { text: `Điểm khá ổn định. Chương "${weakest.title}" TB ${vi(weakest.avg)}, nên giao thêm bài ôn.` }
    return { text: `Điểm ổn định, TB ${vi(st.avg)}/10 qua ${st.count} bài.` }
  }

  if (best) return { text: `Kỷ lục mới: ${vi(last.score)} điểm! Bạn giỏi quá 🎉`, cheer: true }
  if (st.trend !== null && st.trend >= 0.5)
    return { text: pick([`Điểm đang đi lên ▲ ${vi(st.trend)}! Giữ phong độ nhé 💪`, `Tiến bộ rõ luôn: tăng ${vi(st.trend)} điểm so với mấy bài trước 📈`]) }
  if (st.trend !== null && st.trend <= -0.5)
    return { text: 'Mấy bài gần đây hơi giảm. Vào Ôn tập làm lại câu sai là lên lại ngay 💪' }
  if (last.score >= 8) return { text: `Bài gần nhất ${vi(last.score)} điểm, tốt lắm! Cứ thế phát huy nhé ✨` }
  return { text: pick(['Điểm của bạn đang ổn định. Thêm chút nữa là bứt phá đó! 🚀', 'Chạm vào từng điểm để xem lại bài nhé 📊']) }
}

// Lời gấu khi học sinh chạm một điểm (chỉ nói khi đáng nói)
export function pointComment(p, points) {
  if (points.length >= 3 && p.score >= Math.max(...points.map((x) => x.score))) return `"${p.title}" là bài điểm cao nhất của bạn 🏆`
  if (p.score < 5) return 'Bài này chưa tốt lắm, xem lại lời giải rồi thử làm lại nhé 💪'
  return null
}

// Trung bình động k bài (từ bài thứ k trở đi) → [{ i, v }]
export function movingAvg(points, k = 3) {
  const out = []
  for (let i = k - 1; i < points.length; i++) out.push({ i, v: avgOf(points.slice(i - k + 1, i + 1)) })
  return out
}
