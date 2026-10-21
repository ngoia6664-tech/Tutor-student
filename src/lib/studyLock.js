import { useEffect, useSyncExternalStore } from 'react'

// "Đang làm bài": trang làm bài chưa nộp đang mở. Khi đó khóa chế độ ngắm vũ trụ (nút kính viễn vọng ở Layout)
// và gấu chỉ ngồi đọc sách đợi (Mascot). Nộp xong (trang chuyển sang xem lại) thì tự mở khóa.
export const LOCK_MESSAGE = 'Làm xong bài là mở khóa phần thưởng đó! Thầy ngồi đợi nè 📖'
export const TELESCOPE_LOCKED = 'Nộp bài xong mới được ngắm vũ trụ nhé! 🔭'
export const UNLOCK_PRAISE = 'Nộp bài xong rồi! Giỏi lắm 🎉 Phần thưởng đã mở: bấm 🔭 để ngắm vũ trụ nhé.'

let count = 0
const listeners = new Set()
const emit = () => listeners.forEach((fn) => fn())

function subscribe(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

export function useStudying() {
  return useSyncExternalStore(subscribe, () => count > 0)
}

// Gọi trong trang làm bài: khóa khi active, tự mở khi rời trang / nộp xong
export function useStudyLock(active = true) {
  useEffect(() => {
    if (!active) return
    count++
    emit()
    return () => {
      count--
      emit()
    }
  }, [active])
}
