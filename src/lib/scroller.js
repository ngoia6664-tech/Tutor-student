// Phần tử đang cuộn nội dung chính của trang.
// Khung cố định (<html data-shell>, gia sư màn rộng — Layout.jsx, styles/shell.css): trang không cuộn, nội dung tự cuộn trong `.page-body`.
// Các nơi khác: cuộn của cả trang (window). ScrollMemory, ScrollJump, nền vũ trụ... dùng các hàm này thay cho window.scrollY / scrollTo.

/** @returns {HTMLElement | null} khung cuộn của nội dung, hoặc null khi cuộn cả trang */
export const getScroller = () => (document.documentElement.hasAttribute('data-shell') ? document.querySelector('.page-body') : null)

export const scrollY = () => {
  const el = getScroller()
  return el ? el.scrollTop : window.scrollY
}
export const maxScroll = () => {
  const el = getScroller()
  return el ? el.scrollHeight - el.clientHeight : document.documentElement.scrollHeight - window.innerHeight
}

/** @param {number} top @param {ScrollBehavior} [behavior] */
export function scrollToY(top, behavior = 'auto') {
  const el = getScroller()
  if (el) el.scrollTo({ top, behavior })
  else window.scrollTo({ top, behavior })
}

/** Mép trên của vùng nhìn thấy (px từ đỉnh màn hình): đầu khung cuộn, hoặc mép dưới thanh trên cùng */
export const viewTop = () => {
  const el = getScroller()
  if (el) return el.getBoundingClientRect().top
  return Math.max(0, document.querySelector('.topbar')?.getBoundingClientRect().bottom || 0)
}

/**
 * Nghe sự kiện cuộn của nội dung chính. Nghe ở pha bắt (capture) trên window vì sự kiện scroll của một phần tử không nổi bọt;
 * chỉ gọi `fn` khi đúng khung nội dung (hoặc cả trang) cuộn, bỏ qua cột phải, cây mục lục...
 * @param {() => void} fn @returns {() => void} hàm hủy
 */
export function onScroll(fn) {
  /** @param {Event} e */
  const handler = (e) => {
    const el = getScroller()
    if (el ? e.target === el : e.target === document) fn()
  }
  window.addEventListener('scroll', handler, { capture: true, passive: true })
  return () => window.removeEventListener('scroll', handler, { capture: true })
}
