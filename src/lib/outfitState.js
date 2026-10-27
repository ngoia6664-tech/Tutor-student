// Trạng thái một bộ với tài khoản hiện tại: chưa có / đủ Xu / thiếu Xu / đã có / đang mặc → nhãn nút + ghi chú
const number = new Intl.NumberFormat('vi-VN')

export function outfitState(outfit, account) {
  const owned = account?.ownedOutfitIds.includes(outfit.id) || false
  const equipped = account?.equippedOutfitId === outfit.id
  const missing = Math.max(0, outfit.price - (account?.coins || 0))
  return {
    owned,
    equipped,
    missing,
    label: equipped ? 'Đang mặc' : owned ? 'Mặc' : missing ? `Thiếu ${number.format(missing)} Xu` : 'Mua',
    priceLabel: outfit.isDefault ? 'Sở hữu sẵn' : `${number.format(outfit.price)} Xu`,
    disabled: !account || equipped || !outfit.enabled || (owned ? !account.equipmentEnabled : !account.purchasesEnabled || missing > 0),
    note: outfit.isDefault ? 'Luôn có trong tủ đồ' : owned ? 'Đã sở hữu' : !account?.purchasesEnabled ? 'Sắp mở' : missing ? 'Chưa đủ Xu' : 'Đủ Xu',
  }
}
