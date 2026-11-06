// Bảng đen: khung gỗ, máng phấn; hình trên bảng vẽ lại theo số người dùng kéo trên mảnh giấy.
import * as THREE from 'three'
import { massEnergyJ, tntTons, viNumber, wavelengthColor, wavelengthNm } from '../../lib/labPhysics.js'
import { grainTexture, kit, mergeStatic, seeded } from './labKit.js'

const FORMULAS = [
  { mode: 'gravity', text: 'F = G m₁m₂ / r²' },
  { mode: 'wave', text: 'λ = c / f' },
  { mode: 'energy', text: 'E = mc²' },
]
const CHALK = '#ecefe2'
const GOLD = '#f2d78a'

export function buildBoard() {
  const group = new THREE.Group()
  group.userData.spot = 'board'
  const { add, box, cyl } = kit(group)
  const grain = grainTexture()
  const wood = new THREE.MeshStandardMaterial({ map: grain, roughness: 0.46 })
  const dark = new THREE.MeshStandardMaterial({ map: grain, color: 0x8d6d5c, roughness: 0.55 })

  // Khung có gờ, máng phấn, phấn, giẻ lau
  box(2.42, 1.56, 0.04, dark, 0, 0, -0.012)
  ;[[0, 0.75, 2.42, 0.08], [0, -0.75, 2.42, 0.08], [-1.17, 0, 0.08, 1.58], [1.17, 0, 0.08, 1.58]].forEach(([x, y, w, h]) => box(w, h, 0.05, wood, x, y, 0.012))
  box(2.3, 0.03, 0.12, wood, 0, -0.8, 0.06)
  box(2.3, 0.03, 0.012, dark, 0, -0.775, 0.115)
  const chalk = new THREE.MeshStandardMaterial({ color: 0xf1efe6, roughness: 1 })
  ;[[-0.7, 0.3], [-0.55, -0.5], [0.72, 0.1]].forEach(([x, r]) => {
    const c = cyl(0.009, 0.009, 0.1, chalk, x, -0.775, 0.07, group, 8)
    c.rotation.set(0, r, Math.PI / 2)
  })
  box(0.17, 0.04, 0.07, new THREE.MeshStandardMaterial({ color: 0x3b3027, roughness: 1 }), 0.42, -0.765, 0.07)

  const c = document.createElement('canvas')
  c.width = 1024
  c.height = 640
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 8
  add(new THREE.PlaneGeometry(2.28, 1.42), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9 }), 0, 0, 0.012, group, false)

  /** Mũi tên phấn. @param {CanvasRenderingContext2D} g @param {number} x1 @param {number} x2 @param {number} y */
  function arrow(g, x1, x2, y) {
    const dir = Math.sign(x2 - x1)
    g.beginPath()
    g.moveTo(x1, y)
    g.lineTo(x2, y)
    g.moveTo(x2, y)
    g.lineTo(x2 - dir * 15, y - 10)
    g.moveTo(x2, y)
    g.lineTo(x2 - dir * 15, y + 10)
    g.stroke()
  }

  /** Vẽ lại cả bảng theo công thức đang chọn. @param {string} mode @param {number} value */
  function draw(mode, value) {
    const g = c.getContext('2d')
    if (!g) return
    const rnd = seeded(41)
    g.fillStyle = '#1e332b'
    g.fillRect(0, 0, 1024, 640)
    // Vệt phấn lau dở giữ nguyên giữa các lần vẽ
    for (let i = 0; i < 120; i++) {
      g.fillStyle = `rgba(220,235,225,${rnd(0.005, 0.03)})`
      g.fillRect(rnd(0, 1024), rnd(0, 640), rnd(40, 240), rnd(3, 22))
    }
    g.textBaseline = 'alphabetic'
    g.textAlign = 'left'
    g.lineCap = 'round'
    FORMULAS.forEach((f, i) => {
      const y = 96 + i * 110
      const on = f.mode === mode
      g.fillStyle = on ? GOLD : 'rgba(236,239,226,.55)'
      g.font = "italic 52px 'Times New Roman', serif"
      g.fillText(f.text, 48, y)
      if (on) {
        g.strokeStyle = GOLD
        g.lineWidth = 3
        g.strokeRect(32, y - 54, 420, 74)
      }
    })
    g.fillStyle = 'rgba(236,239,226,.55)'
    g.font = "italic 42px 'Times New Roman', serif"
    g.fillText('T = 2π√(l / g)', 48, 448)
    g.fillText('T² ~ a³', 48, 520)

    // Hình bên phải
    g.strokeStyle = CHALK
    g.fillStyle = CHALK
    g.lineWidth = 4
    g.font = "italic 38px 'Times New Roman', serif"
    if (mode === 'gravity') {
      const gap = 70 + value * 75
      const x1 = 540
      const x2 = x1 + gap
      for (const [x, r] of [[x1, 36], [x2, 22]]) {
        g.beginPath()
        g.arc(x, 210, r, 0, 7)
        g.stroke()
      }
      // Hai mũi tên cùng thu lại khi xa ra: F tỉ lệ 1/r²
      const len = Math.max(8, 110 / (value * value))
      g.strokeStyle = GOLD
      arrow(g, x1 + 38, x1 + 38 + len, 210)
      arrow(g, x2 - 24, x2 - 24 - len, 210)
      g.strokeStyle = CHALK
      arrow(g, x1, x2, 280)
      arrow(g, x2, x1, 280)
      g.fillText(`r gấp ${String(value).replace('.', ',')} lần`, 560, 350)
      g.fillStyle = GOLD
      g.fillText(`F giảm ${String(Math.round(value * value * 100) / 100).replace('.', ',')} lần`, 560, 410)
    } else if (mode === 'wave') {
      const nm = wavelengthNm(value)
      g.strokeStyle = wavelengthColor(nm)
      g.lineWidth = 6
      g.beginPath()
      const period = nm / 7
      for (let x = 0; x <= 450; x += 3) {
        const y = 210 + Math.sin((x / period) * Math.PI * 2) * 62
        if (x === 0) g.moveTo(520 + x, y)
        else g.lineTo(520 + x, y)
      }
      g.stroke()
      g.lineWidth = 4
      g.strokeStyle = CHALK
      arrow(g, 520, 520 + period, 305)
      arrow(g, 520 + period, 520, 305)
      g.fillText(`f = ${Math.round(value)} THz`, 520, 370)
      g.fillStyle = GOLD
      g.fillText(`λ = ${Math.round(nm)} nm`, 520, 430)
    } else {
      const r = 20 + Math.sqrt(value) * 40
      g.strokeStyle = GOLD
      for (let i = 0; i < 16; i++) {
        const a = (i / 16) * Math.PI * 2
        g.beginPath()
        g.moveTo(720 + Math.cos(a) * (r + 10), 200 + Math.sin(a) * (r + 10))
        g.lineTo(720 + Math.cos(a) * (r + 34), 200 + Math.sin(a) * (r + 34))
        g.stroke()
      }
      g.beginPath()
      g.arc(720, 200, r, 0, 7)
      g.stroke()
      const joules = massEnergyJ(value)
      g.fillText(`m = ${value} g`, 520, 400)
      g.fillStyle = GOLD
      g.fillText(`E ≈ ${(joules / 1e13).toFixed(0)} × 10¹³ J`, 520, 460)
      g.fillStyle = CHALK
      g.fillText(`≈ ${viNumber(tntTons(joules))} tấn TNT`, 520, 520)
    }
    tex.needsUpdate = true
  }
  draw('gravity', 2)
  mergeStatic(group)

  return { group, draw }
}
