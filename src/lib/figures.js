// "Hình của tôi": hình vẽ lưu trên máy này (trình duyệt), theo từng tài khoản.
// Mỗi hình: { id, name, mode, ggb (nội dung để mở lại), thumb (ảnh nhỏ), updated }
const MAX = 40
const keyFor = (userId) => `draw-figures:${userId}`

export function listFigures(userId) {
  try {
    const list = JSON.parse(localStorage.getItem(keyFor(userId)) || '[]')
    return Array.isArray(list) ? list : []
  } catch {
    return []
  }
}

function write(userId, list) {
  localStorage.setItem(keyFor(userId), JSON.stringify(list))
}

// Lưu mới hoặc ghi đè (cùng id). Trả về danh sách mới; bộ nhớ đầy thì báo lỗi rõ ràng.
export function saveFigure(userId, fig) {
  const now = new Date().toISOString()
  const item = { ...fig, id: fig.id || `f${Date.now().toString(36)}`, updated: now }
  const list = [item, ...listFigures(userId).filter((f) => f.id !== item.id)].slice(0, MAX)
  try {
    write(userId, list)
  } catch {
    throw new Error('Bộ nhớ trình duyệt đã đầy. Hãy xóa bớt hình cũ rồi lưu lại.')
  }
  return { item, list }
}

export function deleteFigure(userId, id) {
  const list = listFigures(userId).filter((f) => f.id !== id)
  try {
    write(userId, list)
  } catch {
    // bỏ qua
  }
  return list
}
