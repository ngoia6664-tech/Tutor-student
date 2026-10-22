// Âm thanh chế độ ngắm vũ trụ, tổng hợp bằng Web Audio (không cần file âm thanh).
// Nền chính là nhạc YouTube (components/SpaceMusic); tiếng vũ trụ trầm tổng hợp ở đây chỉ dùng khi nhạc lỗi. Gấu: tiếng "líu lo" khi nói, tiếng chuông khi soi hành tinh.
// Bật/tắt nhớ trong localStorage ('space-sound' = 'off' là tắt).
const KEY = 'space-sound'
let on = (() => {
  try {
    return localStorage.getItem(KEY) !== 'off'
  } catch {
    return true
  }
})()

// Âm lượng chung 0–100 (nhạc nền YouTube + hiệu ứng), nhớ trong localStorage 'space-volume'
const VOL_KEY = 'space-volume'
let volume = (() => {
  try {
    const v = Number(localStorage.getItem(VOL_KEY))
    return localStorage.getItem(VOL_KEY) !== null && v >= 0 && v <= 100 ? v : 60
  } catch {
    return 60
  }
})()
// Tai người nghe theo thang log: bình phương cho thanh trượt "ăn" đều, kéo xuống thấy nhỏ hẳn
const masterLevel = () => 1.2 * (volume / 100) ** 2

export const getVolume = () => volume

export function setVolume(value) {
  volume = value
  try {
    localStorage.setItem(VOL_KEY, String(value))
  } catch {
    // không lưu được thì thôi
  }
  if (master) master.gain.setTargetAtTime(masterLevel(), ctx.currentTime, 0.05)
}

let ctx = null
let master = null
let echo = null // bus vang (delay có phản hồi) cho cảm giác không gian rộng
let ambient = null

export const isSoundOn = () => on

export function setSoundOn(value) {
  on = value
  try {
    localStorage.setItem(KEY, value ? 'on' : 'off')
  } catch {
    // trình duyệt chặn lưu: chỉ nhớ trong phiên
  }
  if (!value) {
    stopAmbient()
    stopMusic()
  }
}

function audio() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext
    if (!AC) return null
    // iPhone: mặc định Web Audio bị tắt theo nút gạt im lặng; 'playback' cho phát như nghe nhạc (iOS 17+)
    try {
      if (navigator.audioSession) navigator.audioSession.type = 'playback'
    } catch {
      // trình duyệt không hỗ trợ
    }
    ctx = new AC()
    master = ctx.createGain()
    master.gain.value = masterLevel()
    master.connect(ctx.destination)
    const delay = ctx.createDelay(1)
    delay.delayTime.value = 0.33
    const feedback = ctx.createGain()
    feedback.gain.value = 0.38
    const wet = ctx.createGain()
    wet.gain.value = 0.35
    delay.connect(feedback).connect(delay)
    delay.connect(wet).connect(master)
    echo = delay
  }
  if (ctx.state === 'suspended') ctx.resume()
  return ctx
}

// Một nốt ngắn có bao âm (attack nhanh, tắt dần), tùy chọn trượt cao độ và gửi sang bus vang
function note(freq, { at = 0, dur = 0.12, type = 'sine', gain = 0.12, glide = 0, wet = false } = {}) {
  const t = ctx.currentTime + at
  const osc = ctx.createOscillator()
  const g = ctx.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(freq, t)
  if (glide) osc.frequency.exponentialRampToValueAtTime(freq * glide, t + dur)
  g.gain.setValueAtTime(0.0001, t)
  g.gain.exponentialRampToValueAtTime(gain, t + 0.012)
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  osc.connect(g).connect(master)
  if (wet) g.connect(echo)
  osc.start(t)
  osc.stop(t + dur + 0.05)
}

function noiseBuffer(seconds) {
  const buf = ctx.createBuffer(1, ctx.sampleRate * seconds, ctx.sampleRate)
  const data = buf.getChannelData(0)
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1
  return buf
}

// Mở kính viễn vọng: tiếng "vút" gió vũ trụ quét lên rồi lắng xuống
export function playWhoosh() {
  if (!on || !audio()) return
  const t = ctx.currentTime
  const src = ctx.createBufferSource()
  src.buffer = noiseBuffer(1.6)
  const bp = ctx.createBiquadFilter()
  bp.type = 'bandpass'
  bp.Q.value = 1.2
  bp.frequency.setValueAtTime(180, t)
  bp.frequency.exponentialRampToValueAtTime(2200, t + 0.6)
  bp.frequency.exponentialRampToValueAtTime(260, t + 1.5)
  const g = ctx.createGain()
  g.gain.setValueAtTime(0.0001, t)
  g.gain.exponentialRampToValueAtTime(0.28, t + 0.45)
  g.gain.exponentialRampToValueAtTime(0.0001, t + 1.55)
  src.connect(bp).connect(g).connect(master)
  g.connect(echo)
  src.start(t)
}

// Nền vũ trụ: hai nốt trầm lệch nhau (quãng 5) qua bộ lọc thở chậm + tiếng lấp lánh rải rác thang ngũ cung
export function startAmbient() {
  if (!on || ambient || !audio()) return
  const t = ctx.currentTime
  const bus = ctx.createGain()
  bus.gain.setValueAtTime(0.0001, t)
  bus.gain.exponentialRampToValueAtTime(0.16, t + 3)
  const lp = ctx.createBiquadFilter()
  lp.type = 'lowpass'
  lp.frequency.value = 380
  lp.Q.value = 3
  const lfo = ctx.createOscillator()
  const lfoAmt = ctx.createGain()
  lfo.frequency.value = 0.06
  lfoAmt.gain.value = 220
  lfo.connect(lfoAmt).connect(lp.frequency)
  lp.connect(bus).connect(master)
  const oscs = [
    [55, 'sawtooth', 0.5, 0],
    [55, 'sawtooth', 0.5, 7],
    [82.4, 'triangle', 0.6, -4],
    [110, 'sine', 0.35, 3],
  ].map(([f, type, level, detune]) => {
    const o = ctx.createOscillator()
    const g = ctx.createGain()
    o.type = type
    o.frequency.value = f
    o.detune.value = detune
    g.gain.value = level
    o.connect(g).connect(lp)
    o.start(t)
    return o
  })
  lfo.start(t)

  const scale = [1046.5, 1174.7, 1318.5, 1568, 1760, 2093]
  let timer = 0
  const twinkle = () => {
    note(scale[Math.floor(Math.random() * scale.length)], { dur: 1.6, gain: 0.025, wet: true })
    timer = setTimeout(twinkle, 1800 + Math.random() * 3500)
  }
  timer = setTimeout(twinkle, 1500)

  ambient = { bus, nodes: [...oscs, lfo], timer: () => timer }
}

export function stopAmbient() {
  if (!ambient || !ctx) return
  const { bus, nodes, timer } = ambient
  ambient = null
  clearTimeout(timer())
  const t = ctx.currentTime
  bus.gain.cancelScheduledValues(t)
  bus.gain.setValueAtTime(Math.max(bus.gain.value, 0.0001), t)
  bus.gain.exponentialRampToValueAtTime(0.0001, t + 0.8)
  nodes.forEach((n) => n.stop(t + 0.9))
}

// Gấu nói: 3–5 tiếng "bíp" cao độ ngẫu nhiên, trượt lên nhẹ như tiếng líu lo
export function playPandaTalk() {
  if (!on || !audio()) return
  const n = 3 + Math.floor(Math.random() * 3)
  for (let i = 0; i < n; i++) {
    note(520 + Math.random() * 420, { at: i * 0.085, dur: 0.075, type: 'triangle', gain: 0.1, glide: 1.25 })
  }
}

// Soi hành tinh: chuỗi chuông lấp lánh đi lên (Đô – Mi – Son – Đô)
export function playFocus() {
  if (!on || !audio()) return
  ;[1046.5, 1318.5, 1568, 2093].forEach((f, i) => note(f, { at: i * 0.07, dur: 0.5, type: 'triangle', gain: 0.07, wet: true }))
}

// ===== Nhạc nền từ file trong app (public/audio/space-music.mp3) =====
// Phải gọi startMusic() NGAY TRONG sự kiện bấm (nút kính viễn vọng / nút loa): iPhone chỉ cho phát tiếng khi bắt đầu trong cú bấm.
// Đi qua Web Audio (GainNode) vì iOS bỏ qua thuộc tính volume của <audio> → thanh âm lượng mới có tác dụng.
// status: 'idle' | 'playing' | 'missing' (không có file / lỗi → SpaceExplorer chuyển sang YouTube rồi âm thanh tổng hợp)
const MUSIC_URL = '/audio/space-music.mp3'
let music = null
let musicStatus = 'idle'
const musicListeners = new Set()
const setMusicStatus = (s) => {
  musicStatus = s
  musicListeners.forEach((f) => f(s))
}
export const getMusicStatus = () => musicStatus
export function onMusicStatus(fn) {
  musicListeners.add(fn)
  return () => musicListeners.delete(fn)
}

export function startMusic() {
  if (!on || musicStatus === 'missing' || !audio()) return
  if (!music) {
    const el = new Audio(MUSIC_URL)
    el.loop = true
    el.preload = 'auto'
    el.setAttribute('playsinline', '')
    const gain = ctx.createGain()
    gain.gain.value = 0.0001
    ctx.createMediaElementSource(el).connect(gain).connect(master)
    el.addEventListener('error', () => setMusicStatus('missing'))
    el.addEventListener('playing', () => setMusicStatus('playing'))
    music = { el, gain }
  }
  const t = ctx.currentTime
  music.gain.gain.cancelScheduledValues(t)
  music.gain.gain.setValueAtTime(Math.max(music.gain.gain.value, 0.0001), t)
  music.gain.gain.exponentialRampToValueAtTime(1, t + 2)
  music.el.play().catch((err) => {
    // NotAllowedError = bị chặn tự phát (hiếm khi xảy ra vì đã gọi trong cú bấm); lỗi khác = không có file
    if (err?.name !== 'NotAllowedError' && err?.name !== 'AbortError') setMusicStatus('missing')
  })
}

export function stopMusic() {
  if (!music || !ctx) return
  const { el, gain } = music
  const t = ctx.currentTime
  gain.gain.cancelScheduledValues(t)
  gain.gain.setValueAtTime(Math.max(gain.gain.value, 0.0001), t)
  gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.8)
  setTimeout(() => {
    if (gain.gain.value < 0.01) el.pause()
  }, 850)
}
