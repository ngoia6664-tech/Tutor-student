// Trang chủ công khai (home.html): trang tĩnh, chỉ ô "Phòng thử đồ" dùng gấu thật của app
// (OutfitPanda + hoạt cảnh giữ PandaAct + tiếng pandaSfx), không tải Supabase / router.
import { StrictMode, useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import OutfitPanda from '../components/panda/OutfitPanda.jsx'
import { useHold, usePandaAct } from '../components/panda/PandaAct.jsx'
import { prefersReducedMotion, useSettings } from '../lib/settings.js'
import { OUTFITS, OUTFIT_TIERS } from '../lib/outfits.js'
import '../styles/panda-shop.css'
import './home-panda.css'

const byId = (id) => OUTFITS.find((o) => o.id === id) || OUTFITS[0]

function HomePanda({ outfitId }) {
  const outfit = byId(outfitId)
  const settings = useSettings()
  const canAct = !prefersReducedMotion()
  const act = usePandaAct(outfit)
  const hold = useHold(() => act.play(null), act.has && canAct)
  const on = act.has && canAct
  return (
    <div
      className={`home-panda tier-${outfit.tier}${on ? ' is-clickable' : ''}${hold.holding ? ' is-holding' : ''}`}
      role={on ? 'button' : undefined}
      tabIndex={on ? 0 : undefined}
      aria-label={on ? `Giữ để xem ${outfit.name} diễn` : outfit.name}
      {...hold.handlers}
      onKeyDown={(e) => on && (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), act.play(null))}
    >
      <OutfitPanda key={outfit.id} outfit={outfit} showcase act={act.run} lite={!settings.mascotAnimation} />
    </div>
  )
}

// Lời dưới gấu lấy thẳng từ danh mục trang phục của app
function caption(o) {
  const tier = o.isDefault ? 'Mặc định' : OUTFIT_TIERS[o.tier]
  const hint = o.interaction ? ' <em>Giữ chuột / ngón tay lên gấu để xem hoạt cảnh.</em>' : ''
  return `<strong>${o.name} (${tier}):</strong> ${o.description}${hint}`
}

function mount() {
  const holder = document.getElementById('pandaStageHolder')
  if (!holder) return
  const desc = document.getElementById('pandaOutfitDesc')
  const buttons = [...document.querySelectorAll('.outfit-btn[data-outfit]')].map((b) => /** @type {HTMLElement} */ (b))
  /** @type {(id: string) => void} */
  let setOutfit = () => {}

  function Root() {
    const [id, setId] = useState(buttons.find((b) => b.classList.contains('is-selected'))?.dataset.outfit || 'student')
    setOutfit = setId
    useEffect(() => {
      if (desc) desc.innerHTML = caption(byId(id))
    }, [id])
    return <HomePanda outfitId={id} />
  }

  buttons.forEach((btn) =>
    btn.addEventListener('click', () => {
      buttons.forEach((b) => b.classList.toggle('is-selected', b === btn))
      setOutfit(btn.dataset.outfit)
    })
  )
  createRoot(holder).render(
    <StrictMode>
      <Root />
    </StrictMode>
  )
}

mount()
