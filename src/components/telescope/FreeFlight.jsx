import { useEffect, useRef, useState } from 'react'
import Icon from '../Icon.jsx'
import { buildWorld, coinSpots, ENGINE, hasFlightCoins, SHIP_SCALE, escapeSpeed, gravity, heatLevel, predict, startShip, step, strongest, V_MAX } from '../../lib/flight.js'
import { collectFlightCoins, economyChanged, fetchFlightCoins } from '../../lib/pandaShop.js'
import { leaveLandscape, PHONE, PHONE_PORTRAIT } from '../../lib/landscape.js'
import '../../styles/flight.css'

// Bay tự do trong một hệ sao đã mở (Kính thiên văn, SpaceExplorer). Vật lý ở lib/flight.js.
// Vẽ bằng một canvas (vòng rAF, vị trí giữ trong ref, không setState mỗi khung hình); HUD cập nhật ~8 lần/giây.
// Điều khiển: núm kéo nổi (chạm đâu ở vùng trái dưới thì núm hiện ở đó) chọn hướng; thanh tốc độ bên phải (vuốt) chọn
// vận tốc mong muốn — động cơ có giới hạn nên sát sao có thể không đủ sức. Động cơ chỉ chạy khi giữ nút "Duy trì"
// (hoặc đang vuốt thanh); nhả ra thì quán tính giảm dần, lực hút bẻ cong đường bay. Máy tính: mũi tên / WASD, phím + −, giữ Space, lăn chuột
// để phóng to, Esc để về. Điện thoại dọc: màn che "Xoay ngang" + tạm dừng (lib/landscape.js). Xu: (ngưỡng Sao × 5) đồng mỗi hệ, nhặt lần đầu được Xu thật (RPC collect_flight_coins).
// Kết thúc: chạm vùng nóng của sao / va hành tinh (tự về), hoặc bấm "Về hệ sao" → onExit({ reason, name, coins }).
const STICK = 52 // bán kính núm (px)
const END_MS = 1500
const ZOOM_MIN = 0.45
const ZOOM_MAX = 2.2
const fmt = (n) => Math.round(n)

// music: { on, toggle } — nút nhạc nền (null khi tắt "Nhạc nền" trong Cài đặt)
export default function FreeFlight({ placeId, placeName, color, panda, music, onExit }) {
  const canvasRef = useRef(null)
  const input = useRef({ aim: null, speed: 0, hold: false, keys: new Set() })
  const sim = useRef(null)
  const zoom = useRef(1)
  const [hud, setHud] = useState(null)
  const [speed, setSpeedState] = useState(0)
  const [holding, setHolding] = useState(false)
  const [portrait, setPortrait] = useState(() => window.matchMedia(PHONE_PORTRAIT).matches)
  const paused = useRef(portrait)
  const [dashOpen, setDashOpen] = useState(() => !window.matchMedia(PHONE).matches) // điện thoại: đồng hồ thu gọn ở góc
  const [stick, setStick] = useState(null) // { x, y, kx, ky } vị trí núm trên màn hình
  const [end, setEnd] = useState(null) // { reason, name }
  const [coinInfo, setCoinInfo] = useState(null) // { total, got } — null: đang tải / gia sư
  const exitRef = useRef(onExit)
  exitRef.current = onExit
  const setSpeed = (v) => {
    const n = Math.round(Math.max(0, Math.min(V_MAX, v)))
    input.current.speed = n
    setSpeedState(n)
  }
  // Động cơ chạy khi còn ít nhất một nguồn giữ: nút "Duy trì", ngón tay trên thanh tốc độ, phím Space
  const holds = useRef(new Set())
  const setHold = (src, on) => {
    if (on) holds.current.add(src)
    else holds.current.delete(src)
    const h = holds.current.size > 0
    input.current.hold = h
    setHolding(h)
  }

  // Xu: tải các đồng đã nhặt, gửi đồng mới nhặt lên máy chủ theo lô (chậm 0,8 s), gửi nốt khi rời màn bay
  const pending = useRef(new Set())
  const flushTimer = useRef(0)
  const gotThisFlight = useRef(0)
  const flush = () => {
    clearTimeout(flushTimer.current)
    if (!pending.current.size) return
    const list = [...pending.current]
    pending.current.clear()
    collectFlightCoins(placeId, list)
      .then(() => economyChanged())
      .catch(() => list.forEach((i) => pending.current.add(i))) // lỗi mạng: thử lại ở lần gửi sau
  }
  const flushRef = useRef(flush)
  flushRef.current = flush

  // Điện thoại dọc: tạm dừng, nhả hết nút giữ; rời màn bay thì trả lại xoay tự do + thoát toàn màn hình
  useEffect(() => {
    const mq = window.matchMedia(PHONE_PORTRAIT)
    const on = () => {
      paused.current = mq.matches
      setPortrait(mq.matches)
      if (mq.matches) {
        holds.current.clear()
        input.current.hold = false
        setHolding(false)
      }
    }
    mq.addEventListener('change', on)
    return () => {
      mq.removeEventListener('change', on)
      leaveLandscape()
    }
  }, [])

  // Mô phỏng + vẽ
  useEffect(() => {
    const world = buildWorld(placeId)
    const cv = canvasRef.current
    if (!world || !cv) return
    const ctx = cv.getContext('2d')
    const ship = startShip(world)
    const s = { world, ship, t: 0, trail: [], end: null, endAt: 0, path: null, pathAt: -1, pops: [], toast: null, outside: false, wallAt: -1e9, coinTotal: 0, coinLeft: 0 }
    sim.current = s
    setSpeed(Math.hypot(ship.vx, ship.vy))
    let W = 0
    let H = 0
    let base = 1
    const resize = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1)
      W = cv.clientWidth
      H = cv.clientHeight
      cv.width = Math.round(W * dpr)
      cv.height = Math.round(H * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      base = Math.min(W, H) / 560 // px trên mỗi đv ở zoom 1: điện thoại dọc thấy khoảng nửa hệ
    }
    resize()
    // Theo dõi chính canvas: iOS báo resize trước khi xoay xong → đo theo window thì hình bị bẹt
    const ro = new ResizeObserver(resize)
    ro.observe(cv)
    const toast = (text, now, ms = 4000) => (s.toast = { text, until: now + ms })

    let last = performance.now()
    let hudAt = 0
    let raf = 0
    const frame = (now) => {
      raf = requestAnimationFrame(frame)
      const dt = (now - last) / 1000
      last = now
      if (!s.end && !paused.current) {
        const r = step(world, ship, input.current, s.t, dt)
        s.t = r.t
        for (const i of r.coins) {
          pending.current.add(i)
          gotThisFlight.current++
          s.coinLeft--
          s.pops.push({ x: ship.x, y: ship.y, at: now })
          clearTimeout(flushTimer.current)
          flushTimer.current = setTimeout(() => flushRef.current(), 800)
          setCoinInfo((c) => c && { ...c, got: c.got + 1 })
          if (s.coinTotal && s.coinLeft === 0) toast(`Nhặt hết ${s.coinTotal} Xu ở ${placeName} rồi! Giỏi quá!`, now, 5000)
        }
        if (r.hit) {
          s.end = { reason: r.hit.star ? 'heat' : 'planet', body: r.hit, name: r.hit.name }
          s.endAt = now
          setEnd({ reason: s.end.reason, name: s.end.name })
        }
        if (r.wall && now - s.wallAt > 5000) toast('Hết vùng bay rồi, không ra xa hơn được nữa! Quay mũi tàu về hệ sao nhé.', now)
        if (r.wall) s.wallAt = now
        const outside = Math.hypot(ship.x, ship.y) > world.edge
        if (outside !== s.outside) {
          s.outside = outside
          toast(
            outside
              ? 'Ra khỏi hệ rồi! Ở đây lực hút rất yếu nên tàu lái nhẹ hẳn: kéo hướng nào đi ngay hướng đó.'
              : `Vào lại ${placeName}: lực hút mạnh dần, tàu lái nặng hơn đấy.`,
            now
          )
        }
        // Dự đoán nặng hơn một bước: tính lại mỗi 1/10 s
        if (now - s.pathAt > 100) {
          s.path = predict(world, ship, input.current, s.t, 5)
          s.pathAt = now
        }
        s.trail.push(ship.x, ship.y)
        if (s.trail.length > 240) s.trail.splice(0, 2)
      } else {
        // Hoạt cảnh kết thúc: tàu xoáy vào tâm thiên thể
        const k = Math.min(1, (now - s.endAt) / END_MS)
        const b = s.end.body
        ship.x += (b.x - ship.x) * Math.min(1, dt * 3)
        ship.y += (b.y - ship.y) * Math.min(1, dt * 3)
        ship.heading += dt * 9
        s.t += dt
        if (k >= 1 && !s.done) {
          s.done = true
          flushRef.current()
          exitRef.current({ reason: s.end.reason, name: s.end.name, coins: gotThisFlight.current })
        }
      }
      draw(ctx, s, W, H, base * zoom.current, color, now)

      if (now - hudAt > 120 && !s.end) {
        hudAt = now
        const v = Math.hypot(ship.vx, ship.vy)
        const heat = heatLevel(world, ship.x, ship.y)
        setHud({
          v,
          need: escapeSpeed(world, ship.x, ship.y),
          g: Math.hypot(...gravity(world, ship.x, ship.y)),
          pull: strongest(world, ship.x, ship.y)?.name,
          heat: heat.level,
          hot: heat.star?.name,
          outside: s.outside,
          hit: s.path?.hit ? { name: s.path.hit.name, star: s.path.hit.star, time: s.path.time } : null,
          toast: s.toast && s.toast.until > now ? s.toast.text : null,
          intro: s.t < 6,
        })
      }
    }
    raf = requestAnimationFrame(frame)

    // Xu chưa nhặt của hệ này (gia sư / lỗi mạng: không có Xu, vẫn bay bình thường)
    let alive = true
    if (hasFlightCoins(placeId))
        fetchFlightCoins(placeId)
        .then(({ total, collected }) => {
          if (!alive || !total) return
          const got = new Set(collected)
          world.coins = coinSpots(world, total).filter((c) => !got.has(c.i))
          s.coinTotal = total
          s.coinLeft = world.coins.length
          setCoinInfo({ total, got: got.size })
        })
        .catch(() => {})

    const wheel = (e) => {
      e.preventDefault()
      zoom.current = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, zoom.current * (1 - e.deltaY * 0.0012)))
    }
    cv.addEventListener('wheel', wheel, { passive: false })
    return () => {
      alive = false
      cancelAnimationFrame(raf)
      ro.disconnect()
      cv.removeEventListener('wheel', wheel)
      flushRef.current()
    }
  }, [placeId, placeName, color])

  // Bàn phím (bắt ở pha capture để Esc không lọt xuống Kính thiên văn)
  useEffect(() => {
    const dirs = { arrowup: [0, -1], w: [0, -1], arrowdown: [0, 1], s: [0, 1], arrowleft: [-1, 0], a: [-1, 0], arrowright: [1, 0], d: [1, 0] }
    const aim = () => {
      let x = 0
      let y = 0
      for (const k of input.current.keys) if (dirs[k]) [x, y] = [x + dirs[k][0], y + dirs[k][1]]
      if (x || y) input.current.aim = Math.atan2(y, x)
    }
    const down = (e) => {
      if (e.key === 'Escape') {
        e.stopImmediatePropagation()
        e.preventDefault()
        if (!sim.current?.end) quit()
        return
      }
      const k = e.key.toLowerCase()
      if (dirs[k]) {
        e.preventDefault()
        input.current.keys.add(k)
        aim()
      } else if (e.code === 'Space') {
        e.preventDefault()
        setHold('key', true)
      } else if (k === '+' || k === '=' || e.code === 'NumpadAdd') {
        e.preventDefault()
        setSpeed(input.current.speed + 20)
      } else if (k === '-' || k === '_' || e.code === 'NumpadSubtract') {
        e.preventDefault()
        setSpeed(input.current.speed - 20)
      }
    }
    const up = (e) => {
      input.current.keys.delete(e.key.toLowerCase())
      if (e.code === 'Space') setHold('key', false)
    }
    const blur = () => {
      input.current.keys.clear()
      holds.current.clear()
      setHold('key', false)
    }
    window.addEventListener('keydown', down, true)
    window.addEventListener('keyup', up, true)
    window.addEventListener('blur', blur)
    return () => {
      window.removeEventListener('keydown', down, true)
      window.removeEventListener('keyup', up, true)
      window.removeEventListener('blur', blur)
    }
  }, [])

  function quit() {
    flushRef.current()
    exitRef.current({ reason: 'quit', coins: gotThisFlight.current })
  }

  // Núm kéo nổi kiểu game điện thoại: chỉ chọn hướng (tốc độ ở thanh bên phải)
  const stickId = useRef(null)
  const stickDown = (e) => {
    if (stickId.current != null) return
    stickId.current = e.pointerId
    e.currentTarget.setPointerCapture(e.pointerId)
    setStick({ x: e.clientX, y: e.clientY, kx: 0, ky: 0 })
  }
  const stickMove = (e) => {
    if (e.pointerId !== stickId.current || !stick) return
    let dx = e.clientX - stick.x
    let dy = e.clientY - stick.y
    const d = Math.hypot(dx, dy)
    if (d > STICK) [dx, dy] = [(dx / d) * STICK, (dy / d) * STICK]
    if (d > 8) input.current.aim = Math.atan2(dy, dx)
    setStick({ ...stick, kx: dx, ky: dy })
  }
  const stickUp = (e) => {
    if (e.pointerId !== stickId.current) return
    stickId.current = null
    setStick(null)
  }

  // Thanh tốc độ: vuốt dọc (trên = nhanh); đang vuốt cũng là đang giữ động cơ
  const trackRef = useRef(null)
  const throttleAt = (e) => {
    const r = trackRef.current.getBoundingClientRect()
    setSpeed(((r.bottom - e.clientY) / r.height) * V_MAX)
  }
  const throttle = {
    onPointerDown: (e) => {
      e.currentTarget.setPointerCapture(e.pointerId)
      throttleAt(e)
      setHold('track', true)
    },
    onPointerMove: (e) => e.currentTarget.hasPointerCapture(e.pointerId) && throttleAt(e),
    onLostPointerCapture: () => setHold('track', false),
  }
  // Nút "Duy trì vận tốc": giữ để động cơ giữ tốc độ đã chọn, nhả ra là tắt máy
  const keep = {
    onPointerDown: (e) => {
      e.currentTarget.setPointerCapture(e.pointerId)
      setHold('btn', true)
    },
    onLostPointerCapture: () => setHold('btn', false),
    onContextMenu: (e) => e.preventDefault(),
  }

  const zoomBy = (k) => (zoom.current = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, zoom.current * k)))

  const say = sayFor(end, hud, coinInfo)
  const danger = !end && hud && ((hud.hit && hud.hit.time < 3.5) || hud.heat > 0.3)
  const pct = (v) => `${Math.min(100, (v / V_MAX) * 100)}%`

  return (
    <div className={`flight${danger ? ' is-danger' : ''}${end ? ` is-end is-${end.reason}` : ''}`} style={{ '--flight-c': color }} role="dialog" aria-label={`Bay tự do: ${placeName}`}>
      <canvas ref={canvasRef} className="flight-canvas" aria-hidden="true" />
      <div className="flight-frame" aria-hidden="true" />
      {portrait && !end && (
        <div className="flight-rotate" role="alert">
          <span className="flight-rotate-phone" aria-hidden="true" />
          <b>Xoay ngang điện thoại để bay</b>
          <small>Tàu đang tạm dừng. Nếu màn hình không xoay, hãy tắt Khoá xoay màn hình của máy.</small>
          <button type="button" className="flight-quit" onClick={quit}>
            ‹ Về hệ sao
          </button>
        </div>
      )}

      <header className="flight-topbar">
        <div className="flight-place">
          <small>{hud?.outside ? 'Ngoài hệ' : 'Đang bay trong'}</small>
          <b>{placeName}</b>
        </div>
        {coinInfo && (
          <div className="flight-coins" aria-label={`Đã nhặt ${coinInfo.got} trên ${coinInfo.total} Xu`}>
            <span className="flight-coin-ico" aria-hidden="true" />
            {coinInfo.got}/{coinInfo.total}
          </div>
        )}
        {music && (
          <button type="button" className="flight-music" onClick={music.toggle} aria-pressed={music.on} aria-label={music.on ? 'Tắt nhạc nền' : 'Bật nhạc nền'} title={music.on ? 'Tắt nhạc nền' : 'Bật nhạc nền'}>
            <Icon name={music.on ? 'pause' : 'resume'} size={16} />
          </button>
        )}
        <button type="button" className="flight-quit" onClick={() => !end && quit()}>
          ‹ Về hệ sao
        </button>
      </header>

      <div className="flight-left">
        <section className={`flight-dash${dashOpen ? '' : ' is-mini'}`} aria-label="Đồng hồ bay">
          <button type="button" className="flight-dash-toggle" onClick={() => setDashOpen((o) => !o)} aria-expanded={dashOpen}>
            {dashOpen ? 'Ẩn' : 'Chi tiết'}
          </button>
          <Gauge v={hud?.v || 0} need={hud?.need || 0} want={speed} />
          {dashOpen && (
            <dl className="flight-read">
              <div>
                <dt>Vận tốc thoát tại đây</dt>
                <dd className={hud && hud.v >= hud.need ? 'is-ok' : ''}>{hud ? fmt(hud.need) : '–'} đv/s</dd>
              </div>
              <div>
                <dt>Lực hút / động cơ</dt>
                <dd className={hud && hud.g > ENGINE && !hud.outside ? 'is-bad' : ''}>
                  {hud ? (hud.g < 10 ? hud.g.toFixed(1).replace('.', ',') : fmt(hud.g)) : '–'} / {ENGINE}
                </dd>
              </div>
              <div className="flight-read-wide">
                <dt>Kéo mạnh nhất</dt>
                <dd>{hud?.pull || '–'}</dd>
              </div>
            </dl>
          )}
          {hud && hud.heat > 0 && (
            <div className="flight-heat">
              <span>Nhiệt độ vỏ tàu</span>
              <span className="flight-heat-bar" aria-hidden="true">
                <i style={{ width: `${hud.heat * 100}%` }} />
              </span>
            </div>
          )}
          {dashOpen && <p className="flight-note">v<sub>thoát</sub> = √(2GM/r) · đơn vị mô phỏng (khoảng cách, tốc độ đã thu nhỏ)</p>}
        </section>

        <div className="flight-copilot">
          <div className="flight-panda" aria-hidden="true">
            {panda}
          </div>
          {say && (
            <p className={`flight-say${danger ? ' is-alert' : ''}`} role="status" key={say}>
              {say}
            </p>
          )}
        </div>
      </div>

      <div className="flight-zoom">
        <button type="button" onClick={() => zoomBy(1.25)} aria-label="Phóng to">
          +
        </button>
        <button type="button" onClick={() => zoomBy(0.8)} aria-label="Thu nhỏ">
          −
        </button>
      </div>

      {!end && (
        <>
          <div className="flight-stick-zone" onPointerDown={stickDown} onPointerMove={stickMove} onPointerUp={stickUp} onPointerCancel={stickUp} aria-label="Kéo để chọn hướng bay">
            {stick ? (
              <span className="flight-stick" style={{ left: stick.x, top: stick.y }}>
                <i style={{ transform: `translate(${stick.kx}px, ${stick.ky}px)` }} />
              </span>
            ) : (
              <span className="flight-stick-hint">
                Kéo để
                <br />
                chọn hướng
              </span>
            )}
          </div>

          <div className="flight-throttle">
            <b>{speed}</b>
            <small>đv/s</small>
            <div
              ref={trackRef}
              className="flight-track"
              role="slider"
              tabIndex={0}
              aria-label="Vận tốc mong muốn"
              aria-valuemin={0}
              aria-valuemax={V_MAX}
              aria-valuenow={speed}
              {...throttle}
            >
              <i className="flight-track-fill" style={{ height: pct(speed) }} />
              {hud && <em className="flight-track-need" style={{ bottom: pct(hud.need) }} title="Vận tốc thoát" />}
              <span className="flight-track-thumb" style={{ bottom: pct(speed) }} />
            </div>
            <small>Tốc độ</small>
          </div>
          <button type="button" className={`flight-keep${holding ? ' is-on' : ''}`} aria-pressed={holding} aria-label="Giữ để duy trì vận tốc" {...keep}>
            Duy trì
          </button>
        </>
      )}
    </div>
  )
}

// Đồng hồ cung tròn: vạch màu = vận tốc thật, vạch đỏ = vận tốc thoát, chấm = vận tốc mong muốn
function Gauge({ v, need, want }) {
  const R = 44
  const ang = (x) => ((210 - 240 * Math.min(1, Math.max(0, x / V_MAX))) * Math.PI) / 180
  const pt = (x, r = R) => [60 + r * Math.cos(ang(x)), 58 - r * Math.sin(ang(x))]
  const arc = (x) => {
    const [x0, y0] = pt(0)
    const [x1, y1] = pt(x)
    return `M${x0} ${y0} A${R} ${R} 0 ${240 * Math.min(1, x / V_MAX) > 180 ? 1 : 0} 1 ${x1} ${y1}`
  }
  const [nx0, ny0] = pt(need, R - 9)
  const [nx1, ny1] = pt(need, R + 7)
  const [wx, wy] = pt(want, R + 10)
  return (
    <svg className="flight-gauge" viewBox="0 0 120 92" aria-hidden="true">
      <path d={arc(V_MAX)} className="flight-gauge-bg" />
      {v > 0.5 && <path d={arc(v)} className={`flight-gauge-val${v >= need ? ' is-ok' : ''}`} />}
      <line x1={nx0} y1={ny0} x2={nx1} y2={ny1} className="flight-gauge-need" />
      <circle cx={wx} cy={wy} r="3.2" className="flight-gauge-want" />
      <text x="60" y="58" className="flight-gauge-num">
        {Math.round(v)}
      </text>
      <text x="60" y="72" className="flight-gauge-unit">
        đv/s
      </text>
    </svg>
  )
}

// Lời gấu lái phụ (ưu tiên: kết thúc → nguy hiểm → lực hút thắng động cơ → thông báo → hướng dẫn lúc đầu)
function sayFor(end, hud, coinInfo) {
  if (end) return end.reason === 'heat' ? `Nóng quá! Tàu áp sát ${end.name}, mình phải quay về ngay!` : `Ối! Tàu va vào ${end.name} rồi, quay về thôi!`
  if (!hud) return null
  if ((hud.hit?.star && hud.hit.time < 3.5) || hud.heat > 0.3) return `Nhiệt độ nóng quá! Mình đang sát ${hud.hot || hud.hit?.name} — mau thoát ra ngoài đi!`
  if (hud.hit && hud.hit.time < 3) return `Cẩn thận! Sắp va vào ${hud.hit.name} — đổi hướng ngay!`
  if (!hud.outside && hud.g > ENGINE && hud.v < hud.need) return `Lực hút của ${hud.pull} mạnh hơn động cơ rồi! Kéo tốc độ lên trên vạch đỏ, giữ Duy trì và lao ra xa!`
  if (hud.toast) return hud.toast
  if (hud.intro)
    return `Mình lái phụ nhé! Kéo núm bên trái để chọn hướng, vuốt thanh bên phải chọn tốc độ, giữ Duy trì để động cơ chạy — nhả ra là tàu trôi chậm dần.${coinInfo && coinInfo.got < coinInfo.total ? ' Xu vàng rải khắp nơi, cả ngoài hệ nữa!' : ''}`
  return null
}

// ---------- Vẽ ----------
function draw(ctx, s, W, H, S, color, now) {
  const { world, ship } = s
  const cx = W / 2
  const cy = H * (W < 600 ? 0.62 : 0.52) // điện thoại dọc: tàu thấp hơn, chừa chỗ cho bảng đồng hồ
  const X = (x) => cx + (x - ship.x) * S
  const Y = (y) => cy + (y - ship.y) * S
  const ox = X(0)
  const oy = Y(0)

  // Nền tối, ám màu của địa điểm quanh tâm hệ
  ctx.fillStyle = '#04020a'
  ctx.fillRect(0, 0, W, H)
  const glow = ctx.createRadialGradient(ox, oy, 0, ox, oy, world.edge * S * 1.3)
  glow.addColorStop(0, hexA(color, 0.26))
  glow.addColorStop(0.55, hexA(color, 0.07))
  glow.addColorStop(1, 'rgba(4,2,10,0)')
  ctx.fillStyle = glow
  ctx.fillRect(0, 0, W, H)

  // Sao nền (thị sai: sao xa trôi chậm)
  for (const st of s.sky || (s.sky = makeSky())) {
    const px = (((st.x - ship.x * S * st.z) % W) + W) % W
    const py = (((st.y - ship.y * S * st.z) % H) + H) % H
    ctx.globalAlpha = st.a
    ctx.fillStyle = st.c
    ctx.fillRect(px, py, st.r, st.r)
  }
  ctx.globalAlpha = 1

  // Viền vùng bay (không qua được) + mép hệ
  ctx.lineWidth = 2
  ctx.strokeStyle = 'rgba(248,113,113,0.45)'
  ctx.setLineDash([2, 10])
  ctx.beginPath()
  ctx.arc(ox, oy, world.wall * S, 0, Math.PI * 2)
  ctx.stroke()
  ctx.lineWidth = 1
  ctx.setLineDash([6, 8])
  ctx.strokeStyle = 'rgba(255,255,255,0.22)'
  ctx.beginPath()
  ctx.arc(ox, oy, world.edge * S, 0, Math.PI * 2)
  ctx.stroke()
  ctx.setLineDash([])

  // Quỹ đạo
  ctx.strokeStyle = 'rgba(255,255,255,0.08)'
  for (const b of world.bodies) {
    if (!b.orbit) continue
    const p = b.orbit.parent
    ctx.beginPath()
    ctx.arc(p ? X(p.x) : ox, p ? Y(p.y) : oy, b.orbit.r * S, 0, Math.PI * 2)
    ctx.stroke()
  }

  // Xu (nhấp nháy nhẹ)
  for (const c of world.coins) {
    const x = X(c.x)
    const y = Y(c.y)
    if (x < -20 || x > W + 20 || y < -20 || y > H + 20) continue
    const r = Math.max(4, 7 * Math.min(1.4, S))
    const sx = Math.abs(Math.cos(now / 600 + c.i)) * 0.7 + 0.3 // xoay quanh trục dọc
    const halo = ctx.createRadialGradient(x, y, 0, x, y, r * 2.6)
    halo.addColorStop(0, 'rgba(253,224,71,0.45)')
    halo.addColorStop(1, 'rgba(253,224,71,0)')
    ctx.fillStyle = halo
    ctx.beginPath()
    ctx.arc(x, y, r * 2.6, 0, Math.PI * 2)
    ctx.fill()
    ctx.save()
    ctx.translate(x, y)
    ctx.scale(sx, 1)
    const g = ctx.createLinearGradient(-r, -r, r, r)
    g.addColorStop(0, '#fff7c2')
    g.addColorStop(0.5, '#facc15')
    g.addColorStop(1, '#b45309')
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.arc(0, 0, r, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = 'rgba(146,64,14,0.8)'
    ctx.lineWidth = 1.2
    ctx.beginPath()
    ctx.arc(0, 0, r * 0.62, 0, Math.PI * 2)
    ctx.stroke()
    ctx.restore()
  }

  // Thiên thể
  ctx.font = '600 11px system-ui, sans-serif'
  ctx.textAlign = 'center'
  for (const b of world.bodies) {
    const x = X(b.x)
    const y = Y(b.y)
    const r = b.radius * S
    const reach = (b.star ? b.heat * 2 : b.radius) * S + 20
    if (x < -reach || x > W + reach || y < -reach || y > H + reach) continue
    const [c0, c1, c2] = b.look.c
    if (b.star) {
      // vùng nóng: quầng đỏ + vòng đứt nét
      const hz = ctx.createRadialGradient(x, y, r, x, y, b.heat * S * 1.7)
      hz.addColorStop(0, 'rgba(255,90,40,0.35)')
      hz.addColorStop(0.55, 'rgba(255,90,40,0.1)')
      hz.addColorStop(1, 'rgba(255,90,40,0)')
      ctx.fillStyle = hz
      ctx.beginPath()
      ctx.arc(x, y, b.heat * S * 1.7, 0, Math.PI * 2)
      ctx.fill()
      ctx.setLineDash([4, 5])
      ctx.strokeStyle = 'rgba(255,120,80,0.55)'
      ctx.beginPath()
      ctx.arc(x, y, b.heat * S, 0, Math.PI * 2)
      ctx.stroke()
      ctx.setLineDash([])
      const g = ctx.createRadialGradient(x, y, 0, x, y, r * 2.2)
      g.addColorStop(0, hexA(c1, 0.6))
      g.addColorStop(1, hexA(c1, 0))
      ctx.fillStyle = g
      ctx.beginPath()
      ctx.arc(x, y, r * 2.2, 0, Math.PI * 2)
      ctx.fill()
    }
    const g = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, r * 0.1, x, y, r)
    g.addColorStop(0, c0)
    g.addColorStop(0.6, c1)
    g.addColorStop(1, c2)
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.arc(x, y, Math.max(2, r), 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = 'rgba(255,255,255,0.7)'
    ctx.fillText(b.name, x, y + Math.max(r, b.star ? b.heat * S : r) + 14)
  }

  // Vệt đã bay
  const tr = s.trail
  if (tr.length > 4) {
    const grad = ctx.createLinearGradient(X(tr[0]), Y(tr[1]), X(ship.x), Y(ship.y))
    grad.addColorStop(0, hexA(color, 0))
    grad.addColorStop(1, hexA(color, 0.6))
    ctx.strokeStyle = grad
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(X(tr[0]), Y(tr[1]))
    for (let i = 2; i < tr.length; i += 2) ctx.lineTo(X(tr[i]), Y(tr[i + 1]))
    ctx.stroke()
  }

  // Đường dự đoán nếu giữ tay lái hiện tại (đỏ khi sắp va)
  if (s.path && !s.end) {
    const { pts, hit } = s.path
    ctx.fillStyle = hit ? '#ff6b6b' : 'rgba(255,255,255,0.75)'
    for (let i = 0; i < pts.length; i += 4) {
      ctx.globalAlpha = 1 - i / pts.length
      ctx.beginPath()
      ctx.arc(X(pts[i]), Y(pts[i + 1]), 1.8, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.globalAlpha = 1
    if (hit) {
      const hx = X(pts[pts.length - 2])
      const hy = Y(pts[pts.length - 1])
      ctx.strokeStyle = '#ff6b6b'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(hx - 6, hy - 6)
      ctx.lineTo(hx + 6, hy + 6)
      ctx.moveTo(hx + 6, hy - 6)
      ctx.lineTo(hx - 6, hy + 6)
      ctx.stroke()
    }
  }

  // "+1 Xu" bay lên khi nhặt
  s.pops = s.pops.filter((p) => now - p.at < 900)
  ctx.font = '700 13px system-ui, sans-serif'
  for (const p of s.pops) {
    const k = (now - p.at) / 900
    ctx.globalAlpha = 1 - k
    ctx.fillStyle = '#fde047'
    ctx.fillText('+1 Xu', X(p.x), Y(p.y) - 22 - k * 26)
  }
  ctx.globalAlpha = 1

  // Tàu
  const shrink = s.end ? Math.max(0, 1 - (now - s.endAt) / 900) : 1
  // Tàu là vật thể trong không gian: phóng to / thu nhỏ thì tàu to / nhỏ theo (cùng tỉ lệ S với hành tinh, Xu)
  if (shrink > 0) drawShip(ctx, X(ship.x), Y(ship.y), ship.heading, shrink * S * SHIP_SCALE, s.end ? 0 : ship.engine, color, now)

  // Bản đồ nhỏ (giữa đáy, giữa núm kéo và thanh tốc độ): cả vùng bay, tàu là chấm trắng
  const mr = Math.min(42, W * 0.105)
  const mx = W / 2
  const my = H - mr - 20
  const k = (mr - 3) / world.wall
  ctx.fillStyle = 'rgba(10,6,24,0.78)'
  ctx.strokeStyle = 'rgba(248,113,113,0.5)'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.arc(mx, my, mr, 0, Math.PI * 2)
  ctx.fill()
  ctx.stroke()
  ctx.strokeStyle = 'rgba(255,255,255,0.25)'
  ctx.beginPath()
  ctx.arc(mx, my, world.edge * k, 0, Math.PI * 2)
  ctx.stroke()
  ctx.fillStyle = 'rgba(253,224,71,0.85)'
  for (const c of world.coins) ctx.fillRect(mx + c.x * k - 0.75, my + c.y * k - 0.75, 1.5, 1.5)
  for (const b of world.bodies) {
    ctx.fillStyle = b.star ? b.look.c[1] : 'rgba(255,255,255,0.5)'
    ctx.beginPath()
    ctx.arc(mx + b.x * k, my + b.y * k, b.star ? 2.6 : 1.2, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.fillStyle = '#fff'
  ctx.beginPath()
  ctx.arc(mx + ship.x * k, my + ship.y * k, 2.4, 0, Math.PI * 2)
  ctx.fill()
}

// Tàu: thân trắng bóng, cánh tím, buồng lái có gấu, lửa đuôi dài theo độ mạnh động cơ
function drawShip(ctx, x, y, heading, scale, engine, color, now) {
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(heading)
  ctx.scale(scale, scale)
  if (engine > 0.03) {
    const f = 8 + engine * 22 + Math.sin(now / 28) * 3
    const fire = ctx.createLinearGradient(-12, 0, -12 - f, 0)
    fire.addColorStop(0, '#fff')
    fire.addColorStop(0.35, '#7dd3fc')
    fire.addColorStop(1, 'rgba(56,189,248,0)')
    ctx.fillStyle = fire
    ctx.beginPath()
    ctx.moveTo(-11, -5)
    ctx.quadraticCurveTo(-12 - f * 0.6, -3, -12 - f, 0)
    ctx.quadraticCurveTo(-12 - f * 0.6, 3, -11, 5)
    ctx.fill()
  }
  // cánh
  ctx.fillStyle = '#a855f7'
  ctx.strokeStyle = '#2a1f3d'
  ctx.lineWidth = 1.1
  for (const sgn of [-1, 1]) {
    ctx.beginPath()
    ctx.moveTo(-2, 5 * sgn)
    ctx.lineTo(-12, 14 * sgn)
    ctx.lineTo(-14, 12 * sgn)
    ctx.lineTo(-10, 4 * sgn)
    ctx.closePath()
    ctx.fill()
    ctx.stroke()
  }
  // thân
  const hull = ctx.createLinearGradient(0, -7, 0, 7)
  hull.addColorStop(0, '#ffffff')
  hull.addColorStop(0.55, '#e2e8f0')
  hull.addColorStop(1, '#94a3b8')
  ctx.fillStyle = hull
  ctx.beginPath()
  ctx.moveTo(18, 0)
  ctx.bezierCurveTo(12, -8, -4, -8, -11, -6)
  ctx.lineTo(-11, 6)
  ctx.bezierCurveTo(-4, 8, 12, 8, 18, 0)
  ctx.closePath()
  ctx.fill()
  ctx.stroke()
  // sọc + mũi màu địa điểm
  ctx.strokeStyle = color
  ctx.lineWidth = 1.6
  ctx.beginPath()
  ctx.moveTo(-6, -5.6)
  ctx.lineTo(-6, 5.6)
  ctx.stroke()
  ctx.fillStyle = '#f472b6'
  ctx.beginPath()
  ctx.moveTo(18, 0)
  ctx.quadraticCurveTo(15, -3.4, 13, -4.2)
  ctx.lineTo(13, 4.2)
  ctx.quadraticCurveTo(15, 3.4, 18, 0)
  ctx.fill()
  // buồng lái + gấu
  ctx.fillStyle = '#0e7490'
  ctx.strokeStyle = '#cbd5e1'
  ctx.lineWidth = 1.2
  ctx.beginPath()
  ctx.arc(5, 0, 4.4, 0, Math.PI * 2)
  ctx.fill()
  ctx.stroke()
  ctx.fillStyle = '#2a1f3d'
  ctx.beginPath()
  ctx.arc(3.2, -2.6, 1.3, 0, Math.PI * 2)
  ctx.arc(3.2, 2.6, 1.3, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#fff'
  ctx.beginPath()
  ctx.arc(5.4, 0, 2.6, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#2a1f3d'
  ctx.beginPath()
  ctx.arc(6, -0.9, 0.55, 0, Math.PI * 2)
  ctx.arc(6, 0.9, 0.55, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

function makeSky() {
  return Array.from({ length: 170 }, (_, i) => ({
    x: (i * 7919) % 2000,
    y: (i * 6271) % 2000,
    z: 0.05 + ((i * 37) % 10) / 50,
    a: 0.25 + ((i * 13) % 10) / 15,
    r: i % 7 === 0 ? 2 : 1,
    c: i % 11 === 0 ? '#c4b5fd' : i % 13 === 0 ? '#fde68a' : '#fff',
  }))
}

// '#rrggbb' + độ mờ → rgba()
function hexA(hex, a) {
  const h = hex.replace('#', '')
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16))
  return `rgba(${r},${g},${b},${a})`
}
