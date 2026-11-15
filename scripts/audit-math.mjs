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

const hits = []
const walk = (file, v) => {
  if (typeof v === 'string') {
    for (const line of v.split('\n')) {
      if (line.includes('$') || !line.includes('/')) continue
      for (const sp of findMathSpans(hideExplicit(line))) {
        const bad = multiDenoms(sp.tex)
        if (bad.length) hits.push({ file, line: line.trim().slice(0, 140), tex: sp.tex, bad })
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
  console.log(`${h.file}\n  nhập : ${h.line}\n  mẫu số dài: ${h.bad.join(' ; ')}\n`)
}
console.log(`${files.length} file, ${seen.size} dòng có phân số mẫu nhiều nhân tử (cần xem tay).`)
