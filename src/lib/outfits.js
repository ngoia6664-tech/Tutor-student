// Danh mục trang phục Panda (một nơi duy nhất). Hình vẽ từng bộ: components/panda/outfitLooks.jsx (theo id);
// hiệu ứng riêng: components/panda/SkinEffect.jsx (theo `effect`). Thêm bộ mới = thêm 1 dòng ở đây + 1 hàm vẽ.
// pose / face: tư thế + biểu cảm gấu khi mặc bộ này (FrontPanda). effect: hiệu ứng quanh gấu ở phòng thử đồ (null = không có).
// glow: [màu viền sáng sát thân, màu quầng] — từ Hiếm ⭐⭐ (shop + linh vật góc màn hình).
// stage: [rộng, cao] px desktop của SÂN DIỄN quanh gấu — không phải cỡ gấu (gấu luôn PANDA_PX = 180px, PandaAct.jsx).
//   Bậc càng cao sân càng rộng để chứa vũ khí, hành tinh, tàu, ngân hà, vụ nổ. Điện thoại: cả cảnh co đều theo màn hình.
// interaction: hoạt cảnh khi bấm vào gấu (components/panda/PandaAct.jsx, từ Hiếm ⭐⭐) — linh vật đang mặc bộ / phòng thử đồ.
export const OUTFIT_TIERS = {
  common: 'Thường',
  rare1: 'Hiếm ⭐',
  rare2: 'Hiếm ⭐⭐',
  rare3: 'Hiếm ⭐⭐⭐',
  premium: 'Cực phẩm',
}

const outfit = (id, name, tier, price, description, extra = {}) => ({ id, name, tier, price, description, pose: 'sit', face: 'normal', effect: null, glow: null, interaction: null, stage: [220, 240], enabled: true, isDefault: false, ...extra })

export const OUTFITS = [
  outfit('student', 'Panda Học Sinh', 'common', 0, 'Mũ tốt nghiệp, kính tròn và cây đũa sao quen thuộc.', { isDefault: true, stage: [220, 240] }),
  outfit('sport', 'Panda Thể Thao', 'common', 150, 'Áo đấu số 07, băng đô và quả bóng, sẵn sàng ra sân.', { stage: [240, 250] }),
  outfit('sleep', 'Panda Ngủ Nướng', 'common', 200, 'Pyjama in sao, mũ ngủ chùm bông và chiếc gối êm.', { face: 'happy', stage: [260, 250] }),
  outfit('artist', 'Panda Nghệ Sĩ', 'common', 250, 'Mũ nồi, áo khoác vẽ lấm tấm màu và bảng pha màu.', { stage: [260, 270] }),
  outfit('explorer', 'Panda Thám Hiểm', 'rare1', 400, 'Mũ thám hiểm, áo gile nhiều túi, bản đồ và ống nhòm.', { effect: 'soft-sparkle', stage: [290, 290] }),
  outfit('scientist', 'Panda Bác Học', 'rare1', 450, 'Áo blouse trắng, kính bảo hộ và bình thí nghiệm phát sáng.', { effect: 'soft-sparkle', stage: [300, 300] }),
  outfit('dj', 'Panda DJ', 'rare2', 650, 'Tai nghe neon, áo khoác bomber và đĩa than bắt nhịp cùng các vì sao.', { effect: 'dj-wave', glow: ['#67e8f9', '#a855f7'], interaction: 'dj-set', stage: [350, 330] }),
  outfit('swordsman', 'Panda Kiếm Sĩ Tinh Hệ', 'rare3', 800, 'Áo khoác trắng bạc cổ cao, tinh thể năng lượng tím và thanh kiếm giám sát tinh hệ.', { effect: 'star-blade', pose: 'teach', glow: ['#f5d0fe', '#a855f7'], interaction: 'star-duel', stage: [460, 380] }),
  outfit('wizard', 'Panda Pháp Sư Sao', 'rare3', 1000, 'Mũ phép, áo choàng thêu sao và cây gậy gom ánh sáng bầu trời.', { effect: 'star-orbit', pose: 'teach', glow: ['#fde68a', '#a855f7'], interaction: 'star-summon', stage: [430, 420] }),
  outfit('astronaut', 'Panda Phi Hành Gia', 'premium', 1500, 'Bộ đồ không gian, mũ kính và hành tinh tí hon theo cùng.', { effect: 'space-drift', glow: ['#e0f2fe', '#38bdf8'], interaction: 'space-trip', stage: [480, 430] }),
  outfit('galaxy', 'Panda Ngân Hà', 'premium', 2000, 'Áo choàng tinh vân, vương miện sao và cả dải ngân hà bay quanh.', { effect: 'galaxy-orbit', glow: ['#f0abfc', '#38bdf8'], interaction: 'galaxy-descent', stage: [540, 470] }),
]

export const DEFAULT_OUTFIT_ID = OUTFITS.find((o) => o.isDefault).id
