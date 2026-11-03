// Chủ đề vừa nhập / thay đổi (Thư viện gia sư): hiện nhãn "Mới" ở cây + thẻ chủ đề cho tới khi mở chủ đề đó.
// Lưu trên máy này (localStorage: { id: thời điểm ms }), tự hết sau 7 ngày. Lỗi lưu trữ thì bỏ qua, không ảnh hưởng chức năng.

const KEY = 'recent-chapters'
const TTL = 7 * 24 * 3600 * 1000

/** @returns {Record<string, number>} */
function read(now = Date.now()) {
  try {
    const all = JSON.parse(localStorage.getItem(KEY) || '{}')
    return Object.fromEntries(Object.entries(all).filter(([, t]) => typeof t === 'number' && now - t < TTL))
  } catch {
    return {}
  }
}

/** @param {Record<string, number>} m */
function write(m) {
  try {
    localStorage.setItem(KEY, JSON.stringify(m))
  } catch {
    // bỏ qua
  }
}

/** Đánh dấu các chủ đề vừa thay đổi @param {string[]} ids */
export function markRecent(ids, now = Date.now()) {
  const m = read(now)
  for (const id of ids) if (id) m[id] = now
  write(m)
}

/** Tắt nhãn "Mới" của một chủ đề (khi mở nó) */
export function clearRecent(id) {
  const m = read()
  if (id in m) {
    delete m[id]
    write(m)
  }
}

/** @returns {Set<string>} id các chủ đề còn nhãn "Mới" */
export function recentIds(now = Date.now()) {
  return new Set(Object.keys(read(now)))
}
