import { memo } from 'react'
import OutfitPanda from '../panda/OutfitPanda.jsx'
import { OUTFIT_TIERS } from '../../lib/outfits.js'
import { outfitState } from '../../lib/outfitState.js'

const number = new Intl.NumberFormat('vi-VN')

// Thẻ trong lưới: gấu tĩnh (không hiệu ứng chạy), khung theo độ hiếm. Bấm = đưa lên phòng thử đồ.
export default memo(function OutfitCard({ outfit, account, selected, onSelect }) {
  const state = outfitState(outfit, account)
  const status = state.equipped ? 'Đang mặc' : state.owned ? 'Đã có' : null
  return (
    <button type="button" className={`ocard tier-${outfit.tier}${selected ? ' is-selected' : ''}`} aria-pressed={selected} onClick={() => onSelect(outfit.id)}>
      <span className="ocard-thumb">
        <OutfitPanda outfit={outfit} />
        {status && <span className={`ocard-status${state.equipped ? ' is-on' : ''}`}>{state.equipped ? '✓ ' : ''}{status}</span>}
        <span className="led-panel ocard-tag">
          {outfit.isDefault ? (
            <b>Miễn phí</b>
          ) : (
            <>
              <span aria-hidden="true">🪙</span>
              <b>{number.format(outfit.price)}</b>
              <span className="sr-only">Xu</span>
            </>
          )}
        </span>
      </span>
      <span className="ocard-body">
        <span className="ocard-rarity">{outfit.isDefault ? 'Mặc định' : OUTFIT_TIERS[outfit.tier]}</span>
        <span className="ocard-name">{outfit.name.replace(/^Panda /, '')}</span>
      </span>
    </button>
  )
})
