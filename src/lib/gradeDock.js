import { useEffect, useSyncExternalStore } from 'react'

// "Đang chấm bài": trang theo dõi / chấm một bài tập đang mở (AssignmentTracking). Khi đó bấm gấu (Mascot) không giảng / nói
// mà ẩn / hiện Sổ chấm bài; gấu không đi dạo. Rời trang thì gấu trở lại bình thường.
const OPEN_KEY = 'grade-dock-open'

// Mặc định mở; nhớ lựa chọn trên máy
function readOpen() {
  try {
    return localStorage.getItem(OPEN_KEY) !== '0'
  } catch {
    return true
  }
}

let state = { active: 0, open: readOpen() }
const listeners = new Set()
const emit = () => listeners.forEach((fn) => fn())

function subscribe(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

export function useGrading() {
  return useSyncExternalStore(subscribe, () => state.active > 0)
}

export function useGradeDockOpen() {
  return useSyncExternalStore(subscribe, () => state.open)
}

export function toggleGradeDock() {
  state = { ...state, open: !state.open }
  try {
    localStorage.setItem(OPEN_KEY, state.open ? '1' : '0')
  } catch {
    // Trình duyệt chặn lưu: chỉ không nhớ được lựa chọn
  }
  emit()
}

// Gọi trong trang chấm bài: bật chế độ chấm khi active, tự tắt khi rời trang
export function useGradingMode(active = true) {
  useEffect(() => {
    if (!active) return
    state = { ...state, active: state.active + 1 }
    emit()
    return () => {
      state = { ...state, active: state.active - 1 }
      emit()
    }
  }, [active])
}
