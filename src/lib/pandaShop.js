import { DEFAULT_OUTFIT_ID, OUTFITS } from './outfits.js'

// Gia sư sở hữu mọi bộ (theo yêu cầu Owner). Bộ gia sư đang mặc nhớ trên máy (localStorage `panda-tutor-outfit`) —
// chỉ là tuỳ chọn hiển thị, không phải dữ liệu Xu / sở hữu. Khi có backend: chuyển sang lưu ở server như học sinh.
const TUTOR_KEY = 'panda-tutor-outfit'
const validOutfit = (id) => OUTFITS.some((o) => o.id === id && o.enabled)

function readTutorOutfit() {
  try {
    const id = localStorage.getItem(TUTOR_KEY)
    return validOutfit(id) ? id : DEFAULT_OUTFIT_ID
  } catch {
    return DEFAULT_OUTFIT_ID
  }
}

// TODO: Claude nối ledger Xu, ledger Sao và quyền sở hữu theo học sinh đã xác thực.
// Backend phải trả số dư thật; Sao là tiến trình tích lũy, không trừ khi mua.
export async function fetchPandaAccount(studentId, role = 'student') {
  void studentId
  const isTutor = role === 'tutor'
  return {
    coins: 0,
    stars: 0,
    ownedOutfitIds: isTutor ? OUTFITS.map((outfit) => outfit.id) : [DEFAULT_OUTFIT_ID],
    equippedOutfitId: isTutor ? readTutorOutfit() : DEFAULT_OUTFIT_ID,
    purchasesEnabled: false,
    equipmentEnabled: isTutor,
  }
}

// TODO: Claude nối giao dịch mua nguyên tử: kiểm giá/quyền sở hữu, trừ Xu và ghi ledger ở backend.
export async function purchaseOutfit(studentId, outfitId) {
  void studentId
  void outfitId
  throw new Error('Mua trang phục sắp mở.')
}

// TODO: Claude nối mặc trang phục cho học sinh: kiểm quyền sở hữu ở backend rồi tải lại tài khoản.
// Chỉ bộ mặc định sở hữu sẵn; không được xóa quyền sở hữu bộ này.
export async function equipOutfit(studentId, outfitId, role = 'student') {
  void studentId
  if (role === 'tutor' && validOutfit(outfitId)) {
    try {
      localStorage.setItem(TUTOR_KEY, outfitId)
    } catch {
      // không lưu được: vẫn mặc trong phiên này (tài khoản tải lại sẽ về bộ mặc định)
    }
    return
  }
  throw new Error('Mặc trang phục sắp mở.')
}
