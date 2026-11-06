// Hệ Mặt Trời nhìn qua thị kính: một cảnh 3D riêng, chỉ vẽ khi đang áp mắt vào kính (chưa chuyển sang màn Vũ Trụ).
import * as THREE from 'three'
import { paintTexture } from './labKit.js'

// [tên, bán kính quỹ đạo, cỡ, màu dải]: khoảng cách và cỡ đã phóng đại để nhìn rõ trong khung kính, không theo tỉ lệ thật
/** @type {[string, number, number, string[]][]} */
const PLANETS = [
  ['Sao Thủy', 1.75, 0.13, ['#a8a29e', '#78716c', '#a8a29e']],
  ['Sao Kim', 2.45, 0.2, ['#f2d9a0', '#d9b36c', '#f0d59a']],
  ['Trái Đất', 3.25, 0.21, ['#2f7fd1', '#2a6fc0', '#2f7fd1']],
  ['Sao Hỏa', 4.05, 0.16, ['#c8603a', '#a7472a', '#d0704a']],
  ['Sao Mộc', 5.45, 0.5, ['#d9b48a', '#a97a52', '#ecd5b0', '#b5825a', '#e3c7a0', '#9c6c48', '#d9b48a']],
  ['Sao Thổ', 6.85, 0.42, ['#efdcae', '#d1b27c', '#e8d09c', '#c7a56f', '#efdcae']],
  ['Sao Thiên Vương', 7.95, 0.3, ['#a6e3e6', '#8fd4da', '#a6e3e6']],
  ['Sao Hải Vương', 8.85, 0.29, ['#4770d8', '#3558b8', '#5280e2']],
]
const FIT = 21.5 // bề rộng cảnh (đơn vị 3D) cần lọt khung kính 78vmin

/** Vân hành tinh: dải màu + vệt mảnh để không bị trơn như quả bóng. @param {string} name @param {string[]} bands */
function planetTexture(name, bands) {
  return paintTexture(512, 256, (g) => {
    const grad = g.createLinearGradient(0, 0, 0, 256)
    bands.forEach((color, i) => grad.addColorStop(i / Math.max(1, bands.length - 1), color))
    g.fillStyle = grad
    g.fillRect(0, 0, 512, 256)
    for (let i = 0; i < 260; i++) {
      g.fillStyle = `rgba(${Math.random() > 0.5 ? '255,255,255' : '40,24,14'},${0.02 + Math.random() * 0.06})`
      g.fillRect(Math.random() * 512, Math.random() * 256, 30 + Math.random() * 160, 1 + Math.random() * 3)
    }
    if (name === 'Trái Đất') {
      g.fillStyle = '#4c9c58'
      for (let i = 0; i < 16; i++) {
        g.beginPath()
        g.ellipse(Math.random() * 512, 50 + Math.random() * 156, 16 + Math.random() * 40, 10 + Math.random() * 26, Math.random() * 3, 0, 7)
        g.fill()
      }
      g.fillStyle = 'rgba(245,250,255,.9)'
      g.fillRect(0, 0, 512, 16)
      g.fillRect(0, 240, 512, 16)
      for (let i = 0; i < 18; i++) {
        g.fillStyle = 'rgba(255,255,255,.4)'
        g.fillRect(Math.random() * 512, 24 + Math.random() * 208, 40 + Math.random() * 80, 3 + Math.random() * 5)
      }
    }
    if (name === 'Sao Mộc') {
      g.fillStyle = '#b75a3a'
      g.beginPath()
      g.ellipse(320, 164, 26, 13, 0, 0, 7)
      g.fill()
    }
  })
}

const sunTexture = () => paintTexture(512, 256, (g) => {
  g.fillStyle = '#ffc95a'
  g.fillRect(0, 0, 512, 256)
  for (let i = 0; i < 1400; i++) {
    g.fillStyle = `rgba(${Math.random() > 0.5 ? '255,244,190' : '226,108,28'},${0.05 + Math.random() * 0.14})`
    g.beginPath()
    g.arc(Math.random() * 512, Math.random() * 256, 1 + Math.random() * 7, 0, 7)
    g.fill()
  }
})

const glowTexture = () => paintTexture(256, 256, (g) => {
  const r = g.createRadialGradient(128, 128, 0, 128, 128, 128)
  r.addColorStop(0, 'rgba(255,240,190,1)')
  r.addColorStop(0.22, 'rgba(255,190,90,.75)')
  r.addColorStop(0.5, 'rgba(255,130,40,.16)')
  r.addColorStop(1, 'rgba(255,110,30,0)')
  g.fillStyle = r
  g.fillRect(0, 0, 256, 256)
})

/** Vành Sao Thổ: nhiều dải sáng tối, có khe Cassini */
const ringTexture = () => paintTexture(512, 8, (g) => {
  const r = g.createLinearGradient(0, 0, 512, 0)
  r.addColorStop(0, 'rgba(190,170,130,.25)')
  r.addColorStop(0.3, 'rgba(232,212,165,.85)')
  r.addColorStop(0.62, 'rgba(240,222,178,.95)')
  r.addColorStop(0.68, 'rgba(0,0,0,0)')
  r.addColorStop(0.73, 'rgba(214,194,150,.75)')
  r.addColorStop(1, 'rgba(180,160,120,.2)')
  g.fillStyle = r
  g.fillRect(0, 0, 512, 8)
})

/** Nhãn tên hành tinh. @param {string} name */
function nameSprite(name) {
  const map = paintTexture(320, 64, (g) => {
    g.font = "32px 'Times New Roman', serif"
    g.textAlign = 'center'
    g.textBaseline = 'middle'
    g.fillStyle = 'rgba(236,226,200,.95)'
    g.fillText(name, 160, 34)
  })
  return new THREE.Sprite(new THREE.SpriteMaterial({ map, transparent: true, depthWrite: false, depthTest: false }))
}

export function createSolarView() {
  const scene = new THREE.Scene()
  scene.background = new THREE.Color(0x03040c)
  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 400)

  // Ánh sáng nền đủ mạnh để hành tinh quay mặt khuất về phía người xem vẫn nhìn ra màu
  scene.add(new THREE.AmbientLight(0x9aa2c0, 0.95))
  const sunLight = new THREE.PointLight(0xfff0d0, 22, 0, 1)
  scene.add(sunLight)
  const sun = new THREE.Mesh(new THREE.SphereGeometry(0.85, 40, 28), new THREE.MeshBasicMaterial({ map: sunTexture() }))
  scene.add(sun)
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), blending: THREE.AdditiveBlending, depthWrite: false }))
  glow.scale.setScalar(5.4)
  scene.add(glow)

  const ball = new THREE.SphereGeometry(1, 32, 22)
  const labels = []
  /** @type {THREE.Mesh | null} */
  let saturnRing = null
  const movers = PLANETS.map(([name, orbit, size, bands], i) => {
    const planet = new THREE.Mesh(ball, new THREE.MeshStandardMaterial({ map: planetTexture(name, bands), roughness: 0.82 }))
    planet.scale.setScalar(size)
    planet.rotation.z = 0.2
    scene.add(planet)
    if (name === 'Sao Thổ') {
      const geo = new THREE.RingGeometry(1.35, 2.3, 64, 1)
      // Đổi toạ độ texture theo bán kính để dải màu chạy vòng quanh hành tinh
      const pos = geo.attributes.position
      const uv = geo.attributes.uv
      for (let k = 0; k < pos.count; k++) uv.setXY(k, (Math.hypot(pos.getX(k), pos.getY(k)) - 1.35) / 0.95, 0.5)
      const ring = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: ringTexture(), transparent: true, side: THREE.DoubleSide, depthWrite: false }))
      // Không gắn vào hành tinh: hành tinh tự quay còn vành phải giữ nguyên độ nghiêng
      ring.rotation.x = Math.PI / 2 + 0.38
      ring.scale.setScalar(size)
      scene.add(ring)
      saturnRing = ring
    }
    const path = new THREE.Mesh(
      new THREE.RingGeometry(orbit - 0.012, orbit + 0.012, 128),
      new THREE.MeshBasicMaterial({ color: 0x9db1dc, transparent: true, opacity: 0.2, side: THREE.DoubleSide }),
    )
    path.rotation.x = Math.PI / 2
    scene.add(path)
    const label = nameSprite(name)
    scene.add(label)
    labels.push(label)
    // Định luật III Kepler: T² tỉ lệ a³, nên hành tinh càng xa càng chậm
    return { planet, label, size, orbit, speed: 2.1 / Math.pow(orbit, 1.5), start: i * 2.4 }
  })
  const earth = movers[2]
  const moon = new THREE.Mesh(ball, new THREE.MeshStandardMaterial({ color: 0xcfcbc2, roughness: 0.9 }))
  moon.scale.setScalar(0.06)
  scene.add(moon)

  const starCount = 1400
  const pos = new Float32Array(starCount * 3)
  for (let i = 0; i < starCount; i++) {
    const a = Math.random() * Math.PI * 2
    const b = Math.acos(2 * Math.random() - 1)
    const r = 120 + Math.random() * 120
    pos.set([r * Math.sin(b) * Math.cos(a), r * Math.cos(b), r * Math.sin(b) * Math.sin(a)], i * 3)
  }
  const starGeo = new THREE.BufferGeometry()
  starGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
  scene.add(new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xe6ebff, size: 0.75, sizeAttenuation: true })))

  let distance = 40
  let rush = 0

  return {
    scene,
    camera,
    /** @param {number} aspect */
    resize(aspect) {
      camera.aspect = aspect
      camera.updateProjectionMatrix()
      const tan = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2))
      distance = (FIT / 0.78 / (2 * tan)) / Math.min(1, aspect)
      // Màn dọc thu nhỏ cả cảnh, nhãn phải to hơn mới đọc được
      const k = aspect < 1 ? 1.75 : 1
      labels.forEach((l) => l.scale.set(3.2 * k, 0.64 * k, 1))
    },
    /** 0 = đứng yên ngắm, 1 = lao hết vào Mặt Trời khi bấm du hành. @param {number} p */
    setRush(p) {
      rush = p
    },
    /** @param {number} t */
    update(t) {
      for (const m of movers) {
        const a = m.start + t * m.speed
        m.planet.position.set(Math.cos(a) * m.orbit, 0, Math.sin(a) * m.orbit)
        m.planet.rotation.y = t * 0.5
        m.label.position.set(m.planet.position.x, m.size + 0.42, m.planet.position.z)
      }
      saturnRing?.position.copy(movers[5].planet.position)
      moon.position.copy(earth.planet.position)
      moon.position.x += Math.cos(t * 1.6) * 0.36
      moon.position.z += Math.sin(t * 1.6) * 0.36
      sun.rotation.y = t * 0.06
      const d = distance * (1 - rush * 0.93)
      const swing = t * 0.035
      camera.position.set(Math.sin(swing) * d * 0.9, d * 0.42, Math.cos(swing) * d * 0.9)
      camera.lookAt(0, 0, 0)
    },
  }
}
