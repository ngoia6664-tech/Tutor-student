// Con lắc của đồng hồ quả lắc: công thức + kim đồng hồ (thuần, có test). Góc lắc nhỏ nên dùng được T = 2π√(l/g).
export const EARTH_G = 9.8
export const MOON_G = 1.62
// "Con lắc giây": dài khoảng 1 m thì mỗi lần lắc qua một phía mất khoảng 1 giây, đồng hồ chạy đúng giờ ở độ dài này
export const DEFAULT_LENGTH = 0.99

/** @param {number} l mét @param {number} g m/s² */
export const pendulumPeriod = (l, g) => 2 * Math.PI * Math.sqrt(l / g)

/** Đồng hồ đếm theo nhịp con lắc: con lắc nhanh gấp mấy lần thì kim nhanh gấp bấy nhiêu lần. @param {number} l @param {number} g */
export const clockRate = (l, g) => pendulumPeriod(DEFAULT_LENGTH, EARTH_G) / pendulumPeriod(l, g)

/** @param {number} rate kết quả của clockRate */
export function clockSpeedText(rate) {
  if (Math.abs(rate - 1) < 0.005) return 'Đồng hồ chạy đúng giờ'
  const times = (rate > 1 ? rate : 1 / rate).toFixed(2).replace('.', ',')
  return rate > 1 ? `Đồng hồ chạy nhanh gấp ${times} lần` : `Đồng hồ chạy chậm đi ${times} lần`
}

/** Góc 3 kim (radian, 0 = số XII, tăng theo chiều kim đồng hồ); kim giây nhảy từng nấc như đồng hồ thật.
 * @param {number} sec số giây tính từ 0 giờ */
export function clockHands(sec) {
  const turn = 2 * Math.PI
  return {
    hour: ((sec % 43200) / 43200) * turn,
    minute: ((sec % 3600) / 3600) * turn,
    second: ((Math.floor(sec) % 60) / 60) * turn,
  }
}
