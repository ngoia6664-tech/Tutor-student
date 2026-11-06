// Số liệu + công thức cho các thí nghiệm trong Phòng Khoa học (thuần, có test). Con lắc đồng hồ ở pendulum.js.

// a: bán trục lớn (AU), T: chu kì (năm Trái Đất)
export const ORRERY_PLANETS = [
  { id: 'venus', name: 'Sao Kim', a: 0.723, T: 0.615, color: 0xe6c88e },
  { id: 'earth', name: 'Trái Đất', a: 1, T: 1, color: 0x3f86c8 },
  { id: 'mars', name: 'Sao Hỏa', a: 1.524, T: 1.881, color: 0xc65a33 },
]

/** Định luật III Kepler: tỉ số này gần như nhau với mọi hành tinh (≈ 1 khi đo bằng AU và năm).
 * @param {number} a @param {number} T */
export const keplerRatio = (a, T) => (T * T) / (a * a * a)

/** Khoảng cách gấp r lần thì lực hấp dẫn giảm bao nhiêu lần. @param {number} r */
export const gravityDrop = (r) => r * r

/** @param {number} thz tần số (THz) @returns {number} bước sóng (nm) */
export const wavelengthNm = (thz) => 299792.458 / thz

const C = 299792458
/** E = mc². @param {number} grams @returns {number} jun */
export const massEnergyJ = (grams) => (grams / 1000) * C * C
/** @param {number} joules @returns {number} tấn TNT tương đương */
export const tntTons = (joules) => joules / 4.184e9

/** Màu mắt thấy của một bước sóng; ngoài vùng nhìn thấy trả về đỏ / tím rất tối. @param {number} nm */
export function wavelengthColor(nm) {
  let r = 0
  let g = 0
  let b = 0
  if (nm < 440) [r, b] = [(440 - nm) / 60, 1]
  else if (nm < 490) [g, b] = [(nm - 440) / 50, 1]
  else if (nm < 510) [g, b] = [1, (510 - nm) / 20]
  else if (nm < 580) [r, g] = [(nm - 510) / 70, 1]
  else if (nm < 645) [r, g] = [1, (645 - nm) / 65]
  else r = 1
  // Mờ dần ở hai đầu, nơi mắt người kém nhạy
  const edge = nm < 420 ? Math.max(0.25, 0.3 + (0.7 * (nm - 380)) / 40) : nm > 700 ? Math.max(0.25, 0.3 + (0.7 * (780 - nm)) / 80) : 1
  const to255 = (/** @type {number} */ v) => Math.round(255 * Math.min(1, Math.max(0, v)) * edge)
  return `rgb(${to255(r)},${to255(g)},${to255(b)})`
}

export const SPECTRUM_FROM = 380
export const SPECTRUM_TO = 780
/** Vị trí bước sóng trên dải phổ, từ 0 đến 1. @param {number} nm */
export const spectrumX = (nm) => (nm - SPECTRUM_FROM) / (SPECTRUM_TO - SPECTRUM_FROM)

// Vạch phát xạ mạnh (nm) và màu ngọn lửa của từng muối
export const FLAME_SALTS = [
  { id: 'na', name: 'Natri', salt: 'NaCl', flame: '#ffb52e', flameName: 'vàng cam', lines: [589.0, 589.6] },
  { id: 'cu', name: 'Đồng', salt: 'CuCl₂', flame: '#27e0a0', flameName: 'xanh lục', lines: [510.6, 515.3, 521.8] },
  { id: 'k', name: 'Kali', salt: 'KCl', flame: '#c08cff', flameName: 'tím nhạt', lines: [404.4, 766.5, 769.9] },
  { id: 'li', name: 'Liti', salt: 'LiCl', flame: '#ff3b5c', flameName: 'đỏ thắm', lines: [610.4, 670.8] },
]

// Một số vạch tối (Fraunhofer) nổi bật trong ánh sáng Mặt Trời (nm)
export const SOLAR_LINES = [393.4, 396.8, 430.8, 486.1, 517.3, 589.0, 589.6, 656.3]

/** Các vạch của muối trùng với vạch tối Mặt Trời. @param {number[]} lines */
export const solarMatches = (lines) => lines.filter((nm) => SOLAR_LINES.some((s) => Math.abs(s - nm) < 0.1))

/** Số kiểu Việt Nam: 21 500 → "21.500". @param {number} n */
export const viNumber = (n) => Math.round(n).toLocaleString('vi-VN')
