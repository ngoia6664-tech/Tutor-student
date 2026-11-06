// Căn gác mái dựng bằng Three.js: phòng, đồ vật, ánh sáng và các cú máy (mở cửa, bay đến đồ vật, áp mắt vào kính).
// Cảnh chỉ lo 3D; nút bấm, hộp thoại, âm thanh ở ScienceLab.jsx.
import * as THREE from 'three'
import { buildBench } from './labBench.js'
import { buildBoard } from './labBoard.js'
import { buildClock } from './labClock.js'
import { grainTexture, kit, mergeStatic, paintTexture } from './labKit.js'
import { buildCabinet } from './labOrrery.js'
import { buildShelf } from './labShelf.js'
import { buildPanda } from './labPanda.js'
import { createSolarView } from './labSolar.js'

/** @typedef {[number, number, number]} P3 */
/** @typedef {{ id: string, label: string, at: P3, pose?: { path: P3[], pos: P3, look: P3, phone?: { pos: P3, look: P3 } } }} LabSpot */

// Nhãn đồng + nơi camera dừng khi bấm vào từng món đồ
/** @type {LabSpot[]} */
export const LAB_SPOTS = [
  { id: 'scope', label: 'Kính thiên văn', at: [2.45, 2.72, -2.1] },
  { id: 'shelf', label: 'Giá sách', at: [-4.4, 2.75, -1.6], pose: { path: [[-1.8, 1.65, 1.6]], pos: [-2.7, 1.66, -0.75], look: [-4.6, 1.56, -0.75], phone: { pos: [-2.75, 1.42, -0.75], look: [-4.6, 0.92, -0.75] } } },
  { id: 'board', label: 'Bảng đen', at: [-0.2, 3.28, -3.9], pose: { path: [[0.1, 1.66, 1.2]], pos: [0.45, 2, -0.75], look: [0.45, 2.2, -4], phone: { pos: [-0.2, 1.95, -0.6], look: [-0.2, 1.42, -4] } } },
  { id: 'cabinet', label: 'Tủ mẫu vật', at: [4.4, 2.3, -2.9], pose: { path: [[2.3, 1.7, 1.4]], pos: [3.05, 2.02, -2.42], look: [4.5, 1.42, -2.42], phone: { pos: [3.05, 2.1, -2.9], look: [4.5, 1.0, -2.9] } } },
  // Nhìn vuông góc vào tường để đồng hồ thẳng đứng; đứng lệch để mảnh giấy bên phải không che tủ kính. Điện thoại: giấy ở dưới nên đẩy đồng hồ lên trên.
  { id: 'clock', label: 'Đồng hồ quả lắc', at: [4.35, 3.72, -1.2], pose: { path: [[1.6, 1.7, 1.6]], pos: [0.7, 1.82, -0.35], look: [4.7, 1.82, -0.35], phone: { pos: [1.25, 1.6, -1], look: [4.7, 1.03, -1] } } },
  { id: 'desk', label: 'Thử màu ngọn lửa', at: [-1.15, 1.85, -3.1], pose: { path: [[-1.1, 1.7, 1.2]], pos: [-1.02, 1.68, -1.75], look: [-1.02, 1.2, -3.6], phone: { pos: [-1.3, 1.8, -1.9], look: [-1.3, 0.72, -3.6] } } },
  { id: 'journal', label: 'Sổ tay', at: [-2.65, 1.45, -3.1], pose: { path: [[-1.5, 1.7, 1]], pos: [-2.1, 1.75, -2.25], look: [-2.1, 1.0, -3.3], phone: { pos: [-2.55, 1.85, -2.35], look: [-2.55, 0.62, -3.3] } } },
  { id: 'panda', label: 'Giáo sư Gấu Trúc', at: [1.05, 2.1, -2.85] },
]

const HOME = { pos: new THREE.Vector3(-0.1, 1.66, 4.15), look: new THREE.Vector3(0.05, 1.55, -3) }
const DOOR_MS = 4000 // khớp độ dài file door-creak.mp3
const WOOD_HUES = 26
const MIN_PIXEL_RATIO = 1

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
  let pixelRatio = Math.min(window.devicePixelRatio, low ? 1.5 : 2)
  let slowSum = 0
  gl.setPixelRatio(pixelRatio)
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
  // Mặt hộp có toạ độ texture 0..1 nên phải đặt số lần lặp riêng, nếu không vân vữa giãn thành mảng lớn
  const sideMap = plasterMap.clone()
  sideMap.repeat.set(2.4, 1.1)
  sideMap.needsUpdate = true
  const sidePlaster = mat({ map: sideMap, roughness: 0.95 })
  box(0.3, 4.4, 9.1, sidePlaster, -5.15, 2.2, 0.1)
  box(0.3, 4.4, 9.1, sidePlaster, 5.15, 2.2, 0.1)
  box(10.6, 0.3, 9.1, M.oak, 0, 4.55, 0.1)
  for (let z = -3.4; z < 4.4; z += 1.55) box(10, 0.24, 0.3, M.oak, 0, 4.26, z)
  ;[-4.82, 4.82].forEach((x) => [-3.85, 4.35].forEach((z) => box(0.3, 4.2, 0.3, M.oak, x, 2.1, z)))
  box(10, 0.2, 0.08, M.oak, 0, 0.1, -3.96)

  // Ốp gỗ chân tường
  const trimGrain = grainTexture()
  const trim = mat({ map: trimGrain, roughness: 0.5 })
  const trimDark = mat({ map: trimGrain, color: 0x8d6d5c, roughness: 0.58 })
  const decor = kit(scene)
  /** @param {number} len @param {number} x @param {number} z @param {number} rotY */
  function wainscot(len, x, z, rotY) {
    const g = new THREE.Group()
    g.position.set(x, 0, z)
    g.rotation.y = rotY
    scene.add(g)
    decor.box(len, 1, 0.02, trimDark, 0, 0.5, 0, g)
    decor.box(len, 0.05, 0.05, trim, 0, 1.02, 0.015, g)
    decor.box(len, 0.03, 0.035, trimDark, 0, 0.99, 0.01, g)
    decor.box(len, 0.18, 0.035, trim, 0, 0.09, 0.012, g)
    const n = Math.round(len / 0.95)
    const w = len / n
    for (let i = 0; i < n; i++) {
      decor.box(w - 0.14, 0.66, 0.016, trim, -len / 2 + w * (i + 0.5), 0.58, 0.012, g)
      decor.box(0.05, 0.8, 0.03, trim, -len / 2 + w * i, 0.56, 0.012, g)
    }
  }
  wainscot(9.4, 0, -3.985, 0)
  wainscot(8.1, -4.985, 0.1, Math.PI / 2)
  wainscot(8.1, 4.985, 0.1, -Math.PI / 2)

  /** Tranh treo tường có khung. @param {THREE.Texture} map @param {number} w @param {number} h @param {number} x @param {number} y @param {number} z @param {number} rotY */
  function framed(map, w, h, x, y, z, rotY) {
    const g = new THREE.Group()
    g.position.set(x, y, z)
    g.rotation.y = rotY
    scene.add(g)
    decor.box(w + 0.12, h + 0.12, 0.03, trim, 0, 0, 0, g)
    decor.box(w + 0.04, h + 0.04, 0.012, trimDark, 0, 0, 0.012, g)
    decor.add(new THREE.PlaneGeometry(w, h), mat({ map, roughness: 0.85 }), 0, 0, 0.02, g, false)
  }
  const parchment = (/** @type {CanvasRenderingContext2D} */ g, /** @type {number} */ w, /** @type {number} */ h) => {
    g.fillStyle = '#e4d6b4'
    g.fillRect(0, 0, w, h)
    g.strokeStyle = '#3a2a18'
    g.fillStyle = '#3a2a18'
    g.lineWidth = 3
    g.strokeRect(14, 14, w - 28, h - 28)
    g.textAlign = 'center'
  }
  // Bản đồ bầu trời vẽ tay
  framed(paintTexture(640, 460, (g) => {
    parchment(g, 640, 460)
    g.font = "bold 30px 'Times New Roman', serif"
    g.fillText('BẢN ĐỒ BẦU TRỜI', 320, 58)
    g.lineWidth = 1.2
    for (let r = 60; r <= 180; r += 60) {
      g.beginPath()
      g.arc(320, 265, r, 0, 7)
      g.stroke()
    }
    for (let a = 0; a < 12; a++) {
      g.beginPath()
      g.moveTo(320, 265)
      g.lineTo(320 + Math.cos((a * Math.PI) / 6) * 180, 265 + Math.sin((a * Math.PI) / 6) * 180)
      g.stroke()
    }
    for (const c of [[[230, 210], [262, 188], [300, 200], [326, 170], [360, 188], [392, 160]], [[250, 340], [290, 310], [335, 335], [380, 300], [410, 330]], [[420, 240], [450, 275], [430, 325], [395, 290]]]) {
      g.lineWidth = 2
      g.beginPath()
      c.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)))
      g.stroke()
      c.forEach(([x, y]) => {
        g.beginPath()
        g.arc(x, y, 5, 0, 7)
        g.fill()
      })
    }
  }), 1.5, 1.08, -2.75, 2.82, -3.985, 0)
  // Sơ đồ Hệ Mặt Trời trên tường trái
  framed(paintTexture(640, 460, (g) => {
    parchment(g, 640, 460)
    g.font = "bold 30px 'Times New Roman', serif"
    g.fillText('HỆ MẶT TRỜI', 320, 58)
    g.lineWidth = 1.4
    for (let i = 1; i <= 6; i++) {
      g.beginPath()
      g.ellipse(320, 265, i * 46, i * 26, 0, 0, 7)
      g.stroke()
    }
    g.beginPath()
    g.arc(320, 265, 16, 0, 7)
    g.fill()
    ;[[6, 46], [8, 92], [8, 138], [7, 184], [14, 230], [12, 276]].forEach(([r, d], i) => {
      g.beginPath()
      g.arc(320 + Math.cos(i * 1.7) * d, 265 + (Math.sin(i * 1.7) * d * 26) / 46, r, 0, 7)
      g.fill()
    })
  }), 1.4, 1, -4.985, 2.5, 2.7, Math.PI / 2)
  // Bản đồ Mặt Trăng trên tường phải
  framed(paintTexture(460, 620, (g) => {
    parchment(g, 460, 620)
    g.font = "bold 28px 'Times New Roman', serif"
    g.fillText('MẶT TRĂNG', 230, 62)
    g.lineWidth = 2
    g.beginPath()
    g.arc(230, 340, 180, 0, 7)
    g.stroke()
    g.fillStyle = 'rgba(58,42,24,.42)'
    for (const [x, y, r] of [[180, 290, 44], [258, 262, 34], [300, 340, 42], [205, 380, 30], [145, 370, 22], [290, 420, 20], [230, 450, 16], [170, 225, 14], [330, 270, 16]]) {
      g.beginPath()
      g.arc(x, y, r, 0, 7)
      g.fill()
    }
  }), 0.95, 1.28, 4.985, 2.4, 2, -Math.PI / 2)

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
  ;[[1.9, 2.3, 2.42], [3.1, 2.3, 2.42]].forEach(([x, y, h]) => box(0.05, h, 0.05, M.brass, x, y, -4.08))
  box(2.4, 0.05, 0.05, M.brass, 2.5, 1.7, -4.08)
  // Rèm nhung: tấm phẳng uốn sóng rồi tính lại pháp tuyến để nếp gấp đón sáng thật
  const velvet = mat({ color: 0x5a1420, roughness: 0.92, side: THREE.DoubleSide })
  ;[1.17, 3.83].forEach((x) => {
    const geo = new THREE.PlaneGeometry(0.46, 3, 30, 1)
    const p = geo.attributes.position
    for (let i = 0; i < p.count; i++) p.setZ(i, Math.sin(p.getX(i) * 44) * 0.03 * (1 - (p.getY(i) + 1.5) * 0.08))
    geo.computeVertexNormals()
    add(geo, velvet, x, 2.38, -3.92)
    const band = cyl(0.17, 0.17, 0.09, velvet, x, 1.62, -3.9, scene, 14)
    band.scale.z = 0.34
  })
  const curtainRod = cyl(0.016, 0.016, 3.5, M.brass, 2.5, 3.9, -3.92, scene, 10)
  curtainRod.rotation.z = Math.PI / 2
  ;[0.75, 4.25].forEach((x) => ball(0.04, M.brass, x, 3.9, -3.92))

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
  // Vòng đồng trên thân, núm chỉnh nét, ống ngắm nhỏ
  ;[-0.3, 0.05, 0.4, 0.68].forEach((z) => tube(0.128 + z * 0.012, 0.128 + z * 0.012, 0.022, z, M.iron))
  ;[-1, 1].forEach((s2) => {
    const knob = cyl(0.03, 0.03, 0.03, M.brass, s2 * 0.1, -0.03, -0.46, scope, 16)
    knob.rotation.z = Math.PI / 2
    cyl(0.009, 0.009, 0.05, M.iron, s2 * 0.07, -0.03, -0.46, scope, 8).rotation.z = Math.PI / 2
  })
  const finder = cyl(0.026, 0.026, 0.46, M.brass, 0, 0.19, 0.06, scope, 18)
  finder.rotation.x = Math.PI / 2
  ;[-0.1, 0.2].forEach((z) => box(0.02, 0.07, 0.03, M.iron, 0, 0.14, z, scope))
  ;[0, 2.09, 4.19].forEach((a) => {
    const leg = cyl(0.03, 0.045, 1.75, M.oak, 2.5 + Math.cos(a) * 0.36, 0.72, -2.2 + Math.sin(a) * 0.36, scopeItem)
    leg.rotation.z = -Math.cos(a) * 0.42
    leg.rotation.x = Math.sin(a) * 0.42
  })
  cyl(0.13, 0.13, 0.08, M.brass, 2.5, 1.4, -2.2, scopeItem)
  // Giá đỡ: cột đồng, vòng khắc độ, nẹp giữ 3 chân, chân bọc đồng
  kit(scopeItem).turned([[0.11, 0], [0.09, 0.05], [0.05, 0.12], [0.05, 0.28], [0.08, 0.32], [0, 0.32]], M.brass, 2.5, 1.04, -2.2)
  add(new THREE.TorusGeometry(0.16, 0.012, 10, 40), M.brass, 2.5, 1.43, -2.2, scopeItem).rotation.x = Math.PI / 2
  cyl(0.05, 0.05, 0.06, M.iron, 2.5, 0.7, -2.2, scopeItem, 14)
  ;[0, 2.09, 4.19].forEach((a) => {
    const spreader = box(0.46, 0.022, 0.03, M.oak, 2.5 + Math.cos(a) * 0.24, 0.7, -2.2 + Math.sin(a) * 0.24, scopeItem)
    spreader.rotation.y = -a
    cyl(0.05, 0.03, 0.06, M.brass, 2.5 + Math.cos(a) * 0.72, 0.03, -2.2 + Math.sin(a) * 0.72, scopeItem, 12)
  })
  scene.updateMatrixWorld(true)
  const eye = scope.localToWorld(V(0, 0, -0.8))
  const scopeStart = eye.clone().addScaledVector(tubeDir, -1.25)

  // ------- Giá sách, bảng đen, bàn thí nghiệm, tủ mẫu vật (mỗi món một file) -------
  const shelf = buildShelf()
  shelf.group.position.set(-4.72, 0, -1.3)
  scene.add(shelf.group)
  const board = buildBoard()
  board.group.position.set(-0.2, 2.25, -3.97)
  scene.add(board.group)
  const bench = buildBench()
  bench.group.position.set(-2.1, 0, -3.35)
  bench.journal.position.set(-2.1, 0, -3.35)
  scene.add(bench.group, bench.journal)
  const cabinet = buildCabinet()
  cabinet.group.position.set(4.62, 0, -2.9)
  cabinet.group.rotation.y = -Math.PI / 2
  scene.add(cabinet.group)

  // ------- Đồng hồ quả lắc -------
  const clock = buildClock()
  clock.group.position.set(4.68, 0, -1.2)
  clock.group.rotation.y = -Math.PI / 2
  scene.add(clock.group)

  // ------- Thảm, quả địa cầu làm tiền cảnh, đèn treo -------
  const rugMap = tex(1024, 1024, (g, w) => {
    const c = w / 2
    g.fillStyle = '#5a1f1b'
    g.fillRect(0, 0, w, w)
    /** @type {[number, string, number][]} */
    const rings = [[0.485, '#c49a4b', 12], [0.455, '#1f2a42', 34], [0.42, '#c49a4b', 6], [0.26, '#c49a4b', 6], [0.235, '#1f2a42', 18]]
    rings.forEach(([r, color, lw]) => {
      g.strokeStyle = color
      g.lineWidth = lw
      g.beginPath()
      g.arc(c, c, w * r, 0, 7)
      g.stroke()
    })
    g.translate(c, c)
    // Hoa văn lặp quanh vành
    for (let i = 0; i < 40; i++) {
      g.save()
      g.rotate((i / 40) * Math.PI * 2)
      g.fillStyle = i % 2 ? '#c49a4b' : '#8c3a2c'
      g.beginPath()
      g.moveTo(0, -w * 0.47)
      g.lineTo(9, -w * 0.455)
      g.lineTo(0, -w * 0.44)
      g.lineTo(-9, -w * 0.455)
      g.fill()
      g.restore()
    }
    for (let i = 0; i < 16; i++) {
      g.save()
      g.rotate((i / 16) * Math.PI * 2)
      g.fillStyle = '#7a2b22'
      g.beginPath()
      g.ellipse(0, -w * 0.34, 34, 66, 0, 0, 7)
      g.fill()
      g.fillStyle = '#c49a4b'
      g.beginPath()
      g.ellipse(0, -w * 0.34, 10, 34, 0, 0, 7)
      g.fill()
      g.restore()
    }
    // Sao 8 cánh giữa thảm như la bàn
    for (let i = 0; i < 8; i++) {
      g.save()
      g.rotate((i / 8) * Math.PI * 2)
      g.fillStyle = i % 2 ? '#8c6a2c' : '#d8b05a'
      g.beginPath()
      g.moveTo(0, -w * (i % 2 ? 0.14 : 0.22))
      g.lineTo(w * 0.04, 0)
      g.lineTo(-w * 0.04, 0)
      g.fill()
      g.restore()
    }
  })
  cyl(2.3, 2.3, 0.012, mat({ map: rugMap, roughness: 1 }), -0.2, 0.008, -0.2, scene, 64).castShadow = false

  const globeSpot = V(-2.4, 0, -0.2)
  const globeKit = kit(scene)
  globeKit.turned([[0, 0], [0.09, 0.02], [0.05, 0.1], [0.028, 0.16], [0.04, 0.42], [0.022, 0.62], [0.03, 0.7], [0, 0.7]], trim, globeSpot.x, 0.1, globeSpot.z)
  ;[0, 2.09, 4.19].forEach((a) => {
    const leg = box(0.3, 0.035, 0.04, trimDark, globeSpot.x + Math.cos(a) * 0.14, 0.09, globeSpot.z + Math.sin(a) * 0.14)
    leg.rotation.y = -a
    ball(0.024, M.brass, globeSpot.x + Math.cos(a) * 0.29, 0.03, globeSpot.z + Math.sin(a) * 0.29)
  })
  // Quả địa cầu cổ: lưới kinh vĩ, các lục địa vẽ phác theo toạ độ thật
  const globeMap = tex(1024, 512, (g, w, h) => {
    g.fillStyle = '#2c5670'
    g.fillRect(0, 0, w, h)
    const lon = (/** @type {number} */ d) => ((d + 180) / 360) * w
    const lat = (/** @type {number} */ d) => ((90 - d) / 180) * h
    g.strokeStyle = 'rgba(232,214,170,.28)'
    g.lineWidth = 1
    for (let d = -150; d <= 180; d += 30) {
      g.beginPath()
      g.moveTo(lon(d), 0)
      g.lineTo(lon(d), h)
      g.stroke()
    }
    for (let d = -60; d <= 60; d += 30) {
      g.beginPath()
      g.moveTo(0, lat(d))
      g.lineTo(w, lat(d))
      g.stroke()
    }
    const lands = [
      [[-165, 62], [-140, 70], [-95, 72], [-65, 60], [-55, 50], [-80, 30], [-97, 18], [-85, 10], [-105, 22], [-122, 38], [-130, 55]],
      [[-80, 10], [-60, 8], [-36, -6], [-40, -22], [-58, -38], [-70, -54], [-74, -30], [-81, -6]],
      [[-16, 28], [-6, 36], [12, 36], [32, 31], [44, 11], [51, 11], [40, -15], [32, -28], [20, -34], [14, -10], [8, 4], [-8, 5], [-16, 14]],
      [[-9, 37], [-8, 44], [2, 51], [8, 58], [24, 68], [60, 72], [105, 77], [140, 73], [178, 66], [160, 58], [140, 50], [122, 38], [120, 24], [106, 10], [98, 12], [90, 22], [78, 8], [72, 20], [58, 25], [48, 30], [36, 36], [26, 40], [12, 44]],
      [[114, -22], [122, -18], [131, -12], [142, -11], [153, -27], [147, -38], [130, -32], [116, -34]],
      [[-52, 60], [-44, 60], [-22, 70], [-30, 82], [-60, 80], [-68, 72]],
      [[-180, -72], [-90, -72], [-40, -78], [40, -68], [120, -67], [180, -72], [180, -90], [-180, -90]],
    ]
    g.fillStyle = '#c7ab70'
    g.strokeStyle = '#6d5428'
    g.lineWidth = 1.5
    lands.forEach((poly) => {
      g.beginPath()
      poly.forEach(([x, y], i) => (i ? g.lineTo(lon(x), lat(y)) : g.moveTo(lon(x), lat(y))))
      g.closePath()
      g.fill()
      g.stroke()
    })
  })
  const globeTilt = new THREE.Group()
  globeTilt.position.set(globeSpot.x, 1.13, globeSpot.z)
  globeTilt.rotation.z = -0.41 // trục Trái Đất nghiêng 23,5°
  globeTilt.userData.dynamic = true
  scene.add(globeTilt)
  const globe = ball(0.3, mat({ map: globeMap, roughness: 0.42 }), 0, 0, 0, globeTilt)
  add(new THREE.TorusGeometry(0.335, 0.012, 8, 56), M.brass, 0, 0, 0, globeTilt).rotation.y = Math.PI / 2
  cyl(0.008, 0.008, 0.72, M.brass, 0, 0, 0, globeTilt, 8)
  add(new THREE.TorusGeometry(0.335, 0.016, 8, 56), M.brass, globeSpot.x, 1.13, globeSpot.z).rotation.x = Math.PI / 2

  // Đèn dầu treo: lồng đồng, bóng thủy tinh phát sáng. Đặt sát nguồn sáng nên không đổ bóng, kẻo thành mảng đen trên trần
  const lampKit = kit(scene)
  /** @param {THREE.Mesh} m */
  const noCast = (m) => {
    m.castShadow = false
  }
  noCast(lampKit.cyl(0.008, 0.008, 0.72, M.iron, 0, 4.0, 0, scene, 6))
  noCast(lampKit.turned([[0, 0.3], [0.03, 0.3], [0.05, 0.24], [0.11, 0.17], [0.13, 0.13], [0.13, 0.11], [0, 0.11]], M.brass, 0, 3.34, 0))
  noCast(lampKit.turned([[0, 0], [0.1, 0], [0.13, 0.025], [0.1, 0.05], [0, 0.05]], M.brass, 0, 3.06, 0))
  ;[0, 1, 2, 3].forEach((i) => noCast(lampKit.cyl(0.006, 0.006, 0.36, M.brass, Math.cos(i * 1.57 + 0.78) * 0.115, 3.28, Math.sin(i * 1.57 + 0.78) * 0.115, scene, 6)))
  noCast(add(new THREE.TorusGeometry(0.03, 0.004, 6, 16), M.brass, 0, 3.66, 0))
  const lantern = lampKit.turned([[0.05, 0], [0.08, 0.06], [0.09, 0.15], [0.07, 0.26], [0.045, 0.34]], new THREE.MeshBasicMaterial({ color: 0xffd28a, fog: false, side: THREE.DoubleSide }), 0, 3.1, 0)
  noCast(lantern)

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
  hinge.userData.dynamic = true
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
  const hemi = new THREE.HemisphereLight(0x8a7a70, 0x25160d, 0.5)
  scene.add(hemi)
  const roomLight = new THREE.PointLight(0xffb76b, 42, 16, 1.8)
  roomLight.position.set(0, 3.05, 0)
  roomLight.castShadow = true
  roomLight.shadow.mapSize.set(low ? 512 : 1024, low ? 512 : 1024)
  roomLight.shadow.bias = -0.003
  roomLight.shadow.radius = 5
  scene.add(roomLight)
  const deskLight = new THREE.PointLight(0xffc27c, 4.5, 7, 2)
  deskLight.position.set(-3.2, 1.5, -3.55)
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
  const dust = new THREE.Points(dustGeo, new THREE.PointsMaterial({ map: dustTex, size: 0.024, transparent: true, opacity: 0.75, depthWrite: false, blending: THREE.AdditiveBlending }))
  dust.raycast = () => {} // bụi không chặn cú bấm, cũng đỡ tốn tính toán
  scene.add(dust)

  // Môi trường phản chiếu vẽ tay: đèn ấm phía trên, cửa sổ xanh một bên. Thiếu nó đồng thau chỉ còn màu xỉn tối
  const envSource = paintTexture(256, 128, (g) => {
    const wall = g.createLinearGradient(0, 0, 0, 128)
    wall.addColorStop(0, '#4a3324')
    wall.addColorStop(0.5, '#6b4a30')
    wall.addColorStop(1, '#2a1a10')
    g.fillStyle = wall
    g.fillRect(0, 0, 256, 128)
    g.fillStyle = '#ffdca0'
    g.fillRect(100, 6, 56, 18)
    g.fillStyle = '#ffc27c'
    g.fillRect(20, 40, 26, 22)
    g.fillStyle = '#7f9ad8'
    g.fillRect(190, 34, 30, 40)
  })
  envSource.mapping = THREE.EquirectangularReflectionMapping
  const pmrem = new THREE.PMREMGenerator(gl)
  const envTarget = pmrem.fromEquirectangular(envSource)
  scene.environment = envTarget.texture
  envSource.dispose()
  pmrem.dispose()

  const solar = createSolarView()

  // Kính thiên văn và vỏ phòng gộp lại; các món khác đã tự gộp lúc dựng
  mergeStatic(scopeItem)
  mergeStatic(scene)

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
  /** Trả mọi món về trạng thái nghỉ khi rời đi */
  function resetProps() {
    clock.reset()
    shelf.pickBook(-1)
    cabinet.reset()
    bench.setSalt(null)
  }

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
  let hoverAt = 0
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
      if (e.timeStamp - hoverAt > 120) {
        hoverAt = e.timeStamp
        canvas.style.cursor = spotAt(e.clientX, e.clientY) ? 'pointer' : 'grab'
      }
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
    const rawDt = clockObj.getDelta()
    const dt = Math.min(rawDt, 0.25)
    const t = now / 1000
    frameNo++
    if (frameNo > 60) {
      slowSum += rawDt
      if (frameNo % 45 === 0) {
        if (slowSum / 45 > 0.026 && pixelRatio > MIN_PIXEL_RATIO) {
          pixelRatio = Math.max(MIN_PIXEL_RATIO, pixelRatio - 0.25)
          gl.setPixelRatio(pixelRatio)
        }
        slowSum = 0
      }
    }

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

    clock.update(now, dt, calm)
    cabinet.update(t, dt, calm)
    bench.update(t, dt, calm)
    shelf.update(dt)
    if (!calm) {
      globe.rotation.y = t * 0.12
      panda.update(t, dt, camera.position)
      const a = dustGeo.attributes.position
      for (let i = 0; i < dustN; i++) {
        let y = a.getY(i) + dt * 0.03
        if (y > 4.1) y = 0.2
        a.setY(i, y)
        a.setX(i, a.getX(i) + Math.sin(t * 0.3 + i) * dt * 0.018)
      }
      a.needsUpdate = true
    }

    // Đèn chuyển dần như vặn nhỏ đèn dầu
    const k = Math.min(1, dt * 3)
    const flicker = lightsOn && !calm ? 1 + Math.sin(t * 7.1) * 0.018 + Math.sin(t * 13.3) * 0.012 : 1
    roomLight.intensity += ((lightsOn ? 42 * flicker : 2.2) - roomLight.intensity) * k
    deskLight.intensity += ((lightsOn ? 4.5 : 1.6) - deskLight.intensity) * k
    hemi.intensity += ((lightsOn ? 0.5 : 0.14) - hemi.intensity) * k
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
      const stop = (camera.aspect < 1 && s.pose.phone) || s.pose
      // Sách đặt trước mắt, ngay trên đường nhìn của nơi camera dừng (trong toạ độ của giá sách)
      if (id === 'shelf') {
        const phone = camera.aspect < 1
        shelf.readingSpot(stop.pos[0] - 1 + 4.72, stop.pos[1] + (phone ? 0.08 : 0), stop.pos[2] + 1.3 + (phone ? -0.15 : 0.34))
      }
      fly([...s.pose.path.map(v3), v3(stop.pos)], v3(stop.look), 2.1, done)
    },
    /** Thí nghiệm con lắc: đổi chiều dài dây, gia tốc rơi. @param {number} l @param {number} g */
    setPendulum(l, g) {
      clock.setPendulum(l, g)
    },
    /** @param {string} from id món đồ đang đứng trước @param {() => void} [done] */
    home(from, done) {
      const s = LAB_SPOTS.find((x) => x.id === from)
      resetProps()
      fly([...(s?.pose?.path ?? []).map(v3), HOME.pos], HOME.look, 1.9, () => {
        clock.settle()
        inRoom = true
        done?.()
      })
    },
    /** Quay đầu, vòng sang phải cho đồ vật trôi qua, vào đúng trục thị kính rồi áp mắt.
     * @param {() => void} onIris lúc viền tối bắt đầu khép @param {() => void} done */
    enterScope(onIris, done) {
      resetProps()
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
      // Tắt đèn thì đồ vật cũng bớt phản chiếu, kẻo tối mà đồng vẫn sáng
      scene.traverse((o) => {
        const m = /** @type {THREE.Mesh} */ (o).material
        if (m && 'envMapIntensity' in m) /** @type {THREE.MeshStandardMaterial} */ (m).envMapIntensity = on ? 1 : 0.3
      })
    },
    waveTo: panda.wave,
    parts: { shelf, board, bench, cabinet },
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
      envTarget.dispose()
      gl.dispose()
      gl.forceContextLoss()
      canvas.remove()
    },
  }
}
