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

// ----- Hình không có bộ màu tối (vd. hình vẽ trong JSON): chữ / trục đen hoặc xám chìm vào nền tối -----
// App tối: đảo các màu trung tính (đen / xám đậm → sáng, trắng / xám rất nhạt → tối) để chữ, trục, nền ô
// đổi theo nhau; giữ nguyên màu có sắc (đường đỏ, xanh...). Chữ / hình không ghi màu (mặc định đen) cũng thành sáng.
const INK_LIGHT = '#ece8ff'
const PAPER_DARK = '#1e1a3d'
const NAMED = {
  black: '#000000', gray: '#808080', grey: '#808080', dimgray: '#696969', dimgrey: '#696969',
  darkgray: '#a9a9a9', darkgrey: '#a9a9a9', white: '#ffffff', whitesmoke: '#f5f5f5', gainsboro: '#dcdcdc',
}
const COLOR_ATTR = /\b(fill|stroke|color|stop-color)(\s*=\s*["']|\s*:\s*)(#[0-9a-f]{3,8}\b|rgba?\([^)]*\)|[a-z]+)/gi

function toRgb(c) {
  c = c.toLowerCase()
  if (NAMED[c]) c = NAMED[c]
  let m = c.match(/^#([0-9a-f]{3,4})$/)
  if (m) return [...m[1].slice(0, 3)].map((h) => parseInt(h + h, 16))
  m = c.match(/^#([0-9a-f]{6})([0-9a-f]{2})?$/)
  if (m) return [0, 2, 4].map((i) => parseInt(m[1].slice(i, i + 2), 16))
  m = c.match(/^rgba?\(\s*(\d+)[\s,]+(\d+)[\s,]+(\d+)/)
  if (m) return [+m[1], +m[2], +m[3]]
  return null
}

// Màu trung tính (ít sắc): tối → sáng, rất sáng → tối; còn lại (màu có sắc, xám vừa) giữ nguyên
function flipNeutral(color) {
  const rgb = toRgb(color)
  if (!rgb) return null
  const [r, g, b] = rgb
  if (Math.max(r, g, b) - Math.min(r, g, b) >= 40) return null
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  if (lum < 0.55) return INK_LIGHT
  if (lum > 0.85) return PAPER_DARK
  return null
}

function lightenInk(svg) {
  const recolored = svg.replace(COLOR_ATTR, (m, prop, sep, value) => {
    const flipped = flipNeutral(value)
    return flipped ? `${prop}${sep}${flipped}` : m
  })
  // Màu mặc định (không ghi fill) của chữ / hình là đen: đặt mặc định sáng trên thẻ <svg> gốc
  return recolored.replace(/<svg\b([^>]*)>/i, (tag) => `${tag}<style>svg{fill:${INK_LIGHT};color:${INK_LIGHT}}</style>`)
}

const cache = new Map()

export function themedSvg(uri, theme) {
  if (!SVG_B64.test(uri)) return uri
  const key = theme + '|' + uri
  if (cache.has(key)) return cache.get(key)
  let out = uri
  try {
    const svg = decodeBase64Utf8(uri.replace(SVG_B64, ''))
    let rewritten = svg.replace(DARK_MEDIA, (block) => (theme === 'dark' ? unwrapDark(block) : ''))
    // Hình đã có bộ màu tối riêng thì tôn trọng; không có thì tự làm sáng chữ / trục khi app tối
    if (theme === 'dark' && rewritten === svg) rewritten = lightenInk(svg)
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
