// Trang chủ: bấm nút có gấu ló dẫn tới /login thì gấu nhảy khỏi nút, trang mờ đi rồi mới chuyển
// (trang Đăng nhập diễn tiếp phần thẻ trượt vào). CSS: styles/auth.css.
import { canAnimateClick, clearTransition, markTransition, readTransition } from '../lib/authTransition.js'

const LEAVE_MS = 520
const root = document.documentElement

document.addEventListener('click', (e) => {
  const a = /** @type {HTMLAnchorElement | null} */ (e.target instanceof Element ? e.target.closest('a.peek-btn[href="/login"]') : null)
  if (!a || !canAnimateClick(e) || root.classList.contains('auth-leaving')) return
  e.preventDefault()
  markTransition('login')
  a.classList.add('is-going')
  root.classList.add('auth-leaving')
  setTimeout(() => window.location.assign(a.href), LEAVE_MS)
})

// Bấm Back từ Đăng nhập mà trình duyệt trả trang cũ từ bộ nhớ đệm: gỡ trạng thái đang mờ
window.addEventListener('pageshow', (e) => {
  if (!e.persisted) return
  root.classList.remove('auth-leaving')
  document.querySelectorAll('.peek-btn.is-going').forEach((b) => b.classList.remove('is-going'))
})

// Từ Đăng nhập về: gấu ở nút Đăng nhập đầu trang ló ra vẫy chào
if (readTransition('home')) {
  clearTransition()
  const btn = document.querySelector('.btn-login-header')
  btn?.classList.add('is-hello')
  setTimeout(() => btn?.classList.remove('is-hello'), 1400)
}
