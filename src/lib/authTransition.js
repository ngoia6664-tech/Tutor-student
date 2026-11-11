// Hiệu ứng chuyển Trang chủ ↔ Đăng nhập (2 trang tải riêng): trang đi ghi cờ vào sessionStorage,
// trang đến đọc cờ để diễn tiếp phần còn lại. CSS: styles/auth.css.
import { prefersReducedMotion } from './settings.js'

const KEY = 'auth-transition'
/** Cờ sessionStorage: dashboard đã diễn màn xuất hiện trong phiên này (Layout); đăng nhập xong thì xóa để diễn lại */
export const DASH_INTRO_KEY = 'dash-intro'

/** @param {'login' | 'home'} to */
export function markTransition(to) {
  try { sessionStorage.setItem(KEY, to) } catch { /* chế độ riêng tư: bỏ qua, chỉ mất hiệu ứng */ }
}

/** Cờ có dành cho trang này không. Không xóa cờ (React StrictMode gọi 2 lần): xóa bằng clearTransition.
 * @param {'login' | 'home'} to */
export function readTransition(to) {
  try {
    return sessionStorage.getItem(KEY) === to && !prefersReducedMotion()
  } catch { return false }
}

/** Đã diễn xong / đã đọc: xóa cờ để tải lại trang không diễn lại */
export function clearTransition() {
  try { sessionStorage.removeItem(KEY) } catch { /* bỏ qua */ }
}

/** Chỉ diễn với cú bấm chuột trái thường; Ctrl/Cmd/Shift/chuột giữa vẫn mở tab như link. @param {MouseEvent} e */
export const canAnimateClick = (e) =>
  !prefersReducedMotion() && e.button === 0 && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey
