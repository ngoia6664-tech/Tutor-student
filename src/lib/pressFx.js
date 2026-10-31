// Hiệu ứng chạm nút: ghi điểm chạm vào --px/--py để CSS (.btn::before) vẽ vệt sáng ngay chỗ ngón tay
export function installPressFx() {
  document.addEventListener(
    'pointerdown',
    (e) => {
      const btn = e.target instanceof Element ? e.target.closest('.btn') : null
      if (!(btn instanceof HTMLElement)) return
      const r = btn.getBoundingClientRect()
      btn.style.setProperty('--px', `${e.clientX - r.left}px`)
      btn.style.setProperty('--py', `${e.clientY - r.top}px`)
    },
    { passive: true }
  )
}
