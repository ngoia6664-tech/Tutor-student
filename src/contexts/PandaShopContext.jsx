import { createContext, useCallback, useContext } from 'react'
import { useAuth } from './AuthContext.jsx'
import { useAsync } from '../lib/useAsync.js'
import { equipOutfit, fetchPandaAccount, purchaseOutfit } from '../lib/pandaShop.js'
import { DEFAULT_OUTFIT_ID, OUTFITS } from '../lib/outfits.js'
import { mascotSay } from '../lib/celebrate.js'

const PandaShopContext = createContext(null)

// Một tài khoản dùng chung cho cụm nổi, cửa hàng và linh vật; không tải lại khi chuyển tab.
export function PandaShopProvider({ children }) {
  const { profile } = useAuth()
  const state = useAsync(() => fetchPandaAccount(profile.id, profile.role), [profile.id, profile.role])
  const { reload } = state
  const act = useCallback(
    async (outfit, owned) => {
      if (owned) await equipOutfit(profile.id, outfit.id, profile.role)
      else await purchaseOutfit(profile.id, outfit.id)
      reload()
      // Vừa mặc bộ có hoạt cảnh riêng: gấu góc màn hình chỉ cách xem
      if (owned && outfit.interaction) mascotSay(`Mặc ${outfit.name} rồi! Giữ vào thầy để xem thầy diễn nhé ✨`, 'cheer')
    },
    [profile.id, profile.role, reload]
  )
  return <PandaShopContext.Provider value={{ ...state, act }}>{children}</PandaShopContext.Provider>
}

export function usePandaShop() {
  return useContext(PandaShopContext)
}

// Bộ đang mặc (catalog). Ngoài Layout (không có provider) / đang tải: bộ mặc định
export function useEquippedOutfit() {
  const id = useContext(PandaShopContext)?.data?.equippedOutfitId || DEFAULT_OUTFIT_ID
  return OUTFITS.find((o) => o.id === id) || OUTFITS[0]
}
