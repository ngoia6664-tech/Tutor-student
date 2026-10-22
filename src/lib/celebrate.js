// Ăn mừng: pháo giấy + bé Nguyên Tử (components/Mascot.jsx) nhảy lên nói một câu.
// Gọi được từ bất kỳ trang nào, không cần truyền props.
import { getSettings, prefersReducedMotion } from './settings.js'

export const MASCOT_EVENT = 'mascot'

// mood: 'talk' (nói bình thường) | 'cheer' (nhảy lên ăn mừng)
export function mascotSay(text, mood = 'talk') {
  window.dispatchEvent(new CustomEvent(MASCOT_EVENT, { detail: { text, mood } }))
}

// Tắt "Hiệu ứng ăn mừng" trong Cài đặt: không pháo giấy, gấu chỉ nói (không nhảy); lời nhắn vẫn hiện
export function celebrate(text) {
  const on = getSettings().celebration
  if (on) confetti()
  mascotSay(text, on ? 'cheer' : 'talk')
}

const COLORS = ['#a855f7', '#ec4899', '#facc15', '#22d3ee', '#4ade80']

function confetti() {
  // Giảm chuyển động / tab đang ẩn (không ai xem): không tạo hạt
  if (prefersReducedMotion() || document.hidden) return
  const box = document.createElement('div')
  box.className = 'confetti'
  box.setAttribute('aria-hidden', 'true')
  for (let i = 0; i < 70; i++) {
    const p = document.createElement('span')
    p.style.left = `${Math.random() * 100}%`
    p.style.background = COLORS[i % COLORS.length]
    p.style.animationDelay = `${Math.random() * 0.4}s`
    p.style.animationDuration = `${1.6 + Math.random() * 1.2}s`
    p.style.setProperty('--drift', `${(Math.random() - 0.5) * 160}px`)
    p.style.setProperty('--spin', `${(Math.random() - 0.5) * 1080}deg`)
    if (i % 3 === 0) p.style.borderRadius = '50%'
    box.appendChild(p)
  }
  document.body.appendChild(box)
  setTimeout(() => box.remove(), 3200)
}
