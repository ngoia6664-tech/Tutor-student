import { supabase, unwrap } from './supabase.js'
import { DEFAULT_OUTFIT_ID, OUTFITS } from './outfits.js'

// Xu / Sao / Chuỗi / trang phục: số thật ở Supabase (sổ cái economy_ledger, xem "Kinh tế" trong schema.sql).
// App chỉ gửi ý định (mua bộ X, mua khiên, mặc bộ Y); máy chủ quyết định giá, số dư, thưởng.
// Gia sư sở hữu mọi bộ (theo yêu cầu Owner) mà KHÔNG có ví: coins/stars = null. Bộ gia sư đang mặc nhớ trên máy
// (localStorage `panda-tutor-outfit`) — chỉ là tuỳ chọn hiển thị.
const TUTOR_KEY = 'panda-tutor-outfit'
const validOutfit = (id) => OUTFITS.some((o) => o.id === id && o.enabled)

// Báo cho cụm Xu/Sao tải lại (sau khi nộp bài, xong Ôn tập...). Máy chủ đã cộng thưởng, app chỉ đọc lại.
export const ECONOMY_EVENT = 'economy-changed'
export const economyChanged = () => window.dispatchEvent(new Event(ECONOMY_EVENT))

function readTutorOutfit() {
  try {
    const id = localStorage.getItem(TUTOR_KEY)
    return validOutfit(id) ? id : DEFAULT_OUTFIT_ID
  } catch {
    return DEFAULT_OUTFIT_ID
  }
}

const prices = (map) => Object.fromEntries(OUTFITS.map((o) => [o.id, Number(map?.[o.id] ?? o.price)]))

export async function fetchPandaAccount(studentId, role = 'student') {
  void studentId
  const e = unwrap(await supabase.rpc('get_economy'))
  if (role === 'tutor' || e.role === 'tutor') {
    return {
      isTutor: true,
      coins: null,
      stars: null,
      prices: prices(e.prices),
      ownedOutfitIds: OUTFITS.map((outfit) => outfit.id),
      equippedOutfitId: readTutorOutfit(),
      purchasesEnabled: false,
      equipmentEnabled: true,
    }
  }
  const owned = [...new Set([DEFAULT_OUTFIT_ID, ...e.owned])]
  return {
    isTutor: false,
    coins: e.coins,
    stars: e.stars,
    shields: e.shields,
    shield: e.shield, // { price, max_held, cooldown_days }
    streak: e.streak, // { current, longest, done_today, shield_ready, last_completed_date, last_shield_date }
    achievements: e.achievements,
    dailyAvailable: e.daily_available, // có câu cho Ôn tập mỗi ngày (pool > 0)
    unseen: e.unseen,
    prices: prices(e.prices),
    ownedOutfitIds: owned,
    equippedOutfitId: owned.includes(e.equipped_outfit) && validOutfit(e.equipped_outfit) ? e.equipped_outfit : DEFAULT_OUTFIT_ID,
    purchasesEnabled: true,
    equipmentEnabled: true,
  }
}

// Giá hiển thị: theo máy chủ (catalog chỉ là dự phòng khi chưa tải xong)
export const priceOf = (outfit, account) => account?.prices?.[outfit.id] ?? outfit.price

export async function purchaseOutfit(studentId, outfitId) {
  void studentId
  return unwrap(await supabase.rpc('buy_outfit', { p_outfit_id: outfitId }))
}

export async function equipOutfit(studentId, outfitId, role = 'student') {
  void studentId
  if (role === 'tutor') {
    if (!validOutfit(outfitId)) return
    try {
      localStorage.setItem(TUTOR_KEY, outfitId)
    } catch {
      // không lưu được: vẫn mặc trong phiên này (tài khoản tải lại sẽ về bộ mặc định)
    }
    return
  }
  unwrap(await supabase.rpc('equip_outfit', { p_outfit_id: outfitId }))
}

// requestId: mã của một lần bấm — gửi lại (mạng chập chờn) không bị trừ Xu hai lần
export async function buyStreakShield(requestId) {
  return unwrap(await supabase.rpc('buy_streak_shield', { p_request_id: requestId }))
}

// Xu nhặt khi Bay tự do (Kính thiên văn): { total, collected: [số thứ tự đã nhặt] }. Gia sư: total 0.
export async function fetchFlightCoins(place) {
  return unwrap(await supabase.rpc('get_flight_coins', { p_place: place }))
}
// Máy chủ cộng 1 Xu cho mỗi đồng chưa từng nhặt (đồng đã nhặt bỏ qua). Trả { coins: số dư, added }.
export async function collectFlightCoins(place, coins) {
  return unwrap(await supabase.rpc('collect_flight_coins', { p_place: place, p_coins: coins }))
}

export async function markRewardsSeen(upto) {
  unwrap(await supabase.rpc('mark_rewards_seen', { p_upto: upto }))
}

// Lời gấu báo các khoản thưởng mới (gộp lại thành một câu)
const SOURCE_LABEL = {
  starting: 'quà chào mừng',
  daily: 'Ôn tập mỗi ngày',
  official_score: 'điểm cao',
  progress_milestone: 'mốc số bài',
  streak_milestone: 'mốc chuỗi',
  tutor_reward: 'quà gia sư',
  flight_coin: 'nhặt khi bay ngoài vũ trụ',
}

export function rewardMessage(list) {
  const shieldUsed = list.find((r) => r.source === 'shield_use')
  const gains = list.filter((r) => r.amount > 0 && r.resource !== 'shield')
  const sum = (res) => gains.filter((r) => r.resource === res).reduce((n, r) => n + r.amount, 0)
  const coins = sum('coin')
  const stars = sum('star')
  const parts = [coins && `+${coins} Xu 🪙`, stars && `+${stars} Sao ⭐`].filter(Boolean)
  const why = [...new Set(gains.map((r) => SOURCE_LABEL[r.source]).filter(Boolean))].join(', ')
  const badge = gains.find((r) => r.meta?.badge)?.meta.badge
  const text = [
    list.some((r) => r.source === 'daily') ? 'Xong Ôn tập hôm nay! 🔥' : '',
    parts.length ? `${parts.join(' · ')}${why ? ` (${why})` : ''}` : '',
    badge ? `Huy hiệu "${badge}" 🏅` : '',
    shieldUsed ? `Khiên đã đỡ chuỗi ${shieldUsed.meta?.streak || ''} ngày 🛡️` : '',
  ].filter(Boolean)
  return { text: text.join(' — '), big: stars > 0 || !!badge || gains.some((r) => r.source.endsWith('_milestone')) }
}
