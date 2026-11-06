// Đồ nghề chung để dựng các món trong phòng: vẽ texture, thêm khối, gộp khối tĩnh cho nhẹ.
import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'

/**
 * @param {number} w @param {number} h
 * @param {(g: CanvasRenderingContext2D) => void} paint
 */
export function paintTexture(w, h, paint) {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  const g = c.getContext('2d')
  if (g) paint(g)
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  t.anisotropy = 8
  return t
}

/** Vân gỗ gụ không có khe ván */
export const grainTexture = () => paintTexture(256, 512, (g) => {
  g.fillStyle = '#5a2c18'
  g.fillRect(0, 0, 256, 512)
  for (let i = 0; i < 900; i++) {
    g.strokeStyle = `rgba(${Math.random() > 0.55 ? '24,10,4' : '170,96,52'},${0.05 + Math.random() * 0.14})`
    g.lineWidth = 0.5 + Math.random() * 1.6
    const x = Math.random() * 256
    const y = Math.random() * 512
    g.beginPath()
    g.moveTo(x, y)
    g.bezierCurveTo(x + 3, y + 40, x - 3, y + 90, x + Math.random() * 6 - 3, y + 130 + Math.random() * 120)
    g.stroke()
  }
})

/** Số giả ngẫu nhiên cố định, để hàng sách lần nào mở cũng giống nhau. @param {number} start */
export function seeded(start) {
  let seed = start
  /** @param {number} a @param {number} b */
  return (a, b) => {
    seed = (seed * 16807) % 2147483647
    return a + (seed / 2147483647) * (b - a)
  }
}

/** Bộ hàm thêm khối vào một nhóm. @param {THREE.Object3D} root */
export function kit(root) {
  /**
   * @param {THREE.BufferGeometry} geo @param {THREE.Material} mat
   * @param {number} [x] @param {number} [y] @param {number} [z]
   * @param {THREE.Object3D} [parent] @param {boolean} [shadow]
   */
  function add(geo, mat, x = 0, y = 0, z = 0, parent = root, shadow = true) {
    const m = new THREE.Mesh(geo, mat)
    m.position.set(x, y, z)
    m.castShadow = shadow
    m.receiveShadow = true
    parent.add(m)
    return m
  }
  return {
    add,
    /** @param {number} w @param {number} h @param {number} d @param {THREE.Material} m @param {number} [x] @param {number} [y] @param {number} [z] @param {THREE.Object3D} [p] */
    box: (w, h, d, m, x, y, z, p) => add(new THREE.BoxGeometry(w, h, d), m, x, y, z, p),
    /** @param {number} r1 @param {number} r2 @param {number} h @param {THREE.Material} m @param {number} [x] @param {number} [y] @param {number} [z] @param {THREE.Object3D} [p] @param {number} [seg] */
    cyl: (r1, r2, h, m, x, y, z, p, seg = 20) => add(new THREE.CylinderGeometry(r1, r2, h, seg), m, x, y, z, p),
    /** @param {number} r @param {THREE.Material} m @param {number} [x] @param {number} [y] @param {number} [z] @param {THREE.Object3D} [p] */
    ball: (r, m, x, y, z, p) => add(new THREE.SphereGeometry(r, 24, 16), m, x, y, z, p),
    /** Khối tiện tròn từ đường viền [bán kính, cao]. @param {number[][]} profile @param {THREE.Material} m @param {number} [x] @param {number} [y] @param {number} [z] @param {THREE.Object3D} [p] */
    turned: (profile, m, x, y, z, p) => add(new THREE.LatheGeometry(profile.map(([r, h]) => new THREE.Vector2(r, h)), 20), m, x, y, z, p),
  }
}

/** Gộp các khối đứng yên cùng vật liệu thành một lần vẽ, phòng có hàng trăm chi tiết mà điện thoại vẫn chịu được.
 * Không đi vào nhóm có `userData.dynamic` (đang chuyển động) và nhóm con có `userData.spot` (bấm được, tự gộp riêng).
 * @param {THREE.Object3D} root */
export function mergeStatic(root) {
  root.updateMatrixWorld(true)
  const toRoot = root.matrixWorld.clone().invert()
  /** @type {Map<string, THREE.Mesh[]>} */
  const buckets = new Map()
  /** @param {THREE.Object3D} o */
  const visit = (o) => {
    if (o.userData.dynamic || (o !== root && o.userData.spot)) return
    const m = /** @type {THREE.Mesh} */ (o)
    if (m.isMesh && !(/** @type {any} */ (m).isInstancedMesh)) {
      const mat = /** @type {THREE.Material} */ (m.material)
      if (!mat.transparent) {
        const key = `${mat.uuid}|${m.castShadow}|${m.receiveShadow}`
        buckets.set(key, [...(buckets.get(key) ?? []), m])
      }
    }
    o.children.forEach(visit)
  }
  visit(root)
  for (const meshes of buckets.values()) {
    if (meshes.length < 2) continue
    const parts = meshes.map((m) => {
      const g = m.geometry.index ? m.geometry.toNonIndexed() : m.geometry.clone()
      g.applyMatrix4(new THREE.Matrix4().multiplyMatrices(toRoot, m.matrixWorld))
      return g
    })
    const merged = mergeGeometries(parts)
    parts.forEach((g) => g.dispose())
    if (!merged) continue
    const one = new THREE.Mesh(merged, meshes[0].material)
    one.castShadow = meshes[0].castShadow
    one.receiveShadow = meshes[0].receiveShadow
    root.add(one)
    meshes.forEach((m) => {
      m.parent?.remove(m)
      m.geometry.dispose()
    })
  }
}

/** Mờ dần về đích theo thời gian, không phụ thuộc tốc độ khung hình. @param {number} now @param {number} to @param {number} rate @param {number} dt */
export const approach = (now, to, rate, dt) => now + (to - now) * Math.min(1, dt * rate)
