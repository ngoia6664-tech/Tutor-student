// Bàn thí nghiệm: thử màu ngọn lửa. Rắc muối vào đèn cồn, ánh sáng qua lăng kính thành các vạch phổ riêng của từng nguyên tố trên màn đặt sau bàn.
import * as THREE from 'three'
import { FLAME_SALTS, spectrumX, wavelengthColor } from '../../lib/labPhysics.js'
import { approach, grainTexture, kit, mergeStatic, paintTexture } from './labKit.js'

const PLAIN_FLAME = '#6aa8ff' // cồn cháy cho lửa xanh nhạt
const flameProfile = (/** @type {number} */ w, /** @type {number} */ h) => [[0, 0], [w * 0.75, h * 0.1], [w, h * 0.28], [w * 0.8, h * 0.5], [w * 0.38, h * 0.76], [0, h]].map(([x, y]) => new THREE.Vector2(x, y))

export function buildBench() {
  const group = new THREE.Group()
  group.userData.spot = 'desk'
  const { add, box, cyl, ball, turned } = kit(group)

  const grain = grainTexture()
  const wood = new THREE.MeshStandardMaterial({ map: grain, roughness: 0.46 })
  const dark = new THREE.MeshStandardMaterial({ map: grain, color: 0x8d6d5c, roughness: 0.55 })
  const brass = new THREE.MeshStandardMaterial({ color: 0xc99a44, metalness: 0.6, roughness: 0.42 })
  const glass = new THREE.MeshStandardMaterial({ color: 0xcfe6ee, transparent: true, opacity: 0.32, metalness: 0.2, roughness: 0.06, side: THREE.DoubleSide, depthWrite: false })
  const porcelain = new THREE.MeshStandardMaterial({ color: 0xece8de, roughness: 0.35 })

  // Mặt bàn, yếm, chân tiện, ngăn kéo
  box(3.1, 0.07, 1.25, wood, 0, 1, 0)
  box(3.16, 0.025, 1.31, dark, 0, 0.955, 0)
  box(2.9, 0.16, 1.1, dark, 0, 0.87, 0)
  ;[[-1.45, -0.54], [1.45, -0.54], [-1.45, 0.54], [1.45, 0.54]].forEach(([x, z]) => {
    turned([[0.03, 0], [0.042, 0.04], [0.03, 0.1], [0.05, 0.3], [0.036, 0.52], [0.05, 0.62], [0.05, 0.8], [0, 0.8]], wood, x, 0, z)
  })
  ;[-0.8, 0.8].forEach((x) => {
    box(0.86, 0.12, 0.02, wood, x, 0.87, 0.555)
    add(new THREE.TorusGeometry(0.035, 0.006, 8, 16, Math.PI), brass, x, 0.85, 0.57).rotation.z = Math.PI
  })

  // Đèn bàn chao xanh
  turned([[0, 0], [0.15, 0], [0.15, 0.015], [0.1, 0.04], [0.03, 0.06], [0.016, 0.1], [0, 0.1]], brass, -1.1, 1.035, -0.2)
  cyl(0.012, 0.012, 0.45, brass, -1.1, 1.3, -0.2)
  turned([[0.26, 0], [0.24, 0.05], [0.16, 0.14], [0.06, 0.19], [0.015, 0.2]], new THREE.MeshStandardMaterial({ color: 0x1d5a40, roughness: 0.3, side: THREE.DoubleSide }), -1.1, 1.5, -0.2)
  ball(0.05, new THREE.MeshBasicMaterial({ color: 0xffe0a0 }), -1.1, 1.54, -0.2).castShadow = false
  cyl(0.002, 0.002, 0.14, brass, -0.96, 1.42, -0.2, group, 6)
  ball(0.009, brass, -0.96, 1.345, -0.2)

  // Khay 4 đĩa muối + thẻ tên; muối đồng màu xanh, các muối khác màu trắng
  box(1.02, 0.015, 0.24, dark, 0.46, 1.043, 0.36)
  const dishes = FLAME_SALTS.map((s, i) => {
    const x = 0.1 + i * 0.24
    turned([[0, 0], [0.06, 0], [0.09, 0.022], [0.092, 0.03], [0.07, 0.012], [0, 0.012]], porcelain, x, 1.05, 0.32)
    const heap = ball(0.05, new THREE.MeshStandardMaterial({ color: s.id === 'cu' ? 0x3fa3c9 : 0xf1efe9, roughness: 0.95 }), x, 1.062, 0.32)
    heap.scale.y = 0.35
    const tag = paintTexture(128, 48, (g) => {
      g.fillStyle = '#efe3c5'
      g.fillRect(0, 0, 128, 48)
      g.fillStyle = '#2b1d12'
      g.font = "bold 30px 'Times New Roman', serif"
      g.textAlign = 'center'
      g.textBaseline = 'middle'
      g.fillText(s.salt, 64, 26)
    })
    const card = add(new THREE.PlaneGeometry(0.15, 0.056), new THREE.MeshStandardMaterial({ map: tag, roughness: 0.85 }), x, 1.056, 0.44, group, false)
    card.rotation.x = -Math.PI / 2
    return x
  })
  const marker = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.006, 8, 36), new THREE.MeshBasicMaterial({ color: 0xffd590 }))
  marker.rotation.x = Math.PI / 2
  marker.position.set(0, 1.054, 0.32)
  marker.visible = false
  marker.userData.dynamic = true
  group.add(marker)

  // Đèn cồn: bầu thủy tinh, cồn bên trong, cổ đồng, bấc
  const burnerX = 0.55
  const burnerZ = -0.08
  turned([[0, 0], [0.075, 0], [0.09, 0.03], [0.075, 0.09], [0.03, 0.12], [0.022, 0.15]], glass, burnerX, 1.035, burnerZ)
  turned([[0, 0], [0.07, 0], [0.083, 0.03], [0.07, 0.06], [0, 0.06]], new THREE.MeshStandardMaterial({ color: 0x6fb7c9, transparent: true, opacity: 0.55, roughness: 0.1 }), burnerX, 1.04, burnerZ)
  cyl(0.024, 0.03, 0.03, brass, burnerX, 1.195, burnerZ)
  cyl(0.008, 0.008, 0.03, new THREE.MeshStandardMaterial({ color: 0xece4d0, roughness: 1 }), burnerX, 1.222, burnerZ)

  // Ngọn lửa: hai lớp cộng sáng, không đổ bóng, không ghi độ sâu
  const flame = new THREE.Group()
  flame.position.set(burnerX, 1.235, burnerZ)
  flame.userData.dynamic = true
  group.add(flame)
  // Tắt ánh xạ tông màu: màu ngọn lửa chính là kết quả thí nghiệm, không được bạc thành trắng
  const flameMat = new THREE.MeshBasicMaterial({ color: PLAIN_FLAME, transparent: true, opacity: 0.6, depthWrite: false, side: THREE.DoubleSide, fog: false, toneMapped: false })
  flame.add(new THREE.Mesh(new THREE.LatheGeometry(flameProfile(0.038, 0.17), 16), flameMat))
  flame.add(new THREE.Mesh(new THREE.LatheGeometry(flameProfile(0.016, 0.07), 12), new THREE.MeshBasicMaterial({ color: 0xfff4d8, transparent: true, opacity: 0.75, depthWrite: false, fog: false, toneMapped: false })))
  const light = new THREE.PointLight(PLAIN_FLAME, 1.6, 2.6, 2)
  light.position.set(burnerX, 1.3, burnerZ)
  group.add(light)

  // Lăng kính trên giá đồng + màn hứng phổ
  const prismX = 0.98
  const prismZ = -0.08
  turned([[0, 0], [0.06, 0], [0.05, 0.015], [0.012, 0.03], [0.009, 0.16], [0, 0.16]], brass, prismX, 1.035, prismZ)
  const tri = new THREE.Shape()
  tri.moveTo(-0.055, 0)
  tri.lineTo(0.055, 0)
  tri.lineTo(0, 0.095)
  tri.closePath()
  add(new THREE.ExtrudeGeometry(tri, { depth: 0.12, bevelEnabled: false }), new THREE.MeshStandardMaterial({ color: 0xd8eef7, transparent: true, opacity: 0.5, metalness: 0.3, roughness: 0.04, side: THREE.DoubleSide, depthWrite: false }), prismX, 1.195, prismZ - 0.06, group, false)

  const screenC = document.createElement('canvas')
  screenC.width = 640
  screenC.height = 300
  const screenTex = new THREE.CanvasTexture(screenC)
  screenTex.colorSpace = THREE.SRGBColorSpace
  screenTex.anisotropy = 8
  /** Vẽ vạch phổ của muối đang chọn. @param {number[]} lines */
  function drawScreen(lines) {
    const g = screenC.getContext('2d')
    if (!g) return
    g.fillStyle = '#07070b'
    g.fillRect(0, 0, 640, 300)
    for (const nm of lines) {
      g.fillStyle = wavelengthColor(nm)
      g.shadowColor = g.fillStyle
      g.shadowBlur = 16
      g.fillRect(30 + spectrumX(nm) * 580 - 2, 32, 4, 190)
    }
    g.shadowBlur = 0
    g.fillStyle = '#e8dcc0'
    g.font = "24px 'Times New Roman', serif"
    g.textAlign = 'center'
    for (const nm of [400, 500, 600, 700]) {
      const x = 30 + spectrumX(nm) * 580
      g.fillRect(x - 1, 224, 2, 12)
      g.fillText(`${nm} nm`, x, 264)
    }
    screenTex.needsUpdate = true
  }
  drawScreen([])
  const screenX = 1.14
  const screenZ = -0.5
  box(0.6, 0.33, 0.02, dark, screenX, 1.33, screenZ)
  add(new THREE.PlaneGeometry(0.56, 0.29), new THREE.MeshBasicMaterial({ map: screenTex }), screenX, 1.33, screenZ + 0.011, group, false)
  turned([[0, 0], [0.09, 0], [0.07, 0.015], [0.012, 0.03], [0.01, 0.13], [0, 0.13]], brass, screenX, 1.035, screenZ)

  // Tia sáng từ lửa đến lăng kính rồi đến màn: chỉ hiện khi có muối
  const beamMat = new THREE.MeshBasicMaterial({ color: PLAIN_FLAME, transparent: true, opacity: 0.2, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false })
  /** @param {THREE.Vector3} a @param {THREE.Vector3} b @param {number} w1 @param {number} w2 */
  function beam(a, b, w1, w2) {
    const len = a.distanceTo(b)
    const m = new THREE.Mesh(new THREE.CylinderGeometry(w2, w1, len, 8, 1, true), beamMat)
    m.position.copy(a).add(b).multiplyScalar(0.5)
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize())
    m.userData.dynamic = true
    m.visible = false
    group.add(m)
    return m
  }
  const beams = [
    beam(new THREE.Vector3(burnerX + 0.03, 1.3, burnerZ), new THREE.Vector3(prismX, 1.24, prismZ), 0.014, 0.008),
    beam(new THREE.Vector3(prismX, 1.24, prismZ), new THREE.Vector3(screenX, 1.33, screenZ), 0.006, 0.02),
  ]

  // Giá ống nghiệm + bình cầu đặt cho đúng không khí phòng thí nghiệm
  box(0.42, 0.018, 0.1, dark, 0.05, 1.04, -0.42)
  box(0.42, 0.018, 0.1, dark, 0.05, 1.16, -0.42)
  ;[-1, 1].forEach((s) => box(0.016, 0.14, 0.1, dark, 0.05 + s * 0.2, 1.1, -0.42))
  ;['#d9a13a', '#3f9fd0', '#c76fd8', '#d9506a'].forEach((c, i) => {
    const x = -0.09 + i * 0.09
    turned([[0, 0], [0.012, 0.004], [0.018, 0.016], [0.018, 0.2]], glass, x, 1.045, -0.42)
    turned([[0, 0], [0.012, 0.004], [0.016, 0.016], [0.016, 0.09], [0, 0.09]], new THREE.MeshStandardMaterial({ color: c, transparent: true, opacity: 0.85, roughness: 0.2 }), x, 1.046, -0.42)
  })
  /** Vòm cầu từ đáy lên. @param {number} r @param {number} to góc dừng (rad) */
  const bulb = (r, to) => Array.from({ length: 15 }, (_, i) => {
    const a = (i / 14) * to
    return [Math.sin(a) * r, r - Math.cos(a) * r]
  })
  const flaskR = 0.105
  turned([...bulb(flaskR, 2.8), [0.03, 0.235], [0.028, 0.33], [0.036, 0.34]], glass, 1.32, 1.035, 0.28)
  // Mặt dung dịch phẳng, ở ngang lưng bình
  turned([...bulb(flaskR * 0.96, 1.35), [0, 0.096]], new THREE.MeshStandardMaterial({ color: 0x4fb98a, transparent: true, opacity: 0.62, roughness: 0.15, side: THREE.DoubleSide }), 1.32, 1.038, 0.28)

  // Sổ tay nghiên cứu: món bấm được riêng, đặt trên cùng mặt bàn
  const journal = new THREE.Group()
  journal.userData.spot = 'journal'
  const j = kit(journal)
  const page = (/** @type {boolean} */ left) => paintTexture(360, 480, (g) => {
    g.fillStyle = '#efe4c8'
    g.fillRect(0, 0, 360, 480)
    g.strokeStyle = '#3a2a18'
    g.lineWidth = 3
    g.fillStyle = '#2b1d12'
    g.font = "italic bold 30px 'Times New Roman', serif"
    if (left) {
      g.fillText('Nhật ký quan sát', 30, 52)
      for (let y = 88; y < 450; y += 30) {
        g.beginPath()
        g.moveTo(30, y)
        g.lineTo(150 + ((y * 37) % 170), y + 1)
        g.stroke()
      }
    } else {
      // Hình vẽ tay: Sao Mộc và 4 vệ tinh
      g.beginPath()
      g.arc(110, 120, 42, 0, 7)
      g.stroke()
      for (const [x, y] of [[190, 118], [226, 124], [262, 116], [310, 121]]) {
        g.beginPath()
        g.arc(x, y, 6, 0, 7)
        g.fill()
      }
      for (let y = 220; y < 450; y += 30) {
        g.beginPath()
        g.moveTo(30, y)
        g.lineTo(130 + ((y * 53) % 190), y + 1)
        g.stroke()
      }
    }
  })
  const jBase = 1.036
  j.box(0.78, 0.016, 0.5, new THREE.MeshStandardMaterial({ color: 0x5c2a1c, roughness: 0.55 }), -0.45, jBase + 0.008, 0.16)
  ;[[-0.63, 0.05], [-0.27, -0.05]].forEach(([x, tilt], i) => {
    j.box(0.35, 0.03, 0.46, new THREE.MeshStandardMaterial({ color: 0xe4d8ba, roughness: 0.9 }), x, jBase + 0.03, 0.16).rotation.z = tilt
    const sheet = j.add(new THREE.PlaneGeometry(0.34, 0.45), new THREE.MeshStandardMaterial({ map: page(i === 0), roughness: 0.9 }), x, jBase + 0.046, 0.16, journal, false)
    sheet.rotation.set(-Math.PI / 2, tilt, 0, 'YXZ')
  })
  // Lọ mực + bút lông
  j.turned([[0, 0], [0.05, 0], [0.05, 0.05], [0.022, 0.07], [0.022, 0.085], [0, 0.085]], new THREE.MeshStandardMaterial({ color: 0x12182a, roughness: 0.15 }), -0.02, jBase, -0.12)
  const quill = j.cyl(0.002, 0.004, 0.32, new THREE.MeshStandardMaterial({ color: 0xe6e0d0, roughness: 0.6 }), -0.02, jBase + 0.2, -0.1)
  quill.rotation.z = -0.32
  const vane = j.ball(0.05, new THREE.MeshStandardMaterial({ color: 0xe9e4d6, roughness: 0.8 }), 0.03, jBase + 0.3, -0.1)
  vane.scale.set(0.28, 1.9, 0.1)
  vane.rotation.z = -0.32

  mergeStatic(group)
  mergeStatic(journal)

  const flameColor = new THREE.Color(PLAIN_FLAME)
  const flameTo = new THREE.Color(PLAIN_FLAME)
  let puff = 0

  return {
    group,
    journal,
    /** Chọn muối; null = lửa cồn trơn, màn tối. @param {string | null} id */
    setSalt(id) {
      const i = FLAME_SALTS.findIndex((s) => s.id === id)
      flameTo.set(i >= 0 ? FLAME_SALTS[i].flame : PLAIN_FLAME)
      drawScreen(i >= 0 ? FLAME_SALTS[i].lines : [])
      marker.visible = i >= 0
      if (i >= 0) {
        marker.position.x = dishes[i]
        puff = 1
      }
      beams.forEach((b) => {
        b.visible = i >= 0
      })
    },
    /** @param {number} t @param {number} dt @param {boolean} calm */
    update(t, dt, calm) {
      flameColor.lerp(flameTo, Math.min(1, dt * 5))
      flameMat.color.copy(flameColor)
      beamMat.color.copy(flameColor)
      light.color.copy(flameColor)
      puff = approach(puff, 0, 2.2, dt)
      const wave = calm ? 0 : Math.sin(t * 11) * 0.07 + Math.sin(t * 23) * 0.04
      flame.scale.set(1 + puff * 0.8 - wave * 0.5, 1 + puff * 1.1 + wave, 1 + puff * 0.8 - wave * 0.5)
      light.intensity = 1.6 + puff * 1.6 + wave * 2
    },
  }
}
