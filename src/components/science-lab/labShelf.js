// Giá sách kịch trần: hàng sách, đồng hồ cát, cuộn bản đồ, thang gỗ. Ba cuốn nổi bật rút ra khỏi kệ và mở ra đọc được.
import * as THREE from 'three'
import { approach, grainTexture, kit, mergeStatic, paintTexture, seeded } from './labKit.js'

const W = 0.3 // bề rộng trang sách
const H = 0.4
const T = 0.07
const REST_Y = 1.55 // chiều cao tầng đặt 3 cuốn nổi bật
const PAPER = '#efe4c8'
const INK = '#33241a'

/** @param {(g: CanvasRenderingContext2D) => void} draw */
const pageTexture = (draw) => paintTexture(512, 680, (g) => {
  g.fillStyle = PAPER
  g.fillRect(0, 0, 512, 680)
  g.strokeStyle = 'rgba(120,90,50,.35)'
  g.lineWidth = 3
  g.strokeRect(22, 22, 468, 636)
  g.fillStyle = INK
  g.strokeStyle = INK
  g.textAlign = 'center'
  g.lineWidth = 2.5
  draw(g)
})

/** @param {CanvasRenderingContext2D} g @param {string} text @param {number} y @param {number} size @param {string} [style] */
function line(g, text, y, size, style = '') {
  g.font = `${style} ${size}px 'Times New Roman', serif`
  g.fillText(text, 256, y)
}

/** @param {CanvasRenderingContext2D} g @param {number} x @param {number} y @param {number} r */
function dot(g, x, y, r) {
  g.beginPath()
  g.arc(x, y, r, 0, 7)
  g.fill()
}

// Mỗi cuốn: màu bìa, chữ gáy, trang trái, trang phải
const BOOKS = [
  {
    color: '#6b2018',
    spine: 'NEWTON',
    left: (/** @type {CanvasRenderingContext2D} */ g) => {
      line(g, 'PHILOSOPHIÆ', 150, 40, 'bold')
      line(g, 'NATURALIS', 200, 40, 'bold')
      line(g, 'PRINCIPIA', 250, 40, 'bold')
      line(g, 'MATHEMATICA', 300, 40, 'bold')
      g.beginPath()
      g.moveTo(170, 340)
      g.lineTo(342, 340)
      g.stroke()
      line(g, 'Isaac Newton', 400, 34, 'italic')
      line(g, 'Londini, 1687', 450, 30)
    },
    // Hình khẩu pháo của Newton: bắn đủ nhanh thì viên đạn rơi mãi quanh Trái Đất
    right: (/** @type {CanvasRenderingContext2D} */ g) => {
      line(g, 'Quả táo và Mặt Trăng', 72, 30, 'italic')
      g.beginPath()
      g.arc(256, 340, 96, 0, 7)
      g.stroke()
      g.setLineDash([9, 8])
      ;[[120, 170], [175, 205]].forEach(([rx, ry]) => {
        g.beginPath()
        g.ellipse(256 + (rx - 96) / 2.2, 340, rx, ry, 0, Math.PI, Math.PI * 1.98)
        g.stroke()
      })
      g.beginPath()
      g.arc(256, 340, 190, 0, 7)
      g.stroke()
      g.setLineDash([])
      g.fillRect(250, 228, 12, 16)
      dot(g, 446, 340, 14)
      line(g, 'F = G m₁m₂ / r²', 610, 38, 'italic')
    },
  },
  {
    color: '#20402f',
    spine: 'GALILEO',
    // Mặt Trăng có núi và miệng hố, điều Galileo công bố năm 1610
    left: (/** @type {CanvasRenderingContext2D} */ g) => {
      line(g, 'SIDEREUS NUNCIUS', 78, 34, 'bold')
      line(g, 'Galileo Galilei, 1610', 122, 26, 'italic')
      g.beginPath()
      g.arc(256, 340, 150, 0, 7)
      g.stroke()
      const r = seeded(9)
      g.fillStyle = 'rgba(51,36,26,.55)'
      for (let i = 0; i < 26; i++) {
        const a = r(0, 6.28)
        const d = r(0, 130)
        dot(g, 256 + Math.cos(a) * d, 340 + Math.sin(a) * d, r(3, 15))
      }
      g.fillStyle = INK
      line(g, 'Mặt Trăng có núi và miệng hố', 560, 28, 'italic')
    },
    // Ghi chép các đêm tháng 1 năm 1610: 4 chấm đổi chỗ quanh Sao Mộc nên chúng quay quanh Sao Mộc
    right: (/** @type {CanvasRenderingContext2D} */ g) => {
      line(g, 'Bốn vệ tinh của Sao Mộc', 78, 32, 'bold')
      /** @type {[string, number[]][]} */
      const nights = [['7/1', [-150, -90, 80]], ['8/1', [70, 120, 170]], ['10/1', [-140, -70]], ['11/1', [-160, -110]], ['12/1', [-120, -50, 90]], ['13/1', [50, 100, 130, 170]]]
      g.textAlign = 'left'
      nights.forEach(([day, moons], i) => {
        const y = 150 + i * 72
        g.font = "26px 'Times New Roman', serif"
        g.fillText(day, 46, y + 9)
        dot(g, 290, y, 15)
        moons.forEach((m) => dot(g, 290 + m, y, 5))
      })
      g.textAlign = 'center'
      line(g, 'Mỗi đêm một vị trí khác', 620, 28, 'italic')
    },
  },
  {
    color: '#22365c',
    spine: 'SAO',
    // Bắc Đẩu: hai sao cuối gàu chỉ về Sao Bắc Cực
    left: (/** @type {CanvasRenderingContext2D} */ g) => {
      line(g, 'Bản đồ sao phương Bắc', 78, 32, 'bold')
      g.strokeStyle = 'rgba(51,36,26,.3)'
      for (let i = 1; i < 6; i++) {
        g.beginPath()
        g.arc(256, 180, i * 76, 0, 7)
        g.stroke()
      }
      g.strokeStyle = INK
      const dipper = [[120, 440], [190, 410], [250, 400], [316, 382], [330, 450], [408, 468], [424, 396]]
      g.beginPath()
      dipper.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)))
      g.lineTo(316, 382)
      g.stroke()
      dipper.forEach(([x, y]) => dot(g, x, y, 7))
      dot(g, 256, 180, 10)
      g.setLineDash([8, 8])
      g.beginPath()
      g.moveTo(424, 396)
      g.lineTo(256, 180)
      g.stroke()
      g.setLineDash([])
      line(g, 'Sao Bắc Cực', 150, 26, 'italic')
      line(g, 'Bắc Đẩu', 530, 28, 'italic')
    },
    // Lạp Hộ với tọa độ thật, xếp trên lưới xích kinh / xích vĩ
    right: (/** @type {CanvasRenderingContext2D} */ g) => {
      line(g, 'Chòm Lạp Hộ', 78, 32, 'bold')
      g.strokeStyle = 'rgba(51,36,26,.3)'
      for (let i = 0; i < 6; i++) {
        g.beginPath()
        g.moveTo(70 + i * 75, 120)
        g.lineTo(70 + i * 75, 540)
        g.moveTo(70, 120 + i * 84)
        g.lineTo(445, 120 + i * 84)
        g.stroke()
      }
      g.strokeStyle = INK
      const orion = [[170, 190], [340, 215], [226, 330], [256, 340], [286, 350], [190, 490], [332, 480]]
      for (const [a, b] of [[0, 1], [0, 2], [1, 4], [2, 3], [3, 4], [2, 5], [4, 6]]) {
        g.beginPath()
        g.moveTo(orion[a][0], orion[a][1])
        g.lineTo(orion[b][0], orion[b][1])
        g.stroke()
      }
      orion.forEach(([x, y], i) => dot(g, x, y, i === 1 || i === 5 ? 10 : 7))
      line(g, 'xích kinh ≈ 5h 30m · xích vĩ ≈ 0°', 595, 25, 'italic')
    },
  },
]

export function buildShelf() {
  const group = new THREE.Group()
  group.userData.spot = 'shelf'
  const { add, box, cyl, ball, turned } = kit(group)

  const grain = grainTexture()
  const wood = new THREE.MeshStandardMaterial({ map: grain, roughness: 0.46 })
  const dark = new THREE.MeshStandardMaterial({ map: grain, color: 0x8d6d5c, roughness: 0.55 })
  const brass = new THREE.MeshStandardMaterial({ color: 0xc99a44, metalness: 0.6, roughness: 0.42 })

  // Khung, đáy cao, mái gờ, hai cột tiện
  box(0.56, 0.2, 3.7, dark, 0, 0.1, 0)
  ;[-1.8, 1.8].forEach((z) => box(0.5, 3.5, 0.08, wood, 0, 1.75, z))
  box(0.04, 3.5, 3.6, dark, -0.23, 1.75, 0)
  const levels = [0.2, 0.86, 1.52, 2.18, 2.84, 3.46]
  levels.forEach((y) => {
    box(0.5, 0.05, 3.6, wood, 0, y, 0)
    box(0.012, 0.022, 3.6, brass, 0.255, y, 0)
  })
  box(0.6, 0.06, 3.8, dark, 0.02, 3.53, 0)
  box(0.68, 0.05, 3.9, wood, 0.03, 3.585, 0)
  ;[-1.84, 1.84].forEach((z) => {
    turned([[0.03, 0], [0.045, 0.05], [0.03, 0.12], [0.033, 1.7], [0.04, 1.75], [0.033, 1.8], [0.028, 3.2], [0.045, 3.26], [0, 3.28]], wood, 0.25, 0.22, z)
  })

  // Hàng sách: chừa chỗ cho 3 cuốn nổi bật và đồ trưng bày
  const bandMap = paintTexture(64, 128, (g) => {
    g.fillStyle = '#ffffff'
    g.fillRect(0, 0, 64, 128)
    g.fillStyle = 'rgba(255,240,190,.95)'
    ;[14, 22, 104, 112].forEach((y) => g.fillRect(0, y, 64, 3))
    g.fillStyle = 'rgba(255,240,190,.75)'
    g.fillRect(14, 46, 36, 26)
  })
  const count = 220
  const books = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ map: bandMap, roughness: 0.62 }), count)
  books.castShadow = true
  books.receiveShadow = true
  group.add(books)
  const rnd = seeded(7)
  const palette = [0x6b2a22, 0x20402f, 0x263a5c, 0x7a5a2c, 0x4a2a44, 0x8a7a55, 0x2c2622, 0x7c3a1e, 0x1f4a4f]
  const holder = new THREE.Object3D()
  let n = 0
  /** Khoảng trống [tầng, z từ, z đến] @type {[number, number, number][]} */
  const gaps = [[2, -0.72, 0.12], [3, 0.66, 1.2], [1, -1.24, -0.62], [4, -0.3, 0.14]]
  levels.slice(0, 5).forEach((y, lv) => {
    let z = -1.72
    while (z < 1.7 && n < count) {
      const gap = gaps.find(([g, from, to]) => g === lv && z >= from && z < to)
      if (gap) {
        z = gap[2]
        continue
      }
      const t = rnd(0.05, 0.12)
      const h = rnd(0.36, 0.56)
      if (rnd(0, 1) < 0.06) {
        z += 0.2
        continue
      }
      holder.position.set(0.02, y + 0.025 + h / 2, z + t / 2)
      holder.scale.set(rnd(0.28, 0.36), h, t)
      holder.rotation.x = rnd(0, 1) < 0.09 ? 0.09 : 0
      holder.updateMatrix()
      books.setMatrixAt(n, holder.matrix)
      books.setColorAt(n, new THREE.Color(palette[Math.floor(rnd(0, palette.length))]))
      n++
      z += t + 0.004
    }
  })
  books.count = n

  // Đồng hồ cát
  turned([[0.075, 0], [0.075, 0.016], [0.02, 0.018], [0, 0.018]], wood, 0.05, 2.205, 0.93)
  turned([[0.075, 0], [0.075, 0.016], [0.02, 0.018], [0, 0.018]], wood, 0.05, 2.5, 0.93)
  ;[[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => cyl(0.005, 0.005, 0.28, brass, 0.05 + a * 0.055, 2.36, 0.93 + b * 0.055))
  turned([[0.008, 0], [0.055, 0.03], [0.058, 0.07], [0.012, 0.13], [0.058, 0.2], [0.055, 0.24], [0.008, 0.27]], new THREE.MeshStandardMaterial({ color: 0xd8eef0, transparent: true, opacity: 0.38, roughness: 0.05, side: THREE.DoubleSide, depthWrite: false }), 0.05, 2.222, 0.93)
  turned([[0, 0], [0.05, 0.012], [0.01, 0.06], [0, 0.06]], new THREE.MeshStandardMaterial({ color: 0xc9a25a, roughness: 1 }), 0.05, 2.225, 0.93)

  // Cuộn bản đồ sao
  const scrollMat = new THREE.MeshStandardMaterial({ color: 0xd9c9a2, roughness: 0.9 })
  ;[[-1.1, 0.92, 0.04], [-0.93, 0.92, -0.05], [-1.02, 1.0, 0.0], [-0.78, 0.92, 0.05]].forEach(([z, y, x]) => {
    const roll = cyl(0.036, 0.036, 0.44, scrollMat, 0.03 + x, y, z, group, 12)
    roll.rotation.z = Math.PI / 2
  })

  // Quả cầu sao nhỏ trên tầng cao
  turned([[0, 0], [0.05, 0], [0.012, 0.03], [0.012, 0.05], [0, 0.05]], brass, 0.03, 2.865, -0.08)
  ball(0.09, new THREE.MeshStandardMaterial({ color: 0x18305c, roughness: 0.35 }), 0.03, 3.0, -0.08)
  add(new THREE.TorusGeometry(0.105, 0.005, 8, 32), brass, 0.03, 3.0, -0.08).rotation.y = 0.8

  // Thang gỗ dựa vào kệ
  ;[-0.17, 0.17].forEach((s) => {
    const rail = box(0.035, 3.1, 0.05, dark, 0.46, 1.54, 2.26 + s)
    rail.rotation.z = -0.13
  })
  for (let i = 0; i < 9; i++) {
    const y = 0.32 + i * 0.32
    const rung = cyl(0.014, 0.014, 0.34, wood, 0.46 + (1.54 - y) * 0.13, y, 2.26, group, 8)
    rung.rotation.x = Math.PI / 2
  }

  // Ba cuốn nổi bật: gáy quay ra ngoài khi nằm trên kệ, mở phẳng hai trang khi đọc
  const featured = BOOKS.map((b, i) => {
    const pivot = new THREE.Group()
    pivot.userData.dynamic = true
    group.add(pivot)
    const k = kit(pivot)
    const cover = new THREE.MeshStandardMaterial({ color: b.color, roughness: 0.5 })
    const gold = new THREE.MeshStandardMaterial({ color: 0xd8ab50, metalness: 0.6, roughness: 0.4 })
    // Bìa sau + khối giấy
    k.box(W, H, 0.008, cover, 0, 0, -T / 2)
    k.box(W - 0.012, H - 0.012, T - 0.012, new THREE.MeshStandardMaterial({ color: 0xe6dcc0, roughness: 0.9 }), 0, 0, 0)
    // Gáy có chữ
    const spine = paintTexture(64, 256, (g) => {
      g.fillStyle = b.color
      g.fillRect(0, 0, 64, 256)
      g.fillStyle = '#e8c878'
      ;[14, 26, 228, 240].forEach((y) => g.fillRect(4, y, 56, 4))
      g.save()
      g.translate(34, 128)
      g.rotate(Math.PI / 2)
      g.font = "bold 30px 'Times New Roman', serif"
      g.textAlign = 'center'
      g.textBaseline = 'middle'
      g.fillText(b.spine, 0, 0)
      g.restore()
    })
    const spineMesh = k.add(new THREE.PlaneGeometry(T + 0.008, H), new THREE.MeshStandardMaterial({ map: spine, roughness: 0.5 }), -W / 2 - 0.001, 0, 0)
    spineMesh.rotation.y = -Math.PI / 2
    // Trang phải nằm trên khối giấy
    k.add(new THREE.PlaneGeometry(W - 0.016, H - 0.016), new THREE.MeshStandardMaterial({ map: pageTexture(b.right), roughness: 0.9 }), 0, 0, T / 2 - 0.004, pivot, false)
    // Bìa trước có bản lề ở gáy, mặt trong mang trang trái
    const hinge = new THREE.Group()
    hinge.position.set(-W / 2, 0, T / 2)
    pivot.add(hinge)
    k.box(W, H, 0.008, cover, W / 2, 0, 0.002, hinge)
    k.box(W * 0.7, 0.012, 0.002, gold, W / 2, H * 0.34, 0.0065, hinge)
    k.box(W * 0.7, 0.012, 0.002, gold, W / 2, -H * 0.34, 0.0065, hinge)
    const inner = k.add(new THREE.PlaneGeometry(W - 0.016, H - 0.016), new THREE.MeshStandardMaterial({ map: pageTexture(b.left), roughness: 0.9 }), W / 2, 0, -0.0025, hinge, false)
    inner.rotation.y = Math.PI
    return { pivot, hinge, restZ: -0.6 + i * 0.13, p: 0 }
  })
  mergeStatic(group)

  const restQuat = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, Math.PI, 0))
  const readQuat = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, Math.PI / 2, 0))
  const rest = new THREE.Vector3()
  const read = new THREE.Vector3()
  /** @type {number} */
  let picked = -1
  // Vị trí đọc tính theo nơi camera dừng (do labScene truyền vào, khác nhau giữa máy tính và điện thoại)
  let readX = 1.05
  let readY = 1.62
  let readZ = 0.95

  featured.forEach((b) => {
    b.pivot.position.set(0.02, REST_Y + H / 2, b.restZ)
    b.pivot.quaternion.copy(restQuat)
  })

  return {
    group,
    /** @param {number} x @param {number} y @param {number} z */
    readingSpot(x, y, z) {
      readX = x
      readY = y
      readZ = z
    },
    /** @param {number} i -1 = cất hết */
    pickBook(i) {
      picked = i
    },
    /** @param {number} dt */
    update(dt) {
      featured.forEach((b, i) => {
        const target = i === picked ? 1 : 0
        if (b.p === target) return
        b.p = approach(b.p, target, 3.4, dt)
        if (Math.abs(b.p - target) < 0.002) b.p = target
        // Rút ra trước, xoay về phía người đọc rồi mới mở bìa
        const move = Math.min(1, b.p / 0.7)
        rest.set(0.02, REST_Y + H / 2, b.restZ)
        read.set(readX, readY, readZ)
        b.pivot.position.lerpVectors(rest, read, move)
        b.pivot.quaternion.slerpQuaternions(restQuat, readQuat, move)
        b.hinge.rotation.y = -Math.PI * Math.max(0, (b.p - 0.55) / 0.45)
      })
    },
  }
}
