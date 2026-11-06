/**
 * labSound.js
 * Hệ thống phát âm thanh cho Phòng Khoa Học & Nghiên Cứu.
 * Đã gỡ bỏ hoàn toàn âm thanh tổng hợp (oscillator) cũ.
 * Chừa sẵn các điểm nối (hook) sạch sẽ để phát trực tiếp file âm thanh (.mp3 / .wav) khi người dùng cung cấp.
 */

const SOUND_PATHS = {
  doorCreak: null, // Ví dụ: '/sounds/door-creak.mp3' (sẽ gắn khi có file)
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

export function playDoorCreak() {
  playFile(SOUND_PATHS.doorCreak, 0.8)
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
