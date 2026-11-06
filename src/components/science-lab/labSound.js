/**
 * labSound.js
 * Hệ thống phát âm thanh cho Phòng Khoa Học & Nghiên Cứu.
 * Đã gỡ bỏ hoàn toàn âm thanh tổng hợp (oscillator) cũ.
 * Chừa sẵn các điểm nối (hook) sạch sẽ để phát trực tiếp file âm thanh (.mp3 / .wav) khi người dùng cung cấp.
 */

const SOUND_PATHS = {
  doorCreak: '/audio/sfx/door-creak.mp3', // 4 giây, khớp DOOR_MS trong labScene.js
  opticChime: null,
  bubble: null,
  clockTick: null,
  ambientMusic: null,
}

let ambientAudio = null

function playFile(path, volume = 0.7) {
  if (!path || typeof window === 'undefined') return
  try {
    const audio = new Audio(path)
    audio.volume = volume
    audio.play().catch(() => {})
  } catch {
    // Bỏ qua nếu trình duyệt chặn autoplay
  }
}

// Dùng lại một thẻ Audio: iPhone chỉ cho phát thẻ đã được "mở" ngay trong cú bấm vào phòng
let doorAudio = null

/** Gọi trong cú bấm mở phòng, trước khi tải xong cảnh 3D */
export function primeDoorCreak() {
  if (typeof window === 'undefined') return
  try {
    doorAudio = doorAudio || new Audio(SOUND_PATHS.doorCreak)
    doorAudio.preload = 'auto'
    doorAudio.muted = true
    doorAudio.play().then(() => {
      if (doorAudio.muted) doorAudio.pause()
    }).catch(() => {})
  } catch {
    // Trình duyệt chặn thì cửa mở không có tiếng
  }
}

export function playDoorCreak() {
  if (typeof window === 'undefined') return
  try {
    doorAudio = doorAudio || new Audio(SOUND_PATHS.doorCreak)
    doorAudio.muted = false
    doorAudio.currentTime = 0
    doorAudio.volume = 0.85
    doorAudio.play().catch(() => {})
  } catch {
    // Bỏ qua nếu trình duyệt chặn autoplay
  }
}

export function stopDoorCreak() {
  if (doorAudio) doorAudio.pause()
}

export function playOpticChime() {
  playFile(SOUND_PATHS.opticChime, 0.65)
}

export function playBubbleSound() {
  playFile(SOUND_PATHS.bubble, 0.6)
}

export function playClockTick() {
  playFile(SOUND_PATHS.clockTick, 0.4)
}

export function startLabAmbient() {
  if (!SOUND_PATHS.ambientMusic || typeof window === 'undefined') return
  try {
    if (!ambientAudio) {
      ambientAudio = new Audio(SOUND_PATHS.ambientMusic)
      ambientAudio.loop = true
      ambientAudio.volume = 0.45
    }
    ambientAudio.play().catch(() => {})
  } catch {}
}

export function stopLabAmbient() {
  try {
    if (ambientAudio) {
      ambientAudio.pause()
      ambientAudio.currentTime = 0
    }
  } catch {}
}
