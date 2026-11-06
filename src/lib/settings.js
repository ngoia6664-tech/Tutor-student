import { useSyncExternalStore } from 'react'

// Cài đặt trải nghiệm (hiệu ứng, linh vật, âm thanh, không gian lớp học), lưu trên máy này trong localStorage 'app-settings' (JSON).
// Một store nhỏ dùng chung: component đọc bằng useSettings(), code ngoài React đọc getSettings() / subscribeSettings().
// "Chế độ hiệu năng" không lưu riêng: suy ra từ các cài đặt hình ảnh (khớp preset nào thì là chế độ đó, không thì "Tùy chỉnh").
const KEY = 'app-settings'

const WEATHERS = ['auto', 'morning', 'sunset', 'rainy']

export const DEFAULTS = {
  animatedBackground: true, // nền vũ trụ / lớp học chuyển động
  mascot: true, // hiện Giáo sư Gấu Trúc
  mascotAnimation: true, // gấu đi dạo / leo / lăn + chuyển động nhẹ
  celebration: true, // pháo giấy + gấu nhảy khi nộp bài / ôn đúng
  travelAnimation: true, // Kính thiên văn: gấu lên tàu vũ trụ bay sang địa điểm mới (~4,8 giây)
  soundEffects: true, // tiếng gấu nói, tiếng "vút", tiếng chuông trong chế độ ngắm vũ trụ
  music: true, // nhạc nền chế độ ngắm vũ trụ
  musicVolume: 60, // 0–100
  dock: true, // cụm cửa hàng + Xu / Sao nổi góc trái dưới (nút ‹ / › thu gọn)
  // Cài đặt riêng cho Giao diện Sáng (Lớp học cổ điển) + Độ đặc thẻ dùng chung:
  classroomWeather: 'sunset', // 'auto' | 'morning' | 'sunset' | 'rainy'
  sunIntensity: 100, // 20–140 (%)
  cardOpacity: 92, // 72–100 (%)
  ceilingLamp: true, // bật / tắt đèn chao thả trần lớp học
}

// Preset hiệu năng: chỉ đụng tới các cài đặt hình ảnh, không đụng âm thanh
export const PRESETS = {
  full: { animatedBackground: true, mascotAnimation: true, celebration: true, travelAnimation: true },
  lite: { animatedBackground: false, mascotAnimation: false, celebration: false, travelAnimation: false },
}

// Tự động xác định giao diện theo giờ: 6h sáng đến trước 18h tối là ban ngày ('light'), 18h tối đến trước 6h sáng là ban đêm ('dark')
export function getAutoThemeByTime() {
  const hr = new Date().getHours()
  return hr >= 6 && hr < 18 ? 'light' : 'dark'
}

export function syncAutoTheme() {
  if (typeof document === 'undefined') return
  if (settings.classroomWeather !== 'auto') return
  const targetTheme = getAutoThemeByTime()
  if (document.documentElement.dataset.theme !== targetTheme) {
    document.documentElement.dataset.theme = targetTheme
    const metaColor = targetTheme === 'light' ? '#efe5d5' : '#14100d'
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', metaColor)
    try {
      localStorage.setItem('theme', targetTheme)
    } catch {
      // ignore
    }
  }
}

// Quy đổi 'auto' theo giờ máy tính:
// Ban ngày (6h–18h): sáng (6h–14h) → nắng sớm ('morning'), chiều (14h–18h) → nắng chiều ('sunset')
// Ban đêm (18h–6h): đầu tối (18h–21h) → trăng trong ('morning'), khuya (21h–1h) → trăng sao ('sunset'), canh ba (1h–4h) → mưa đêm / sương ('rainy'), rạng sáng (4h–6h) → trăng trong ('morning')
export function resolveClassroomWeather(w = 'sunset', theme) {
  if (w !== 'auto') return WEATHERS.includes(w) ? w : 'sunset'
  const hr = new Date().getHours()
  const isLight = (theme ?? (typeof document !== 'undefined' ? document.documentElement.dataset.theme : 'light')) === 'light'
  if (isLight) {
    if (hr >= 6 && hr < 14) return 'morning'
    if (hr >= 14 && hr < 18) return 'sunset'
    return 'morning'
  }
  if (hr >= 18 && hr < 21) return 'morning'
  if (hr >= 21 || hr < 1) return 'sunset'
  if (hr >= 1 && hr < 4) return 'rainy'
  return 'morning'
}

// Đọc giá trị cũ trước khi có trang Cài đặt (spaceSound: 'space-sound', 'space-volume') để người dùng cũ giữ lựa chọn
function legacy() {
  const out = {}
  try {
    if (localStorage.getItem('space-sound') === 'off') {
      out.soundEffects = false
      out.music = false
    }
    const v = localStorage.getItem('space-volume')
    if (v !== null) out.musicVolume = Number(v)
  } catch {
    // không đọc được thì dùng mặc định
  }
  return out
}

function clampInt(val, min, max, fallback) {
  const n = Number(val)
  if (val === undefined || val === null || !Number.isFinite(n)) return fallback
  return Math.round(Math.min(max, Math.max(min, n)))
}

// Dữ liệu lỗi / thiếu / sai kiểu → lấy mặc định cho từng mục
function clean(raw) {
  const s = { ...DEFAULTS }
  if (!raw || typeof raw !== 'object') return s
  for (const k of Object.keys(DEFAULTS)) {
    if (typeof DEFAULTS[k] === 'boolean' && typeof raw[k] === 'boolean') s[k] = raw[k]
  }
  s.musicVolume = clampInt(raw.musicVolume, 0, 100, DEFAULTS.musicVolume)
  s.sunIntensity = clampInt(raw.sunIntensity, 20, 140, DEFAULTS.sunIntensity)
  s.cardOpacity = clampInt(raw.cardOpacity, 72, 100, DEFAULTS.cardOpacity)
  if (typeof raw.classroomWeather === 'string' && WEATHERS.includes(raw.classroomWeather)) {
    s.classroomWeather = raw.classroomWeather
  }
  return s
}

function load() {
  try {
    const text = localStorage.getItem(KEY)
    if (text) return clean(JSON.parse(text))
  } catch {
    // JSON hỏng → mặc định
  }
  return clean(legacy())
}

let settings = load()
const listeners = new Set()

function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(settings))
  } catch {
    // không lưu được (ẩn danh...): chỉ nhớ trong lần mở này
  }
}

export const getSettings = () => settings

export function subscribeSettings(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

export function updateSettings(patch) {
  settings = clean({ ...settings, ...patch })
  save()
  applyToDocument()
  listeners.forEach((fn) => fn(settings))
}

export function resetSettings() {
  updateSettings(DEFAULTS)
}

export function useSettings() {
  return useSyncExternalStore(subscribeSettings, getSettings, getSettings)
}

// 'full' | 'lite' | 'custom'
export function performanceMode(s = settings) {
  for (const [name, preset] of Object.entries(PRESETS)) {
    if (Object.entries(preset).every(([k, v]) => s[k] === v)) return name
  }
  return 'custom'
}

export const prefersReducedMotion = () => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

// Gắn cờ và biến CSS lên <html> để giao diện (styles/base.css, space.css, settings.css) cập nhật tức thì
function applyToDocument() {
  if (typeof document === 'undefined') return
  const root = document.documentElement
  if (settings.classroomWeather === 'auto') {
    syncAutoTheme()
  }
  root.toggleAttribute('data-static-bg', !settings.animatedBackground)
  root.toggleAttribute('data-still-mascot', !settings.mascotAnimation)
  root.dataset.weather = resolveClassroomWeather(settings.classroomWeather, root.dataset.theme)
  root.style.setProperty('--sun-intensity', (settings.sunIntensity / 100).toFixed(2))
  root.style.setProperty('--card-opacity', (settings.cardOpacity / 100).toFixed(2))
  root.style.setProperty('--lamp-on', settings.ceilingLamp ? '1' : '0')
  root.dataset.lamp = settings.ceilingLamp ? 'on' : 'off'
}

applyToDocument()

// Tự động kiểm tra đồng bộ thời gian thực mỗi 20 giây (chuyển giao diện sáng/tối vào đúng 6h sáng và 18h tối)
if (typeof window !== 'undefined') {
  setInterval(() => {
    if (settings.classroomWeather === 'auto') {
      applyToDocument()
    }
  }, 20000)
}
