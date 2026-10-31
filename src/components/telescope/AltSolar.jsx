// @ts-nocheck — nợ kiểu: xóa dòng này rồi chạy npm run typecheck để sửa
import { createPortal } from 'react-dom'

// Hệ sao ngoài Hệ Mặt Trời, dựng y hệt hệ Mặt Trời của nền (SpaceBackdrop): cùng cấu trúc + class .solar-*
// (mặt phẳng nghiêng --tilt/--turn, quỹ đạo quay bằng CSS, "face" nghiêng ngược để thiên thể luôn tròn).
// Gắn vào .space (lớp nền) để SpaceExplorer kéo xoay / phóng to / bấm như Hệ Mặt Trời. data-body = khóa trong SYSTEMS[id].bodies.
// Màu lấy từ look của từng thiên thể (lib/starSystems.js).
export default function AltSolar({ sys, host }) {
  if (!host) return null
  const star = (key, size) => (
    <span
      className="solar-sun tele-star"
      data-body={key}
      style={{ '--s': `${size}px`, '--c0': sys.bodies[key].look.c[0], '--c1': sys.bodies[key].look.c[1], '--c2': sys.bodies[key].look.c[2] }}
    />
  )
  return createPortal(
    <div className="solar solar-alt">
      <div className="solar-plane">
        {sys.center && <div className="solar-face">{star(sys.center.key, sys.center.size)}</div>}
        {sys.orbits.map((o) => {
          const look = sys.bodies[o.key].look
          return (
            <div key={o.key} className="solar-orbit" style={{ '--d': `${o.d}px`, '--period': `${o.period}s`, '--phase': o.start / 360 }}>
              <div className="solar-carrier">
                <div className="solar-face">
                  {look.type === 'star' ? (
                    star(o.key, o.size)
                  ) : (
                    <span className="solar-planet" data-body={o.key} style={{ '--s': `${o.size}px`, background: planetPaint(look) }} />
                  )}
                  {o.moon && (
                    <span
                      className="solar-moon tele-moon"
                      data-body={o.moon.key}
                      style={{ '--r': `${o.moon.r}px`, '--m': `${o.moon.size}px`, '--mp': `${o.moon.period}s`, background: planetPaint(sys.bodies[o.moon.key].look) }}
                    />
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>,
    host
  )
}

// Nền CSS của hành tinh trên cảnh: đá = cầu sáng góc trên trái; khí / tiểu Hải Vương = có dải
function planetPaint({ type, c }) {
  if (type === 'gas') return `linear-gradient(170deg, ${c[0]} 0 18%, ${c[1]} 18% 32%, ${c[0]} 32% 46%, ${c[2]} 46% 54%, ${c[0]} 54% 70%, ${c[1]} 70% 84%, ${c[0]} 84%)`
  if (type === 'mini') return `linear-gradient(170deg, ${c[0]} 0 30%, ${c[1]} 30% 60%, ${c[0]} 60% 75%, ${c[1]} 75%)`
  return `radial-gradient(circle at 35% 35%, ${c[0]}, ${c[1]} 60%, ${c[2]})`
}
