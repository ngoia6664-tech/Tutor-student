// Hệ Mặt Trời nhìn qua thị kính: một cảnh 3D riêng, chỉ vẽ khi đang áp mắt vào kính (chưa chuyển sang màn Vũ Trụ).
import * as THREE from 'three'

// [tên, bán kính quỹ đạo, cỡ, màu dải]: khoảng cách và cỡ đã phóng đại để nhìn rõ trong khung kính, không theo tỉ lệ thật
/** @type {[string, number, number, string[]][]} */
const PLANETS = [
  ['mercury', 1.75, 0.13, ['#a8a29e', '#78716c', '#a8a29e']],
  ['venus', 2.45, 0.2, ['#f2d9a0', '#d9b36c', '#f0d59a']],
  ['earth', 3.25, 0.21, ['#2f7fd1', '#3f9e62', '#2a6fc0', '#e8f2fb', '#2f7fd1']],
  ['mars', 4.05, 0.16, ['#c8603a', '#a7472a', '#d0704a']],
  ['jupiter', 5.45, 0.5, ['#d9b48a', '#a97a52', '#ecd5b0', '#b5825a', '#e3c7a0', '#9c6c48']],
  ['saturn', 6.85, 0.42, ['#efdcae', '#d1b27c', '#e8d09c', '#c7a56f']],
  ['uranus', 7.95, 0.3, ['#a6e3e6', '#8fd4da', '#a6e3e6']],
  ['neptune', 8.85, 0.29, ['#4770d8', '#3558b8', '#5280e2']],
]
const FIT = 21.5 // bề rộng cảnh (đơn vị 3D) cần lọt khung kính 78vmin

/** Vân dải ngang cho hành tinh. @param {string[]} bands */
function bandTexture(bands) {
  const c = document.createElement('canvas')
  c.width = 8
  c.height = 128
  const g = c.getContext('2d')
  if (g) {
    const grad = g.createLinearGradient(0, 0, 0, 128)
    bands.forEach((color, i) => grad.addColorStop(i / Math.max(1, bands.length - 1), color))
    g.fillStyle = grad
    g.fillRect(0, 0, 8, 128)
  }
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  return t
}

function glowTexture() {
  const c = document.createElement('canvas')
  c.width = c.height = 256
  const g = c.getContext('2d')
  if (g) {
    const r = g.createRadialGradient(128, 128, 0, 128, 128, 128)
    r.addColorStop(0, 'rgba(255,240,190,1)')
    r.addColorStop(0.22, 'rgba(255,190,90,.75)')
    r.addColorStop(0.5, 'rgba(255,130,40,.16)')
    r.addColorStop(1, 'rgba(255,110,30,0)')
    g.fillStyle = r
    g.fillRect(0, 0, 256, 256)
  }
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  return t
}

export function createSolarView() {
  const scene = new THREE.Scene()
  scene.background = new THREE.Color(0x03040c)
  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 400)

  // Ánh sáng nền đủ mạnh để hành tinh quay mặt khuất về phía người xem vẫn nhìn ra màu
  scene.add(new THREE.AmbientLight(0x9aa2c0, 0.95))
  const sunLight = new THREE.PointLight(0xfff0d0, 60, 0, 1)
  scene.add(sunLight)
  scene.add(new THREE.Mesh(new THREE.SphereGeometry(0.85, 40, 28), new THREE.MeshBasicMaterial({ color: 0xffd476 })))
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), blending: THREE.AdditiveBlending, depthWrite: false }))
  glow.scale.setScalar(5.4)
  scene.add(glow)

  const ball = new THREE.SphereGeometry(1, 32, 22)
  const movers = PLANETS.map(([name, orbit, size, bands], i) => {
    const planet = new THREE.Mesh(ball, new THREE.MeshStandardMaterial({ map: bandTexture(bands), roughness: 0.82 }))
    planet.scale.setScalar(size)
    scene.add(planet)
    if (name === 'saturn') {
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(1.35, 2.2, 56),
        new THREE.MeshBasicMaterial({ color: 0xe6d2a2, transparent: true, opacity: 0.62, side: THREE.DoubleSide }),
      )
      ring.rotation.x = 1.25
      planet.add(ring)
    }
    const path = new THREE.Mesh(
      new THREE.RingGeometry(orbit - 0.012, orbit + 0.012, 128),
      new THREE.MeshBasicMaterial({ color: 0x9db1dc, transparent: true, opacity: 0.2, side: THREE.DoubleSide }),
    )
    path.rotation.x = Math.PI / 2
    scene.add(path)
    // Định luật III Kepler: T² tỉ lệ a³, nên hành tinh càng xa càng chậm
    return { planet, orbit, speed: 2.1 / Math.pow(orbit, 1.5), start: i * 2.4 }
  })

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
      }
      const d = distance * (1 - rush * 0.93)
      const swing = t * 0.035
      camera.position.set(Math.sin(swing) * d * 0.9, d * 0.42, Math.cos(swing) * d * 0.9)
      camera.lookAt(0, 0, 0)
    },
  }
}
