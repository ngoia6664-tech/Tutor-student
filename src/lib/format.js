// Parse 'YYYY-MM-DD' theo giờ địa phương (tránh lệch ngày do múi giờ)
export function parseDate(d) {
  if (!d) return null
  const [y, m, day] = d.slice(0, 10).split('-').map(Number)
  return new Date(y, m - 1, day)
}

export function formatDate(d) {
  const date = parseDate(d)
  if (!date) return 'Không có hạn'
  return date.toLocaleDateString('vi-VN', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' })
}

export function formatDateTime(ts) {
  if (!ts) return ''
  return new Date(ts).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' })
}

// Số ngày từ hôm nay đến hạn (âm = quá hạn)
export function daysUntil(d) {
  const date = parseDate(d)
  if (!date) return null
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Math.round((date.getTime() - today.getTime()) / 86400000)
}

export function dueInfo(d) {
  const n = daysUntil(d)
  if (n === null) return { text: 'Không có hạn', tone: 'muted' }
  if (n < 0) return { text: `Quá hạn ${-n} ngày`, tone: 'danger' }
  if (n === 0) return { text: 'Hạn hôm nay', tone: 'danger' }
  if (n === 1) return { text: 'Hạn ngày mai', tone: 'warn' }
  if (n <= 3) return { text: `Còn ${n} ngày`, tone: 'warn' }
  return { text: `Còn ${n} ngày`, tone: 'ok' }
}

// Sắp xếp theo hạn gần nhất, bài không có hạn để cuối
export function compareDue(a, b) {
  if (!a && !b) return 0
  if (!a) return 1
  if (!b) return -1
  return a < b ? -1 : a > b ? 1 : 0
}

export const TYPE_LABEL = { classwork: 'Làm trên lớp', homework: 'Về nhà' }
export const STATUS_LABEL = { todo: 'Chưa nộp', done: 'Đã nộp – chờ chấm', checked: 'Đã chấm' }

export function formatScore(s) {
  if (s === null || s === undefined || s === '') return '—'
  return String(Number(s))
}
