// Giáo sư Gấu Trúc 3D: áo choàng học giả, gi-lê, nơ đỏ, mũ vuông, kính đồng; tay phải cầm que chỉ bảng, tay trái ôm sách.
import * as THREE from 'three'

const soft = (/** @type {number} */ color, roughness = 0.82) => new THREE.MeshStandardMaterial({ color, roughness })
const brass = new THREE.MeshStandardMaterial({ color: 0xd8a744, metalness: 0.85, roughness: 0.32 })

/**
 * Thêm một khối vào nhóm, gọn cho hàng chục bộ phận của gấu.
 * @param {THREE.Object3D} parent
 * @param {THREE.BufferGeometry} geo
 * @param {THREE.Material} mat
 * @param {[number, number, number]} pos
 * @param {[number, number, number]} [scale]
 * @param {[number, number, number]} [rot]
 */
function part(parent, geo, mat, pos, scale, rot) {
  const m = new THREE.Mesh(geo, mat)
  m.position.set(...pos)
  if (scale) m.scale.set(...scale)
  if (rot) m.rotation.set(...rot)
  m.castShadow = true
  parent.add(m)
  return m
}

const sphere = new THREE.SphereGeometry(1, 32, 24)

/** @returns {{ group: THREE.Group, wave: () => void, update: (t: number, dt: number, camPos: THREE.Vector3) => void }} */
export function buildPanda() {
  const white = soft(0xf6f1e6)
  const black = soft(0x1b191c, 0.7)
  const robe = soft(0x2f4186, 0.72)
  const vest = soft(0x6d2230, 0.75)
  const shirt = soft(0xf4efe6, 0.8)
  const red = soft(0xc62f35, 0.55)
  const gold = soft(0xe2b24f, 0.5)

  const group = new THREE.Group()
  const body = new THREE.Group()
  group.add(body)

  // Áo choàng dáng chuông, xoay từ một đường cong nên không lộ góc cạnh
  const profile = [[0.43, 0.04], [0.42, 0.14], [0.37, 0.34], [0.335, 0.56], [0.325, 0.74], [0.29, 0.9], [0.18, 1.01], [0.02, 1.05]]
    .map(([x, y]) => new THREE.Vector2(x, y))
  part(body, new THREE.LatheGeometry(profile, 48), robe, [0, 0, 0])
  const hem = part(body, new THREE.TorusGeometry(0.43, 0.022, 10, 56), gold, [0, 0.045, 0])
  hem.rotation.x = Math.PI / 2

  // Phần áo trong lộ ra ở giữa áo choàng
  part(body, sphere, vest, [0, 0.54, 0.22], [0.165, 0.33, 0.185])
  part(body, sphere, shirt, [0, 0.82, 0.215], [0.13, 0.17, 0.11])
  ;[0.7, 0.58, 0.46].forEach((y) => part(body, sphere, brass, [0, y, 0.395], [0.017, 0.017, 0.012]))
  // Dây đồng hồ quả quýt vắt trên gi-lê
  const chain = part(body, new THREE.TorusGeometry(0.06, 0.005, 8, 24, Math.PI), brass, [0.06, 0.6, 0.385])
  chain.rotation.z = Math.PI

  // Hai vạt viền vàng của áo choàng
  ;[-1, 1].forEach((s) => {
    part(body, new THREE.BoxGeometry(0.07, 0.8, 0.05), gold, [s * 0.205, 0.5, 0.285], undefined, [-0.2, s * 0.6, s * -0.11])
    part(body, sphere, black, [s * 0.18, 0.055, 0.34], [0.14, 0.075, 0.2])
  })

  // Nơ đỏ
  ;[-1, 1].forEach((s) => part(body, new THREE.ConeGeometry(0.058, 0.13, 16), red, [s * 0.072, 0.93, 0.285], [1, 1, 0.55], [0, 0, s * Math.PI / 2]))
  part(body, sphere, red, [0, 0.93, 0.292], [0.028, 0.03, 0.024])

  // Đầu
  const head = new THREE.Group()
  head.position.set(0, 1.33, 0.03)
  body.add(head)
  part(head, sphere, white, [0, 0, 0], [0.38, 0.345, 0.35])
  ;[-1, 1].forEach((s) => {
    part(head, sphere, black, [s * 0.32, 0.23, -0.02], [0.115, 0.115, 0.08])
    part(head, sphere, soft(0xf0a8a0, 0.9), [s * 0.215, -0.085, 0.27], [0.058, 0.036, 0.02], [0, s * 0.62, 0])
    // Quầng mắt nghiêng, đặc trưng của gấu trúc
    part(head, sphere, black, [s * 0.135, 0.03, 0.302], [0.082, 0.105, 0.04], [0, s * 0.3, s * 0.42])
    part(head, new THREE.TorusGeometry(0.09, 0.009, 10, 36), brass, [s * 0.135, 0.03, 0.352], undefined, [0, s * 0.28, 0])
    part(head, new THREE.CylinderGeometry(0.006, 0.006, 0.3, 8), brass, [s * 0.262, 0.05, 0.2], undefined, [Math.PI / 2, 0, s * 0.5])
  })
  part(head, new THREE.CylinderGeometry(0.006, 0.006, 0.09, 8), brass, [0, 0.05, 0.356], undefined, [0, 0, Math.PI / 2])

  // Mắt tách nhóm riêng để chớp
  const eyes = new THREE.Group()
  head.add(eyes)
  ;[-1, 1].forEach((s) => {
    part(eyes, sphere, shirt, [s * 0.133, 0.035, 0.337], [0.041, 0.043, 0.012])
    part(eyes, sphere, black, [s * 0.128, 0.03, 0.346], [0.026, 0.029, 0.009])
    part(eyes, sphere, shirt, [s * 0.118, 0.043, 0.354], [0.008, 0.008, 0.004])
  })

  part(head, sphere, black, [0, -0.07, 0.342], [0.04, 0.028, 0.022])
  const smile = part(head, new THREE.TorusGeometry(0.046, 0.007, 8, 22, Math.PI), black, [0, -0.11, 0.332])
  smile.rotation.z = Math.PI

  // Mũ vuông tốt nghiệp có tua vàng
  const cap = new THREE.Group()
  cap.position.set(0, 0.29, -0.01)
  cap.rotation.set(-0.08, 0, 0.05)
  head.add(cap)
  part(cap, new THREE.CylinderGeometry(0.2, 0.22, 0.1, 32), black, [0, 0, 0])
  part(cap, new THREE.BoxGeometry(0.66, 0.024, 0.66), black, [0, 0.06, 0], undefined, [0, Math.PI / 4, 0])
  part(cap, sphere, gold, [0, 0.076, 0], [0.02, 0.012, 0.02])
  part(cap, new THREE.BoxGeometry(0.3, 0.006, 0.012), gold, [0.15, 0.076, 0.01], undefined, [0, -0.1, 0])
  const tassel = new THREE.Group()
  tassel.position.set(0.3, 0.07, 0.02)
  cap.add(tassel)
  part(tassel, new THREE.CylinderGeometry(0.004, 0.004, 0.13, 6), gold, [0, -0.065, 0])
  part(tassel, new THREE.CylinderGeometry(0.009, 0.024, 0.075, 12), gold, [0, -0.16, 0])

  /** Tay: tay áo rộng dần, cổ tay viền vàng, bàn tay đen. @param {number} side */
  function arm(side) {
    const a = new THREE.Group()
    a.position.set(side * 0.285, 0.9, 0.02)
    part(a, new THREE.CapsuleGeometry(0.085, 0.24, 8, 18), robe, [0, -0.17, 0])
    part(a, new THREE.CylinderGeometry(0.095, 0.125, 0.11, 24), robe, [0, -0.345, 0])
    const cuff = part(a, new THREE.TorusGeometry(0.122, 0.012, 8, 28), gold, [0, -0.4, 0])
    cuff.rotation.x = Math.PI / 2
    part(a, sphere, black, [0, -0.45, 0], [0.09, 0.09, 0.09])
    body.add(a)
    return a
  }
  const right = arm(-1)
  right.rotation.set(0, 0, -1.72)
  // Que chỉ bảng nằm trong bàn tay phải, chĩa về phía bảng đen
  part(right, new THREE.CylinderGeometry(0.008, 0.015, 0.68, 10), soft(0x7c5228, 0.5), [0, -0.78, 0])
  part(right, sphere, brass, [0, -1.12, 0], [0.018, 0.018, 0.018])

  const left = arm(1)
  left.rotation.set(-0.95, 0, 0.55)
  // Cuốn sách ôm trong tay trái
  const book = new THREE.Group()
  book.position.set(0, -0.48, 0.08)
  book.rotation.set(0.5, 0.2, -0.5)
  left.add(book)
  part(book, new THREE.BoxGeometry(0.22, 0.29, 0.05), soft(0x7a2c24, 0.6), [0, 0, 0])
  part(book, new THREE.BoxGeometry(0.2, 0.27, 0.034), shirt, [0.012, 0, 0])
  part(book, new THREE.BoxGeometry(0.1, 0.012, 0.052), brass, [0, 0.07, 0])

  let waveLeft = 0
  let blinkAt = 2
  const toCam = new THREE.Vector3()

  return {
    group,
    wave() {
      waveLeft = 1.5
    },
    update(t, dt, camPos) {
      body.scale.y = 1 + Math.sin(t * 1.7) * 0.006
      // Đầu hơi quay về phía người xem, có giới hạn để không vẹo cổ
      toCam.copy(camPos)
      group.worldToLocal(toCam)
      const yaw = THREE.MathUtils.clamp(Math.atan2(toCam.x, toCam.z), -0.5, 0.5)
      const pitch = THREE.MathUtils.clamp((1.35 - toCam.y) / Math.max(1, toCam.length()), -0.22, 0.22)
      head.rotation.y += (yaw + Math.sin(t * 0.6) * 0.04 - head.rotation.y) * Math.min(1, dt * 3)
      head.rotation.x += (pitch - head.rotation.x) * Math.min(1, dt * 3)
      tassel.rotation.z = Math.sin(t * 1.4) * 0.05

      blinkAt -= dt
      if (blinkAt < -0.13) blinkAt = 2 + (Math.sin(t * 91) + 1) * 1.6
      eyes.scale.y = blinkAt < 0 ? 0.12 : 1

      if (waveLeft > 0) {
        waveLeft -= dt
        right.rotation.z = -2.35 + Math.sin(waveLeft * 13) * 0.3
      } else {
        const rest = -1.72 + Math.sin(t * 0.9) * 0.035
        right.rotation.z += (rest - right.rotation.z) * Math.min(1, dt * 5)
      }
    },
  }
}
