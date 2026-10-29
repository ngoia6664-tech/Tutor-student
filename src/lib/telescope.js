// Kính thiên văn: danh sách địa điểm (MỘT nơi duy nhất) + luật mở khóa.
// Owner sửa ngưỡng Sao / thứ tự / mô tả ngay trong PLACES, không phải đụng component.
// Hai điều kiện độc lập:
//   ready — nội dung đã làm xong. false = luôn khóa với MỌI người (học sinh, gia sư), dù đủ Sao hay vào bằng URL.
//   stars — tổng Sao tích lũy cần có. Sao chỉ là mốc tiến trình: mở địa điểm KHÔNG trừ Sao; Xu không dùng ở đây.
// color: màu nhận diện (vệt sao lúc du hành); nền riêng của từng địa điểm ở styles/telescope.css (html[data-place]).
// Thêm địa điểm mới: thêm dòng ở đây (ready: false) → soạn dữ liệu trong lib/starSystems.js → đổi ready: true.

export const SOLAR_ID = 'he-mat-troi'
// Gia sư không có ví Sao: được xem trước địa điểm ĐÃ hoàn thiện (để biết học sinh thấy gì), không vượt được ready
export const TUTOR_PREVIEW = true

export const PLACES = [
  { id: SOLAR_ID, color: '#a855f7', name: 'Hệ Mặt Trời', stars: 0, ready: true, distance: 'Nhà của chúng ta', teaser: 'Mặt Trời và 8 hành tinh — điểm xuất phát của hành trình.' },
  { id: 'alpha-centauri', color: '#fcd34d', name: 'Alpha Centauri', stars: 5, ready: true, distance: '≈ 4,2–4,4 năm ánh sáng', teaser: 'Hệ ba sao gần Mặt Trời nhất, có hành tinh Proxima b.' },
  { id: 'trappist-1', color: '#f43f5e', name: 'TRAPPIST-1', stars: 12, ready: true, distance: '≈ 40 năm ánh sáng', teaser: 'Sao lùn đỏ với 7 hành tinh cỡ Trái Đất.' },
  { id: 'kepler-90', color: '#22d3ee', name: 'Kepler-90', stars: 20, ready: true, distance: '≈ 2 500 năm ánh sáng', teaser: 'Hệ có 8 hành tinh — bằng Hệ Mặt Trời.' },
  { id: 'sirius', color: '#93c5fd', name: 'Sirius', stars: 30, ready: false, distance: '≈ 8,6 năm ánh sáng', teaser: 'Ngôi sao sáng nhất bầu trời đêm, có một sao lùn trắng đi kèm.' },
  { id: 'cygnus-x1', color: '#fb923c', name: 'Cygnus X-1', stars: 45, ready: false, distance: '≈ 7 000 năm ánh sáng', teaser: 'Một trong những hố đen đầu tiên được phát hiện.' },
  { id: 'crab-pulsar', color: '#f472b6', name: 'Crab Pulsar', stars: 65, ready: false, distance: '≈ 6 500 năm ánh sáng', teaser: 'Sao neutron quay khoảng 30 vòng mỗi giây giữa tinh vân Con Cua.' },
  { id: 'orion-nebula', color: '#2dd4bf', name: 'Tinh vân Orion', stars: 90, ready: false, distance: '≈ 1 300 năm ánh sáng', teaser: 'Vườn ươm sao, nhìn thấy được bằng mắt thường.' },
  { id: 'andromeda', color: '#c4b5fd', name: 'Thiên hà Andromeda', stars: 120, ready: false, distance: '≈ 2,5 triệu năm ánh sáng', teaser: 'Thiên hà xoắn ốc lớn láng giềng của Ngân Hà.' },
]

export const findPlace = (id) => PLACES.find((p) => p.id === id) || null

// shop: kết quả usePandaShop() — { loading, error, data: { isTutor, stars } }.
// Trả { state, need, missing, preview }:
//   'open'    vào được            'locked'  đã làm xong nhưng chưa đủ Sao (missing = còn thiếu)
//   'soon'    nội dung chưa làm   'loading' đang tải số Sao
//   'unknown' không đọc được số Sao (lỗi mạng / dữ liệu hỏng) → coi như khóa   'missing' không có địa điểm này
// Mọi trường hợp lạ đều rơi vào khóa, không bao giờ mở ngoài ý muốn.
export function placeAccess(place, shop) {
  if (!place) return { state: 'missing' }
  if (place.ready !== true) return { state: 'soon', need: place.stars }
  const need = place.stars
  if (!Number.isInteger(need) || need < 0) return { state: 'unknown' }
  if (need === 0) return { state: 'open', need }
  const data = shop?.data
  if (!data) return { state: shop?.loading ? 'loading' : 'unknown', need }
  if (data.isTutor) return TUTOR_PREVIEW ? { state: 'open', need, preview: true } : { state: 'locked', need, missing: need }
  const stars = data.stars
  if (typeof stars !== 'number' || !Number.isFinite(stars) || stars < 0) return { state: 'unknown', need }
  return stars >= need ? { state: 'open', need } : { state: 'locked', need, missing: need - Math.floor(stars) }
}

// Lời báo khi bấm địa điểm chưa vào được (hiện trong bảng chọn địa điểm)
export function lockedMessage(place, access) {
  const name = place?.name || 'Địa điểm này'
  switch (access?.state) {
    case 'soon':
      return `${name} chưa mở khóa: nội dung đang được xây dựng nên chưa ai vào được, kể cả khi đủ Sao. Hẹn bạn ở chuyến sau!`
    case 'locked':
      return `Cần ${access.need} Sao để tới ${name} — bạn còn thiếu ${access.missing} Sao. Học tốt để tích thêm Sao nhé!`
    case 'loading':
      return 'Đang kiểm tra số Sao của bạn, đợi một chút nhé…'
    case 'missing':
      return 'Không tìm thấy địa điểm này. Chọn một điểm đến khác nhé!'
    default:
      return 'Chưa đọc được số Sao của bạn nên tạm khóa các địa điểm mới. Thử tải lại nhé.'
  }
}
