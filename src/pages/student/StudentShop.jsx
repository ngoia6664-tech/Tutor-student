import { useCallback, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext.jsx'
import { usePandaShop } from '../../contexts/PandaShopContext.jsx'
import { DEFAULT_OUTFIT_ID, OUTFITS } from '../../lib/outfits.js'
import { notifyError } from '../../lib/dialog.js'
import { prefersReducedMotion } from '../../lib/settings.js'
import { useStickyTop } from '../../components/AnswerProgress.jsx'
import ErrorBox from '../../components/ErrorBox.jsx'
import CoinStarBadge from '../../components/CoinStarBadge.jsx'
import PandaShowcase from '../../components/shop/PandaShowcase.jsx'
import OutfitGrid from '../../components/shop/OutfitGrid.jsx'

// Panda Fashion Shop (/student/shop, gia sư /tutor/shop): header gọn + Xu/Sao dính đầu trang,
// phòng thử đồ (gấu lớn + hiệu ứng riêng), tab Cửa hàng / Tủ đồ, lưới thẻ tĩnh.
// Mua / mặc đi qua adapter lib/pandaShop.js (chưa có backend: học sinh chỉ xem, gia sư mặc thử được mọi bộ).
export default function StudentShop() {
  const { profile } = useAuth()
  const { data: account, error, reload, act } = usePandaShop()
  const [tab, setTab] = useState('shop')
  const [tier, setTier] = useState('all')
  const [picked, setPicked] = useState(null) // null = bộ đang mặc
  const [busy, setBusy] = useState(false)
  const hudRef = useRef(null)
  const showcaseRef = useRef(null)
  const top = useStickyTop(hudRef)
  const isTutor = profile.role === 'tutor'

  const previewId = picked || account?.equippedOutfitId || DEFAULT_OUTFIT_ID
  const preview = OUTFITS.find((o) => o.id === previewId) || OUTFITS[0]

  const onSelect = useCallback((id) => {
    setPicked(id)
    // Phòng thử đồ đã khuất (điện thoại, đang ở giữa lưới): đưa lên để thấy gấu mặc thử
    const el = showcaseRef.current
    if (el && el.getBoundingClientRect().top < 0) el.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'start' })
  }, [])

  const onAction = useCallback(
    async (outfit, owned) => {
      if (busy) return
      setBusy(true)
      try {
        await act(outfit, owned)
      } catch (e) {
        notifyError(e.message)
      } finally {
        setBusy(false)
      }
    },
    [act, busy]
  )

  return (
    <div className="panda-shop">
      <div className="shop-hud-anchor" ref={hudRef} style={{ top }}>
        <CoinStarBadge />
      </div>

      <header className="shop-head">
        <Link to={isTutor ? '/tutor' : '/student'} className="small">
          ← Quay lại học tập
        </Link>
        <h1>
          Panda <span>Fashion Shop</span>
        </h1>
        <p>Chọn phong cách cho Giáo sư Gấu Trúc — từ đồng phục đến cả dải ngân hà.</p>
        {isTutor && <span className="shop-access">♔ Gia sư: mặc thử mọi bộ</span>}
      </header>

      <ErrorBox message={error} onRetry={reload} />

      <div ref={showcaseRef} className="shop-scroll-target">
        <PandaShowcase outfit={preview} account={account} busy={busy || !account} onAction={onAction} />
      </div>

      <OutfitGrid account={account} tab={tab} setTab={setTab} tier={tier} setTier={setTier} selectedId={preview.id} onSelect={onSelect} />
    </div>
  )
}
