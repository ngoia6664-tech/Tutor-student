import { useSyncExternalStore } from 'react'

// Cài đặt trải nghiệm (hiệu ứng, linh vật, âm thanh), lưu trên máy này trong localStorage 'app-settings' (JSON).
// Một store nhỏ dùng chung: component đọc bằng useSettings(), code ngoài React đọc getSettings() / subscribeSettings().
// "Chế độ hiệu năng" không lưu riêng: suy ra từ các cài đặt hình ảnh (khớp preset nào thì là chế độ đó, không thì "Tùy chỉnh").
const KEY = 'app-settings'

export const DEFAULTS = {
  animatedBackground: true, // nền vũ trụ chuyển động (sao trôi, hành tinh quay, sao băng)
  mascot: true, // hiện Giáo sư Gấu Trúc
  mascotAnimation: true, // gấu đi dạo / leo / lăn + chuyển động nhẹ
  celebration: true, // pháo giấy + gấu nhảy khi nộp bài / ôn đúng
  soundEffects: true, // tiếng gấu nói, tiếng "vút", tiếng chuông trong chế độ ngắm vũ trụ
  music: true, // nhạc nền chế độ ngắm vũ trụ
  musicVolume: 60, // 0–100
  dock: true, // cụm cửa hàng + Xu / Sao nổi góc trái dưới (nút ‹ / › thu gọn)
}

// Preset hiệu năng: chỉ đụng tới các cài đặt hình ảnh, không đụng âm thanh
export const PRESETS = {
  full: { animatedBackground: true, mascotAnimation: true, celebration: true },
  lite: { animatedBackground: false, mascotAnimation: false, celebration: false },
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

// Dữ liệu lỗi / thiếu / sai kiểu → lấy mặc định cho từng mục
function clean(raw) {
  const s = { ...DEFAULTS }
  if (!raw || typeof raw !== 'object') return s
  for (const k of Object.keys(DEFAULTS)) {
    if (typeof DEFAULTS[k] === 'boolean' && typeof raw[k] === 'boolean') s[k] = raw[k]
  }
  const v = Number(raw.musicVolume)
  if (raw.musicVolume !== undefined && raw.musicVolume !== null && Number.isFinite(v)) s.musicVolume = Math.round(Math.min(100, Math.max(0, v)))
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

// Gắn cờ lên <html> để CSS tắt animation (styles/settings.css)
function applyToDocument() {
  if (typeof document === 'undefined') return
  const root = document.documentElement
  root.toggleAttribute('data-static-bg', !settings.animatedBackground)
  root.toggleAttribute('data-still-mascot', !settings.mascotAnimation)
}

applyToDocument()
