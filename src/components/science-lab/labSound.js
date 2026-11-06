/**
 * labSound.js
 * Bộ tổng hợp âm thanh chân thực bằng Web Audio API thuần (không cần tải file ngoài).
 * Bao gồm: Tiếng mở cửa gỗ cọt kẹt, tiếng lách cách ống kính, tiếng bọt khí ống nghiệm và tiếng gõ đồng hồ.
 */

let audioCtx = null

function getAudioContext() {
  if (typeof window === 'undefined') return null
  const AudioContext = window.AudioContext || window.webkitAudioContext
  if (!AudioContext) return null
  if (!audioCtx) {
    audioCtx = new AudioContext()
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {})
  }
  return audioCtx
}

/**
 * Tiếng mở cửa gỗ phòng học cũ cọt kẹt (Stick-slip friction synthesis)
 */
export function playDoorCreak() {
  try {
    const ctx = getAudioContext()
    if (!ctx) return

    const now = ctx.currentTime
    const duration = 1.35

    // Bộ dao động ma sát bản lề gỗ (Sawtooth + Triangle)
    const osc = ctx.createOscillator()
    osc.type = 'sawtooth'

    // Tần số dao động trượt giật cục tạo tiếng kẽo kẹt
    osc.frequency.setValueAtTime(140, now)
    osc.frequency.exponentialRampToValueAtTime(320, now + 0.3)
    osc.frequency.linearRampToValueAtTime(210, now + 0.6)
    osc.frequency.exponentialRampToValueAtTime(380, now + 0.95)
    osc.frequency.exponentialRampToValueAtTime(160, now + duration)

    // Bộ lọc cộng hưởng hộp gỗ (Wood resonance bandpass filter)
    const filter = ctx.createBiquadFilter()
    filter.type = 'bandpass'
    filter.frequency.setValueAtTime(680, now)
    filter.Q.setValueAtTime(6.0, now)
    filter.frequency.linearRampToValueAtTime(950, now + 0.8)

    // Điều chế biên độ rung giật tạo các nấc bản lề gỗ cọ xát
    const lfo = ctx.createOscillator()
    lfo.type = 'sine'
    lfo.frequency.setValueAtTime(18, now) // 18Hz chattering

    const lfoGain = ctx.createGain()
    lfoGain.gain.setValueAtTime(0.55, now)

    const mainGain = ctx.createGain()
    mainGain.gain.setValueAtTime(0.001, now)
    mainGain.gain.exponentialRampToValueAtTime(0.35, now + 0.08)
    mainGain.gain.linearRampToValueAtTime(0.28, now + 0.9)
    mainGain.gain.exponentialRampToValueAtTime(0.001, now + duration)

    osc.connect(filter)
    filter.connect(mainGain)
    mainGain.connect(ctx.destination)

    osc.start(now)
    osc.stop(now + duration)
  } catch {
    // Không ném lỗi nếu trình duyệt chặn audio policy
  }
}

/**
 * Tiếng lách cách thấu kính quang học lấp lánh (Optic lens chime)
 */
export function playOpticChime() {
  try {
    const ctx = getAudioContext()
    if (!ctx) return

    const now = ctx.currentTime
    const osc1 = ctx.createOscillator()
    const osc2 = ctx.createOscillator()
    const gain = ctx.createGain()

    osc1.type = 'sine'
    osc2.type = 'sine'

    osc1.frequency.setValueAtTime(1760, now) // A6
    osc1.frequency.exponentialRampToValueAtTime(3520, now + 0.45) // A7

    osc2.frequency.setValueAtTime(2637, now) // E7
    osc2.frequency.exponentialRampToValueAtTime(5274, now + 0.45)

    gain.gain.setValueAtTime(0.001, now)
    gain.gain.linearRampToValueAtTime(0.22, now + 0.03)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.8)

    osc1.connect(gain)
    osc2.connect(gain)
    gain.connect(ctx.destination)

    osc1.start(now)
    osc2.start(now)
    osc1.stop(now + 0.8)
    osc2.stop(now + 0.8)
  } catch {}
}

/**
 * Tiếng sủi bọt ống nghiệm (Bubbly laboratory sound)
 */
export function playBubbleSound() {
  try {
    const ctx = getAudioContext()
    if (!ctx) return

    const now = ctx.currentTime
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    osc.type = 'sine'
    osc.frequency.setValueAtTime(380, now)
    osc.frequency.exponentialRampToValueAtTime(920, now + 0.12)

    gain.gain.setValueAtTime(0.18, now)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14)

    osc.connect(gain)
    gain.connect(ctx.destination)

    osc.start(now)
    osc.stop(now + 0.14)
  } catch {}
}

/**
 * Tiếng tích tắc đồng hồ quả lắc (Clock tic-tac)
 */
export function playClockTick(isTac = false) {
  try {
    const ctx = getAudioContext()
    if (!ctx) return

    const now = ctx.currentTime
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    osc.type = 'triangle'
    osc.frequency.setValueAtTime(isTac ? 980 : 1350, now)
    osc.frequency.exponentialRampToValueAtTime(isTac ? 350 : 500, now + 0.035)

    gain.gain.setValueAtTime(0.07, now)
    gain.gain.exponentialRampToValueAtTime(0.0005, now + 0.04)

    osc.connect(gain)
    gain.connect(ctx.destination)

    osc.start(now)
    osc.stop(now + 0.04)
  } catch {}
}
