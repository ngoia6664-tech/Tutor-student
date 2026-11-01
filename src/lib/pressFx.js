// Hiệu ứng theo con trỏ, vẽ bằng components.css:
// - Vầng sáng theo chuột: một phần tử cố định (.cursor-glow) phủ trên mọi lớp, di chuyển theo chuột thật
// - .btn: sóng lan từ điểm bấm (--px/--py + class is-rip), chạy trọn dù chỉ chạm nhanh
let frame = 0
let mx = 0
let my = 0

function ripple(/** @type {HTMLElement} */ btn, /** @type {number} */ x, /** @type {number} */ y) {
  if (btn.matches(':disabled')) return
  const r = btn.getBoundingClientRect()
  btn.style.setProperty('--px', `${x - r.left}px`)
  btn.style.setProperty('--py', `${y - r.top}px`)
  btn.classList.remove('is-rip')
  void btn.offsetWidth // buộc tính lại kiểu để hoạt ảnh chạy lại khi bấm liên tiếp
  btn.classList.add('is-rip')
}

export function installPressFx() {
  const glow = document.createElement('div')
  glow.className = 'cursor-glow'
  glow.setAttribute('aria-hidden', 'true')
  document.body.appendChild(glow)

  document.addEventListener(
    'pointermove',
    (e) => {
      if (e.pointerType !== 'mouse') return
      mx = e.clientX
      my = e.clientY
      glow.classList.add('is-on')
      if (frame) return
      frame = requestAnimationFrame(() => {
        frame = 0
        glow.style.transform = `translate3d(${mx}px, ${my}px, 0)`
      })
    },
    { passive: true }
  )
  // Chuột ra khỏi cửa sổ thì tắt vầng sáng
  document.documentElement.addEventListener('pointerleave', () => glow.classList.remove('is-on'))

  document.addEventListener(
    'pointerdown',
    (e) => {
      const btn = e.target instanceof Element ? e.target.closest('.btn') : null
      if (btn instanceof HTMLElement) ripple(btn, e.clientX, e.clientY)
    },
    { passive: true }
  )
  // Bàn phím (Enter / Space) không có điểm chạm: cho sóng lan từ giữa nút
  document.addEventListener('click', (e) => {
    if (e.detail !== 0) return
    const btn = e.target instanceof Element ? e.target.closest('.btn') : null
    if (!(btn instanceof HTMLElement)) return
    const r = btn.getBoundingClientRect()
    ripple(btn, r.left + r.width / 2, r.top + r.height / 2)
  })
}
