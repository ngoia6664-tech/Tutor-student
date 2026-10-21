import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import Icon from './Icon.jsx'
import '../styles/explorer.css'

// Chế độ ngắm vũ trụ (tải lười từ Layout): dùng lại chính hệ Mặt Trời của nền (SpaceBackdrop), không vẽ thêm.
// Kéo để xoay góc nhìn, lăn chuột / chụm 2 ngón để phóng to, bấm hành tinh xem số liệu Vật lý. Esc để thoát.
const G_EARTH = 9.8
const BODIES = {
  sun: { name: 'Mặt Trời', g: 274, facts: ['Chiếm khoảng 99,86% khối lượng cả hệ Mặt Trời.', 'Ánh sáng đi từ Mặt Trời tới Trái Đất mất khoảng 8 phút 20 giây.'] },
  mercury: { name: 'Sao Thủy', g: 3.7, facts: ['Một năm chỉ 88 ngày Trái Đất.', 'Không có khí quyển giữ nhiệt: ngày khoảng 430 °C, đêm khoảng −180 °C.'] },
  venus: { name: 'Sao Kim', g: 8.9, facts: ['Nóng nhất hệ Mặt Trời (khoảng 465 °C) do hiệu ứng nhà kính.', 'Tự quay rất chậm: một ngày (243 ngày Trái Đất) dài hơn một năm (225 ngày).'] },
  earth: { name: 'Trái Đất', g: 9.8, facts: ['Cách Mặt Trời khoảng 150 triệu km (1 AU).', 'Chạy trên quỹ đạo với tốc độ khoảng 30 km/s.'] },
  mars: { name: 'Sao Hỏa', g: 3.7, facts: ['Một năm dài 687 ngày Trái Đất.', 'Có ngọn núi lửa cao nhất hệ Mặt Trời: Olympus Mons, khoảng 22 km.'] },
  jupiter: { name: 'Sao Mộc', g: 24.8, facts: ['Khối lượng gấp khoảng 318 lần Trái Đất.', 'Tự quay nhanh nhất: một ngày chưa tới 10 giờ.'] },
  saturn: { name: 'Sao Thổ', g: 10.4, facts: ['Khối lượng riêng trung bình khoảng 0,69 g/cm³, nhỏ hơn nước.', 'Vành đai chủ yếu là băng và đá, dày chỉ vài chục mét.'] },
}

const clamp = (v, a, b) => Math.min(b, Math.max(a, v))
const fmt = (n) => n.toLocaleString('vi-VN', { maximumFractionDigits: 1 })

export default function SpaceExplorer({ onClose }) {
  const [picked, setPicked] = useState(null)
  const view = useRef({ tilt: 55, turn: 0, zoom: 1.4 })
  // Giữ onClose mới nhất mà không phải gắn lại sự kiện mỗi lần Layout render
  const closeRef = useRef(onClose)
  closeRef.current = onClose

  useEffect(() => {
    const solar = document.querySelector('.solar')
    const space = document.querySelector('.space')
    if (!solar || !space) return
    const saved = { tilt: solar.style.getPropertyValue('--tilt'), turn: solar.style.getPropertyValue('--turn') }
    const root = document.documentElement
    root.classList.add('space-exploring')

    let frame = 0
    const apply = () => {
      frame = 0
      const v = view.current
      solar.style.setProperty('--tilt', `${v.tilt}deg`)
      solar.style.setProperty('--turn', `${v.turn}deg`)
      solar.style.setProperty('--zoom', v.zoom)
    }
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(apply)
    }
    apply()

    // Kéo (1 ngón / chuột) xoay; 2 ngón chụm để phóng to
    const pointers = new Map()
    let moved = 0
    let pinch = 0
    const down = (e) => {
      if (e.target.closest('.explorer-ui')) return
      // Chặn hành vi mặc định (bôi đen / kéo-thả chữ): nếu không, trình duyệt có lúc hiện con trỏ "cấm" và không xoay được
      e.preventDefault()
      window.getSelection?.()?.removeAllRanges()
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY })
      moved = 0
      space.setPointerCapture?.(e.pointerId)
    }
    const move = (e) => {
      const p = pointers.get(e.pointerId)
      if (!p) return
      const v = view.current
      if (pointers.size === 2) {
        const [a, b] = [...pointers.values()]
        const d0 = Math.hypot(a.x - b.x, a.y - b.y)
        p.x = e.clientX
        p.y = e.clientY
        const [c, d] = [...pointers.values()]
        const d1 = Math.hypot(c.x - d.x, c.y - d.y)
        if (d0 > 0) v.zoom = clamp(v.zoom * (d1 / d0), 0.5, 3)
        pinch = 1
      } else {
        const dx = e.clientX - p.x
        const dy = e.clientY - p.y
        p.x = e.clientX
        p.y = e.clientY
        moved += Math.abs(dx) + Math.abs(dy)
        v.turn += dx * 0.35
        v.tilt = clamp(v.tilt - dy * 0.3, -80, 89)
      }
      schedule()
    }
    const up = (e) => {
      if (!pointers.has(e.pointerId)) return
      pointers.delete(e.pointerId)
      // Bấm (không kéo) vào hành tinh / Mặt Trời: xem số liệu
      if (moved < 6 && !pinch) {
        const hit = document.elementFromPoint(e.clientX, e.clientY)?.closest('.solar-planet, .solar-sun')
        const key = hit && (hit.classList.contains('solar-sun') ? 'sun' : [...hit.classList].find((c) => c.startsWith('solar-') && c !== 'solar-planet')?.slice(6))
        setPicked(key && BODIES[key] ? key : null)
      }
      if (!pointers.size) pinch = 0
    }
    const wheel = (e) => {
      e.preventDefault()
      view.current.zoom = clamp(view.current.zoom * (1 - e.deltaY * 0.0012), 0.5, 3)
      schedule()
    }
    const key = (e) => e.key === 'Escape' && closeRef.current()
    const noDrag = (e) => e.preventDefault()

    space.addEventListener('pointerdown', down)
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', up)
    space.addEventListener('wheel', wheel, { passive: false })
    window.addEventListener('keydown', key)
    window.addEventListener('dragstart', noDrag)
    window.addEventListener('selectstart', noDrag)
    return () => {
      window.removeEventListener('dragstart', noDrag)
      window.removeEventListener('selectstart', noDrag)
      cancelAnimationFrame(frame)
      space.removeEventListener('pointerdown', down)
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      window.removeEventListener('pointercancel', up)
      space.removeEventListener('wheel', wheel)
      window.removeEventListener('keydown', key)
      root.classList.remove('space-exploring')
      solar.style.setProperty('--tilt', saved.tilt)
      solar.style.setProperty('--turn', saved.turn)
      solar.style.removeProperty('--zoom')
      document.querySelectorAll('.solar .is-picked').forEach((el) => el.classList.remove('is-picked'))
    }
  }, [])

  // Đánh dấu hành tinh đang xem
  useEffect(() => {
    document.querySelectorAll('.solar .is-picked').forEach((el) => el.classList.remove('is-picked'))
    if (picked) document.querySelector(picked === 'sun' ? '.solar-sun' : `.solar-${picked}`)?.classList.add('is-picked')
  }, [picked])

  function zoomBy(f) {
    const v = view.current
    v.zoom = clamp(v.zoom * f, 0.5, 3)
    document.querySelector('.solar')?.style.setProperty('--zoom', v.zoom)
  }

  const b = picked && BODIES[picked]

  return createPortal(
    <div className="explorer-ui" role="dialog" aria-label="Ngắm hệ Mặt Trời">
      <div className="explorer-top">
        <div>
          <h2 className="explorer-title">Hệ Mặt Trời</h2>
          <p className="explorer-hint">Kéo để xoay, lăn chuột hoặc chụm hai ngón để phóng to, bấm vào hành tinh để xem số liệu.</p>
        </div>
        <button type="button" className="btn btn-primary btn-small" onClick={onClose}>
          <Icon name="close" /> Quay lại học
        </button>
      </div>

      {b && (
        <div className="explorer-card" key={picked}>
          <button type="button" className="explorer-card-x" onClick={() => setPicked(null)} aria-label="Đóng">
            ×
          </button>
          <h3>{b.name}</h3>
          <p className="explorer-g">
            g ≈ {fmt(b.g)} m/s²
            {picked !== 'earth' && (
              <span className="muted">
                {' '}
                ({fmt(b.g / G_EARTH)} lần Trái Đất)
              </span>
            )}
          </p>
          {picked !== 'earth' && picked !== 'sun' && (
            <p>
              Bạn nặng 50 kg ở Trái Đất thì ở đây cảm giác nặng như <b>{fmt((50 * b.g) / G_EARTH)} kg</b>.
            </p>
          )}
          <ul>
            {b.facts.map((f) => (
              <li key={f}>{f}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="explorer-zoom">
        <button type="button" className="btn btn-ghost theme-toggle" onClick={() => zoomBy(1.25)} aria-label="Phóng to">
          <Icon name="plus" />
        </button>
        <button type="button" className="btn btn-ghost theme-toggle" onClick={() => zoomBy(0.8)} aria-label="Thu nhỏ">
          <span aria-hidden="true">−</span>
        </button>
      </div>
    </div>,
    document.body
  )
}
