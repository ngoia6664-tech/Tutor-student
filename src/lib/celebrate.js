// Ăn mừng: pháo giấy + bé Nguyên Tử (components/Mascot.jsx) nhảy lên nói một câu.
// Gọi được từ bất kỳ trang nào, không cần truyền props.
export const MASCOT_EVENT = 'mascot'

// mood: 'talk' (nói bình thường) | 'cheer' (nhảy lên ăn mừng)
export function mascotSay(text, mood = 'talk') {
  window.dispatchEvent(new CustomEvent(MASCOT_EVENT, { detail: { text, mood } }))
}

export function celebrate(text) {
  confetti()
  mascotSay(text, 'cheer')
}

const COLORS = ['#a855f7', '#ec4899', '#facc15', '#22d3ee', '#4ade80']

function confetti() {
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
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
