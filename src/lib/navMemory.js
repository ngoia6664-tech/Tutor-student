import { useEffect, useState } from 'react'

// Bộ nhớ điều hướng trong phiên (sessionStorage: tải lại trang vẫn còn, đóng tab là quên).
// - Mỗi tab menu nhớ URL danh sách mở gần nhất (chương / bộ lọc nằm trên ?query của URL)
// - Mỗi URL danh sách nhớ vị trí cuộn: mục neo (link đầu tiên đang thấy) + độ lệch, y dự phòng, mục vừa mở
// - Bộ lọc nhỏ không nằm trên URL (ô tìm, nhóm, trạng thái): useRemembered
// KHÔNG nhớ: chọn nhiều (Sửa / Xóa nhiều), hộp thoại, đang tải, thông báo — để trong state của trang, mất khi rời trang.

const STORE = 'nav-memory-v1'
const MAX_SCROLL = 60 // số URL nhớ vị trí cuộn tối đa (cũ nhất bị bỏ)
// Tham số URL không thuộc danh sách (Kính thiên văn) — không nhớ
const IGNORED_PARAMS = ['vu-tru']

// Trang danh sách → tab menu chứa nó. Chỉ những trang này được nhớ URL cho tab.
/** @type {[string, RegExp][]} */
const LIST_ROUTES = [
  ['/tutor', /^\/tutor\/?$/],
  ['/tutor/library', /^\/tutor\/library(\/[^/]+)?\/?$/],
  ['/tutor/assignments', /^\/tutor\/assignments\/?$/],
  ['/tutor/lessons', /^\/tutor\/lessons\/?$/],
  ['/student', /^\/student\/?$/],
  ['/student/lessons', /^\/student\/lessons\/?$/],
  ['/student/results', /^\/student\/results\/?$/],
  ['/student/mistakes', /^\/student\/mistakes\/?$/],
  ['/student/library', /^\/student\/library(\/[^/]+)?\/?$/],
]

let mem = null
function load() {
  if (mem) return mem
  mem = { tabs: {}, scroll: {}, values: {} }
  try {
    const raw = typeof sessionStorage !== 'undefined' && sessionStorage.getItem(STORE)
    if (raw) mem = { ...mem, ...JSON.parse(raw) }
  } catch {
    // dữ liệu hỏng / trình duyệt chặn: bắt đầu trống
  }
  return mem
}
export function flushNav() {
  try {
    if (mem && typeof sessionStorage !== 'undefined') sessionStorage.setItem(STORE, JSON.stringify(mem))
  } catch {
    // đầy bộ nhớ / chế độ riêng tư: chỉ giữ trong RAM
  }
}
// Chỉ dùng trong test
export function resetNav() {
  mem = null
}

// Khóa một trang: đường dẫn + query (bỏ tham số không thuộc danh sách, giữ thứ tự)
export function urlKey(pathname, search = '') {
  const p = new URLSearchParams(search)
  IGNORED_PARAMS.forEach((k) => p.delete(k))
  const q = p.toString()
  return q ? `${pathname}?${q}` : pathname
}

// Tab menu của một trang danh sách (null: không phải trang danh sách, vd. trang chi tiết / soạn bài)
export function tabOf(pathname) {
  return LIST_ROUTES.find(([, re]) => re.test(pathname))?.[0] ?? null
}

// Gọi mỗi lần đổi trang: trang danh sách thì ghi URL cho tab của nó
export function rememberList(pathname, search) {
  const tab = tabOf(pathname)
  if (!tab) return
  const m = load()
  const url = urlKey(pathname, search)
  if (m.tabs[tab] === url) return
  m.tabs[tab] = url
  flushNav()
}

// URL để mở lại tab / "← Danh sách": đúng chương + bộ lọc lần trước, chưa có thì URL gốc
export function listUrl(tab) {
  return load().tabs[tab] || tab
}

// Chương / chuyên đề vừa bị xóa: quên các URL đang trỏ vào nó (tab mở lại về chỗ hợp lệ)
export function forgetUrlsWith(ids) {
  const m = load()
  const hit = (url) => ids.some((id) => id && url.includes(id))
  Object.keys(m.tabs).forEach((t) => hit(m.tabs[t]) && (m.tabs[t] = t))
  Object.keys(m.scroll).forEach((k) => hit(k) && delete m.scroll[k])
  flushNav()
}

export function readScroll(key) {
  return load().scroll[key] || null
}
// Ghi gộp (giữ "opened" cũ nếu lần này không có). Không ghi sessionStorage ở đây (gọi mỗi khung hình khi cuộn):
// ghi lúc đổi trang / ẩn tab (flushNav)
export function saveScroll(key, pos) {
  const s = load().scroll
  const merged = { ...s[key], ...pos }
  delete s[key] // đưa xuống cuối = mới nhất
  s[key] = merged
  const keys = Object.keys(s)
  for (let i = 0; i < keys.length - MAX_SCROLL; i++) delete s[keys[i]]
}

// useState nhớ trong phiên theo khóa (bộ lọc không nằm trên URL). valid(v): giá trị cũ còn dùng được không
export function useRemembered(key, initial, valid) {
  const [value, setValue] = useState(() => {
    const v = load().values[key]
    return v === undefined || (valid && !valid(v)) ? initial : v
  })
  useEffect(() => {
    const m = load()
    if (m.values[key] === value) return
    m.values[key] = value
    flushNav()
  }, [key, value])
  return [value, setValue]
}
