// Hình SVG nhúng (data URI) thường tự đổi màu theo chế độ tối/sáng của HỆ ĐIỀU HÀNH
// (@media prefers-color-scheme: dark), không theo nút ☀/☾ của app. Ta viết lại phần
// đó theo giao diện của app:
//   - app tối  → luôn dùng bộ màu tối của hình
//   - app sáng → bỏ bộ màu tối, luôn dùng bộ màu sáng

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

// Lấy phần CSS bên trong khối @media và thêm !important (để thắng cả style ghi trực tiếp trên thẻ)
function unwrapDark(block) {
  const inner = block.slice(block.indexOf('{') + 1, block.lastIndexOf('}'))
  return inner.replace(/([^{};]+:[^{};!]+?)\s*(;|(?=\}))/g, '$1 !important$2')
}

const cache = new Map()

export function themedSvg(uri, theme) {
  if (!SVG_B64.test(uri)) return uri
  const key = theme + '|' + uri
  if (cache.has(key)) return cache.get(key)
  let out = uri
  try {
    const svg = decodeBase64Utf8(uri.replace(SVG_B64, ''))
    const rewritten = svg.replace(DARK_MEDIA, (block) => (theme === 'dark' ? unwrapDark(block) : ''))
    if (rewritten !== svg) out = `data:image/svg+xml;base64,${encodeBase64Utf8(rewritten)}`
  } catch {
    // Không giải mã được: giữ nguyên ảnh gốc
  }
  cache.set(key, out)
  return out
}

// Chỉ cho phép ảnh nhúng dạng base64 của các định dạng ảnh thông dụng
export function isSafeImageDataUri(url) {
  return /^data:image\/(png|jpe?g|gif|webp|svg\+xml);base64,[a-z0-9+/=\s]+$/i.test(url)
}

// Trong ô soạn, thay ảnh nhúng (hàng chục nghìn ký tự) bằng mã ngắn (hinh-1), (hinh-2)...
// Khi lưu thì đổi ngược lại. Giúp ô soạn bài giảng đọc được.
const EMBED = /\((data:image\/[a-z0-9+.-]+;base64,[a-z0-9+/=]+)(\s+"[^"]*")?\)/gi
const PLACEHOLDER = /\(hinh-(\d+)(\s+"[^"]*")?\)/g

export function packImages(md) {
  const images = []
  const text = (md || '').replace(EMBED, (_m, uri, title = '') => {
    images.push(uri)
    return `(hinh-${images.length}${title})`
  })
  return { text, images }
}

export function unpackImages(text, images) {
  return (text || '').replace(PLACEHOLDER, (m, n, title = '') => (images[n - 1] ? `(${images[n - 1]}${title})` : m))
}
