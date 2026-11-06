// Đồng hồ quả lắc dựng bằng code: vỏ gỗ gụ, mặt số La Mã, tủ kính có thước đo. Con lắc điều khiển kim đồng hồ, đúng theo T = 2π√(l/g).
import * as THREE from 'three'
import { DEFAULT_LENGTH, EARTH_G, clockHands, clockRate } from '../../lib/pendulum.js'
import { grainTexture, mergeStatic, paintTexture } from './labKit.js'

const SWING = 0.12 // rad, đủ nhỏ để công thức con lắc đúng; quả lắc dài nhất vẫn không chạm thành tủ
const PIVOT_Y = 1.98
const BACK_TOP = 2.11
const BACK_HEIGHT = 1.9
const NUMERALS = ['XII', 'I', 'II', 'III', 'IIII', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI']

/** Mặt đồng hồ: tấm đồng có hoa văn bốn góc, vòng số La Mã, lỗ lên dây */
const dialTexture = () => paintTexture(1024, 1024, (g) => {
  const c = 512
  const plate = g.createLinearGradient(0, 0, 1024, 1024)
  plate.addColorStop(0, '#d9ad57')
  plate.addColorStop(0.5, '#a97a2c')
  plate.addColorStop(1, '#d2a44e')
  g.fillStyle = plate
  g.fillRect(0, 0, 1024, 1024)

  // Hoa văn cuộn ở bốn góc
  g.strokeStyle = '#5b3c10'
  g.lineCap = 'round'
  for (const [x, y, sx, sy] of [[0, 0, 1, 1], [1024, 0, -1, 1], [0, 1024, 1, -1], [1024, 1024, -1, -1]]) {
    g.save()
    g.translate(x, y)
    g.scale(sx, sy)
    for (const [cx, cy, big] of [[62, 62, 42], [132, 48, 25], [48, 132, 25], [116, 112, 18]]) {
      g.lineWidth = 5
      g.beginPath()
      for (let a = 0; a < Math.PI * 4.4; a += 0.2) {
        const r = (big * a) / (Math.PI * 4.4)
        g.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r)
      }
      g.stroke()
    }
    g.restore()
  }

  const disc = g.createRadialGradient(c, c, 60, c, c, 425)
  disc.addColorStop(0, '#f3e8cd')
  disc.addColorStop(0.82, '#e9dab6')
  disc.addColorStop(1, '#cdb88b')
  g.fillStyle = disc
  g.beginPath()
  g.arc(c, c, 425, 0, 7)
  g.fill()

  g.strokeStyle = '#2a1c10'
  g.fillStyle = '#2a1c10'
  ;[[408, 3], [384, 2], [290, 2]].forEach(([r, w]) => {
    g.lineWidth = w
    g.beginPath()
    g.arc(c, c, r, 0, 7)
    g.stroke()
  })
  g.translate(c, c)
  for (let i = 0; i < 60; i++) {
    const a = (i / 60) * Math.PI * 2
    g.save()
    g.rotate(a)
    g.fillRect(i % 5 ? -1.5 : -4, -408, i % 5 ? 3 : 8, 24)
    g.restore()
  }
  g.font = "bold 66px 'Times New Roman', serif"
  g.textAlign = 'center'
  g.textBaseline = 'middle'
  NUMERALS.forEach((n, i) => {
    g.save()
    g.rotate((i / 12) * Math.PI * 2)
    g.fillText(n, 0, -338)
    g.restore()
  })
  // Hai lỗ lên dây đặt lệch như đồng hồ cổ
  for (const s of [-1, 1]) {
    g.fillStyle = '#b98d3c'
    g.beginPath()
    g.arc(s * 132, 58, 24, 0, 7)
    g.fill()
    g.fillStyle = '#17110b'
    g.beginPath()
    g.arc(s * 132, 58, 14, 0, 7)
    g.fill()
  }
  g.fillStyle = '#4b3520'
  g.font = "italic 40px 'Times New Roman', serif"
  g.fillText('T = 2π√(l / g)', 0, 160)
})

/** Vòm trên mặt đồng hồ: trời đêm vẽ tay, chỉ để trang trí */
const skyTexture = () => paintTexture(512, 512, (g) => {
  g.fillStyle = '#10234f'
  g.fillRect(0, 0, 512, 256)
  g.fillStyle = '#e9c870'
  for (let i = 0; i < 46; i++) {
    g.beginPath()
    g.arc(Math.random() * 512, Math.random() * 250, 1.5 + Math.random() * 3, 0, 7)
    g.fill()
  }
  g.beginPath()
  g.arc(256, 134, 72, 0, 7)
  g.fill()
  g.fillStyle = '#10234f'
  g.beginPath()
  g.arc(286, 118, 66, 0, 7)
  g.fill()
})

/** Tấm sau tủ kính có thước đo: khắc độ dài tính từ điểm treo, nên đọc được đúng l trên cảnh */
const rulerTexture = () => paintTexture(256, 640, (g) => {
  g.fillStyle = '#3c2011'
  g.fillRect(0, 0, 256, 640)
  for (let i = 0; i < 260; i++) {
    g.fillStyle = `rgba(${Math.random() > 0.5 ? '14,6,2' : '140,84,46'},0.12)`
    g.fillRect(Math.random() * 256, Math.random() * 640, 1 + Math.random() * 2, 40 + Math.random() * 90)
  }
  g.fillStyle = '#efcf85'
  g.textBaseline = 'middle'
  g.font = "bold 25px 'Times New Roman', serif"
  for (let d = 0.25; d <= 1.5; d += 0.25) {
    const y = ((BACK_TOP - (PIVOT_Y - d)) / BACK_HEIGHT) * 640
    const major = d % 0.5 === 0
    g.fillRect(14, y - 1.5, major ? 52 : 30, 3)
    if (major) g.fillText(`${String(d).replace('.', ',')} m`, 72, y)
  }
})

/** Kim hình mũi giáo. @param {number} len @param {number} w */
function handGeometry(len, w) {
  const s = new THREE.Shape()
  s.moveTo(-w * 0.35, -len * 0.14)
  s.lineTo(-w * 0.35, len * 0.62)
  s.lineTo(-w, len * 0.72)
  s.lineTo(0, len)
  s.lineTo(w, len * 0.72)
  s.lineTo(w * 0.35, len * 0.62)
  s.lineTo(w * 0.35, -len * 0.14)
  s.closePath()
  return new THREE.ExtrudeGeometry(s, { depth: 0.004, bevelEnabled: false })
}

export function buildClock() {
  const grain = grainTexture()
  const wood = new THREE.MeshStandardMaterial({ map: grain, roughness: 0.42 })
  const darkWood = new THREE.MeshStandardMaterial({ map: grain, color: 0x8d6d5c, roughness: 0.5 })
  const brass = new THREE.MeshStandardMaterial({ color: 0xd2a144, metalness: 0.88, roughness: 0.3 })
  // Tủ tối: thêm ánh sáng tự thân cho con lắc, nếu không sẽ chìm vào tấm sau
  const brightBrass = new THREE.MeshStandardMaterial({ color: 0xe0b050, emissive: 0x6a4a12, emissiveIntensity: 0.55, metalness: 0.75, roughness: 0.32 })
  const blued = new THREE.MeshStandardMaterial({ color: 0x141724, metalness: 0.7, roughness: 0.35 })

  const group = new THREE.Group()
  group.userData.spot = 'clock'

  /**
   * @param {THREE.BufferGeometry} geo @param {THREE.Material} mat @param {number} x @param {number} y @param {number} z
   * @param {THREE.Object3D} [parent] @param {boolean} [shadow]
   */
  function add(geo, mat, x, y, z, parent = group, shadow = true) {
    const m = new THREE.Mesh(geo, mat)
    m.position.set(x, y, z)
    m.castShadow = shadow
    m.receiveShadow = true
    parent.add(m)
    return m
  }
  /** @param {number} w @param {number} h @param {number} d @param {THREE.Material} mat @param {number} x @param {number} y @param {number} z */
  const box = (w, h, d, mat, x, y, z) => add(new THREE.BoxGeometry(w, h, d), mat, x, y, z)
  /** Khối tiện tròn (cột, chóp) từ đường viền [bán kính, cao]. @param {number[][]} profile */
  const turned = (profile) => new THREE.LatheGeometry(profile.map(([r, y]) => new THREE.Vector2(r, y)), 20)

  // Đế + chân
  box(1.02, 0.12, 0.58, darkWood, 0, 0.06, 0)
  box(0.94, 0.07, 0.52, wood, 0, 0.155, 0)

  // Thân tủ rỗng: lưng, hai hông, khung cửa kính
  box(0.84, BACK_HEIGHT, 0.03, wood, 0, 1.16, -0.2)
  ;[-1, 1].forEach((s) => box(0.04, BACK_HEIGHT, 0.42, wood, s * 0.4, 1.16, 0))
  const ruler = rulerTexture()
  add(
    new THREE.PlaneGeometry(0.76, BACK_HEIGHT),
    new THREE.MeshStandardMaterial({ map: ruler, emissive: 0xffffff, emissiveMap: ruler, emissiveIntensity: 0.34, roughness: 0.75 }),
    0, 1.16, -0.18, group, false,
  )
  ;[-1, 1].forEach((s) => box(0.07, BACK_HEIGHT, 0.05, wood, s * 0.345, 1.16, 0.205))
  box(0.62, 0.08, 0.05, wood, 0, 2.07, 0.205)
  box(0.62, 0.08, 0.05, wood, 0, 0.25, 0.205)
  // Nẹp đồng quanh kính, bản lề, ổ khóa
  ;[-1, 1].forEach((s) => box(0.012, 1.74, 0.012, brass, s * 0.306, 1.16, 0.232))
  ;[2.03, 0.29].forEach((y) => box(0.624, 0.012, 0.012, brass, 0, y, 0.232))
  ;[0.5, 1.8].forEach((y) => box(0.03, 0.09, 0.012, brass, -0.372, y, 0.232))
  box(0.036, 0.09, 0.008, brass, 0.345, 1.16, 0.232)
  const glass = add(
    new THREE.PlaneGeometry(0.62, 1.74),
    new THREE.MeshStandardMaterial({ color: 0xd8e6f2, transparent: true, opacity: 0.09, metalness: 0.6, roughness: 0.04, depthWrite: false }),
    0, 1.16, 0.205, group, false,
  )
  glass.receiveShadow = false

  // Hai cột tiện hai bên thân
  const column = turned([[0, 0], [0.04, 0], [0.042, 0.03], [0.028, 0.07], [0.03, 0.9], [0.038, 0.95], [0.03, 1], [0.027, 1.82], [0.042, 1.87], [0.03, 1.9], [0, 1.9]])
  ;[-1, 1].forEach((s) => {
    add(column, wood, s * 0.44, 0.21, 0.2)
    add(new THREE.CylinderGeometry(0.036, 0.036, 0.02, 20), brass, s * 0.44, 2.07, 0.2)
    add(new THREE.CylinderGeometry(0.036, 0.036, 0.02, 20), brass, s * 0.44, 0.29, 0.2)
  })

  // Gờ giữa thân và hòm đầu
  box(0.97, 0.035, 0.52, darkWood, 0, 2.125, 0)
  box(1.0, 0.035, 0.56, wood, 0, 2.16, 0)

  // Hòm đầu + mặt số + viền đồng
  box(0.92, 0.78, 0.5, wood, 0, 2.57, 0)
  add(new THREE.PlaneGeometry(0.74, 0.74), new THREE.MeshStandardMaterial({ map: dialTexture(), roughness: 0.48, metalness: 0.08 }), 0, 2.57, 0.252, group, false)
  add(new THREE.TorusGeometry(0.31, 0.017, 12, 64), brass, 0, 2.57, 0.256)
  ;[-1, 1].forEach((s) => {
    add(new THREE.CylinderGeometry(0.024, 0.024, 0.72, 16), wood, s * 0.47, 2.57, 0.25)
    add(new THREE.CylinderGeometry(0.034, 0.034, 0.03, 16), brass, s * 0.47, 2.94, 0.25)
    add(new THREE.CylinderGeometry(0.034, 0.034, 0.03, 16), brass, s * 0.47, 2.2, 0.25)
  })

  // Mái: gờ bậc, vòm trời đêm, ba chóp đồng
  box(1.0, 0.04, 0.56, darkWood, 0, 2.98, 0)
  box(1.06, 0.035, 0.6, wood, 0, 3.015, 0)
  const crest = new THREE.Shape()
  crest.absarc(0, 0, 0.33, 0, Math.PI, false)
  crest.closePath()
  add(new THREE.ExtrudeGeometry(crest, { depth: 0.36, bevelEnabled: false }), wood, 0, 3.03, -0.18)
  add(new THREE.CircleGeometry(0.275, 48, 0, Math.PI), new THREE.MeshStandardMaterial({ map: skyTexture(), roughness: 0.55 }), 0, 3.035, 0.182, group, false)
  add(new THREE.TorusGeometry(0.28, 0.013, 8, 40, Math.PI), brass, 0, 3.035, 0.186)
  const finial = turned([[0, 0], [0.03, 0], [0.018, 0.03], [0.034, 0.07], [0.012, 0.12], [0.006, 0.2], [0, 0.23]])
  add(finial, brass, 0, 3.355, 0)
  ;[-1, 1].forEach((s) => add(finial, brass, s * 0.47, 3.03, 0))

  // Ba kim + chốt giữa; kim chuyển động nên không đổ bóng (bóng trong phòng chỉ tính một lần)
  const hourHand = add(handGeometry(0.17, 0.027), blued, 0, 2.57, 0.26, group, false)
  const minuteHand = add(handGeometry(0.255, 0.02), blued, 0, 2.57, 0.266, group, false)
  const secondHand = add(handGeometry(0.27, 0.005), brass, 0, 2.57, 0.272, group, false)
  add(new THREE.SphereGeometry(0.018, 16, 12), brass, 0, 2.57, 0.276, group, false)
  ;[hourHand, minuteHand, secondHand].forEach((h) => {
    h.userData.dynamic = true
  })

  // Hai quả nặng treo dây phía sau, lệch phải để không che thước
  ;[0.12, 0.25].forEach((x) => {
    add(new THREE.CylinderGeometry(0.003, 0.003, 0.72, 6), blued, x, 1.66, -0.08)
    add(new THREE.CylinderGeometry(0.045, 0.045, 0.3, 24), brass, x, 1.16, -0.08)
    add(new THREE.CylinderGeometry(0.02, 0.045, 0.03, 24), brass, x, 1.325, -0.08)
  })

  // Con lắc: thanh có gốc ở điểm treo nên co giãn bằng scale.y
  box(0.15, 0.05, 0.03, brass, 0, PIVOT_Y + 0.02, 0.05)
  const swing = new THREE.Group()
  swing.userData.dynamic = true
  swing.position.set(0, PIVOT_Y, 0.05)
  group.add(swing)
  const rodGeo = new THREE.CylinderGeometry(0.008, 0.008, 1, 10)
  rodGeo.translate(0, -0.5, 0)
  const rod = add(rodGeo, brightBrass, 0, 0, 0, swing, false)
  const bob = add(new THREE.SphereGeometry(0.1, 32, 20), brightBrass, 0, -DEFAULT_LENGTH, 0, swing, false)
  bob.scale.z = 0.3

  mergeStatic(group)

  const now = new Date()
  const startSec = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds() + now.getMilliseconds() / 1000
  const startMs = performance.now()
  const state = { l: DEFAULT_LENGTH, g: EARTH_G, toL: DEFAULT_LENGTH, toG: EARTH_G, drift: 0 }

  return {
    group,
    /** @param {number} l @param {number} g */
    setPendulum(l, g) {
      state.toL = l
      state.toG = g
    },
    /** Về con lắc chuẩn (kim còn lệch đến khi gọi settle) */
    reset() {
      state.toL = DEFAULT_LENGTH
      state.toG = EARTH_G
    },
    /** Camera đã đi xa: kim về đúng giờ thật, không ai thấy kim nhảy */
    settle() {
      state.l = state.toL
      state.g = state.toG
      state.drift = 0
    },
    /** @param {number} nowMs @param {number} dt @param {boolean} calm giảm chuyển động: chỉ lắc khi đang thí nghiệm */
    update(nowMs, dt, calm) {
      state.l += (state.toL - state.l) * Math.min(1, dt * 6)
      state.g += (state.toG - state.g) * Math.min(1, dt * 3)
      state.drift += dt * (clockRate(state.l, state.g) - 1)
      const sec = startSec + (nowMs - startMs) / 1000 + state.drift
      const hands = clockHands(sec)
      hourHand.rotation.z = -hands.hour
      minuteHand.rotation.z = -hands.minute
      secondHand.rotation.z = -hands.second
      rod.scale.y = state.l
      bob.position.y = -state.l
      // Cùng một đồng hồ đếm cho con lắc và kim: quả lắc ở biên đúng lúc kim giây nhảy
      const idle = state.toL === DEFAULT_LENGTH && state.toG === EARTH_G
      swing.rotation.z = calm && idle ? 0 : SWING * Math.cos(Math.PI * sec)
    },
  }
}
