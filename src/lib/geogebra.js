// Nối GeoGebra (geogebra.org) qua Apps API: tải script một lần, khi cần mới tải (vài MB).
// Tài liệu: https://geogebra.github.io/docs/reference/en/GeoGebra_Apps_API/
const SCRIPT = 'https://www.geogebra.org/apps/deployggb.js'
let loading = null

export function loadGeoGebra() {
  if (window.GGBApplet) return Promise.resolve(window.GGBApplet)
  if (loading) return loading
  loading = new Promise((resolve, reject) => {
    const s = document.createElement('script')
    s.src = SCRIPT
    s.async = true
    s.onload = () => (window.GGBApplet ? resolve(window.GGBApplet) : reject(new Error('Không tải được GeoGebra.')))
    s.onerror = () => {
      loading = null
      s.remove()
      reject(new Error('Không tải được GeoGebra. Kiểm tra kết nối mạng rồi thử lại.'))
    }
    document.head.appendChild(s)
  })
  return loading
}

// Ba kiểu bảng vẽ của app
export const DRAW_MODES = [
  { key: 'plane', label: 'Hình phẳng', icon: 'triangle', app: 'geometry', hint: 'Tam giác, đường tròn, trung điểm, đường cao, phân giác…' },
  { key: 'space', label: 'Hình không gian', icon: 'cube', app: '3d', hint: 'Hình chóp, lăng trụ, mặt phẳng, giao tuyến (lớp 11). Kéo chuột phải để xoay.' },
  { key: 'oxyz', label: 'Hệ trục Oxyz', icon: 'axes', app: '3d', hint: 'Điểm, vectơ, mặt phẳng, đường thẳng trong Oxyz (lớp 12).' },
]
export const modeOf = (key) => DRAW_MODES.find((m) => m.key === key) || DRAW_MODES[0]

// Hình dựng sẵn (lệnh GeoGebra tiếng Anh, dùng được với mọi ngôn ngữ giao diện)
export const TEMPLATES = {
  plane: [
    { key: 'tri', label: 'Tam giác ABC', cmds: ['A=(0,0)', 'B=(6,0)', 'C=(2,4)', 't=Polygon(A,B,C)'], view: [-1, -1, 7, 5] },
    {
      key: 'tri-g',
      label: 'Tam giác + trọng tâm, đường cao',
      cmds: ['A=(0,0)', 'B=(6,0)', 'C=(2,4)', 't=Polygon(A,B,C)', 'M=Midpoint(B,C)', 'G=Centroid(t)', 'H=ClosestPoint(Line(B,C),A)', 'Segment(A,H)', 'Segment(A,M)'],
      view: [-1, -1, 7, 5],
    },
    { key: 'circle', label: 'Đường tròn ngoại tiếp', cmds: ['A=(0,0)', 'B=(6,0)', 'C=(2,4)', 't=Polygon(A,B,C)', 'c=Circle(A,B,C)', 'O=Center(c)'], view: [-2, -3, 8, 6] },
    { key: 'square', label: 'Hình vuông ABCD', cmds: ['A=(0,0)', 'B=(4,0)', 'q=Polygon(A,B,4)'], view: [-1, -1, 5, 5] },
  ],
  space: [
    {
      key: 'pyr-sq',
      label: 'Chóp S.ABCD, SA ⊥ đáy',
      cmds: ['A=(0,0,0)', 'B=(4,0,0)', 'C=(4,4,0)', 'D=(0,4,0)', 'S=(0,0,4)', 'Pyramid(Polygon(A,B,C,D),S)'],
      view: [-1, -1, -1, 5, 5, 5],
    },
    {
      key: 'pyr-reg',
      label: 'Chóp đều S.ABCD',
      cmds: ['A=(0,0,0)', 'B=(4,0,0)', 'C=(4,4,0)', 'D=(0,4,0)', 'O=Intersect(Line(A,C),Line(B,D))', 'S=O+(0,0,4)', 'Pyramid(Polygon(A,B,C,D),S)', 'Segment(S,O)'],
      view: [-1, -1, -1, 5, 5, 5],
    },
    { key: 'tetra', label: 'Tứ diện ABCD', cmds: ['A=(0,0,0)', 'B=(4,0,0)', 'C=(1,4,0)', 'D=(2,1,4)', 'Pyramid(Polygon(A,B,C),D)'], view: [-1, -1, -1, 5, 5, 5] },
    {
      key: 'prism3',
      label: 'Lăng trụ ABC.A′B′C′',
      cmds: ['A=(0,0,0)', 'B=(4,0,0)', 'C=(1,4,0)', "A'=(0,0,4)", "Prism(Polygon(A,B,C),A')"],
      view: [-1, -1, -1, 5, 5, 5],
    },
    {
      key: 'box',
      label: 'Hình hộp ABCD.A′B′C′D′',
      cmds: ['A=(0,0,0)', 'B=(4,0,0)', 'C=(4,3,0)', 'D=(0,3,0)', "A'=(0,0,3)", "Prism(Polygon(A,B,C,D),A')"],
      view: [-1, -1, -1, 5, 5, 5],
    },
  ],
  oxyz: [
    { key: 'pts', label: 'Ba điểm + mặt phẳng (ABC)', cmds: ['A=(2,0,0)', 'B=(0,3,0)', 'C=(0,0,4)', 'p=Plane(A,B,C)', 'Polygon(A,B,C)'], view: [-1, -1, -1, 5, 5, 5] },
    { key: 'vec', label: 'Vectơ AB, AC', cmds: ['A=(1,1,0)', 'B=(4,2,1)', 'C=(2,4,3)', 'u=Vector(A,B)', 'v=Vector(A,C)'], view: [-1, -1, -1, 5, 5, 5] },
    { key: 'line', label: 'Đường thẳng qua A, vuông góc (P)', cmds: ['p: x+2y+2z=6', 'A=(3,3,3)', 'd=PerpendicularLine(A,p)', 'H=Intersect(d,p)'], view: [-1, -1, -1, 5, 5, 5] },
    { key: 'sphere', label: 'Mặt cầu tâm I', cmds: ['I=(1,1,1)', 's=Sphere(I,2)'], view: [-2, -2, -2, 4, 4, 4] },
  ],
}

// Một số lệnh hay dùng, gõ vào ô "Nhập" của GeoGebra
export const COMMAND_TIPS = [
  { name: 'Trung điểm', cmd: 'M=Midpoint(A,B)' },
  { name: 'Trọng tâm tam giác', cmd: 'G=Centroid(Polygon(A,B,C))' },
  { name: 'Chân đường cao từ A', cmd: 'H=ClosestPoint(Line(B,C),A)' },
  { name: 'Giao điểm hai đường', cmd: 'I=Intersect(Line(A,C),Line(B,D))' },
  { name: 'Mặt phẳng qua 3 điểm', cmd: 'P=Plane(A,B,C)' },
  { name: 'Giao tuyến hai mặt phẳng', cmd: 'IntersectPath(Plane(S,A,B),Plane(S,C,D))' },
  { name: 'Hình chiếu của S lên (ABC)', cmd: 'H=ClosestPoint(Plane(A,B,C),S)' },
  { name: 'Góc giữa hai đường', cmd: 'Angle(Line(A,B),Line(C,D))' },
  { name: 'Khoảng cách điểm – mặt phẳng', cmd: 'Distance(S,Plane(A,B,C))' },
]

// Cài đặt khung nhìn theo kiểu bảng (gọi khi mở bảng mới hoặc sau "Xóa hết")
export function setupView(api, mode) {
  try {
    if (mode === 'space') {
      // Hình không gian kiểu lớp 11: không trục, không lưới, không "nền" xOy.
      // API không có lệnh tắt nền, nên sửa cài đặt khung 3D trong XML rồi nạp lại (chỉ gọi khi bảng trống).
      api.setAxesVisible(3, false, false, false)
      api.setGridVisible(3, false)
      const xml = api.getXML()
      const plain = xml.replace(/<euclidianView3D>[\s\S]*?<\/euclidianView3D>/, (v) =>
        v
          .replace(/<plate show="true"\/>/, '<plate show="false"/>')
          .replace(/(<evSettings[^>]*\baxes=)"true"/, '$1"false"')
          .replace(/(<axis id="[012]" show=)"true"/g, '$1"false"')
      )
      if (plain !== xml) api.setXML(plain)
    } else if (mode === 'oxyz') {
      api.setAxesVisible(3, true, true, true)
    }
  } catch {
    // phiên bản GeoGebra khác: bỏ qua, người dùng tự bật/tắt ở thanh kiểu
  }
}

// Dựng hình mẫu: xóa hình cũ, chạy lệnh, căn khung nhìn
export function applyTemplate(api, mode, tpl) {
  api.newConstruction()
  setupView(api, mode)
  for (const c of tpl.cmds) api.evalCommand(c)
  try {
    const v = tpl.view
    if (v?.length === 4) api.setCoordSystem(v[0], v[2], v[1], v[3])
    if (v?.length === 6) api.setCoordSystem(v[0], v[3], v[1], v[4], v[2], v[5])
  } catch {
    // bỏ qua nếu không căn được
  }
  api.setMode(0)
}

// Ảnh PNG của hình (data URL); scale 1 = đúng cỡ trên màn hình
export function figurePng(api, scale = 1) {
  const b64 = api.getPNGBase64(scale, false, 72)
  return b64 ? `data:image/png;base64,${b64}` : null
}

// Nội dung hình (để mở lại sửa tiếp)
export function figureState(api) {
  return new Promise((resolve) => api.getBase64((b64) => resolve(b64)))
}
