// Tủ tám ngăn kéo + mô hình Hệ Mặt Trời cơ khí bằng đồng. Tốc độ từng cánh tay lấy đúng chu kì thật nên tự nghiệm được định luật III Kepler.
import * as THREE from 'three'
import { ORRERY_PLANETS } from '../../lib/labPhysics.js'
import { approach, grainTexture, kit, mergeStatic, paintTexture } from './labKit.js'

const SECONDS_PER_YEAR = 10 // Trái Đất quay một vòng trên mô hình mất 10 giây
const ARM_SCALE = 0.24 // 1 AU trên mô hình
const LABELS = ['Khoáng vật', 'Mẫu đá', 'Bản đồ', 'La bàn', 'Đo góc', 'Thị kính', 'Thiên thạch', 'Lăng kính']

/** Bánh răng. @param {number} radius @param {number} teeth @param {number} depth */
function gearGeometry(radius, teeth, depth) {
  const s = new THREE.Shape()
  const tooth = (Math.PI * 2) / teeth
  for (let i = 0; i < teeth; i++) {
    const a = i * tooth
    /** @type {[number, number][]} */
    const pts = [[a, radius * 0.86], [a + tooth * 0.2, radius], [a + tooth * 0.5, radius], [a + tooth * 0.7, radius * 0.86]]
    pts.forEach(([ang, r], k) => {
      const x = Math.cos(ang) * r
      const y = Math.sin(ang) * r
      if (i === 0 && k === 0) s.moveTo(x, y)
      else s.lineTo(x, y)
    })
  }
  s.closePath()
  const geo = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: false })
  geo.rotateX(-Math.PI / 2)
  return geo
}

/** Hòn đá sần sùi: khối cầu thô bị xô lệch đỉnh. @param {number} r @param {number} seed */
function rockGeometry(r, seed) {
  const geo = new THREE.IcosahedronGeometry(r, 1)
  const pos = geo.attributes.position
  for (let i = 0; i < pos.count; i++) {
    // Đỉnh trùng toạ độ phải lệch như nhau, nếu không mặt đá sẽ bị hở
    const k = 1 + 0.28 * Math.sin(pos.getX(i) * 31 + seed) * Math.cos(pos.getY(i) * 27 + seed * 2) * Math.sin(pos.getZ(i) * 23)
    pos.setXYZ(i, pos.getX(i) * k, pos.getY(i) * k * 0.72, pos.getZ(i) * k)
  }
  geo.computeVertexNormals()
  return geo
}

export function buildCabinet() {
  const group = new THREE.Group()
  group.userData.spot = 'cabinet'
  const { add, box, cyl, ball, turned } = kit(group)

  const grain = grainTexture()
  const wood = new THREE.MeshStandardMaterial({ map: grain, roughness: 0.42 })
  const dark = new THREE.MeshStandardMaterial({ map: grain, color: 0x8d6d5c, roughness: 0.5 })
  // Đồng không quá bóng, kẻo đèn phòng phản lại thành chấm sáng chói trên núm kéo
  const brass = new THREE.MeshStandardMaterial({ color: 0xc99a44, metalness: 0.55, roughness: 0.48 })
  const shiny = new THREE.MeshStandardMaterial({ color: 0xd8ab50, metalness: 0.82, roughness: 0.32 })

  // Thân tủ
  box(1.6, 0.12, 0.7, dark, 0, 0.06, 0)
  box(1.5, 1.16, 0.62, wood, 0, 0.7, 0)
  box(1.6, 0.04, 0.68, dark, 0, 1.3, 0)
  box(1.66, 0.04, 0.74, wood, 0, 1.34, 0)
  ;[-1, 1].forEach((s) => box(0.05, 1.16, 0.05, dark, s * 0.75, 0.7, 0.31))
  box(0.05, 1.16, 0.03, dark, 0, 0.7, 0.315)

  const front = 0.31
  /**
   * Mặt ngăn kéo, tay nắm, thẻ tên.
   * @param {THREE.Object3D} parent @param {number} x @param {number} y @param {number} z @param {string} label
   */
  function drawerFront(parent, x, y, z, label) {
    box(0.68, 0.25, 0.03, wood, x, y, z, parent)
    box(0.58, 0.17, 0.012, dark, x, y, z + 0.018, parent)
    const pull = add(new THREE.TorusGeometry(0.038, 0.007, 8, 18, Math.PI), brass, x, y - 0.03, z + 0.03, parent)
    pull.rotation.z = Math.PI
    ;[-1, 1].forEach((s) => cyl(0.009, 0.009, 0.012, brass, x + s * 0.038, y - 0.03, z + 0.03, parent).rotation.x = Math.PI / 2)
    box(0.17, 0.05, 0.004, brass, x, y + 0.04, z + 0.026, parent)
    const tag = paintTexture(170, 50, (g) => {
      g.fillStyle = '#efe3c5'
      g.fillRect(0, 0, 170, 50)
      g.fillStyle = '#2b1d12'
      g.font = "bold 24px 'Times New Roman', serif"
      g.textAlign = 'center'
      g.textBaseline = 'middle'
      g.fillText(label, 85, 26)
    })
    add(new THREE.PlaneGeometry(0.15, 0.04), new THREE.MeshStandardMaterial({ map: tag, roughness: 0.8 }), x, y + 0.04, z + 0.029, parent, false)
  }

  // Khoang tối hiện ra khi ngăn trên cùng bên trái kéo ra
  box(0.66, 0.24, 0.002, new THREE.MeshStandardMaterial({ color: 0x080503, roughness: 1 }), -0.36, 1.07, front + 0.001)
  LABELS.forEach((label, i) => {
    const y = 0.2 + (i >> 1) * 0.29
    const x = i % 2 ? 0.36 : -0.36
    if (i !== 6) drawerFront(group, x, y, front + 0.018, label)
  })

  // Ngăn kéo được mở: thiên thạch, lăng kính, thị kính nằm trên nỉ xanh
  const drawer = new THREE.Group()
  drawer.userData.dynamic = true
  drawer.position.set(-0.36, 1.07, 0)
  group.add(drawer)
  drawerFront(drawer, 0, 0, front + 0.018, LABELS[6])
  box(0.62, 0.015, 0.54, new THREE.MeshStandardMaterial({ color: 0x1d4a34, roughness: 1 }), 0, -0.07, front - 0.27, drawer)
  ;[-1, 1].forEach((s) => box(0.012, 0.13, 0.54, wood, s * 0.31, -0.02, front - 0.27, drawer))
  const iron = new THREE.MeshStandardMaterial({ color: 0x5a544d, metalness: 0.7, roughness: 0.55, flatShading: true })
  const stone = new THREE.MeshStandardMaterial({ color: 0x8c8378, roughness: 0.9, flatShading: true })
  add(rockGeometry(0.058, 1), iron, -0.19, -0.022, front - 0.17, drawer)
  add(rockGeometry(0.04, 2), iron, -0.09, -0.032, front - 0.27, drawer)
  add(rockGeometry(0.046, 3), stone, -0.21, -0.03, front - 0.34, drawer)
  // Lăng kính thủy tinh + vệt cầu vồng do nó tán sắc trên nỉ
  const tri = new THREE.Shape()
  tri.moveTo(-0.04, 0)
  tri.lineTo(0.04, 0)
  tri.lineTo(0, 0.07)
  tri.closePath()
  const prism = add(
    new THREE.ExtrudeGeometry(tri, { depth: 0.13, bevelEnabled: false }),
    new THREE.MeshStandardMaterial({ color: 0xcfe8f5, transparent: true, opacity: 0.55, metalness: 0.3, roughness: 0.05 }),
    0.05, -0.062, front - 0.31, drawer, false,
  )
  prism.rotation.y = 0.3
  const rainbow = paintTexture(128, 16, (g) => {
    const r = g.createLinearGradient(0, 0, 128, 0)
    ;['#ff3030', '#ff9a20', '#ffe640', '#40e060', '#30b0ff', '#6050ff', '#b040ff'].forEach((c, i) => r.addColorStop(i / 6, c))
    g.fillStyle = r
    g.fillRect(0, 0, 128, 16)
  })
  const streak = add(new THREE.PlaneGeometry(0.2, 0.06), new THREE.MeshBasicMaterial({ map: rainbow, transparent: true, opacity: 0.85 }), 0.19, -0.061, front - 0.24, drawer, false)
  streak.rotation.x = -Math.PI / 2
  // Hai thị kính 25 mm, 10 mm
  ;[[0.17, 0.018], [0.25, 0.013]].forEach(([x, r]) => {
    cyl(r, r, 0.07, shiny, x, -0.03, front - 0.1, drawer).rotation.x = Math.PI / 2
    cyl(r * 1.5, r * 1.5, 0.018, new THREE.MeshStandardMaterial({ color: 0x1a1a20, roughness: 0.5 }), x, -0.03, front - 0.056, drawer).rotation.x = Math.PI / 2
  })

  // ------- Mô hình Hệ Mặt Trời -------
  const orrery = new THREE.Group()
  orrery.userData.dynamic = true
  orrery.position.set(0, 1.36, 0)
  group.add(orrery)
  const o = kit(orrery)
  /** Bóng trong phòng tính một lần nên phần đang quay không đổ bóng */
  const noShadow = (/** @type {THREE.Object3D} */ root) => root.traverse((x) => { x.castShadow = false })

  o.turned([[0, 0], [0.26, 0], [0.26, 0.02], [0.23, 0.035], [0.2, 0.05], [0, 0.05]], dark, 0, 0, 0)
  o.add(new THREE.TorusGeometry(0.235, 0.006, 8, 48), shiny, 0, 0.037, 0).rotation.x = Math.PI / 2
  // Vòng số 12 tháng khắc trên đế
  const months = paintTexture(256, 256, (g) => {
    g.fillStyle = '#b98d3c'
    g.fillRect(0, 0, 256, 256)
    g.translate(128, 128)
    g.fillStyle = '#2b1b08'
    g.font = "bold 18px 'Times New Roman', serif"
    g.textAlign = 'center'
    for (let i = 0; i < 12; i++) {
      g.save()
      g.rotate((i / 12) * Math.PI * 2)
      g.fillRect(-1, -120, 2, 14)
      g.fillText(String(i + 1), 0, -92)
      g.restore()
    }
  })
  o.add(new THREE.CircleGeometry(0.19, 48), new THREE.MeshStandardMaterial({ map: months, metalness: 0.15, roughness: 0.5 }), 0, 0.052, 0).rotation.x = -Math.PI / 2

  const gears = [
    { mesh: o.add(gearGeometry(0.07, 18, 0.012), shiny, 0.11, 0.054, 0.06), speed: 1 },
    { mesh: o.add(gearGeometry(0.045, 12, 0.012), brass, 0.19, 0.054, 0.01), speed: -1.5 },
    { mesh: o.add(gearGeometry(0.055, 14, 0.012), brass, -0.1, 0.054, -0.09), speed: -1.29 },
  ]
  o.turned([[0.024, 0.05], [0.03, 0.08], [0.016, 0.11], [0.014, 0.5], [0.022, 0.52], [0.012, 0.56]], shiny, 0, 0, 0)
  // Mặt Trời cao hơn mọi cánh tay nên không hành tinh nào chui qua
  o.ball(0.07, new THREE.MeshStandardMaterial({ color: 0xffc95e, emissive: 0xff9d2e, emissiveIntensity: 1.25, roughness: 0.4 }), 0, 0.62, 0)
  const halo = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.003, 8, 32), shiny)
  orrery.add(halo)

  const arms = ORRERY_PLANETS.map((p, i) => {
    const arm = new THREE.Group()
    const y = 0.2 + i * 0.09
    arm.position.y = y
    orrery.add(arm)
    const len = p.a * ARM_SCALE
    o.cyl(0.024, 0.024, 0.014, shiny, 0, 0, 0, arm)
    o.box(len + 0.05, 0.007, 0.014, brass, (len - 0.05) / 2, 0, 0, arm)
    o.ball(0.012, shiny, -0.05, 0, 0, arm)
    // Cột đứng đưa hành tinh về cùng mặt phẳng với Mặt Trời
    const rise = 0.62 - y
    o.cyl(0.004, 0.004, rise, shiny, len, rise / 2, 0, arm, 8)
    const size = [0.024, 0.027, 0.02][i]
    const mat = new THREE.MeshStandardMaterial({ color: p.color, roughness: 0.55, emissive: p.color, emissiveIntensity: 0 })
    const planet = o.ball(size, mat, len, rise, 0, arm)
    return { arm, mat, planet, size, speed: (Math.PI * 2) / (p.T * SECONDS_PER_YEAR) }
  })
  // Mặt Trăng tí hon quay quanh Trái Đất
  const moonArm = new THREE.Group()
  moonArm.position.copy(arms[1].planet.position)
  arms[1].arm.add(moonArm)
  o.ball(0.007, new THREE.MeshStandardMaterial({ color: 0xd6d3cc, roughness: 0.8 }), 0.05, 0, 0, moonArm)
  noShadow(orrery)

  mergeStatic(group)

  let pullTo = 0
  let pull = 0
  /** @type {number} */
  let picked = -1

  return {
    group,
    /** @param {number} i -1 = bỏ chọn */
    pickPlanet(i) {
      picked = i
      arms.forEach((a, k) => {
        a.mat.emissiveIntensity = k === i ? 0.9 : 0
      })
      halo.visible = i >= 0
      if (i >= 0) {
        halo.removeFromParent()
        arms[i].arm.add(halo)
        halo.position.copy(arms[i].planet.position)
        halo.scale.setScalar((arms[i].size * 1.7) / 0.05)
      }
    },
    /** @param {boolean} open */
    setDrawer(open) {
      pullTo = open ? 0.36 : 0
    },
    reset() {
      pullTo = 0
      this.pickPlanet(-1)
    },
    /** @param {number} t @param {number} dt @param {boolean} calm */
    update(t, dt, calm) {
      pull = approach(pull, pullTo, 4, dt)
      drawer.position.z = pull
      const go = calm && picked < 0 ? 0 : t
      arms.forEach((a) => {
        a.arm.rotation.y = -go * a.speed
      })
      moonArm.rotation.y = -go * 4
      gears.forEach((g) => {
        g.mesh.rotation.y = go * g.speed
      })
    },
  }
}
