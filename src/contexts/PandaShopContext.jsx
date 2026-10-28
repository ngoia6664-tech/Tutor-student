import { createContext, useCallback, useContext, useEffect, useRef } from 'react'
import { useAuth } from './AuthContext.jsx'
import { useAsync } from '../lib/useAsync.js'
import { buyStreakShield, ECONOMY_EVENT, equipOutfit, fetchPandaAccount, markRewardsSeen, purchaseOutfit, rewardMessage } from '../lib/pandaShop.js'
import { DEFAULT_OUTFIT_ID, OUTFITS } from '../lib/outfits.js'
import { celebrate, mascotSay } from '../lib/celebrate.js'

const PandaShopContext = createContext(null)

// Một tài khoản dùng chung cho cụm nổi, cửa hàng và linh vật; không tải lại khi chuyển tab.
// Tải lại khi: có sự kiện economyChanged() (nộp bài, xong Ôn tập), quay lại tab sau một lúc.
export function PandaShopProvider({ children }) {
  const { profile } = useAuth()
  const state = useAsync(() => fetchPandaAccount(profile.id, profile.role), [profile.id, profile.role])
  const { reload, data } = state

  useEffect(() => {
    let last = Date.now()
    const onVisible = () => {
      if (document.visibilityState !== 'visible' || Date.now() - last < 60000) return
      last = Date.now()
      reload()
    }
    window.addEventListener(ECONOMY_EVENT, reload)
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      window.removeEventListener(ECONOMY_EVENT, reload)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [reload])

  // Thưởng mới từ máy chủ (điểm cao do gia sư chấm, Ôn tập, mốc...) → gấu báo một lần rồi đánh dấu đã xem
  const announced = useRef(0)
  useEffect(() => {
    const list = data?.unseen
    if (!list?.length) return
    const upto = list.at(-1).id
    if (upto <= announced.current) return
    announced.current = upto
    const { text, big } = rewardMessage(list)
    if (text) (big ? celebrate : mascotSay)(text, 'cheer')
    markRewardsSeen(upto).catch(() => {})
  }, [data])

  // Mở app mà hôm nay chưa làm Ôn tập: gấu nhắc một lần (đợi gấu tải xong; có thưởng mới thì nói sau lời báo thưởng)
  const nudged = useRef(false)
  const nudgeTimer = useRef(0)
  useEffect(() => {
    if (nudged.current || !data || data.isTutor) return
    nudged.current = true
    if (!data.dailyAvailable || data.streak?.done_today) return
    const n = data.streak?.current || 0
    const text = n
      ? `Chuỗi ${n} ngày 🔥 đang chờ bạn! Bấm nút dưới ngọn lửa góc trên để làm Ôn tập hôm nay, giữ chuỗi và nhận Xu nhé.`
      : 'Làm Ôn tập hôm nay để thắp ngọn lửa chuỗi 🔥 nhé! Bấm nút dưới ngọn lửa góc trên, xong còn được Xu.'
    nudgeTimer.current = setTimeout(() => mascotSay(text), data.unseen?.length ? 7000 : 2500)
  }, [data])
  useEffect(() => () => clearTimeout(nudgeTimer.current), [])

  const act = useCallback(
    async (outfit, owned) => {
      if (owned) await equipOutfit(profile.id, outfit.id, profile.role)
      else {
        await purchaseOutfit(profile.id, outfit.id)
        celebrate(`Đã mua ${outfit.name}! Bấm "Mặc" để thầy diện thử nhé 🛍️`)
      }
      reload()
      // Vừa mặc bộ có hoạt cảnh riêng: gấu góc màn hình chỉ cách xem
      if (owned && outfit.interaction) mascotSay(`Mặc ${outfit.name} rồi! Giữ vào thầy để xem thầy diễn nhé ✨`, 'cheer')
    },
    [profile.id, profile.role, reload]
  )

  const buyShield = useCallback(async () => {
    const res = await buyStreakShield(crypto.randomUUID())
    reload()
    mascotSay(`Đã có ${res.shields} khiên 🛡️ Lỡ quên một ngày Ôn tập, khiên sẽ tự giữ chuỗi cho bạn.`, 'cheer')
  }, [reload])

  return <PandaShopContext.Provider value={{ ...state, act, buyShield }}>{children}</PandaShopContext.Provider>
}

export function usePandaShop() {
  return useContext(PandaShopContext)
}

// Bộ đang mặc (catalog). Ngoài Layout (không có provider) / đang tải: bộ mặc định
export function useEquippedOutfit() {
  const id = useContext(PandaShopContext)?.data?.equippedOutfitId || DEFAULT_OUTFIT_ID
  return OUTFITS.find((o) => o.id === id) || OUTFITS[0]
}
