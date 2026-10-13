// Hình SVG nhúng (data URI) thường tự đổi màu theo chế độ tối/sáng của HỆ ĐIỀU HÀNH
// (@media prefers-color-scheme: dark), không theo nút ☀/☾ của app. Khi hai chế độ
// lệch nhau, chữ trong hình có thể trùng màu nền. Ta bỏ phần màu tối để hình luôn
// dùng bộ màu sáng, rồi hiển thị trên khung "giấy" sáng (xem .figure trong CSS).

const DARK_MEDIA = /@media\s*\(\s*prefers-color-scheme\s*:\s*dark\s*\)\s*\{(?:[^{}]*\{[^{}]*\})*[^{}]*\}/gi
const SVG_B64 = /^data:image\/svg\+xml;base64,/i

function decodeBase64Utf8(b64) {
  const bin = atob(b64)
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0))
  return new TextDecoder().decode(bytes)
}

function encodeBase64Utf8(text) {
  const bytes = new TextEncoder().encode(text)
  let bin = ''
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return btoa(bin)
}

const cache = new Map()

export function lightOnlySvg(uri) {
  if (!SVG_B64.test(uri)) return uri
  if (cache.has(uri)) return cache.get(uri)
  let out = uri
  try {
    const svg = decodeBase64Utf8(uri.replace(SVG_B64, ''))
    const cleaned = svg.replace(DARK_MEDIA, '')
    if (cleaned !== svg) out = `data:image/svg+xml;base64,${encodeBase64Utf8(cleaned)}`
  } catch {
    // Không giải mã được: giữ nguyên ảnh gốc
  }
  cache.set(uri, out)
  return out
}

// Chỉ cho phép ảnh nhúng dạng base64 của các định dạng ảnh thông dụng
export function isSafeImageDataUri(url) {
  return /^data:image\/(png|jpe?g|gif|webp|svg\+xml);base64,[a-z0-9+/=\s]+$/i.test(url)
}
