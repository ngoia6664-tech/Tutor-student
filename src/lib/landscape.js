// Điện thoại khi bay tự do: ưu tiên màn hình ngang.
// Android Chrome: bật toàn màn hình rồi khoá xoay ngang (phải gọi ngay trong lúc bấm nút — cần cử chỉ người dùng).
// iPhone / trình duyệt không cho khoá: bỏ qua, FreeFlight hiện màn che "Xoay ngang" và tạm dừng.
export const PHONE = '(pointer: coarse) and (max-width: 600px), (pointer: coarse) and (max-height: 600px)'
export const PHONE_PORTRAIT = '(pointer: coarse) and (orientation: portrait) and (max-width: 600px)'

export function enterLandscape() {
  if (!window.matchMedia(PHONE).matches) return
  const el = document.documentElement
  if (!el.requestFullscreen || document.fullscreenElement) return
  el.requestFullscreen({ navigationUI: 'hide' })
    .then(() => screen.orientation?.lock?.('landscape'))
    .catch(() => {})
}

export function leaveLandscape() {
  try {
    screen.orientation?.unlock?.()
  } catch {
    // trình duyệt không hỗ trợ
  }
  if (document.fullscreenElement) document.exitFullscreen().catch(() => {})
}
