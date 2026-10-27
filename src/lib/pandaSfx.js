import { getSettings, subscribeSettings } from './settings.js'

// ===== Tiếng hoạt cảnh trang phục (components/panda/PandaAct.jsx), tổng hợp bằng Web Audio, không cần file =====
// Mỗi hoạt cảnh = một kịch bản gồm nhiều tiếng NGẮN đặt đúng mốc giây của animation (khớp chú thích từng Layer
// trong PandaAct.jsx + keyframes styles/panda-act.css). Không có đoạn tiếng dài chạy suốt; cao trào trùng hình.
// AudioContext riêng (không đụng nhạc nền / tiếng vũ trụ của lib/spaceSound.js), diễn xong thì treo cho đỡ tốn CPU.
// Tắt "Hiệu ứng âm thanh" trong Cài đặt → im ngay (kể cả đang diễn). Đổi bộ / rời trang / ra nền → dừng ngay.
// Bộ càng hiếm thì càng nhiều lớp + vang sâu hơn (bus vang `wet`), không phải to hơn: mọi tiếng đi qua một compressor chung.

let ctx = null
let out = null // tổng hiệu ứng → compressor → loa
let verb = null // vang (impulse tự tạo) — chiều sâu không gian
let noiseBuf = null
let current = null // hoạt cảnh đang kêu { bus, send, sources, end }
let sleepTimer = 0

const rand = (a, b) => a + Math.random() * (b - a)
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)]

// Vang: nhiễu tắt dần theo hàm mũ, hai kênh lệch nhau cho cảm giác rộng
function impulse(sec) {
  const len = Math.floor(ctx.sampleRate * sec)
  const buf = ctx.createBuffer(2, len, ctx.sampleRate)
  for (let c = 0; c < 2; c++) {
    const d = buf.getChannelData(c)
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 3.4
  }
  return buf
}

function audio() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext
    if (!AC) return null
    // iPhone: cho phát cả khi gạt im lặng, giống lib/spaceSound.js
    try {
      if (navigator.audioSession) navigator.audioSession.type = 'playback'
    } catch {
      // trình duyệt không hỗ trợ
    }
    ctx = new AC()
    const comp = ctx.createDynamicsCompressor()
    comp.threshold.value = -16
    comp.knee.value = 10
    comp.ratio.value = 5
    comp.attack.value = 0.004
    comp.release.value = 0.25
    comp.connect(ctx.destination)
    out = ctx.createGain()
    out.gain.value = 0.55
    out.connect(comp)
    verb = ctx.createConvolver()
    verb.buffer = impulse(2.8)
    verb.connect(out)
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate)
    const d = noiseBuf.getChannelData(0)
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1
  }
  clearTimeout(sleepTimer)
  if (ctx.state === 'suspended') ctx.resume()?.catch?.(() => {})
  return ctx
}

// Gọi trong cú chạm / bấm (useHold) để trình duyệt cho phát tiếng khi hoạt cảnh bắt đầu sau khi giữ đủ lâu
export function unlockSfx() {
  if (getSettings().soundEffects) audio()
}

// ===== Bộ dụng cụ tiếng của một lần diễn: mọi mốc t tính bằng giây từ lúc hoạt cảnh bắt đầu =====
function kit(run, t0) {
  const { bus, send } = run
  const at = (t) => t0 + t
  // Mốc đã qua (trình duyệt mở tiếng trễ) thì bỏ, không phát dồn
  const late = (t) => at(t) < ctx.currentTime - 0.03
  const track = (src, end) => {
    run.sources.push(src)
    run.end = Math.max(run.end, end)
  }

  // Đích của một tiếng: (pan trái/phải, có thể trượt) → bus, kèm nhánh vang
  function chain(t, dur, { pan = 0, panTo, wet = 0 }) {
    const g = ctx.createGain()
    if (ctx.createStereoPanner && (pan || panTo != null)) {
      const p = ctx.createStereoPanner()
      p.pan.setValueAtTime(pan, at(t))
      if (panTo != null) p.pan.linearRampToValueAtTime(panTo, at(t + dur))
      g.connect(p).connect(bus)
    } else g.connect(bus)
    if (wet) {
      const w = ctx.createGain()
      w.gain.value = wet
      g.connect(w).connect(send)
    }
    return g
  }

  // Bao âm: lên trong a, giữ hold, tắt dần trong r
  function shape(param, t, gain, a, hold, r) {
    const s = at(t)
    param.setValueAtTime(0.0001, s)
    param.exponentialRampToValueAtTime(gain, s + a)
    if (hold) param.setValueAtTime(gain, s + a + hold)
    param.exponentialRampToValueAtTime(0.0001, s + a + hold + r)
    return s + a + hold + r
  }

  // Cao độ / tần số lọc: cố định, trượt tới `to` trong `glide`, hoặc theo đường cong `curve`
  function sweep(param, t, dur, f, to, glide, curve) {
    if (curve) {
      param.value = curve[0]
      param.setValueCurveAtTime(Float32Array.from(curve), at(t), dur)
    } else {
      param.setValueAtTime(f, at(t))
      if (to) param.exponentialRampToValueAtTime(to, at(t) + (glide ?? dur))
    }
  }

  function tone(t, f, { type = 'sine', gain = 0.1, a = 0.005, hold = 0, r = 0.2, to, glide, curve, vib, detune = 0, lp, pan, panTo, wet } = {}) {
    if (late(t) || f > 16000) return
    const dur = a + hold + r
    const o = ctx.createOscillator()
    o.type = type
    o.detune.value = detune
    sweep(o.frequency, t, dur, f, to, glide, curve)
    if (vib) {
      // [tốc độ Hz, độ rung cent]
      const l = ctx.createOscillator()
      const d = ctx.createGain()
      l.frequency.value = vib[0]
      d.gain.value = vib[1]
      l.connect(d).connect(o.detune)
      l.start(at(t))
      l.stop(at(t) + dur + 0.05)
      track(l, at(t) + dur)
    }
    const g = ctx.createGain()
    const end = shape(g.gain, t, gain, a, hold, r)
    let head = o
    if (lp) {
      const bq = ctx.createBiquadFilter()
      bq.type = 'lowpass'
      bq.frequency.value = lp
      head = o.connect(bq)
    }
    head.connect(g).connect(chain(t, dur, { pan, panTo, wet }))
    o.start(at(t))
    o.stop(end + 0.05)
    track(o, end)
  }

  function noise(t, { type = 'bandpass', f = 1000, to, curve, q = 1, gain = 0.1, a = 0.005, hold = 0, r = 0.2, pan, panTo, wet } = {}) {
    if (late(t)) return
    const dur = a + hold + r
    const src = ctx.createBufferSource()
    src.buffer = noiseBuf
    src.loop = true
    const bq = ctx.createBiquadFilter()
    bq.type = type
    bq.Q.value = q
    sweep(bq.frequency, t, dur, f, to, undefined, curve)
    const g = ctx.createGain()
    const end = shape(g.gain, t, gain, a, hold, r)
    src.connect(bq).connect(g).connect(chain(t, dur, { pan, panTo, wet }))
    src.start(at(t), Math.random() * 1.5)
    src.stop(end + 0.05)
    track(src, end)
  }

  // Hợp âm êm (sóng răng cưa lệch nhẹ qua lọc thấp chung) — nền vũ trụ, cú "stab" khi drop
  function pad(t, freqs, { gain = 0.08, a = 0.4, hold = 0, r = 0.8, lp = 900, lpTo, q = 0.7, pan, panTo, wet = 0.5 } = {}) {
    if (late(t)) return
    const dur = a + hold + r
    const bq = ctx.createBiquadFilter()
    bq.type = 'lowpass'
    bq.Q.value = q
    sweep(bq.frequency, t, dur, lp, lpTo)
    const g = ctx.createGain()
    const end = shape(g.gain, t, gain, a, hold, r)
    bq.connect(g).connect(chain(t, dur, { pan, panTo, wet }))
    for (const f of freqs)
      for (const cents of [-7, 7]) {
        const o = ctx.createOscillator()
        o.type = 'sawtooth'
        o.frequency.value = f
        o.detune.value = cents + rand(-2, 2)
        const each = ctx.createGain()
        each.gain.value = 1 / (freqs.length * 2)
        o.connect(each).connect(bq)
        o.start(at(t))
        o.stop(end + 0.05)
        track(o, end)
      }
  }

  // ----- Tiếng ghép -----
  const whoosh = (t, dur, { f = 700, to = 2600, q = 1.4, gain = 0.22, pan, panTo, wet } = {}) =>
    noise(t, { f, to, q, gain, a: dur * 0.6, r: dur * 0.4, pan, panTo, wet })

  // Chuông pha lê: các bội âm không điều hoà tắt nhanh dần
  function chime(t, f, { gain = 0.05, r = 1, pan, wet = 0.45 } = {}) {
    tone(t, f, { gain, a: 0.003, r, pan, wet })
    tone(t, f * 2.76, { gain: gain * 0.3, a: 0.002, r: r * 0.5, pan, wet })
    tone(t, f * 5.4, { gain: gain * 0.1, a: 0.002, r: r * 0.3, pan, wet })
  }

  // Kim loại ngân "shing": bội âm lệch + vệt nhiễu cao lúc chạm
  function shing(t, f, { gain = 0.14, r = 0.8, pan, wet = 0.35 } = {}) {
    const k = rand(0.985, 1.015)
    ;[1, 2.31, 3.87, 5.43].forEach((m, i) =>
      tone(t, f * m * k, { gain: gain * [1, 0.55, 0.32, 0.18][i], a: 0.002, r: r * [1, 0.8, 0.55, 0.4][i], vib: [7, 6], pan, wet })
    )
    noise(t, { type: 'highpass', f: 6000, gain: gain * 1.1, a: 0.001, r: 0.05, pan })
  }

  const click = (t, { gain = 0.18, f = 3500, pan } = {}) => {
    noise(t, { type: 'highpass', f, gain, a: 0.001, r: 0.02, pan })
    tone(t, f * 0.5, { gain: gain * 0.35, a: 0.001, r: 0.015, pan })
  }

  const kick = (t, { gain = 0.45, f = 160, to = 45, r = 0.3 } = {}) => {
    tone(t, f, { gain, a: 0.002, r, to, glide: 0.1 })
    noise(t, { type: 'highpass', f: 3000, gain: gain * 0.15, a: 0.001, r: 0.012 })
  }

  const hat = (t, { gain = 0.05, r = 0.04, pan = 0.25 } = {}) => noise(t, { type: 'highpass', f: 7500, gain, a: 0.001, r, pan })

  // Nạp năng lượng: nhiễu cao dần + nốt trượt lên, cắt gọn ở cuối
  function riser(t, dur, { f = 400, to = 5000, gain = 0.12, pitch = [220, 880], wet = 0.2 } = {}) {
    noise(t, { type: 'highpass', f, to, q: 0.9, gain, a: dur * 0.95, r: 0.04, wet })
    tone(t, pitch[0], { type: 'triangle', gain: gain * 0.35, a: dur * 0.95, r: 0.04, to: pitch[1], glide: dur, wet })
  }

  // Tiếng khí nén (cửa tàu): nhiễu sáng, tắt chậm
  const hiss = (t, dur, { gain = 0.1, f = 4200, pan } = {}) => noise(t, { f, q: 0.6, gain, a: 0.012, hold: dur * 0.25, r: dur * 0.75, pan })

  // Vụ nổ: tiếng trầm rơi xuống + nhiễu đục dần + tiếng nứt + lách tách
  function boom(t, { gain = 1, sub = [90, 28], r = 1.4, bright = 2600, wet = 0.5, crackle = 6 } = {}) {
    tone(t, sub[0], { gain: 0.85 * gain, a: 0.004, r, to: sub[1], glide: r * 0.5 })
    tone(t, sub[0] * 1.5, { type: 'triangle', gain: 0.25 * gain, a: 0.004, r: r * 0.4, to: sub[1] * 1.5, glide: r * 0.4 })
    noise(t, { type: 'lowpass', f: bright, to: 110, q: 0.7, gain: 0.5 * gain, a: 0.005, r: r * 1.1, wet })
    noise(t, { type: 'highpass', f: 2400, gain: 0.32 * gain, a: 0.001, r: 0.08 })
    for (let i = 0; i < crackle; i++)
      noise(t + rand(0.03, 0.3), { f: rand(2000, 5200), q: 3, gain: 0.1 * gain, a: 0.001, r: 0.025, pan: rand(-0.7, 0.7) })
  }

  // Bụi sao rơi: chuông cao rải ngẫu nhiên trong khoảng dur, theo thang âm (nếu có)
  function sparkles(t, dur, n, { scale, lo = 1800, hi = 4600, gain = 0.035, r = 0.8, wet = 0.6, descend = false } = {}) {
    for (let i = 0; i < n; i++) {
      const when = t + (descend ? (i / n) * dur + rand(0, dur / n) : rand(0, dur))
      const f = scale ? (descend ? scale[Math.max(0, scale.length - 1 - (i % scale.length))] : pick(scale)) : lo * (hi / lo) ** Math.random()
      chime(when, f * rand(0.995, 1.005), { gain: gain * rand(0.6, 1), r: r * rand(0.7, 1.2), pan: rand(-0.75, 0.75), wet })
    }
  }

  // Tiếng ù kéo dài (năng lượng, phép, vũ trụ): vài sóng sine cùng lên / xuống, có thể trượt cao độ
  function drone(t, dur, freqs, { gain = 0.05, a = 0.3, r = 0.3, to = 1, type = 'sine', vib, pan, panTo, wet = 0.3 } = {}) {
    const hold = Math.max(0, dur - a - r)
    freqs.forEach((f) => tone(t, f, { type, gain: gain / freqs.length, a, hold, r, to: to !== 1 ? f * to : undefined, glide: dur, vib, pan, panTo, wet }))
  }

  return { tone, noise, pad, whoosh, chime, shing, click, kick, hat, riser, hiss, boom, sparkles, drone }
}

// ===== Kịch bản từng hoạt cảnh (mốc giây khớp PandaAct.jsx) =====
const PENTA = [1568, 1760, 2093, 2349, 2637, 3136, 3520] // ngũ cung sáng: bụi sao, chòm sao

const SCRIPTS = {
  // ---------- Panda DJ (3s): chạm tai nghe → bàn DJ → beat + scratch theo tay → riser → mini bass drop ----------
  'dj-set': (k, lite) => {
    // Tay chạm tai nghe (act-dj-arm-r 6–11%) + tai nghe nháy sóng
    k.noise(0.18, { f: 1400, q: 2, gain: 0.07, a: 0.002, r: 0.03 })
    k.noise(0.29, { f: 1700, q: 2, gain: 0.06, a: 0.002, r: 0.03 })
    // Bàn DJ trồi lên: click điện tử + blip
    k.click(0.35, { gain: 0.12, f: 4200 })
    k.tone(0.37, 660, { type: 'square', gain: 0.025, r: 0.06, to: 1320, glide: 0.05, lp: 3000 })
    // Beat: kick đúng nhịp nhún người (act-dj-body 26/38/50/62%), hi-hat ở phách lẻ
    for (const t of [0.78, 1.14, 1.5, 1.86]) {
      k.kick(t, { gain: 0.42 })
      k.tone(t, 55, { type: 'triangle', gain: 0.1, a: 0.005, r: 0.24 })
    }
    for (const t of [0.6, 0.96, 1.32, 1.68]) k.hat(t)
    // Scratch theo từng lượt tay qua lại trên mâm đĩa — mỗi lần một cao độ khác
    const strokes = [
      [0.79, true, 1],
      [0.94, false, 0.9],
      [1.09, true, 1.12],
      [1.51, true, 1.04],
      [1.66, false, 0.86],
      [1.87, true, 1.18],
    ]
    for (const [t, up, p] of strokes) {
      const pitch = p * rand(0.97, 1.03)
      const curve = (up ? [260, 1300, 2100, 700] : [1900, 650, 300, 820]).map((f) => f * pitch)
      k.noise(t, { curve, q: 3.5, gain: 0.16, a: 0.01, hold: 0.06, r: 0.06, pan: up ? 0.15 : -0.15 })
      k.tone(t, 140, { type: 'sawtooth', curve: curve.map((f) => f / 6), gain: 0.05, a: 0.01, hold: 0.06, r: 0.06, lp: 2400 })
    }
    // Build-up: riser ngắn + hi-hat dồn dập, tay giơ lên (72%)
    k.riser(1.72, 0.42, { gain: 0.1, pitch: [330, 1320] })
    if (!lite) [1.98, 2.03, 2.07, 2.1].forEach((t, i) => k.hat(t, { gain: 0.03 + i * 0.012, pan: 0 }))
    // DROP (vòng sáng toả ra 2.1): bass rơi + stab hợp âm + bùng sáng
    k.kick(2.13, { gain: 0.7, f: 180, to: 38, r: 0.5 })
    k.tone(2.13, 82, { gain: 0.32, a: 0.005, hold: 0.1, r: 0.55, to: 41, glide: 0.5 })
    k.pad(2.13, [220, 277.2, 329.6, 440], { gain: 0.09, a: 0.005, r: 0.38, lp: 2600, lpTo: 500, wet: 0.25 })
    k.noise(2.13, { type: 'lowpass', f: 3200, to: 300, gain: 0.16, r: 0.4 })
    if (!lite) k.sparkles(2.2, 0.35, 3, { lo: 2600, hi: 4200, gain: 0.02 })
  },

  // ---------- Kiếm Sĩ Tinh Hệ (4.6s): rút kiếm → combo 8 nhát cực nhanh → im lặng → tra kiếm "cạch" → ĐẠI BÙNG NỔ ----------
  'star-duel': (k, lite) => {
    // Vào thế: ù năng lượng rất nhẹ, tay chạm chuôi
    k.drone(0, 0.62, [110, 164.8], { gain: 0.05, a: 0.2, r: 0.3, vib: [6, 8], wet: 0.2 })
    k.click(0.2, { gain: 0.06, f: 2200 })
    k.tone(0.2, 1400, { gain: 0.025, r: 0.05 })
    // Rút kiếm (tia sáng chạy dọc lưỡi 0.38): tiếng kim loại sắc + lấp lánh vũ trụ
    k.noise(0.26, { f: 2500, to: 8000, q: 2, gain: 0.09, a: 0.12, r: 0.05 })
    k.shing(0.38, 1320, { gain: 0.13, r: 0.7, pan: -0.1 })
    k.chime(0.44, 2637, { gain: 0.022 })
    k.chime(0.5, 3520, { gain: 0.018 })
    // Combo 8 nhát (DUEL_BEATS): shh-shh-shh-SHING-shh-cut-shh-SHING, đổi bên theo hướng gấu lao
    const beats = [0.6, 0.71, 0.82, 0.93, 1.04, 1.15, 1.26, 1.37]
    const kinds = ['hi', 'lo', 'hi', 'shing', 'lo', 'cut', 'hi', 'shing']
    beats.forEach((t, i) => {
      const pan = (i % 2 ? 0.1 : -0.45) + rand(-0.08, 0.08)
      const kind = kinds[i]
      if (kind === 'lo') k.whoosh(t - 0.03, 0.09, { f: 800, to: 2300, q: 1.8, gain: 0.24, pan, panTo: -pan })
      else k.whoosh(t - 0.03, 0.08, { f: 2600, to: 6800, q: 2.2, gain: 0.2, pan, panTo: -pan })
      if (kind === 'shing') k.shing(t + 0.015, i === 7 ? 2093 : 1760, { gain: i === 7 ? 0.13 : 0.1, r: i === 7 ? 0.5 : 0.32, pan })
      if (kind === 'cut') k.tone(t, 2400, { type: 'sawtooth', gain: 0.03, a: 0.002, r: 0.07, to: 220, glide: 0.07, lp: 5000, pan })
      // Vết cắt hằn trên hành tinh (bên trái sân)
      k.tone(t + 0.035, rand(170, 210), { gain: 0.06, a: 0.002, r: 0.06, to: 90, pan: -0.4 })
    })
    // 1.5–2.7 gần như im lặng; tra kiếm chậm rãi: tiếng trượt rất khẽ
    k.noise(2.28, { f: 3000, to: 4400, q: 6, gain: 0.018, a: 0.38, r: 0.06 })
    // "CẠCH" kiếm vào bao (2.74) — trigger
    k.click(2.74, { gain: 0.3, f: 3000 })
    k.tone(2.74, 880, { type: 'square', gain: 0.025, a: 0.001, r: 0.03, lp: 4000 })
    k.shing(2.745, 2350, { gain: 0.08, r: 0.28 })
    // BOOM (2.86, sau tiếng cạch 0,12s): sâu, có bass, tiếng nứt vũ trụ rồi bụi sao lan như pháo hoa
    k.boom(2.86, { gain: 1, sub: [95, 26], r: 1.5, wet: 0.6, crackle: lite ? 4 : 8 })
    k.noise(2.87, { type: 'highpass', f: 1500, to: 7000, gain: 0.12, a: 0.003, r: 0.3, wet: 0.4 })
    k.sparkles(2.98, 1.0, lite ? 6 : 12, { lo: 1800, hi: 5200, gain: 0.03 })
    if (!lite)
      for (const t of [3.2, 3.42, 3.62]) {
        k.noise(t, { f: 1600, q: 1.2, gain: 0.08, a: 0.001, r: 0.06, pan: rand(-0.6, 0.6), wet: 0.4 })
        k.sparkles(t + 0.03, 0.3, 3, { lo: 2400, hi: 5000, gain: 0.018 })
      }
  },

  // ---------- Pháp Sư Sao (5s): niệm chú → nạp phép tăng dần → triệu hồi → điều khiển → nén năng lượng → bùng nổ phép ----------
  'star-summon': (k, lite) => {
    // Cầm trượng: ù phép nhẹ + vài tiếng pha lê
    k.drone(0, 1.5, [220, 330], { gain: 0.035, a: 0.45, r: 0.1, vib: [5, 10], wet: 0.5 })
    for (const [t, f] of [[0.1, 1760], [0.24, 2349], [0.38, 2637]]) k.chime(t, f, { gain: 0.025, pan: rand(-0.4, 0.4) })
    // Vòng phép dưới chân (0.5): cộng hưởng như chuông bát
    k.tone(0.5, 523.3, { gain: 0.05, a: 0.02, r: 1.4, vib: [3, 6], wet: 0.6 })
    k.tone(0.5, 784, { gain: 0.025, a: 0.02, r: 1.1, wet: 0.6 })
    // Nạp phép 0.5–1.45: ù mạnh dần, cao dần, rền trầm rất nhỏ; hạt sáng hút về
    k.drone(0.5, 0.95, [330, 440], { gain: 0.05, a: 0.85, r: 0.06, to: 1.5, vib: [7, 12], wet: 0.4 })
    k.noise(0.5, { type: 'lowpass', f: 140, q: 0.8, gain: 0.07, a: 0.85, r: 0.15 })
    if (!lite) [0.75, 0.95, 1.12, 1.27].forEach((t, i) => k.chime(t, 1568 * 1.15 ** i, { gain: 0.018, r: 0.4 }))
    // Hành tinh bung ra (1.45): bloom ma thuật + pha lê + ù quỹ đạo
    k.tone(1.45, 90, { gain: 0.16, a: 0.01, r: 0.7, to: 60, glide: 0.5 })
    k.noise(1.4, { f: 600, to: 2400, q: 0.8, gain: 0.08, a: 0.06, r: 0.5, wet: 0.5 })
    k.pad(1.45, [523.3, 659.3, 784, 1046.5], { gain: 0.05, a: 0.02, r: 1.1, lp: 3200, lpTo: 900, wet: 0.6 })
    k.sparkles(1.48, 0.4, lite ? 3 : 6, { scale: PENTA, gain: 0.026 })
    // Trượng dẫn hành tinh bay vòng lên đỉnh đầu 1.75–3.15: gió nhẹ theo quỹ đạo + ù quỹ đạo
    k.noise(1.75, { f: 500, to: 1300, q: 1.6, gain: 0.05, a: 0.7, r: 0.7, pan: -0.6, panTo: 0.3, wet: 0.4 })
    k.drone(1.75, 1.45, [196], { gain: 0.035, a: 0.3, r: 0.4, vib: [4, 14], wet: 0.4 })
    // Mỗi cú vung trượng một tiếng vút nhỏ
    for (const [t, p] of [[1.75, -0.4], [2.4, 0.1], [3.0, 0.3]]) k.whoosh(t, 0.22, { f: 900, to: 2600, q: 1.6, gain: 0.08, pan: p, wet: 0.3 })
    // Ra lệnh 3.2–3.92: ấn lục giác "ting", năng lượng dồn vào một điểm — cao dần, nhỏ dần, rồi cắt
    k.chime(3.2, 2093, { gain: 0.04, r: 0.6 })
    k.drone(3.2, 0.68, [330, 495], { gain: 0.06, a: 0.6, r: 0.04, to: 3, vib: [9, 18], wet: 0.2 })
    k.noise(3.25, { type: 'highpass', f: 800, to: 7000, gain: 0.05, a: 0.6, r: 0.03 })
    // BÙNG NỔ PHÉP (3.95): va chạm ma thuật, bass vừa, pha lê vỡ, sóng năng lượng — không phải tiếng bom
    k.tone(3.95, 110, { gain: 0.32, a: 0.004, r: 0.9, to: 52, glide: 0.5 })
    k.noise(3.95, { f: 3200, to: 450, q: 0.9, gain: 0.18, a: 0.006, r: 0.85, wet: 0.6 })
    k.pad(3.95, [261.6, 392, 523.3, 784, 1046.5], { gain: 0.07, a: 0.01, r: 1.0, lp: 4200, lpTo: 700, wet: 0.7 })
    for (const f of [2093, 2637, 3136, 4186]) k.chime(3.96 + rand(0, 0.04), f, { gain: 0.035, r: 1.2, pan: rand(-0.6, 0.6) })
    // Bụi sao rơi dần 4.05–5
    k.sparkles(4.05, 0.6, lite ? 5 : 9, { scale: PENTA, gain: 0.022, r: 0.45, descend: true })
  },

  // ---------- Phi Hành Gia (7s): triệu hồi tàu → vào tàu → nạp động cơ → phóng, tăng tốc → warp → điểm sáng xa → tàu lao về, hãm
  // → lơ lửng → đáp → bước ra vẫy tay → tàu tan thành bụi sao → sao rơi (mốc khớp TR trong PandaAct SpaceTrip) ----------
  'space-trip': (k, lite) => {
    // Triệu hồi (0.15): hạt sáng tụ lại + không gian méo (ù trầm rung) · hologram quét (0.4) · tàu vật chất hoá (0.75)
    k.tone(0.15, 300, { gain: 0.03, a: 0.5, r: 0.1, to: 1200, glide: 0.6, vib: [18, 35], wet: 0.4, pan: 0.4 })
    k.tone(0.2, 70, { gain: 0.05, a: 0.3, r: 0.3, to: 95, glide: 0.6, vib: [6, 40], pan: 0.4 })
    k.noise(0.4, { type: 'highpass', f: 2500, to: 7000, gain: 0.03, a: 0.3, r: 0.06, pan: 0.4 })
    k.tone(0.75, 420, { gain: 0.045, a: 0.04, r: 0.3, to: 1700, glide: 0.25, wet: 0.35, pan: 0.4 })
    k.tone(0.75, 95, { gain: 0.12, a: 0.004, r: 0.3, to: 55, glide: 0.2, pan: 0.4 })
    k.noise(0.75, { f: 1800, to: 5000, q: 2, gain: 0.05, a: 0.01, r: 0.25, pan: 0.4 })
    // Xung sáng chạy dọc thân (0.95) + ba đèn bật
    k.tone(0.95, 700, { type: 'triangle', gain: 0.025, a: 0.2, r: 0.15, to: 1600, glide: 0.35, pan: 0.4, wet: 0.3 })
    ;[1318.5, 1568, 1760].forEach((f, i) => k.tone(1.0 + i * 0.08, f, { gain: 0.03, a: 0.003, r: 0.06, pan: 0.4 }))
    // Cửa mở (1.15): khí nén + servo
    k.hiss(1.15, 0.35, { gain: 0.07, pan: 0.4 })
    k.tone(1.15, 140, { type: 'square', gain: 0.025, a: 0.01, hold: 0.12, r: 0.06, curve: [140, 175, 150, 190], lp: 900, pan: 0.4 })
    // Gấu nhún rồi nhảy vào (1.7)
    k.whoosh(1.7, 0.25, { f: 600, to: 1600, gain: 0.06, pan: 0.1, panTo: 0.4 })
    // Đóng cửa (2.0) + khoá (2.12) + đèn chuyển sang chuẩn bị phóng
    k.noise(2.0, { f: 450, q: 1.2, gain: 0.12, a: 0.004, r: 0.08, pan: 0.4 })
    k.tone(2.0, 190, { type: 'square', gain: 0.03, a: 0.002, r: 0.06, lp: 700, pan: 0.4 })
    k.click(2.12, { gain: 0.1, f: 2600, pan: 0.4 })
    k.tone(2.14, 1568, { gain: 0.025, a: 0.003, r: 0.05, pan: 0.4 })
    k.tone(2.38, 1568, { gain: 0.025, a: 0.003, r: 0.05, pan: 0.4 })
    // Nạp động cơ 2.15–2.85: ù tăng dần, thân tàu rung lạch cạch, vòng gió, lửa mồi 2.6
    k.tone(2.15, 50, { type: 'sawtooth', gain: 0.07, a: 0.66, r: 0.04, to: 120, glide: 0.7, lp: 650, pan: 0.35 })
    k.noise(2.15, { type: 'lowpass', f: 180, to: 1100, gain: 0.09, a: 0.66, r: 0.04, pan: 0.35 })
    if (!lite) [2.42, 2.53, 2.62, 2.7, 2.77].forEach((t, i) => k.noise(t, { f: 1200 + i * 200, q: 3, gain: 0.025 + i * 0.006, a: 0.002, r: 0.03, pan: 0.4 }))
    k.whoosh(2.45, 0.35, { f: 400, to: 1200, gain: 0.03, pan: 0.4 })
    k.noise(2.6, { f: 900, q: 0.7, gain: 0.05, a: 0.01, r: 0.2, pan: 0.35 })
    // PHÓNG (2.85): bùng động cơ + sóng chấn động, rồi tăng tốc vụt lên (3.05)
    k.kick(2.85, { gain: 0.35, f: 130, to: 38, r: 0.45 })
    k.noise(2.85, { type: 'lowpass', f: 3200, to: 260, q: 0.8, gain: 0.3, a: 0.02, hold: 0.2, r: 0.8, pan: 0.3, panTo: 0, wet: 0.35 })
    k.tone(2.85, 70, { gain: 0.25, a: 0.005, r: 0.5, to: 35, glide: 0.45 })
    k.whoosh(3.05, 0.4, { f: 600, to: 3600, q: 1.1, gain: 0.13, pan: 0.3, panTo: 0 })
    // Vệt sao (3.05) → warp (3.3) → tàu thu thành điểm sáng, loé (3.4)
    k.tone(3.05, 300, { gain: 0.06, a: 0.35, r: 0.15, to: 2600, glide: 0.45, vib: [14, 30], wet: 0.5 })
    k.noise(3.15, { f: 400, to: 5000, q: 4, gain: 0.07, a: 0.3, r: 0.12, pan: -0.5, panTo: 0.5 })
    if (!lite) k.pad(3.3, [392, 587.3], { gain: 0.035, a: 0.12, r: 0.5, lp: 1800, wet: 0.6 })
    k.chime(3.4, 3136, { gain: 0.05, r: 0.6 })
    k.tone(3.4, 2400, { gain: 0.035, a: 0.003, r: 0.25, to: 1200, wet: 0.5 })
    // Điểm sáng xa (3.95): ngân cao sáng dần, không gian co lại
    k.tone(3.95, 1800, { gain: 0.025, a: 0.33, r: 0.03, to: 2700, glide: 0.35, vib: [9, 18], wet: 0.5, pan: -0.5 })
    k.tone(3.95, 80, { gain: 0.05, a: 0.33, r: 0.03, to: 170, glide: 0.35, vib: [7, 40], pan: -0.5 })
    // Tàu lao về (4.3): loé + warp ngược, động cơ hãm dần
    k.noise(4.3, { type: 'highpass', f: 2400, gain: 0.08, a: 0.002, r: 0.12, pan: -0.5 })
    k.tone(4.3, 2400, { gain: 0.05, a: 0.02, r: 0.32, to: 280, glide: 0.34, vib: [14, 30], wet: 0.4, pan: -0.5, panTo: -0.2 })
    k.whoosh(4.3, 0.45, { f: 3200, to: 500, q: 1.2, gain: 0.13, pan: -0.5, panTo: -0.2 })
    k.tone(4.4, 160, { type: 'sawtooth', gain: 0.05, a: 0.02, r: 0.45, to: 55, glide: 0.45, lp: 600, pan: -0.3 })
    // Lơ lửng (4.8): thruster bật lại, thổi bụi, vòng năng lượng
    k.noise(4.8, { type: 'lowpass', f: 900, gain: 0.07, a: 0.05, hold: 0.2, r: 0.12, pan: -0.3 })
    k.tone(4.8, 75, { type: 'sawtooth', gain: 0.04, a: 0.05, hold: 0.2, r: 0.1, lp: 400, pan: -0.3 })
    k.whoosh(4.95, 0.3, { f: 500, to: 1100, gain: 0.03, pan: -0.3 })
    // Chạm đất (5.1): nặng mà mềm + tiếng cơ khí, động cơ lịm dần
    k.tone(5.1, 110, { gain: 0.22, a: 0.003, r: 0.25, to: 55, glide: 0.15 })
    k.noise(5.1, { f: 650, q: 1.5, gain: 0.08, a: 0.002, r: 0.1, pan: -0.3 })
    k.noise(5.12, { type: 'lowpass', f: 1400, to: 200, gain: 0.06, a: 0.02, r: 0.35, pan: -0.3 })
    k.click(5.2, { gain: 0.06, f: 2200, pan: -0.3 })
    // Mở cửa (5.25), gấu bước ra lảo đảo
    k.hiss(5.25, 0.3, { gain: 0.06, pan: -0.3 })
    k.tone(5.45, 200, { type: 'triangle', gain: 0.04, a: 0.003, r: 0.06, to: 150, pan: -0.15 })
    k.tone(5.62, 180, { type: 'triangle', gain: 0.04, a: 0.003, r: 0.06, to: 140 })
    // Vẫy tay — chuông thành công (5.9); tàu tan thành bụi sao, hút về một điểm, loé (6.4)
    ;[1046.5, 1318.5, 1568].forEach((f, i) => k.tone(5.9 + i * 0.07, f, { type: 'triangle', gain: 0.045, a: 0.004, r: 0.28, wet: 0.3 }))
    k.sparkles(5.97, 0.35, lite ? 3 : 6, { scale: PENTA, gain: 0.016, r: 0.35 })
    k.tone(5.97, 900, { gain: 0.02, a: 0.4, r: 0.03, to: 2400, glide: 0.43, wet: 0.5, pan: -0.3 })
    k.chime(6.4, 2637, { gain: 0.04, r: 0.5, pan: -0.3 })
    // Ngôi sao nhỏ rơi xuống (6.45), tắt (6.85)
    k.tone(6.45, 3136, { gain: 0.02, a: 0.01, r: 0.3, to: 2093, glide: 0.3, wet: 0.5, pan: 0.3 })
    if (!lite) k.chime(6.85, 3520, { gain: 0.022, r: 0.4, pan: 0.3 })
  },

  // ---------- Ngân Hà (7.4s): hiện tượng vũ trụ — rộng, sâu, nhiều lớp, vang dài; cao trào Galaxy Burst ----------
  'galaxy-descent': (k, lite) => {
    // 0–0.9 nhắm mắt nạp năng lượng: ù vũ trụ rất thấp, tăng dần
    k.drone(0, 1.5, [55, 82.4], { gain: 0.09, a: 0.9, r: 0.5, vib: [0.6, 6], wet: 0.6 })
    k.noise(0, { type: 'lowpass', f: 260, to: 900, gain: 0.04, a: 0.9, r: 0.3, wet: 0.5 })
    // 0.9–1.3 bay lên trong cột sáng
    k.whoosh(0.9, 0.4, { f: 400, to: 2400, gain: 0.09, wet: 0.4 })
    k.pad(0.95, [220, 329.6, 440], { gain: 0.035, a: 0.3, r: 0.4, lp: 1400, wet: 0.7 })
    // 1.3–1.6 TAN thành bụi sao, bị hút vào ngân hà: WOOOSH kéo vào trong rồi tắt cực nhanh
    k.noise(1.25, { f: 300, to: 5200, q: 1.3, gain: 0.2, a: 0.3, r: 0.07, wet: 0.7 })
    k.tone(1.28, 220, { type: 'triangle', gain: 0.04, a: 0.27, r: 0.05, to: 1760, glide: 0.32, wet: 0.5 })
    if (!lite) for (let i = 0; i < 6; i++) k.chime(1.3 + i * 0.045, 1568 * 1.12 ** i, { gain: 0.016, r: 0.35, wet: 0.7 })
    // 1.45–3.8 thế giới khác: nền vũ trụ sâu, kết cấu xa xăm, vệt sao
    k.pad(1.45, [110, 164.8, 220, 246.9, 329.6], { gain: 0.06, a: 0.7, hold: 1.3, r: 0.5, lp: 700, lpTo: 1300, wet: 0.8 })
    k.noise(1.5, { f: 500, to: 1500, q: 3, gain: 0.025, a: 0.9, r: 1.2, pan: -0.6, panTo: 0.6, wet: 0.6 })
    if (!lite) for (const [t, p] of [[1.7, -0.6], [2.05, 0.6], [2.5, -0.3]]) k.whoosh(t, 0.3, { f: 3000, to: 6500, q: 3, gain: 0.025, pan: p, panTo: -p, wet: 0.6 })
    // Bụi sao kết thành CHÒM SAO GẤU TRÚC: mỗi ngôi sao nối nét một tiếng chuông, đi lên
    const stars = lite ? 7 : 12
    for (let i = 0; i < stars; i++) k.chime(2.0 + (i / stars) * 1.0, PENTA[i % PENTA.length] * (i >= PENTA.length ? 1.5 : 1) * 0.5, { gain: 0.022, r: 0.9, pan: rand(-0.6, 0.6), wet: 0.8 })
    // Chòm sao nháy mắt
    k.chime(3.12, 3136, { gain: 0.025, r: 0.5 })
    k.chime(3.2, 3520, { gain: 0.02, r: 0.5 })
    // 3.35–3.8 chòm sao hút vào lõi: nạp năng lượng ngắn trong cổng
    k.riser(3.35, 0.45, { f: 300, to: 6000, gain: 0.1, pitch: [196, 1568], wet: 0.4 })
    // 3.8 SIÊU TÂN TINH: cosmic burst, cột sáng giáng xuống, gấu hiện lại trong trạng thái mới
    k.tone(3.8, 75, { gain: 0.35, a: 0.004, r: 0.9, to: 32, glide: 0.6 })
    k.noise(3.8, { type: 'lowpass', f: 5000, to: 300, gain: 0.2, a: 0.004, r: 0.8, wet: 0.7 })
    k.pad(3.8, [110, 138.6, 164.8, 220, 277.2, 440], { gain: 0.06, a: 0.02, hold: 0.3, r: 1.0, lp: 3000, lpTo: 900, wet: 0.8 })
    k.whoosh(3.82, 0.6, { f: 5000, to: 500, q: 1.2, gain: 0.08, wet: 0.5 })
    // 4.5 đáp đất: bass impact nhẹ + sao toả khắp sân
    k.tone(4.5, 90, { gain: 0.3, a: 0.003, r: 0.4, to: 38, glide: 0.25 })
    k.noise(4.5, { type: 'lowpass', f: 1200, to: 150, gain: 0.1, a: 0.003, r: 0.4 })
    k.sparkles(4.52, 0.35, lite ? 3 : 6, { scale: PENTA, gain: 0.022 })
    // 4.65 giơ tay điều khiển · 5.0–5.55 ngân hà xoáy co lại thành một điểm (xoáy trái ↔ phải, cao dần)
    k.whoosh(4.65, 0.35, { f: 700, to: 1800, gain: 0.05, wet: 0.4 })
    k.noise(5.0, { f: 300, to: 6500, q: 2.2, gain: 0.12, a: 0.5, r: 0.04, pan: -0.7, panTo: 0.7, wet: 0.4 })
    k.drone(5.0, 0.55, [110, 165], { type: 'triangle', gain: 0.06, a: 0.5, r: 0.04, to: 4, vib: [10, 20], wet: 0.3 })
    // 5.55–5.75 im lặng tuyệt đối → 5.75 GALAXY BURST: sâu nhất, rộng nhất, vang dài
    k.boom(5.75, { gain: 0.95, sub: [70, 24], r: 1.5, bright: 4200, wet: 0.8, crackle: lite ? 4 : 10 })
    k.noise(5.75, { type: 'highpass', f: 1200, to: 8000, gain: 0.08, a: 0.004, r: 0.5, pan: -0.8, wet: 0.6 })
    k.noise(5.75, { type: 'highpass', f: 1400, to: 9000, gain: 0.08, a: 0.004, r: 0.5, pan: 0.8, wet: 0.6 })
    k.pad(5.76, [110, 164.8, 220, 277.2, 329.6, 440, 554.4], { gain: 0.08, a: 0.02, hold: 0.35, r: 1.2, lp: 4500, lpTo: 800, wet: 0.9 })
    k.sparkles(5.9, 0.85, lite ? 7 : 14, { scale: PENTA, gain: 0.024, r: 0.55, descend: true })
    // 6.6 ngân hà mini hiện trên tay: ánh lấp lánh khẽ
    ;[2093, 2637, 3136, 4186].forEach((f, i) => k.chime(6.6 + i * 0.06, f, { gain: 0.02, r: 0.5, wet: 0.7 }))
  },
}

// ===== Phát / dừng =====
// Trả "vé" của lần diễn này; stopActSound(vé) chỉ dừng đúng lần đó (gấu góc màn hình và phòng thử đồ không tắt nhầm của nhau)
export function playActSound(id, { lite = false } = {}) {
  const script = SCRIPTS[id]
  if (!script || !getSettings().soundEffects || !audio()) return null
  stopActSound(current)
  const bus = ctx.createGain()
  bus.connect(out)
  const send = ctx.createGain()
  send.connect(verb)
  const run = { bus, send, sources: [], end: 0 }
  current = run
  const startedAt = performance.now()
  const go = () => {
    if (current !== run) return
    // Trình duyệt mở tiếng trễ → lùi mốc 0 cho tiếng vẫn khớp hình (mốc đã qua thì bỏ)
    script(kit(run, ctx.currentTime + 0.01 - (performance.now() - startedAt) / 1000), lite)
    clearTimeout(sleepTimer)
    sleepTimer = setTimeout(() => {
      if (current === run) current = null
      if (!current) ctx.suspend?.()?.catch?.(() => {})
    }, Math.max(0, run.end - ctx.currentTime + 0.6) * 1000)
  }
  if (ctx.state === 'running') go()
  else ctx.resume().then(go, () => {})
  return run
}

export function stopActSound(run) {
  if (!run || run !== current || !ctx) return
  current = null
  const now = ctx.currentTime
  for (const g of [run.bus, run.send]) {
    g.gain.cancelScheduledValues(now)
    g.gain.setValueAtTime(g.gain.value, now)
    g.gain.linearRampToValueAtTime(0, now + 0.06)
  }
  for (const s of run.sources)
    try {
      s.stop(now + 0.08)
    } catch {
      // nguồn đã dừng
    }
  setTimeout(() => {
    run.bus.disconnect()
    run.send.disconnect()
  }, 200)
}

// Tắt "Hiệu ứng âm thanh" hoặc ra nền: im ngay
subscribeSettings((s) => {
  if (!s.soundEffects) stopActSound(current)
})
if (typeof document !== 'undefined')
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stopActSound(current)
  })
