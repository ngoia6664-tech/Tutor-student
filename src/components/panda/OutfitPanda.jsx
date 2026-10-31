// @ts-nocheck — nợ kiểu: xóa dòng này rồi chạy npm run typecheck để sửa
import { memo, useEffect, useRef } from 'react'
import { FrontPanda } from '../PandaArt.jsx'
import { prefersReducedMotion, useSettings } from '../../lib/settings.js'
import { LOOKS } from './outfitLooks.jsx'
import { EFFECTS } from './SkinEffect.jsx'
import { PandaActLayer, actClass } from './PandaAct.jsx'

// Gấu mặc một bộ trang phục (catalog lib/outfits.js). Dùng chung cho cửa hàng; sau này cho Home / hộp thoại / kính viễn vọng.
// - showcase: gắn lớp hiệu ứng riêng của bộ (EFFECTS[outfit.effect]) — chỉ phòng thử đồ bật, lưới thẻ để tĩnh cho nhẹ.
// - Viền sáng (catalog `glow`, từ Hiếm ⭐⭐): cả thẻ lẫn phòng thử đồ; quầng phập phồng chỉ ở phòng thử đồ.
// - act: { id, key } = đang diễn hoạt cảnh tương tác (PandaAct); lite = bản nhẹ (Cài đặt "Tối ưu"). Đang diễn thì
//   tạm ẩn hiệu ứng thường trực để hai lớp không chồng nhau.
// - Chuyển động theo Cài đặt "Animation gấu" + giảm chuyển động của máy; cuộn khuất khỏi màn hình thì dừng hẳn.
// Khung .opanda = 1,5× gấu (gấu cách mỗi cạnh 1/6) → toạ độ góc -30, cạnh 180 đơn vị gấu
const FRAME = [-30, 180]

function OutfitPanda({ outfit, showcase = false, act = null, lite = false }) {
  const root = useRef(null)
  const settings = useSettings()
  const fx = showcase && !act ? EFFECTS[outfit.effect] : null
  const motion = showcase && settings.mascotAnimation && !prefersReducedMotion()

  useEffect(() => {
    const el = root.current
    if (!motion || !el || !('IntersectionObserver' in window)) return
    const io = new IntersectionObserver(([entry]) => {
      el.classList.toggle('is-paused', !entry.isIntersecting)
      el.querySelectorAll('svg').forEach((svg) => (entry.isIntersecting ? svg.unpauseAnimations?.() : svg.pauseAnimations?.()))
    })
    io.observe(el)
    return () => io.disconnect()
  }, [motion, outfit.id])

  const glow = outfit.glow ? ` has-glow glow-${outfit.tier}` : ''
  return (
    <div
      ref={root}
      className={`opanda${showcase ? ' is-showcase' : ''}${motion && fx?.float ? ' is-floating' : ''}${glow}${actClass(act, lite)}`}
      style={outfit.glow ? { '--glow-a': outfit.glow[0], '--glow-b': outfit.glow[1] } : undefined}
    >
      {fx && (
        <svg className="opanda-fx" viewBox="-30 -30 180 180" aria-hidden="true">
          <fx.Back m={motion} />
        </svg>
      )}
      <PandaActLayer run={act} lite={lite} part="back" stage={outfit.stage} frame={FRAME} />
      <div className="opanda-figure">
        <FrontPanda pose={outfit.pose} face={outfit.face} look={LOOKS[outfit.id]} motion={motion} actFaces={!!act} />
      </div>
      {fx && (
        <svg className="opanda-fx" viewBox="-30 -30 180 180" aria-hidden="true">
          <fx.Front m={motion} />
        </svg>
      )}
      <PandaActLayer run={act} lite={lite} stage={outfit.stage} frame={FRAME} />
    </div>
  )
}

export default memo(OutfitPanda)
