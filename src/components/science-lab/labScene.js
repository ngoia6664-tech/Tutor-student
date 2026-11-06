// Căn gác mái dựng bằng Three.js: phòng, đồ vật, ánh sáng và các cú máy (mở cửa, bay đến đồ vật, áp mắt vào kính).
// Cảnh chỉ lo 3D; nút bấm, hộp thoại, âm thanh ở ScienceLab.jsx.
import * as THREE from 'three'
import { buildPanda } from './labPanda.js'
import { createSolarView } from './labSolar.js'

/** @typedef {[number, number, number]} P3 */
/** @typedef {{ id: string, label: string, at: P3, pose?: { path: P3[], pos: P3, look: P3 } }} LabSpot */

// Nhãn đồng + nơi camera dừng khi bấm vào từng món đồ
/** @type {LabSpot[]} */
export const LAB_SPOTS = [
  { id: 'scope', label: 'Kính thiên văn', at: [2.45, 2.72, -2.1] },
  { id: 'shelf', label: 'Giá sách', at: [-4.4, 2.75, -1.6], pose: { path: [[-1.8, 1.65, 1.6]], pos: [-2.7, 1.65, -0.8], look: [-4.6, 1.55, -1.3] } },
  { id: 'board', label: 'Bảng đen', at: [-0.2, 3.28, -3.9], pose: { path: [[0.1, 1.66, 1.2]], pos: [0.6, 1.95, -0.2], look: [0.6, 2.15, -4] } },
  { id: 'cabinet', label: 'Tủ mẫu vật', at: [4.4, 2.2, -2.9], pose: { path: [[2.3, 1.7, 1.4]], pos: [3.0, 1.95, -1.4], look: [4.6, 1.4, -2.9] } },
  { id: 'clock', label: 'Đồng hồ quả lắc', at: [4.35, 3.05, -1.2], pose: { path: [[1.9, 1.7, 1.6]], pos: [2.75, 1.8, -0.9], look: [4.7, 1.75, -1.2] } },
  { id: 'desk', label: 'Bình thí nghiệm', at: [-1.15, 1.75, -3.1], pose: { path: [[-1.1, 1.7, 1.2]], pos: [-0.95, 1.5, -1.55], look: [-1.05, 1.15, -3.4] } },
  { id: 'journal', label: 'Sổ tay', at: [-2.35, 1.42, -3.1], pose: { path: [[-1.5, 1.7, 1]], pos: [-2.25, 1.7, -2.05], look: [-2.3, 1.03, -3.25] } },
  { id: 'panda', label: 'Giáo sư Gấu Trúc', at: [1.05, 2.1, -2.85] },
]

const HOME = { pos: new THREE.Vector3(-0.1, 1.66, 4.15), look: new THREE.Vector3(0.05, 1.55, -3) }
const DOOR_MS = 4000 // khớp độ dài file door-creak.mp3
const WOOD_HUES = 26

const easeInOut = (/** @type {number} */ t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)
// Cửa gỗ nặng: nhích chậm ở đầu rồi mới bung, dừng êm ở cuối
const easeDoor = (/** @type {number} */ t) => 0.5 - Math.cos(Math.PI * Math.pow(t, 1.35)) / 2

/**
 * @param {HTMLElement} host thẻ chứa canvas (canvas tạo mới mỗi lần, vì context đã mất không dùng lại được)
 * @param {{ spotEl: (id: string) => HTMLElement | null | undefined, onPick: (id: string) => void }} opts
 */
export function createLabScene(host, { spotEl, onPick }) {
  const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const low = window.innerWidth < 700 || (navigator.hardwareConcurrency || 8) <= 4

  const canvas = document.createElement('canvas')
  canvas.className = 'sci-canvas'
  canvas.setAttribute('aria-hidden', 'true')
  host.appendChild(canvas)

  let renderer
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: !low })
  } catch (err) {
    canvas.remove()
    throw err
  }
  const gl = renderer
  gl.setPixelRatio(Math.min(window.devicePixelRatio, low ? 1.5 : 2))
  gl.shadowMap.enabled = true
  gl.shadowMap.type = low ? THREE.PCFShadowMap : THREE.PCFSoftShadowMap
  // Bóng đèn phòng tính 6 mặt rất nặng: chỉ tính lại khi có vật lớn đổi chỗ (cánh cửa)
  gl.shadowMap.autoUpdate = false
  gl.shadowMap.needsUpdate = true
  gl.toneMapping = THREE.ACESFilmicToneMapping
  gl.toneMappingExposure = 1.15

  const scene = new THREE.Scene()
  scene.background = new THREE.Color(0x05060b)
  scene.fog = new THREE.FogExp2(0x140d0a, 0.03)
  const camera = new THREE.PerspectiveCamera(52, 1, 0.03, 80)
  const V = (/** @type {number} */ x, /** @type {number} */ y, /** @type {number} */ z) => new THREE.Vector3(x, y, z)

  // Số giả ngẫu nhiên cố định để căn phòng lần nào mở cũng giống nhau
  let seed = 7
  /** @param {number} [a] @param {number} [b] */
  const rnd = (a = 1, b) => {
    seed = (seed * 16807) % 2147483647
    const r = seed / 2147483647
    return b === undefined ? r * a : a + r * (b - a)
  }

  /**
   * @param {number} w @param {number} h
   * @param {(g: CanvasRenderingContext2D, w: number, h: number) => void} paint
   * @param {number} [rx] @param {number} [ry]
   */
  function tex(w, h, paint, rx = 1, ry = 1) {
    const c = document.createElement('canvas')
    c.width = w
    c.height = h
    const g = c.getContext('2d')
    if (g) paint(g, w, h)
    const t = new THREE.CanvasTexture(c)
    t.wrapS = t.wrapT = THREE.RepeatWrapping
    t.repeat.set(rx, ry)
    t.colorSpace = THREE.SRGBColorSpace
    t.anisotropy = 4
    return t
  }

  /** Ván gỗ có vân, khe, đinh. @param {CanvasRenderingContext2D} g @param {number} w @param {number} h @param {number} base */
  function planks(g, w, h, base) {
    const n = 7
    const pw = w / n
    for (let i = 0; i < n; i++) {
      g.fillStyle = `hsl(${WOOD_HUES} 42% ${base + rnd(-9, 9)}%)`
      g.fillRect(i * pw, 0, pw, h)
      for (let k = 0; k < 130; k++) {
        g.strokeStyle = `rgba(${rnd() > 0.5 ? '15,8,3' : '205,155,95'},${rnd(0.04, 0.16)})`
        const x = i * pw + rnd(pw)
        g.beginPath()
        g.moveTo(x, rnd(h))
        g.lineTo(x + rnd(-3, 3), rnd(h))
        g.stroke()
      }
      g.fillStyle = 'rgba(0,0,0,.72)'
      g.fillRect(i * pw, 0, 2.5, h)
      g.fillRect(i * pw, rnd(h), pw, 2)
      for (let k = 0; k < 6; k++) {
        g.beginPath()
        g.arc(i * pw + 12, rnd(h), 1.7, 0, 7)
        g.fill()
      }
    }
  }

  const floorMap = tex(1024, 1024, (g, w, h) => planks(g, w, h, 21), 3, 4)
  const oakMap = tex(512, 512, (g, w, h) => planks(g, w, h, 16))
  const plasterMap = tex(512, 512, (g, w, h) => {
    g.fillStyle = '#6d5a44'
    g.fillRect(0, 0, w, h)
    for (let i = 0; i < 2600; i++) {
      g.fillStyle = `rgba(${rnd() > 0.5 ? '30,20,10' : '190,165,125'},${rnd(0.015, 0.05)})`
      g.beginPath()
      g.arc(rnd(w), rnd(h), rnd(1, 14), 0, 7)
      g.fill()
    }
  }, 0.25, 0.25)

  /** @param {THREE.MeshStandardMaterialParameters} o */
  const mat = (o) => new THREE.MeshStandardMaterial(o)
  const M = {
    floor: mat({ map: floorMap, bumpMap: floorMap, bumpScale: 0.02, roughness: 0.78 }),
    oak: mat({ map: oakMap, bumpMap: oakMap, bumpScale: 0.012, roughness: 0.68 }),
    plaster: mat({ map: plasterMap, roughness: 0.95 }),
    brass: mat({ color: 0xc8963d, metalness: 0.92, roughness: 0.3 }),
    iron: mat({ color: 0x25211d, metalness: 0.6, roughness: 0.55 }),
    paper: mat({ color: 0xe8dabb, roughness: 0.9 }),
  }

  /**
   * @param {THREE.BufferGeometry} geo @param {THREE.Material} material
   * @param {number} [x] @param {number} [y] @param {number} [z]
   * @param {THREE.Object3D} [parent] @param {boolean} [shadow]
   */
  function add(geo, material, x = 0, y = 0, z = 0, parent = scene, shadow = true) {
    const m = new THREE.Mesh(geo, material)
    m.position.set(x, y, z)
    m.castShadow = shadow
    m.receiveShadow = true
    parent.add(m)
    return m
  }
  /** @param {number} w @param {number} h @param {number} d @param {THREE.Material} m @param {number} x @param {number} y @param {number} z @param {THREE.Object3D} [p] */
  const box = (w, h, d, m, x, y, z, p) => add(new THREE.BoxGeometry(w, h, d), m, x, y, z, p)
  /** @param {number} r1 @param {number} r2 @param {number} h @param {THREE.Material} m @param {number} x @param {number} y @param {number} z @param {THREE.Object3D} [p] @param {number} [seg] */
  const cyl = (r1, r2, h, m, x, y, z, p, seg = 24) => add(new THREE.CylinderGeometry(r1, r2, h, seg), m, x, y, z, p)
  /** @param {number} r @param {THREE.Material} m @param {number} x @param {number} y @param {number} z @param {THREE.Object3D} [p] */
  const ball = (r, m, x, y, z, p) => add(new THREE.SphereGeometry(r, 32, 22), m, x, y, z, p)
  /** Nhóm đồ vật bấm được. @param {string} spot @param {number} x @param {number} y @param {number} z */
  function item(spot, x = 0, y = 0, z = 0) {
    const g = new THREE.Group()
    g.position.set(x, y, z)
    g.userData.spot = spot
    scene.add(g)
    return g
  }

  // ------- Vỏ phòng: rộng 10m, sâu 8.5m, cao 4.4m -------
  const floor = add(new THREE.PlaneGeometry(10, 14), M.floor, 0, 0, 2.5, scene, false)
  floor.rotation.x = -Math.PI / 2
  /** Tường có khoét lỗ. @param {number} z @param {(h: THREE.Path) => void} cut */
  function wall(z, cut) {
    const s = new THREE.Shape()
    s.moveTo(-5, 0)
    s.lineTo(5, 0)
    s.lineTo(5, 4.4)
    s.lineTo(-5, 4.4)
    s.closePath()
    const h = new THREE.Path()
    cut(h)
    s.holes.push(h)
    add(new THREE.ExtrudeGeometry(s, { depth: 0.3, bevelEnabled: false }), M.plaster, 0, 0, z)
  }
  wall(-4.3, (h) => {
    h.moveTo(1.3, 1.1)
    h.lineTo(3.7, 1.1)
    h.lineTo(3.7, 2.5)
    h.absarc(2.5, 2.5, 1.2, 0, Math.PI, false)
    h.lineTo(1.3, 1.1)
  })
  wall(4.5, (h) => {
    h.moveTo(-0.85, 0.001)
    h.lineTo(0.85, 0.001)
    h.lineTo(0.85, 2.7)
    h.lineTo(-0.85, 2.7)
    h.lineTo(-0.85, 0.001)
  })
  box(0.3, 4.4, 9.1, M.plaster, -5.15, 2.2, 0.1)
  box(0.3, 4.4, 9.1, M.plaster, 5.15, 2.2, 0.1)
  box(10.6, 0.3, 9.1, M.oak, 0, 4.55, 0.1)
  for (let z = -3.4; z < 4.4; z += 1.55) box(10, 0.24, 0.3, M.oak, 0, 4.26, z)
  ;[-4.82, 4.82].forEach((x) => [-3.85, 4.35].forEach((z) => box(0.3, 4.2, 0.3, M.oak, x, 2.1, z)))
  box(10, 0.2, 0.08, M.oak, 0, 0.1, -3.96)

  // Cửa vòm: bầu trời đêm là tấm nền đặt ngoài tường
  const stars = tex(1024, 768, (g, w, h) => {
    const sky = g.createLinearGradient(0, 0, 0, h)
    sky.addColorStop(0, '#060b24')
    sky.addColorStop(1, '#1d2d55')
    g.fillStyle = sky
    g.fillRect(0, 0, w, h)
    for (let i = 0; i < 620; i++) {
      g.fillStyle = `rgba(235,240,255,${rnd(0.25, 1)})`
      g.beginPath()
      g.arc(rnd(w), rnd(h), rnd(0.4, 1.6), 0, 7)
      g.fill()
    }
    g.fillStyle = '#f6efd8'
    g.shadowColor = '#cfe0ff'
    g.shadowBlur = 50
    g.beginPath()
    g.arc(w * 0.62, h * 0.3, 44, 0, 7)
    g.fill()
  })
  add(new THREE.PlaneGeometry(13, 9), new THREE.MeshBasicMaterial({ map: stars, fog: false }), 2.5, 3, -7, scene, false)
  add(new THREE.TorusGeometry(1.2, 0.06, 10, 40, Math.PI), M.brass, 2.5, 2.5, -4.08)
  box(0.1, 2.65, 0.06, M.brass, 2.5, 2.38, -4.08)
  box(2.4, 0.07, 0.06, M.brass, 2.5, 2.3, -4.08)
  box(2.7, 0.1, 0.36, M.oak, 2.5, 1.06, -4)
  ;[1.3, 3.7].forEach((x) => box(0.1, 1.4, 0.08, M.brass, x, 1.8, -4.08))

  // ------- Kính thiên văn -------
  const tubeDir = V(0.08, 0.42, -1).normalize()
  const scopeItem = item('scope')
  const scope = new THREE.Group()
  scope.position.set(2.5, 1.55, -2.2)
  scopeItem.add(scope)
  scope.lookAt(scope.position.clone().add(tubeDir))
  /** @param {number} r1 @param {number} r2 @param {number} len @param {number} z @param {THREE.Material} m */
  function tube(r1, r2, len, z, m) {
    const c = cyl(r1, r2, len, m, 0, 0, z, scope, 36)
    c.rotation.x = Math.PI / 2
    return c
  }
  tube(0.13, 0.1, 1.5, 0.25, M.brass)
  tube(0.16, 0.16, 0.32, 1.05, M.brass)
  tube(0.17, 0.17, 0.05, 0.78, M.iron)
  tube(0.17, 0.17, 0.04, 1.2, M.iron)
  tube(0.1, 0.1, 0.05, -0.48, M.iron)
  tube(0.055, 0.055, 0.24, -0.6, M.brass)
  tube(0.075, 0.065, 0.08, -0.74, M.iron)
  tube(0.03, 0.03, 0.01, -0.785, mat({ color: 0x223a6a, metalness: 0.9, roughness: 0.05 }))
  ball(0.1, M.iron, 0, -0.15, 0.1, scope)
  ;[0, 2.09, 4.19].forEach((a) => {
    const leg = cyl(0.03, 0.045, 1.75, M.oak, 2.5 + Math.cos(a) * 0.36, 0.72, -2.2 + Math.sin(a) * 0.36, scopeItem)
    leg.rotation.z = -Math.cos(a) * 0.42
    leg.rotation.x = Math.sin(a) * 0.42
  })
  cyl(0.13, 0.13, 0.08, M.brass, 2.5, 1.4, -2.2, scopeItem)
  scene.updateMatrixWorld(true)
  const eye = scope.localToWorld(V(0, 0, -0.8))
  const scopeStart = eye.clone().addScaledVector(tubeDir, -1.25)

  // ------- Giá sách bên trái -------
  const shelf = item('shelf', -4.72, 0, -1.3)
  box(0.5, 3.5, 0.08, M.oak, 0, 1.75, -1.75, shelf)
  box(0.5, 3.5, 0.08, M.oak, 0, 1.75, 1.75, shelf)
  box(0.05, 3.5, 3.5, M.oak, -0.23, 1.75, 0, shelf)
  const levels = [0.2, 0.86, 1.52, 2.18, 2.84, 3.46]
  levels.forEach((y) => box(0.5, 0.06, 3.5, M.oak, 0, y, 0, shelf))
  const palette = [0x6b2a22, 0x20402f, 0x263a5c, 0x7a5a2c, 0x4a2a44, 0x8a7a55, 0x2c2622]
  const books = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), mat({ roughness: 0.72 }), 170)
  books.castShadow = true
  books.receiveShadow = true
  shelf.add(books)
  {
    const o = new THREE.Object3D()
    let n = 0
    levels.slice(0, 5).forEach((y) => {
      let z = -1.66
      while (z < 1.62 && n < 170) {
        const t = rnd(0.05, 0.12)
        const h = rnd(0.34, 0.52)
        if (rnd() < 0.07) {
          z += 0.22
          continue
        }
        o.position.set(0.02, y + 0.03 + h / 2, z + t / 2)
        o.scale.set(rnd(0.28, 0.36), h, t)
        o.rotation.x = rnd() < 0.08 ? 0.1 : 0
        o.updateMatrix()
        books.setMatrixAt(n, o.matrix)
        books.setColorAt(n, new THREE.Color(palette[Math.floor(rnd(palette.length))]))
        n++
        z += t + 0.004
      }
    })
    books.count = n
  }

  // ------- Bảng đen công thức -------
  const boardItem = item('board', -0.2, 2.25, -3.97)
  box(2.36, 1.5, 0.05, M.oak, 0, 0, -0.01, boardItem)
  const boardTex = tex(1024, 640, (g, w, h) => {
    g.fillStyle = '#1e332b'
    g.fillRect(0, 0, w, h)
    for (let i = 0; i < 120; i++) {
      g.fillStyle = `rgba(220,235,225,${rnd(0.005, 0.03)})`
      g.fillRect(rnd(w), rnd(h), rnd(40, 240), rnd(3, 22))
    }
    g.fillStyle = '#ecefe2'
    g.font = 'italic 62px Georgia, serif'
    g.fillText('F = G m₁m₂ / r²', 56, 112)
    g.fillText('E = mc²', 56, 235)
    g.fillText('λ = c / f', 56, 355)
    g.fillStyle = '#f2d78a'
    g.fillText('T = 2π√(l / g)', 56, 480)
    g.strokeStyle = '#ecefe2'
    g.lineWidth = 3
    g.beginPath()
    g.ellipse(770, 200, 190, 96, -0.25, 0, 7)
    g.stroke()
    g.fillStyle = '#f2d78a'
    g.beginPath()
    g.arc(720, 208, 22, 0, 7)
    g.fill()
    g.fillStyle = '#ecefe2'
    g.beginPath()
    g.arc(920, 138, 11, 0, 7)
    g.fill()
    g.font = 'italic 34px Georgia, serif'
    g.fillText('T² ~ a³', 680, 360)
  })
  add(new THREE.PlaneGeometry(2.2, 1.36), mat({ map: boardTex, roughness: 0.9 }), 0, 0, 0.02, boardItem, false)
  box(2.4, 0.05, 0.1, M.oak, 0, -0.73, 0.04, boardItem)

  // ------- Bàn thí nghiệm: đèn, bình phát sáng, sổ tay -------
  const desk = item('desk', -2.1, 0, -3.35)
  box(3.1, 0.09, 1.25, M.oak, 0, 0.98, 0, desk)
  ;[[-1.45, -0.5], [1.45, -0.5], [-1.45, 0.5], [1.45, 0.5]].forEach(([x, z]) => box(0.11, 0.96, 0.11, M.oak, x, 0.47, z, desk))
  cyl(0.14, 0.17, 0.04, M.brass, -1.05, 1.05, -0.2, desk)
  cyl(0.018, 0.018, 0.55, M.brass, -1.05, 1.32, -0.2, desk)
  cyl(0.08, 0.26, 0.2, mat({ color: 0x1d4633, roughness: 0.4, side: THREE.DoubleSide }), -1.05, 1.62, -0.2, desk)
  ball(0.05, new THREE.MeshBasicMaterial({ color: 0xffe0a0 }), -1.05, 1.54, -0.2, desk).castShadow = false
  const journal = item('journal', -2.1, 0, -3.35)
  box(0.34, 0.025, 0.44, M.paper, -0.2, 1.04, 0.15, journal).rotation.z = 0.04
  box(0.34, 0.025, 0.44, M.paper, 0.15, 1.04, 0.15, journal).rotation.z = -0.04
  box(0.72, 0.02, 0.47, mat({ color: 0x5c2a1c, roughness: 0.6 }), -0.03, 1.03, 0.15, journal)

  const brew = mat({ color: 0x25c98c, emissive: 0x18c07e, emissiveIntensity: 1.1, transparent: true, opacity: 0.84, roughness: 0.1 })
  ball(0.16, brew, 0.85, 1.18, -0.15, desk)
  cyl(0.04, 0.05, 0.22, mat({ color: 0xa8d8d0, transparent: true, opacity: 0.4 }), 0.85, 1.4, -0.15, desk)
  const tubes = [0, 0.12, 0.24].map((d) => {
    const m = mat({ color: 0xf5a524, emissive: 0xf5a524, emissiveIntensity: 0.7 })
    cyl(0.035, 0.035, 0.26, m, 1.1 + d, 1.16, 0.22, desk)
    return m
  })
  box(0.5, 0.03, 0.12, M.oak, 1.22, 1.14, 0.22, desk)
  const brewLight = new THREE.PointLight(0x3fe0a0, 2.2, 3.2, 2)
  brewLight.position.set(-1.25, 1.4, -3.2)
  scene.add(brewLight)

  // ------- Tủ tám ngăn kéo + mô hình Hệ Mặt Trời bằng đồng -------
  const cabinet = item('cabinet', 4.62, 0, -2.9)
  cabinet.rotation.y = -Math.PI / 2
  box(1.5, 1.28, 0.62, M.oak, 0, 0.64, 0, cabinet)
  box(1.6, 0.06, 0.7, M.oak, 0, 1.31, 0, cabinet)
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 2; c++) {
      const x = c ? 0.36 : -0.36
      const y = 0.2 + r * 0.29
      box(0.66, 0.25, 0.03, M.oak, x, y, 0.32, cabinet)
      ball(0.022, M.brass, x, y, 0.345, cabinet)
    }
  }
  const orrery = new THREE.Group()
  orrery.position.set(0, 1.34, 0)
  cabinet.add(orrery)
  cyl(0.16, 0.2, 0.05, M.brass, 0, 0.02, 0, orrery)
  cyl(0.016, 0.016, 0.42, M.brass, 0, 0.23, 0, orrery)
  ball(0.075, mat({ color: 0xffc95e, emissive: 0xff9d2e, emissiveIntensity: 1.2 }), 0, 0.46, 0, orrery)
  const arms = [[0.2, 0x8f8f8f, 0.024, 1.3], [0.31, 0x3b82c4, 0.032, 0.85], [0.42, 0xbb5533, 0.027, 0.55]].map(([r, color, size, speed]) => {
    const arm = new THREE.Group()
    arm.position.y = 0.4
    orrery.add(arm)
    box(r, 0.008, 0.012, M.brass, r / 2, 0, 0, arm)
    ball(size, mat({ color, roughness: 0.5 }), r, 0.025, 0, arm)
    return { arm, speed }
  })

  // ------- Đồng hồ quả lắc -------
  const clock = item('clock', 4.68, 0, -1.2)
  clock.rotation.y = -Math.PI / 2
  box(0.8, 2.85, 0.42, M.oak, 0, 1.42, 0, clock)
  box(0.92, 0.18, 0.5, M.oak, 0, 2.88, 0, clock)
  box(0.56, 1.25, 0.04, mat({ color: 0x0d0805, roughness: 0.5 }), 0, 1.15, 0.21, clock)
  const dial = cyl(0.27, 0.27, 0.03, M.paper, 0, 2.36, 0.22, clock, 40)
  dial.rotation.x = Math.PI / 2
  add(new THREE.TorusGeometry(0.28, 0.025, 10, 40), M.brass, 0, 2.36, 0.23, clock)
  box(0.018, 0.19, 0.012, M.iron, 0.02, 2.42, 0.245, clock)
  box(0.014, 0.25, 0.012, M.iron, -0.06, 2.4, 0.25, clock).rotation.z = 0.6
  const pend = new THREE.Group()
  pend.position.set(0, 1.74, 0.25)
  clock.add(pend)
  box(0.018, 0.86, 0.012, M.brass, 0, -0.43, 0, pend)
  cyl(0.095, 0.095, 0.022, M.brass, 0, -0.88, 0, pend, 32).rotation.x = Math.PI / 2

  // ------- Thảm, quả địa cầu làm tiền cảnh, đèn treo -------
  const rugMap = tex(512, 512, (g, w) => {
    g.fillStyle = '#5a1f1b'
    g.fillRect(0, 0, w, w)
    ;/** @type {[number, string, number][]} */ ([[0.48, '#c49a4b', 7], [0.42, '#1f2a42', 18], [0.27, '#c49a4b', 4]]).forEach(([r, c, lw]) => {
      g.strokeStyle = c
      g.lineWidth = lw
      g.beginPath()
      g.arc(w / 2, w / 2, w * r, 0, 7)
      g.stroke()
    })
  })
  cyl(2.3, 2.3, 0.012, mat({ map: rugMap, roughness: 1 }), -0.2, 0.008, -0.2, scene, 48).castShadow = false
  const globeSpot = V(-2.4, 0, -0.2)
  cyl(0.2, 0.26, 0.05, M.oak, globeSpot.x, 0.03, globeSpot.z)
  cyl(0.03, 0.05, 0.78, M.oak, globeSpot.x, 0.42, globeSpot.z)
  const globeMap = tex(512, 256, (g, w, h) => {
    g.fillStyle = '#23465f'
    g.fillRect(0, 0, w, h)
    g.fillStyle = '#b9a06a'
    for (let i = 0; i < 16; i++) {
      g.beginPath()
      g.ellipse(rnd(w), rnd(40, h - 40), rnd(16, 58), rnd(9, 34), rnd(3), 0, 7)
      g.fill()
    }
  })
  const globe = ball(0.3, mat({ map: globeMap, roughness: 0.45 }), globeSpot.x, 1.1, globeSpot.z)
  const gRing = add(new THREE.TorusGeometry(0.35, 0.014, 8, 44), M.brass, globeSpot.x, 1.1, globeSpot.z)
  gRing.rotation.set(0.4, 1.1, 0)
  // Đèn treo nằm ngay cạnh nguồn sáng: không đổ bóng, kẻo thành mảng đen lớn trên trần
  cyl(0.008, 0.008, 0.85, M.iron, 0, 3.98, 0, scene, 6).castShadow = false
  cyl(0.05, 0.13, 0.09, M.brass, 0, 3.58, 0).castShadow = false
  cyl(0.11, 0.07, 0.05, M.brass, 0, 3.27, 0).castShadow = false
  const lantern = ball(0.13, new THREE.MeshBasicMaterial({ color: 0xffd28a, fog: false }), 0, 3.42, 0)
  lantern.castShadow = false

  // ------- Giáo sư Gấu Trúc đứng cạnh bảng, que chỉ hướng về bảng -------
  const panda = buildPanda()
  panda.group.position.set(1.05, 0, -2.85)
  panda.group.rotation.y = -0.22
  panda.group.scale.setScalar(1.08)
  panda.group.userData.spot = 'panda'
  scene.add(panda.group)

  // ------- Cửa gỗ và hành lang ngoài cửa (chỉ thấy trong cú máy bước vào) -------
  const hinge = new THREE.Group()
  hinge.position.set(-0.85, 0, 4.72)
  scene.add(hinge)
  box(1.7, 2.7, 0.07, M.oak, 0.85, 1.35, 0, hinge)
  ;[0.55, 2.15].forEach((y) => box(0.7, 0.08, 0.1, M.iron, 0.35, y, 0.01, hinge))
  ball(0.05, M.brass, 1.5, 1.2, 0.08, hinge)
  ball(0.05, M.brass, 1.5, 1.2, -0.08, hinge)
  const plaque = tex(512, 128, (g, w, h) => {
    g.fillStyle = '#b98a3a'
    g.fillRect(0, 0, w, h)
    g.strokeStyle = '#5a3d12'
    g.lineWidth = 5
    g.strokeRect(9, 9, w - 18, h - 18)
    g.fillStyle = '#2b1b08'
    g.font = "bold 50px 'Times New Roman', serif"
    g.textAlign = 'center'
    g.textBaseline = 'middle'
    g.fillText('PHÒNG KHOA HỌC', w / 2, h / 2 + 2)
  })
  add(new THREE.PlaneGeometry(0.86, 0.215), mat({ map: plaque, metalness: 0.5, roughness: 0.4 }), 0.85, 1.72, 0.04, hinge, false)
  box(0.22, 2.8, 4.4, M.oak, -1.2, 1.4, 6.95)
  box(0.22, 2.8, 4.4, M.oak, 1.2, 1.4, 6.95)
  box(2.6, 0.2, 4.4, M.oak, 0, 2.9, 6.95)
  box(2.8, 3, 0.2, M.oak, 0, 1.4, 9.1)
  const hallLamp = new THREE.PointLight(0xffb066, 7, 7, 2)
  hallLamp.position.set(0, 2.5, 7.1)
  scene.add(hallLamp)

  // ------- Ánh sáng -------
  const hemi = new THREE.HemisphereLight(0x8a7a70, 0x25160d, 0.75)
  scene.add(hemi)
  const roomLight = new THREE.PointLight(0xffb76b, 42, 16, 1.8)
  roomLight.position.set(0, 3.05, 0)
  roomLight.castShadow = true
  roomLight.shadow.mapSize.set(low ? 512 : 1024, low ? 512 : 1024)
  roomLight.shadow.bias = -0.003
  roomLight.shadow.radius = 5
  scene.add(roomLight)
  const deskLight = new THREE.PointLight(0xffc27c, 9, 7, 2)
  deskLight.position.set(-3.15, 1.45, -3.5)
  scene.add(deskLight)
  const moon = new THREE.DirectionalLight(0x8aa8ee, 0.75)
  moon.position.set(3.1, 6, -8)
  moon.target.position.set(1.6, 0, -0.6)
  moon.castShadow = true
  Object.assign(moon.shadow.camera, { left: -6, right: 6, top: 6, bottom: -6, far: 22 })
  moon.shadow.mapSize.set(low ? 512 : 1024, low ? 512 : 1024)
  moon.shadow.bias = -0.002
  scene.add(moon, moon.target)

  // Bụi lơ lửng trong ánh đèn
  const dustN = low ? 130 : 280
  const dustPos = new Float32Array(dustN * 3)
  for (let i = 0; i < dustN; i++) dustPos.set([rnd(-4.5, 4.5), rnd(0.2, 4), rnd(-3.8, 4)], i * 3)
  const dustGeo = new THREE.BufferGeometry()
  dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3))
  const dustTex = tex(32, 32, (g) => {
    const r = g.createRadialGradient(16, 16, 0, 16, 16, 16)
    r.addColorStop(0, 'rgba(255,225,170,1)')
    r.addColorStop(1, 'rgba(255,225,170,0)')
    g.fillStyle = r
    g.fillRect(0, 0, 32, 32)
  })
  const dust = new THREE.Points(dustGeo, new THREE.PointsMaterial({ map: dustTex, size: 0.035, transparent: true, opacity: 0.75, depthWrite: false, blending: THREE.AdditiveBlending }))
  scene.add(dust)

  const solar = createSolarView()

  // ------- Camera -------
  const cam = { pos: HOME.pos.clone(), look: HOME.look.clone() }
  /** @type {null | { curve: THREE.CatmullRomCurve3, from: THREE.Vector3, to: THREE.Vector3, dur: number, t: number, turn: number, done?: () => void, at?: number, onAt?: () => void }} */
  let flight = null
  /** @type {null | { start: number, dur: number }} */
  let door = null
  let inRoom = true // true = đứng yên trong phòng: bật nhãn, kéo nhìn quanh
  let showSolar = false
  let rushStart = 0
  let lightsOn = true
  const yaw = { now: 0, pitch: 0 }
  const mouse = { x: 0, y: 0, sx: 0, sy: 0 }
  /** @type {ReturnType<typeof setTimeout>[]} */
  const timers = []
  /** @param {() => void} fn @param {number} ms */
  const later = (fn, ms) => timers.push(setTimeout(fn, ms))

  /**
   * @param {THREE.Vector3[]} points đường đi của camera
   * @param {THREE.Vector3} look điểm nhìn cuối
   * @param {number} dur giây
   * @param {() => void} [done]
   * @param {number} [turn] > 1: quay đầu xong trước khi tới nơi, như người thật
   */
  function fly(points, look, dur, done, turn = 1.7) {
    inRoom = false
    flight = {
      curve: new THREE.CatmullRomCurve3([cam.pos.clone(), ...points], false, 'centripetal'),
      from: cam.look.clone(),
      to: look.clone(),
      dur: calm ? 0.01 : dur,
      t: 0,
      turn,
      done,
    }
    return flight
  }
  const v3 = (/** @type {P3} */ p) => V(p[0], p[1], p[2])

  /** Đổi cảnh qua một nhịp tối ngắn và lấy nét lại, che chỗ chuyển giữa phòng và trời sao. @param {boolean} on */
  function swapToSolar(on) {
    canvas.style.opacity = '0'
    later(() => {
      showSolar = on
      canvas.style.transition = 'none'
      if (on && !calm) canvas.style.filter = 'blur(10px)'
      void canvas.offsetWidth
      canvas.style.transition = ''
      canvas.style.opacity = ''
      canvas.style.filter = ''
    }, calm ? 0 : 220)
  }

  function resize() {
    const w = host.clientWidth || window.innerWidth
    const h = host.clientHeight || window.innerHeight
    gl.setSize(w, h, false)
    camera.aspect = w / h
    // Giữ độ rộng góc nhìn tối thiểu cho màn dọc, nếu không cả phòng chỉ còn một khe hẹp
    const wanted = 2 * THREE.MathUtils.radToDeg(Math.atan(0.6 / camera.aspect))
    camera.fov = Math.min(84, Math.max(52, wanted))
    camera.updateProjectionMatrix()
    solar.resize(camera.aspect)
    spotWidths.clear()
  }
  /** @type {Map<string, number>} */
  const spotWidths = new Map()
  window.addEventListener('resize', resize)
  resize()

  // ------- Kéo để nhìn quanh, bấm thẳng vào đồ vật -------
  const ray = new THREE.Raycaster()
  const pointerNdc = new THREE.Vector2()
  /** @param {number} x @param {number} y */
  function spotAt(x, y) {
    const r = canvas.getBoundingClientRect()
    pointerNdc.set(((x - r.left) / r.width) * 2 - 1, -((y - r.top) / r.height) * 2 + 1)
    ray.setFromCamera(pointerNdc, camera)
    const hit = ray.intersectObjects(scene.children, true).find((h) => h.object.visible && h.object !== dust)
    /** @type {THREE.Object3D | null} */
    let o = hit ? hit.object : null
    while (o && !o.userData.spot) o = o.parent
    return o ? /** @type {string} */ (o.userData.spot) : null
  }
  /** @type {null | { x: number, y: number, moved: number }} */
  let drag = null
  /** @param {PointerEvent} e */
  const onDown = (e) => {
    if (!inRoom) return
    drag = { x: e.clientX, y: e.clientY, moved: 0 }
    canvas.setPointerCapture?.(e.pointerId)
  }
  /** @param {PointerEvent} e */
  const onMove = (e) => {
    if (e.pointerType === 'mouse') {
      mouse.x = (e.clientX / window.innerWidth) * 2 - 1
      mouse.y = (e.clientY / window.innerHeight) * 2 - 1
    }
    if (drag) {
      const dx = e.clientX - drag.x
      const dy = e.clientY - drag.y
      drag.x = e.clientX
      drag.y = e.clientY
      drag.moved += Math.abs(dx) + Math.abs(dy)
      // Màn dọc thấy ít phòng hơn nên được phép quay nhiều hơn
      const limit = camera.aspect < 1 ? 1 : 0.55
      yaw.now = THREE.MathUtils.clamp(yaw.now + dx * 0.0035, -limit, limit)
      yaw.pitch = THREE.MathUtils.clamp(yaw.pitch - dy * 0.0025, -0.3, 0.35)
    } else if (inRoom && e.pointerType === 'mouse') {
      canvas.style.cursor = spotAt(e.clientX, e.clientY) ? 'pointer' : 'grab'
    }
  }
  /** @param {PointerEvent} e */
  const onUp = (e) => {
    const d = drag
    drag = null
    if (!d || d.moved > 8 || !inRoom) return
    const id = spotAt(e.clientX, e.clientY)
    if (id) onPick(id)
  }
  canvas.addEventListener('pointerdown', onDown)
  canvas.addEventListener('pointermove', onMove)
  canvas.addEventListener('pointerup', onUp)
  canvas.addEventListener('pointercancel', () => {
    drag = null
  })

  // ------- Vòng lặp vẽ -------
  const clockObj = new THREE.Clock()
  const look = V(0, 0, 0)
  const v = V(0, 0, 0)
  const up = V(0, 1, 0)
  let raf = 0
  let frameNo = 0

  /** @param {number} now */
  function frame(now) {
    raf = requestAnimationFrame(frame)
    // Trần 0.25s: máy yếu thì cú máy giật hơn nhưng vẫn đúng giờ, không kéo dài thành hàng chục giây
    const dt = Math.min(clockObj.getDelta(), 0.25)
    const t = now / 1000
    frameNo++

    if (flight) {
      const f = flight
      f.t = Math.min(1, f.t + dt / f.dur)
      cam.pos.copy(f.curve.getPoint(easeInOut(f.t)))
      cam.look.lerpVectors(f.from, f.to, easeInOut(Math.min(1, f.t * f.turn)))
      if (f.at && f.t > f.at) {
        f.at = 0
        f.onAt?.()
      }
      if (f.t === 1) {
        flight = null
        f.done?.()
      }
    }
    if (door) {
      const p = Math.min(1, Math.max(0, (now - door.start) / door.dur))
      hinge.rotation.y = 1.95 * easeDoor(p)
      // Ánh sáng lùa theo cánh cửa; máy yếu tính thưa hơn cho đỡ giật
      if (frameNo % (low ? 4 : 2) === 0) gl.shadowMap.needsUpdate = true
      if (p === 1) {
        door = null
        gl.shadowMap.needsUpdate = true
      }
    }

    mouse.sx += (mouse.x - mouse.sx) * 0.05
    mouse.sy += (mouse.y - mouse.sy) * 0.05
    const follow = inRoom && !calm ? 1 : 0
    const sway = calm || showSolar ? 0 : 1
    if (!inRoom) {
      yaw.now *= 0.92
      yaw.pitch *= 0.92
    }
    camera.position.copy(cam.pos)
    camera.position.x += Math.sin(t * 0.55) * 0.012 * sway + mouse.sx * 0.1 * follow
    camera.position.y += Math.sin(t * 0.8) * 0.009 * sway - mouse.sy * 0.05 * follow
    look.copy(cam.look).sub(cam.pos).applyAxisAngle(up, -yaw.now)
    look.y += yaw.pitch * 7
    look.add(cam.pos)
    look.x += mouse.sx * 0.45 * follow + Math.sin(t * 0.4) * 0.012 * sway
    look.y -= mouse.sy * 0.25 * follow
    camera.lookAt(look)

    if (!calm) {
      pend.rotation.z = Math.sin(t * 2.6) * 0.17
      globe.rotation.y = t * 0.12
      arms.forEach((a) => {
        a.arm.rotation.y = t * a.speed
      })
      panda.update(t, dt, camera.position)
      const a = dustGeo.attributes.position
      for (let i = 0; i < dustN; i++) {
        let y = a.getY(i) + dt * 0.03
        if (y > 4.1) y = 0.2
        a.setY(i, y)
        a.setX(i, a.getX(i) + Math.sin(t * 0.3 + i) * dt * 0.018)
      }
      a.needsUpdate = true
      brew.emissiveIntensity = 1 + Math.sin(t * 2.2) * 0.22
    }

    // Đèn chuyển dần như vặn nhỏ đèn dầu
    const k = Math.min(1, dt * 3)
    const flicker = lightsOn && !calm ? 1 + Math.sin(t * 7.1) * 0.018 + Math.sin(t * 13.3) * 0.012 : 1
    roomLight.intensity += ((lightsOn ? 42 * flicker : 2.2) - roomLight.intensity) * k
    deskLight.intensity += ((lightsOn ? 9 : 2.6) - deskLight.intensity) * k
    hemi.intensity += ((lightsOn ? 0.75 : 0.2) - hemi.intensity) * k
    moon.intensity += ((lightsOn ? 0.75 : 2) - moon.intensity) * k

    if (inRoom) {
      for (const s of LAB_SPOTS) {
        const el = spotEl(s.id)
        if (!el) continue
        v.set(s.at[0], s.at[1], s.at[2]).project(camera)
        const off = v.z > 1 || Math.abs(v.x) > 1.02 || Math.abs(v.y) > 1.02
        el.classList.toggle('is-off', off)
        if (off) continue
        let w = spotWidths.get(s.id)
        if (!w) {
          w = el.offsetWidth
          spotWidths.set(s.id, w)
        }
        const W = host.clientWidth
        const x = Math.max(8, Math.min(W - w - 8, ((v.x + 1) / 2) * W - 7))
        const y = ((1 - v.y) / 2) * host.clientHeight - 20
        el.style.transform = `translate(${x.toFixed(1)}px,${y.toFixed(1)}px)`
      }
    }

    if (showSolar) {
      if (rushStart) solar.setRush(easeInOut(Math.min(1, (now - rushStart) / 750)))
      solar.update(t)
      gl.render(solar.scene, solar.camera)
    } else {
      gl.render(scene, camera)
    }
  }
  raf = requestAnimationFrame(frame)

  return {
    calm,
    /** Cú máy mở đầu: cửa mở đúng 4 giây, camera bước vào khi cửa đã hé rộng.
     * @param {() => void} onDoorStart @param {() => void} done */
    playDoor(onDoorStart, done) {
      flight = null
      inRoom = false
      hinge.rotation.y = 0
      gl.shadowMap.needsUpdate = true
      cam.pos.set(0, 1.62, 7.9)
      cam.look.set(0, 1.5, 3)
      later(() => {
        onDoorStart()
        door = { start: performance.now(), dur: DOOR_MS }
      }, 450)
      later(() => {
        fly([V(0, 1.6, 6.4), V(0.05, 1.64, 4.9), HOME.pos], HOME.look, 3.4, () => {
          inRoom = true
          done()
        }, 1.2)
      }, 450 + DOOR_MS * 0.6)
    },
    /** Bỏ qua cú máy mở cửa */
    skipDoor() {
      timers.splice(0).forEach(clearTimeout)
      door = null
      flight = null
      hinge.rotation.y = 1.95
      gl.shadowMap.needsUpdate = true
      cam.pos.copy(HOME.pos)
      cam.look.copy(HOME.look)
      inRoom = true
    },
    /** Đứng sẵn trong phòng, cửa đã mở (trở về từ Vũ Trụ hoặc giảm chuyển động) */
    startInRoom() {
      hinge.rotation.y = 1.95
      gl.shadowMap.needsUpdate = true
    },
    /** @param {string} id @param {() => void} [done] */
    focus(id, done) {
      const s = LAB_SPOTS.find((x) => x.id === id)
      if (!s || !s.pose) return done?.()
      fly([...s.pose.path.map(v3), v3(s.pose.pos)], v3(s.pose.look), 2.1, done)
    },
    /** @param {string} from id món đồ đang đứng trước @param {() => void} [done] */
    home(from, done) {
      const s = LAB_SPOTS.find((x) => x.id === from)
      fly([...(s?.pose?.path ?? []).map(v3), HOME.pos], HOME.look, 1.9, () => {
        inRoom = true
        done?.()
      })
    },
    /** Quay đầu, vòng sang phải cho đồ vật trôi qua, vào đúng trục thị kính rồi áp mắt.
     * @param {() => void} onIris lúc viền tối bắt đầu khép @param {() => void} done */
    enterScope(onIris, done) {
      const f = fly(
        [V(0.75, 1.62, 2.45), V(3.15, 1.82, 0.9), scopeStart, eye.clone().addScaledVector(tubeDir, -0.28), eye.clone().addScaledVector(tubeDir, -0.05)],
        eye.clone().addScaledVector(tubeDir, 5),
        3.3,
        done,
        2.2,
      )
      f.at = 0.82
      f.onAt = () => {
        onIris()
        later(() => swapToSolar(true), calm ? 0 : 420)
      }
    },
    /** @param {() => void} onIrisOpen @param {() => void} done */
    leaveScope(onIrisOpen, done) {
      swapToSolar(false)
      later(() => {
        onIrisOpen()
        fly([scopeStart, V(3.15, 1.82, 0.9), HOME.pos], HOME.look, 2.5, () => {
          inRoom = true
          done()
        })
      }, calm ? 0 : 240)
    },
    /** Lao về phía Mặt Trời ngay trước khi sang màn Vũ Trụ */
    rush() {
      rushStart = performance.now()
    },
    /** @param {boolean} on */
    setLights(on) {
      lightsOn = on
    },
    /** @param {string[]} colors [bình cầu, ống 1, ống 2, ống 3] */
    setBrew(colors) {
      brew.color.set(colors[0])
      brew.emissive.set(colors[0])
      brewLight.color.set(colors[0])
      tubes.forEach((m, i) => {
        m.color.set(colors[i + 1])
        m.emissive.set(colors[i + 1])
      })
    },
    waveTo: panda.wave,
    dispose() {
      cancelAnimationFrame(raf)
      timers.splice(0).forEach(clearTimeout)
      window.removeEventListener('resize', resize)
      for (const root of [scene, solar.scene]) {
        root.traverse((o) => {
          const m = /** @type {THREE.Mesh} */ (o)
          m.geometry?.dispose?.()
          const mats = Array.isArray(m.material) ? m.material : m.material ? [m.material] : []
          mats.forEach((x) => {
            /** @type {any} */ (x).map?.dispose?.()
            x.dispose()
          })
        })
      }
      gl.dispose()
      gl.forceContextLoss()
      canvas.remove()
    },
  }
}
