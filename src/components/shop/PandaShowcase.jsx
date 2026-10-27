import { useLayoutEffect, useRef, useState } from 'react'
import OutfitPanda from '../panda/OutfitPanda.jsx'
import { useHold, usePandaAct } from '../panda/PandaAct.jsx'
import { prefersReducedMotion, useSettings } from '../../lib/settings.js'
import { OUTFIT_TIERS } from '../../lib/outfits.js'
import { outfitState } from '../../lib/outfitState.js'

const number = new Intl.NumberFormat('vi-VN')
// Khung trưng bày (px thiết kế): vừa sân lớn nhất (Ngân Hà 540×470). Gấu luôn 180px ở cùng một chỗ, sân từng bộ
// (catalog `stage`) căn quanh gấu. Màn hình hẹp: cả khung co đều (--k) → không tràn, không méo, đổi bộ không nhảy layout.
const CANVAS = [560, 480]

// Hệ số co của khung theo bề rộng thật
function useCanvasScale() {
  const ref = useRef(null)
  const [k, setK] = useState(1)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const fit = () => setK(Math.min(1, el.clientWidth / CANVAS[0]))
    fit()
    if (!('ResizeObserver' in window)) return
    const ro = new ResizeObserver(fit)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  return [ref, k]
}

// Lời ngắn dưới nút: nhắc đúng tình huống, không dài dòng
function hint(outfit, state, account) {
  if (state.equipped) return 'Gấu đang mặc bộ này ✨'
  if (state.owned) return 'Có trong tủ đồ — mặc ngay nhé!'
  if (!account?.purchasesEnabled)
    return outfit.tier === 'premium' ? 'Bộ này xịn đấy 👀 Cửa hàng sắp mở bán.' : 'Cửa hàng sắp mở bán — ngắm trước nhé 👀'
  if (state.missing) return `Thiếu ${number.format(state.missing)} Xu nữa thôi!`
  return 'Đủ Xu rồi, chốt đơn thôi!'
}

// Phòng thử đồ: gấu lớn mặc bộ đang chọn + hiệu ứng riêng (chỉ ở đây mới chạy đầy đủ), thông tin và nút hành động
export default function PandaShowcase({ outfit, account, busy, onAction }) {
  const state = outfitState(outfit, account)
  const settings = useSettings()
  // Hoạt cảnh: "Tối ưu" vẫn diễn (bản nhẹ); máy bật giảm chuyển động thì không diễn
  const canAct = !prefersReducedMotion()
  const lite = !settings.mascotAnimation
  const act = usePandaAct(outfit)
  const [stageRef, k] = useCanvasScale()
  const perform = () => {
    if (!canAct) return
    // Sân khấu đang khuất (nút nằm dưới, màn hình thấp): đưa vào tầm nhìn rồi mới diễn
    const r = stageRef.current?.getBoundingClientRect()
    if (r && (r.top < 0 || r.bottom > window.innerHeight)) stageRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
    act.play()
  }
  // Giữ vào gấu để diễn (giống linh vật góc màn hình); bàn phím: Enter / Space
  const hold = useHold(perform, act.has && canAct)
  const [sw, sh] = outfit.stage
  return (
    <section className={`showcase tier-${outfit.tier}`} aria-label="Phòng thử đồ">
      <div className="showcase-stage" ref={stageRef} style={{ '--k': k }}>
        <span className="showcase-spot" aria-hidden="true" />
        <div className="showcase-canvas">
          <span className="showcase-arena" style={{ width: sw, height: sh }} aria-hidden="true" />
          <span className="showcase-pedestal" aria-hidden="true" />
          <div
            className={`showcase-figure${act.has && canAct ? ' is-clickable' : ''}${hold.holding ? ' is-holding' : ''}`}
            role={act.has && canAct ? 'button' : undefined}
            tabIndex={act.has && canAct ? 0 : undefined}
            aria-label={act.has && canAct ? `Giữ để xem ${outfit.name} diễn` : undefined}
            {...hold.handlers}
            onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), perform())}
          >
            <OutfitPanda key={outfit.id} outfit={outfit} showcase act={act.run} lite={lite} />
          </div>
        </div>
      </div>
      <div className="showcase-info" aria-live="polite">
        <span className="rarity-chip">{outfit.isDefault ? 'Mặc định' : OUTFIT_TIERS[outfit.tier]}</span>
        <h2>{outfit.name}</h2>
        <p className="showcase-desc">{outfit.description}</p>
        <div className="showcase-buy">
          <span className="led-panel showcase-price">
            {outfit.isDefault ? (
              <b>Sở hữu sẵn</b>
            ) : (
              <>
                <span aria-hidden="true">🪙</span> <b>{number.format(outfit.price)}</b> <small>Xu</small>
              </>
            )}
          </span>
          <button
            type="button"
            className={`btn btn-primary showcase-cta${state.equipped ? ' is-equipped' : ''}`}
            disabled={busy || state.disabled}
            onClick={() => onAction(outfit, state.owned)}
          >
            {state.label}
          </button>
        </div>
        <p className="showcase-hint">{hint(outfit, state, account)}</p>
        {act.has && (
          <div className="showcase-special-row">
            <button
              type="button"
              className="showcase-special"
              disabled={!canAct || act.playing}
              onClick={perform}
              title={canAct ? undefined : 'Máy đang bật giảm chuyển động'}
            >
              ✨ {act.playing ? 'Đang diễn...' : 'Xem hoạt cảnh'}
            </button>
            <p className="showcase-hint">
              Hoặc giữ chuột / ngón tay lên gấu. Mặc bộ này rồi giữ vào gấu ở góc màn hình, thầy sẽ diễn cho xem.
            </p>
          </div>
        )}
      </div>
    </section>
  )
}
