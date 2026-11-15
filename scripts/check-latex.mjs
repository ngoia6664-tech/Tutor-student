// Kiểm tra công thức LaTeX trong file JSON bài giảng / bài tập trước khi giao (chỉ đọc, không sửa).
// Chạy: node scripts/check-latex.mjs "<thư mục hoặc file .json>" [...]
// LỖI (thoát mã 1): công thức KaTeX không vẽ được · cặp $ bị lẻ · \ce{} · ký tự điều khiển do quên gấp đôi dấu \ (\frac → form-feed + "rac").
// CẢNH BÁO: chỉ số nhiều chữ không bọc \mathrm / \text (Q_{Al} → chữ nghiêng sai).
import fs from 'node:fs'
import path from 'node:path'
import katex from 'katex'

/** Tách các đoạn $$...$$ và $...$ trong một chuỗi (bỏ qua \$). */
function mathSpans(s) {
  const spans = []
  const re = /\$\$([\s\S]+?)\$\$|\$([^$\n]+?)\$/g
  const clean = s.replace(/\\\$/g, '\u0000\u0000')
  let m
  while ((m = re.exec(clean))) spans.push((m[1] ?? m[2]).replace(/\u0000\u0000/g, '\\$'))
  return { spans }
}

const errors = []
const warns = []
const where = (file, p) => `${file} › ${p}`

// KaTeX in "No character metrics" khi \text{} có chữ có dấu (ự, ỏ...): vẫn vẽ được bằng phông dự phòng, nên không báo
const warn = console.warn
console.warn = (...a) => (/No character metrics/.test(String(a[0])) ? undefined : warn(...a))

function checkString(file, p, s0) {
  const s = s0.replace(/`[^`\n]*`/g, '') // đoạn code trong dấu nháy (ví dụ minh họa) không phải công thức thật
  if (/[\f\b\t\r\v]/.test(s0)) errors.push(`${where(file, p)}: có ký tự điều khiển (\\f \\b \\t \\r) — công thức LaTeX thiếu gấp đôi dấu gạch ngược (viết \\\\frac, \\\\bar, \\\\text, \\\\right...)`)
  if (!s.includes('$')) return
  const { spans } = mathSpans(s)
  // Cặp $ lẻ: bỏ các đoạn đã ghép, còn $ dư thì báo
  const rest = s.replace(/\\\$/g, '').replace(/\$\$[\s\S]+?\$\$/g, '').replace(/\$[^$\n]+?\$/g, '')
  if (rest.includes('$')) errors.push(`${where(file, p)}: dấu $ không đủ cặp: «${s.slice(0, 80)}»`)
  for (const tex of spans) {
    if (/\\ce\s*\{/.test(tex)) errors.push(`${where(file, p)}: dùng \\ce{} (app không có mhchem): $${tex}$`)
    try {
      katex.renderToString(tex, { throwOnError: true, strict: 'ignore' })
    } catch (e) {
      errors.push(`${where(file, p)}: KaTeX không vẽ được $${tex}$ — ${e instanceof Error ? e.message.replace(/^KaTeX parse error: /, '') : e}`)
    }
    const sub = tex.match(/_\{[A-Za-z]{2,}\}|_[A-Za-z]{2,}/)
    if (sub) warns.push(`${where(file, p)}: chỉ số «${sub[0]}» không bọc \\mathrm{} (tên chất) hoặc \\text{} (từ) → hiện chữ nghiêng: $${tex}$`)
  }
}

function walk(file, v, p = '') {
  if (typeof v === 'string') checkString(file, p, v)
  else if (Array.isArray(v)) v.forEach((x, i) => walk(file, x, `${p}[${i}]`))
  else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) walk(file, x, p ? `${p}.${k}` : k)
}
const collect = (p) => (fs.statSync(p).isDirectory() ? fs.readdirSync(p).flatMap((n) => collect(path.join(p, n))) : p.endsWith('.json') ? [p] : [])

const files = process.argv.slice(2).flatMap(collect)
if (!files.length) {
  console.error('Dùng: node scripts/check-latex.mjs "<thư mục hoặc file .json>"')
  process.exit(2)
}
for (const f of files) {
  try {
    walk(path.basename(f), JSON.parse(fs.readFileSync(f, 'utf8')))
  } catch (e) {
    errors.push(`${path.basename(f)}: không phải JSON hợp lệ — ${e instanceof Error ? e.message : e}`)
  }
}
const uniq = (a) => [...new Set(a)]
for (const w of uniq(warns)) console.log(`CẢNH BÁO  ${w}`)
for (const e of uniq(errors)) console.log(`LỖI       ${e}`)
console.log(`\n${files.length} file: ${uniq(errors).length} lỗi, ${uniq(warns).length} cảnh báo.`)
process.exit(errors.length ? 1 : 0)
