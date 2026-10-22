import { useSyncExternalStore } from 'react'
import { getSettings, subscribeSettings, updateSettings } from './settings.js'

// Âm thanh chế độ ngắm vũ trụ, tổng hợp bằng Web Audio (không cần file âm thanh).
// Nền chính là nhạc YouTube (components/SpaceMusic); tiếng vũ trụ trầm tổng hợp ở đây chỉ dùng khi nhạc lỗi. Gấu: tiếng "líu lo" khi nói, tiếng chuông khi soi hành tinh.
// Bật/tắt + âm lượng lấy từ Cài đặt (lib/settings.js): soundEffects = tiếng hiệu ứng, music = nhạc nền, musicVolume = âm lượng nhạc nền.
const fx = () => getSettings().soundEffects
const musicOn = () => getSettings().music

// Tai người nghe theo thang log: bình phương cho thanh trượt "ăn" đều, kéo xuống thấy nhỏ hẳn
const musicLevel = () => 1.2 * (getSettings().musicVolume / 100) ** 2
const FX_LEVEL = 1.2 * 0.6 ** 2 // hiệu ứng giữ mức cũ (âm lượng 60%)

export const getVolume = () => getSettings().musicVolume
export const setVolume = (value) => updateSettings({ musicVolume: value })

let ctx = null
let master = null // hiệu ứng
let musicBus = null // nhạc nền (file mp3 + tiếng vũ trụ tổng hợp), theo âm lượng nhạc nền
let echo = null // bus vang (delay có phản hồi) cho cảm giác không gian rộng
let ambient = null

// Nút loa trong chế độ ngắm vũ trụ: "có tiếng" khi bật ít nhất một loại; bấm thì tắt / bật cả hai
export const isSoundOn = () => fx() || musicOn()
export const setSoundOn = (value) => updateSettings({ soundEffects: value, music: value })

// Cài đặt đổi: tắt nhạc thì dừng ngay (cả YouTube), đổi âm lượng thì chỉnh bus nhạc
subscribeSettings((s) => {
  if (!s.music) pauseAllMusic()
  if (musicBus) musicBus.gain.setTargetAtTime(musicLevel(), ctx.currentTime, 0.05)
})

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
    // iPhone treo context khi ra nền / có cuộc gọi: nút ▶ / ‖ phải biết nhạc đã im
    ctx.onstatechange = syncPlaying
    master = ctx.createGain()
    master.gain.value = FX_LEVEL
    master.connect(ctx.destination)
    musicBus = ctx.createGain()
    musicBus.gain.value = musicLevel()
    musicBus.connect(ctx.destination)
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
  clearTimeout(idleTimer)
  // Chưa có cú bấm thì trình duyệt có thể từ chối resume: bỏ qua, lần bấm sau thử lại
  if (ctx.state === 'suspended') ctx.resume()?.catch?.(() => {})
  return ctx
}

// Một nốt ngắn có bao âm (attack nhanh, tắt dần), tùy chọn trượt cao độ và gửi sang bus vang
function note(freq, { at = 0, dur = 0.12, type = 'sine', gain = 0.12, glide = 0, wet = false, out = master } = {}) {
  const t = ctx.currentTime + at
  const osc = ctx.createOscillator()
  const g = ctx.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(freq, t)
  if (glide) osc.frequency.exponentialRampToValueAtTime(freq * glide, t + dur)
  g.gain.setValueAtTime(0.0001, t)
  g.gain.exponentialRampToValueAtTime(gain, t + 0.012)
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  osc.connect(g).connect(out)
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
  if (!fx() || !audio()) return
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
  if (!musicOn() || ambient || !audio()) return
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
  lp.connect(bus).connect(musicBus)
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
    note(scale[Math.floor(Math.random() * scale.length)], { dur: 1.6, gain: 0.025, wet: true, out: musicBus })
    timer = setTimeout(twinkle, 1800 + Math.random() * 3500)
  }
  timer = setTimeout(twinkle, 1500)

  ambient = { bus, nodes: [...oscs, lfo], timer: () => timer }
  syncPlaying()
}

export function stopAmbient() {
  if (!ambient || !ctx) return
  const { bus, nodes, timer } = ambient
  ambient = null
  syncPlaying()
  clearTimeout(timer())
  const t = ctx.currentTime
  bus.gain.cancelScheduledValues(t)
  bus.gain.setValueAtTime(Math.max(bus.gain.value, 0.0001), t)
  bus.gain.exponentialRampToValueAtTime(0.0001, t + 0.8)
  nodes.forEach((n) => n.stop(t + 0.9))
}

// Gấu nói: 3–5 tiếng "bíp" cao độ ngẫu nhiên, trượt lên nhẹ như tiếng líu lo
export function playPandaTalk() {
  if (!fx() || !audio()) return
  const n = 3 + Math.floor(Math.random() * 3)
  for (let i = 0; i < n; i++) {
    note(520 + Math.random() * 420, { at: i * 0.085, dur: 0.075, type: 'triangle', gain: 0.1, glide: 1.25 })
  }
}

// Soi hành tinh: chuỗi chuông lấp lánh đi lên (Đô – Mi – Son – Đô)
export function playFocus() {
  if (!fx() || !audio()) return
  ;[1046.5, 1318.5, 1568, 2093].forEach((f, i) => note(f, { at: i * 0.07, dur: 0.5, type: 'triangle', gain: 0.07, wet: true }))
}

// ===== Trạng thái nhạc nền THẬT (nút ▶ / ‖ trong chế độ ngắm vũ trụ đọc ở đây) =====
// Ba nguồn: file mp3 (<audio> qua Web Audio), YouTube (components/SpaceMusic đăng ký qua registerExternalMusic), tiếng vũ trụ tổng hợp.
// "Đang phát" = <audio> chưa pause hoặc tiếng tổng hợp đang chạy, khi AudioContext 'running'; hoặc YouTube báo PLAYING.
let playing = false
let ytPlaying = false
let external = null // { play, pause } của trình phát YouTube đang mở
const playListeners = new Set()
function syncPlaying() {
  const running = ctx?.state === 'running'
  const next = ytPlaying || (running && ((!!music && !music.el.paused && !music.stopping) || !!ambient))
  if (next === playing) return
  playing = next
  playListeners.forEach((f) => f())
}
const subscribePlaying = (fn) => {
  playListeners.add(fn)
  return () => playListeners.delete(fn)
}
export const isMusicPlaying = () => playing
export const useMusicPlaying = () => useSyncExternalStore(subscribePlaying, isMusicPlaying, isMusicPlaying)

// SpaceMusic gọi khi trình phát YouTube sẵn sàng; hàm trả về dùng khi gỡ trình phát
export function registerExternalMusic(ctrl) {
  external = ctrl
  return () => {
    if (external !== ctrl) return
    external = null
    ytPlaying = false
    syncPlaying()
  }
}
export function setExternalPlaying(value) {
  ytPlaying = value
  syncPlaying()
}
// Phải gọi trong cú bấm (nút ▶ / nút loa) để điện thoại cho phát
export const playExternalMusic = () => external?.play()

// ===== Lựa chọn nhạc nền trong phiên đăng nhập =====
// Mặc định chưa phát: lần đầu mở kính viễn vọng hỏi "Bật nhạc nền không?" (cú bấm trả lời = thao tác người dùng → điện thoại cho phát).
// 'on' | 'off' | null (chưa hỏi). Lưu localStorage suốt phiên đăng nhập (đóng tab / mở lại app vẫn nhớ), đăng xuất thì xóa (AuthContext).
const CHOICE_KEY = 'space-music-choice'
let choice = null
try {
  choice = localStorage.getItem(CHOICE_KEY)
} catch {
  // trình duyệt chặn lưu trữ: chỉ nhớ trong bộ nhớ
}
export const getMusicChoice = () => choice
export function setMusicChoice(value) {
  choice = value
  try {
    if (value) localStorage.setItem(CHOICE_KEY, value)
    else localStorage.removeItem(CHOICE_KEY)
  } catch {
    // như trên
  }
}

// Mở khóa AudioContext ngay trong cú bấm: sau đó tiếng tổng hợp phát được kể cả khi cú bấm đã qua (iPhone)
export const unlockAudio = () => !!audio()

// Nút kính viễn vọng: luôn mở khóa AudioContext trong cú bấm (tiếng "vút" phát sau khi màn ngắm tải xong, iPhone mới cho nghe);
// đã chọn bật nhạc trong phiên này thì phát nhạc luôn
export function openExplorerSound() {
  if (!fx() && !musicOn()) return
  unlockAudio()
  if (choice === 'on' && musicOn()) startMusic()
}

// Dừng mọi nguồn nhạc nền (mp3 / YouTube giữ vị trí bài). fade = giây giảm dần, 0 = dừng ngay
export function pauseAllMusic(fade) {
  stopMusic(fade)
  stopAmbient()
  external?.pause()
}

// Đóng chế độ ngắm vũ trụ: hết tiếng thì treo AudioContext (vòng vang + bus vẫn tốn CPU dù im lặng)
let idleTimer = 0
export function releaseAudio() {
  clearTimeout(idleTimer)
  idleTimer = setTimeout(() => {
    if (ctx && !ambient && (!music || music.el.paused)) ctx.suspend?.()?.catch?.(() => {})
  }, 1200)
}

// Điện thoại / máy tính bảng (màn cảm ứng, không chuột): ra nền thì dừng nhạc. Máy tính: nhạc vẫn phát khi sang tab / app khác
const pausesInBackground = () => !!window.matchMedia?.('(hover: none) and (pointer: coarse)').matches
// Lúc này được tự phát / tự lặp lại không (tab đang hiện, hoặc máy tính cho phát nền)
export const canPlayNow = () => !document.hidden || !pausesInBackground()

// Điện thoại ra nền (chuyển app, khóa máy): dừng nhạc ngay + treo AudioContext. Quay lại KHÔNG tự phát:
// điện thoại thường chặn, nút ▶ cho người dùng phát tiếp bằng một cú bấm.
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden || !pausesInBackground()) return
    pauseAllMusic(0)
    clearTimeout(idleTimer)
    if (ctx?.state === 'running') ctx.suspend?.()?.catch?.(() => {})
  })
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
  if (!musicOn() || musicStatus === 'missing' || !audio()) return
  if (!music) {
    const el = new Audio(MUSIC_URL)
    el.loop = true
    el.preload = 'auto'
    el.setAttribute('playsinline', '')
    const gain = ctx.createGain()
    gain.gain.value = 0.0001
    ctx.createMediaElementSource(el).connect(gain).connect(musicBus)
    el.addEventListener('error', () => setMusicStatus('missing'))
    el.addEventListener('playing', () => setMusicStatus('playing'))
    ;['play', 'playing', 'pause', 'ended', 'error'].forEach((ev) => el.addEventListener(ev, syncPlaying))
    music = { el, gain, stopping: false, pauseTimer: 0 }
  }
  // Bấm phát lại trong lúc đang giảm dần để dừng: hủy lệnh dừng cũ (trước đây có thể pause nhầm bài vừa phát lại)
  clearTimeout(music.pauseTimer)
  music.stopping = false
  const t = ctx.currentTime
  music.gain.gain.cancelScheduledValues(t)
  music.gain.gain.setValueAtTime(Math.max(music.gain.gain.value, 0.0001), t)
  music.gain.gain.exponentialRampToValueAtTime(1, t + 2)
  music.el.play().catch((err) => {
    // NotAllowedError = bị chặn tự phát (hiếm khi xảy ra vì đã gọi trong cú bấm); lỗi khác = không có file
    if (err?.name !== 'NotAllowedError' && err?.name !== 'AbortError') setMusicStatus('missing')
    syncPlaying()
  })
  syncPlaying()
}

// fade: giây giảm dần trước khi pause (mặc định 0.8); 0 = pause ngay (ra nền: hẹn giờ bị trình duyệt hoãn)
export function stopMusic(fade = 0.8) {
  if (!music || !ctx) return
  const { el, gain } = music
  clearTimeout(music.pauseTimer)
  music.stopping = true
  syncPlaying()
  if (!fade) {
    el.pause()
    return
  }
  const t = ctx.currentTime
  gain.gain.cancelScheduledValues(t)
  gain.gain.setValueAtTime(Math.max(gain.gain.value, 0.0001), t)
  gain.gain.exponentialRampToValueAtTime(0.0001, t + fade)
  music.pauseTimer = setTimeout(() => el.pause(), fade * 1000 + 50)
}
