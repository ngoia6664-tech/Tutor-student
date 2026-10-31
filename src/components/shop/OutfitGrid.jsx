// @ts-nocheck — nợ kiểu: xóa dòng này rồi chạy npm run typecheck để sửa
import { OUTFITS, OUTFIT_TIERS } from '../../lib/outfits.js'
import OutfitCard from './OutfitCard.jsx'

const TABS = [
  { key: 'shop', label: 'Cửa hàng' },
  { key: 'closet', label: 'Tủ đồ' },
]

// Tab Cửa hàng / Tủ đồ + lọc độ hiếm (chỉ ở Cửa hàng) + lưới thẻ
export default function OutfitGrid({ account, tab, setTab, tier, setTier, selectedId, onSelect }) {
  const owned = account?.ownedOutfitIds || []
  const list = OUTFITS.filter((o) => o.enabled && (tab === 'closet' ? owned.includes(o.id) : tier === 'all' || o.tier === tier))
  return (
    <section className="shop-collection" aria-label="Bộ sưu tập trang phục">
      <div className="shop-tabs" role="tablist" aria-label="Cửa hàng hoặc tủ đồ">
        {TABS.map((t) => (
          <button key={t.key} type="button" role="tab" aria-selected={tab === t.key} className={tab === t.key ? 'is-active' : ''} onClick={() => setTab(t.key)}>
            {t.label}
            <span className="shop-tab-count">{t.key === 'closet' ? owned.length : OUTFITS.length}</span>
          </button>
        ))}
      </div>

      {tab === 'shop' && (
        <div className="shop-filters" role="group" aria-label="Lọc theo độ hiếm">
          {[['all', 'Tất cả'], ...Object.entries(OUTFIT_TIERS)].map(([key, label]) => (
            <button key={key} type="button" aria-pressed={tier === key} className={`tier-${key}${tier === key ? ' is-active' : ''}`} onClick={() => setTier(key)}>
              {label}
            </button>
          ))}
        </div>
      )}

      {list.length ? (
        <div className="ocard-grid" role="tabpanel">
          {list.map((o) => (
            <OutfitCard key={o.id} outfit={o} account={account} selected={o.id === selectedId} onSelect={onSelect} />
          ))}
        </div>
      ) : (
        <p className="shop-empty">Tủ đồ mới có bộ mặc định. Ghé Cửa hàng để ngắm thêm nhé!</p>
      )}
    </section>
  )
}
