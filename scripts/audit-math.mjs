// Rà công thức dễ bị hiểu nhầm trong JSON bài giảng / bài tập (phân số a/b mà mẫu có nhiều nhân tử: 1/2π, a/2b...).
// Dùng đúng bộ đoán của app (src/lib/autoMath.js). Chỉ đọc, không sửa file.
// Chạy: node scripts/audit-math.mjs "<thư mục hoặc file .json>" [...]
// Dòng đã có $...$ thì bỏ qua (đã viết rõ). Cách chữa: thêm ngoặc (3/2)kT hoặc viết $\frac{3}{2}kT$.
import fs from 'node:fs'
import path from 'node:path'
import { findMathSpans } from '../src/lib/autoMath.js'

/** Lấy nhóm {...} bắt đầu tại i (ký tự '{'); trả về [nội dung, vị trí sau '}']. */
function group(t, i) {
  let d = 0
  for (let j = i; j < t.length; j++) {
    if (t[j] === '{') d++
    else if (t[j] === '}' && --d === 0) return [t.slice(i + 1, j), j + 1]
  }
  return ['', t.length]
}

/** Mẫu số của mọi \frac trong tex có từ 2 nhân tử trở lên ở mức ngoài cùng (vd "2 k T")? */
function multiDenoms(tex) {
  const out = []
  for (let i = tex.indexOf('\\frac{'); i >= 0; i = tex.indexOf('\\frac{', i + 1)) {
    const [num, afterNum] = group(tex, i + 5)
    const [den] = group(tex, afterNum)
    let depth = 0
    let parts = 1
    for (const c of den) {
      if (c === '{' || c === '(') depth++
      else if (c === '}' || c === ')') depth--
      else if (c === ' ' && depth === 0) parts++
    }
    if (parts >= 2) out.push(`${num} / ${den}`)
  }
  return out
}

/** Mẫu số đã có ngoặc ngay sau dấu / là viết rõ rồi: thay nội dung ngoặc bằng "0" để không bị tính. */
function hideExplicit(line) {
  let out = ''
  for (let i = 0; i < line.length; i++) {
    if (line[i] === '/' && '([{'.includes(line[i + 1])) {
      let d = 0
      let j = i + 1
      for (; j < line.length; j++) {
        if ('([{'.includes(line[j])) d++
        else if (')]}'.includes(line[j]) && --d === 0) break
      }
      if (j < line.length) {
        out += `/(0)`
        i = j
        continue
      }
    }
    out += line[i]
  }
  return out
}

// ----- Tên chất / nguyên tố viết chữ thường chưa bọc $...$: QAl, mCu, nH2, VCO2, Q_Al, Cu(OH)2, H2SO4 -----
const ELEMENTS = new Set(
  'H He Li Be B C N O F Ne Na Mg Al Si P S Cl Ar K Ca Sc Ti V Cr Mn Fe Co Ni Cu Zn Ga Ge As Se Br Kr Rb Sr Y Zr Nb Mo Tc Ru Rh Pd Ag Cd In Sn Sb Te I Xe Cs Ba La Ce Pr Nd Pm Sm Eu Gd Tb Dy Ho Er Tm Yb Lu Hf Ta W Re Os Ir Pt Au Hg Tl Pb Bi Po At Rn Fr Ra Ac Th Pa U Np Pu Am Cm Bk Cf Es Fm Md No Lr'.split(' ')
)
/** Chuỗi gồm toàn nguyên tố hợp lệ kèm chỉ số / nhóm ngoặc (Cu(OH)2, H2SO4)? Trả về true nếu có ít nhất một chữ số chỉ số. */
function chemWithDigit(tok) {
  if (!/\d/.test(tok)) return false
  const inner = tok.replace(/[()]/g, '')
  const parts = inner.match(/[A-Z][a-z]?|\d+/g) || []
  return parts.join('') === inner && parts.filter((p) => !/\d/.test(p)).every((p) => ELEMENTS.has(p)) && parts.some((p) => ELEMENTS.has(p))
}
/** Danh sách đoạn nghi là ký hiệu ghép: ký hiệu đại lượng + tên chất, hoặc công thức hóa học thiếu chỉ số con. */
function chemHits(line) {
  const plain = line.replace(/\$\$[\s\S]+?\$\$|\$[^$\n]+?\$/g, ' ').replace(/`[^`\n]*`/g, ' ')
  const out = []
  // QAl, mCu, nH2, VCO2: một chữ đại lượng liền sau là tên chất (viết hoa đầu), không có khoảng cách
  // Chỉ báo khi tên chất rõ ràng: có nguyên tố hai chữ (Al, Cu) hoặc có chỉ số số (H2, CO2); chỉ số số chỉ ở cuối.
  // Bỏ pV, TN, EU, MPa (đơn vị), mã ngẫu nhiên (nH6V58).
  for (const m of plain.matchAll(/(?<![\p{L}\d_])([QqmnVvcCTMLEp])((?:[A-Z][a-z]?){1,3}\d*)(?![\p{L}\d])/gu)) {
    const rest = m[2].match(/[A-Z][a-z]?/g) || []
    const clear = rest.some((e) => e.length === 2) || /\d$/.test(m[2])
    if (m[2] !== 'Pa' && clear && rest.every((e) => ELEMENTS.has(e))) out.push(m[0])
  }
  // Q_Al, m_{Cu}, n_{H2}: chỉ số tên chất không bọc \mathrm
  for (const m of plain.matchAll(/(?<![\p{L}\d])[A-Za-z]_\{?((?:[A-Z][a-z]?\d*){1,4})\}?(?![\p{L}\d])/gu)) {
    const rest = m[1].match(/[A-Z][a-z]?/g) || []
    if (rest.every((e) => ELEMENTS.has(e))) out.push(m[0])
  }
  // Cu(OH)2, H2SO4, CO2: công thức hóa học chưa có chỉ số con
  for (const m of plain.matchAll(/(?<![\p{L}\d_])((?:[A-Z][a-z]?\d*|\([A-Za-z0-9]+\)\d*){2,})(?![\p{L}\d_])/gu)) {
    if (chemWithDigit(m[1])) out.push(m[1])
  }
  return [...new Set(out)]
}

const hits = []
const walk = (file, v) => {
  if (typeof v === 'string') {
    for (const line of v.split('\n')) {
      const chem = chemHits(line)
      if (chem.length) hits.push({ file, line: line.trim().slice(0, 140), kind: 'tên chất / hóa học chưa bọc $…$', bad: chem })
      if (line.includes('$') || !line.includes('/')) continue
      for (const sp of findMathSpans(hideExplicit(line))) {
        const bad = multiDenoms(sp.tex)
        if (bad.length) hits.push({ file, line: line.trim().slice(0, 140), kind: 'mẫu số dài', bad })
      }
    }
  } else if (v && typeof v === 'object') for (const x of Object.values(v)) walk(file, x)
}
const collect = (p) => (fs.statSync(p).isDirectory() ? fs.readdirSync(p).flatMap((n) => collect(path.join(p, n))) : p.endsWith('.json') ? [p] : [])

const files = process.argv.slice(2).flatMap(collect)
if (!files.length) {
  console.error('Dùng: node scripts/audit-math.mjs "<thư mục hoặc file .json>"')
  process.exit(1)
}
for (const f of files) {
  try {
    walk(path.basename(f), JSON.parse(fs.readFileSync(f, 'utf8')))
  } catch (e) {
    console.error(`Bỏ qua ${f}: ${e instanceof Error ? e.message : e}`)
  }
}
const seen = new Set()
for (const h of hits) {
  if (seen.has(h.line)) continue
  seen.add(h.line)
  const kinds = hits.filter((x) => x.line === h.line).map((x) => `${x.kind}: ${x.bad.join(' ; ')}`)
  console.log(`${h.file}\n  nhập : ${h.line}\n  ${kinds.join('\n  ')}\n`)
}
console.log(`${files.length} file, ${seen.size} dòng nghi ngờ (phân số mẫu nhiều nhân tử, hoặc tên chất / công thức hóa học chưa bọc $…$) — cần xem tay.`)
