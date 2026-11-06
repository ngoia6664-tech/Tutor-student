// Tự nhận công thức viết bằng chữ thường trong bài giảng / bài tập (a/b, λ_min, x₁, Δd = kλ, 0,5 μm...)
// và đổi sang LaTeX để KaTeX vẽ phân số, chỉ số, căn... Chạy lúc hiển thị (plugin remark trong Markdown.jsx):
// dữ liệu đã lưu KHÔNG đổi, bài cũ không phải soạn lại.
// Chủ trương: thà bỏ sót còn hơn đổi nhầm. Chỉ đổi đoạn chắc chắn là công thức (có dấu =, ≤, phân số a/b, chỉ số,
// chữ Hy Lạp, căn...). Câu chữ thường, code, link, ảnh và công thức $...$ có sẵn giữ nguyên (plugin chỉ duyệt nút chữ
// của cây Markdown). Đoạn nào quy tắc đoán sai thì bọc trong `...` để giữ nguyên.

// ---------- Bảng ký tự ----------
const SUP = { '⁰': '0', '¹': '1', '²': '2', '³': '3', '⁴': '4', '⁵': '5', '⁶': '6', '⁷': '7', '⁸': '8', '⁹': '9', '⁺': '+', '⁻': '-', '⁼': '=', '⁽': '(', '⁾': ')', ⁿ: 'n', ⁱ: 'i' }
const SUB = {
  '₀': '0', '₁': '1', '₂': '2', '₃': '3', '₄': '4', '₅': '5', '₆': '6', '₇': '7', '₈': '8', '₉': '9', '₊': '+', '₋': '-', '₌': '=', '₍': '(', '₎': ')',
  ₐ: 'a', ₑ: 'e', ₒ: 'o', ₓ: 'x', ₕ: 'h', ₖ: 'k', ₗ: 'l', ₘ: 'm', ₙ: 'n', ₚ: 'p', ₛ: 's', ₜ: 't', ᵢ: 'i', ⱼ: 'j', ᵣ: 'r', ᵤ: 'u', ᵥ: 'v',
}
// Dấu phẩy trên chắc chắn (′ ″). Dấu ' và ’ chỉ tính là phẩy trên khi liền sau chữ cái và không dính chữ khác.
const PRIME = { '′': 1, '″': 2 }
const GREEK = {
  α: '\\alpha', β: '\\beta', γ: '\\gamma', δ: '\\delta', ε: '\\varepsilon', ζ: '\\zeta', η: '\\eta', θ: '\\theta', ϑ: '\\vartheta', ι: '\\iota', κ: '\\kappa', λ: '\\lambda',
  μ: '\\mu', '\u00b5': '\\mu', ν: '\\nu', ξ: '\\xi', π: '\\pi', ϖ: '\\varpi', ρ: '\\rho', ϱ: '\\varrho', σ: '\\sigma', ς: '\\varsigma', τ: '\\tau', υ: '\\upsilon',
  φ: '\\varphi', '\u03d5': '\\phi', χ: '\\chi', ψ: '\\psi', ω: '\\omega',
  Γ: '\\Gamma', Δ: '\\Delta', '\u2206': '\\Delta', Θ: '\\Theta', Λ: '\\Lambda', Ξ: '\\Xi', Π: '\\Pi', Σ: '\\Sigma', Υ: '\\Upsilon', Φ: '\\Phi', Ψ: '\\Psi', Ω: '\\Omega', '\u2126': '\\Omega',
}
// ϵ (U+03F5) và ∊ được gõ thay dấu ∈ ("k ϵ Z"), không phải chữ epsilon
const IN_SIGNS = new Set(['\u03f5', '\u220a', '∈'])
const REL = {
  '=': '=', '<': '<', '>': '>', '≤': '\\le', '≥': '\\ge', '≈': '\\approx', '≠': '\\ne', '≪': '\\ll', '≫': '\\gg', '∝': '\\propto', '≡': '\\equiv',
}
const VULGAR = { '½': '\\frac{1}{2}', '¼': '\\frac{1}{4}', '¾': '\\frac{3}{4}', '⅓': '\\frac{1}{3}', '⅔': '\\frac{2}{3}' }
const FUNCS = new Set(['sin', 'cos', 'tan', 'cot', 'arcsin', 'arccos', 'arctan', 'log', 'ln', 'lg', 'exp', 'sqrt', 'abs'])
// Tên hàm viết dính vào đối số: cosα, sinφ, sinωt (đối số phải bắt đầu bằng chữ Hy Lạp; "sinh", "tank" là chữ thường nên không đổi)
const FUNC_PREFIX = /^(?:arcsin|arccos|arctan|sin|cos|tan|cot|log|exp|ln|lg)/
// Tỉ số của đơn vị ghép (m/s, km/h...): không phải phân số của hai biến
const UNIT_RATIOS = new Set([
  'm/s', 'km/h', 'm/s²', 'm/s^2', 'm/s³', 'kg/m³', 'g/cm³', 'rad/s', 'rad/s²', 'N/m', 'N/m²', 'N/C', 'V/m', 'J/s', 'J/kg', 'J/K', 'J/mol', 'W/m²', 'm/min',
  'mol/L', 'cm/s', 'mm/s', 'km/s', 'm/h', 'kJ/kg', 'C/kg', 'A/m', 'T/m', 'Pa/s', 'kg/s', 'g/mol', 'kg/m²', 'V/s', 'A/s', 'W/m', 'Hz/s', 'J/kgK', 'W/mK', 'W/m²K',
])

// Đơn vị đứng sau một số: 0,6 μm · 25 cm · 3 m/s² · 30°C
const UNIT_BASE = ['m', 's', 'g', 'N', 'J', 'W', 'V', 'A', 'C', 'F', 'H', 'T', 'Hz', 'Pa', 'mol', 'Wb', 'eV', 'Ω', String.fromCharCode(0x2126)]
const UNIT_PREFIX = ['k', 'M', 'G', 'm', 'c', 'd', 'n', 'p', 'μ', '\u00b5']
const UNIT_WORDS = [...new Set([...UNIT_BASE, ...UNIT_PREFIX.flatMap((p) => UNIT_BASE.map((u) => p + u)), 'K', 'h', 'min', 'l', 'L', 'rad', 'lx', 'cd', 'atm', '°C', '°F', '°'])].sort(
  (a, b) => b.length - a.length
)
// Viết liền sau số (3kg, 25cm) chỉ nhận đơn vị nhiều chữ, ít bị nhầm với tích biến: 3kT, 2h, 2g, 2m, 5A, 2mg là tích.
// Có cách một dấu cách (3 m, 5 A) thì nhận mọi đơn vị.
const AMBIGUOUS_PRODUCT = /^[kMGmcdnpμ\u00b5][A-Z]$/
const UNIT_ADJACENT = new Set(UNIT_WORDS.filter((u) => u.length >= 2 && !AMBIGUOUS_PRODUCT.test(u) && !['mg', 'cd', 'lx'].includes(u)))
// Đơn vị đứng một mình có số mũ (m², cm³, mm²): vẽ như đơn vị, không coi là biến
const UNIT_LONE = new Set([...UNIT_ADJACENT].filter((u) => !u.startsWith('°')).concat(['m', 's']))
const UNIT_ALT = UNIT_WORDS.map((u) => u.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')
const UNIT_ONE = `(?:${UNIT_ALT})(?:[⁰¹²³⁴⁵⁶⁷⁸⁹⁻]+|\\^-?\\d)?`
const UNIT_TERM = `${UNIT_ONE}(?:[·⋅]${UNIT_ONE})*` // kg·m
// m/s · km/h · J/(kg·K) · N·m
const UNIT = new RegExp(`${UNIT_TERM}(?:/(?:${UNIT_ONE}|\\(${UNIT_TERM}\\)))?`, 'y')
const NUMBER = /\d+(?:,\d+)?(?:\.\d+)?/y
// Chỉ số dưới viết sau _ : N_s, x_t2, I_max, m_NO (chữ hoa liền nhau), N_riêng,1 (nhiều phần cách bằng dấu phẩy)
const SUBWORD = /^(?:\p{Lu}+\d*|[\p{Ll}\p{M}]+\d*|\d+)(?:,(?:\p{Lu}+\d*|[\p{Ll}\p{M}]+\d*|\d+))*/u
// Có ký tự nào gợi ý công thức không? Không có thì bỏ qua ngay (đa số câu chữ thường).
const HINT = /[=<>+/_^√±−×·′″'’°⌊⌋⌈⌉|∈≤≥≈≠∝≡≪≫\u03f5\u0370-\u03ff²³¹\u00b5\u2070-\u209f\u2206\u2126]|sin|cos|tan|cot|log|exp|abs|sqrt/
const MAX_LEN = 20000
const MAX_DEPTH = 40
const LATIN = /[A-Za-z]/
const WORD = /[\p{L}\p{M}\p{N}_]/u
const LETTERISH = /[\p{L}\p{M}]/u

const isWs = (c) => c === ' ' || c === '\t' || c === '\u00a0'
const isDigit = (c) => c !== undefined && c >= '0' && c <= '9'
const isWord = (c) => c !== undefined && WORD.test(c)
const isLetterish = (c) => c !== undefined && LETTERISH.test(c)
const isGreek = (c) => c !== undefined && Object.hasOwn(GREEK, c)
const isMathLetter = (c) => c !== undefined && (LATIN.test(c) || isGreek(c))
const letterTex = (c) => (isGreek(c) ? `${GREEK[c]} ` : c)
const TALL = /\\frac|\\sqrt|\\lfloor|\\lceil|\\left/
/** Dọn khoảng trắng thừa trong LaTeX sinh ra (\lambda _{1} → \lambda_{1}). */
const tidy = (/** @type {string} */ t) => t.replace(/\s+/g, ' ').replace(/ +([}_^')\]])/g, '$1').trim()

/** Nội dung chỉ số dưới: chữ cái đơn, số, k+1 → giữ nguyên (nghiêng); từ nhiều chữ (min, đỏ, vạch) → chữ đứng. */
function subInner(/** @type {string} */ str) {
  return str
    .split(',')
    .map((part) => {
      if (/^(?:[A-Za-z]|\d+|[A-Za-z]\d+)$/.test(part)) return part
      if (/^[A-Za-z0-9]*[+\-−][A-Za-z0-9+\-−]*$/.test(part)) return part.replace(/−/g, '-')
      return `\\text{${part}}`
    })
    .join(',')
}

/**
 * @typedef {{ tex: string, end: number, score: number, v: boolean, kind: string, inner?: string, round?: boolean }} Node
 * @typedef {{ parts: string[], start: number, end: number, score: number, v: boolean, single: Node | null, last: Node }} Seq
 */

/**
 * Tìm các đoạn công thức trong một chuỗi chữ. Trả về [{ start, end, tex }].
 * @param {string} s
 */
function findSpans(s) {
  const n = s.length
  // đoạn chữ cái đã kiểm tra là biến (không phải từ tiếng Việt / tiếng Anh)
  let vStart = -1
  let vEnd = -1
  // độ sâu lồng nhau (ngoặc, căn, hàm...): giới hạn để chuỗi dị dạng không làm tràn ngăn xếp
  let depth = 0
  const guarded = (/** @type {() => any} */ f) => {
    if (depth >= MAX_DEPTH) return null
    depth++
    try {
      return f()
    } finally {
      depth--
    }
  }

  const skipWs = (/** @type {number} */ i) => {
    while (isWs(s[i])) i++
    return i
  }
  let vWord = '' // dãy chữ cái đã kiểm tra (đang xét)
  const runEnd = (/** @type {number} */ p) => {
    let j = p
    while (j < n && isLetterish(s[j]) && SUB[s[j]] === undefined && SUP[s[j]] === undefined && !IN_SIGNS.has(s[j])) j++
    return j
  }
  /** Dãy chữ cái liền nhau có phải biến (tích các biến) không: chỉ chữ Latin / Hy Lạp, ngắn. */
  const runOk = (/** @type {number} */ p, /** @type {number} */ e) => {
    const w = s.slice(p, e)
    if (FUNCS.has(w)) return true
    let greek = false
    for (const ch of w) {
      if (LATIN.test(ch)) continue
      if (isGreek(ch)) {
        greek = true
        continue
      }
      return false
    }
    const len = [...w].length
    if (greek) return len <= 4
    const next = s[e]
    if (len <= 2) {
      // id_user, ax_min…: tên có gạch dưới, không phải biến có chỉ số
      if (len === 2 && next === '_') {
        const sub = SUBWORD.exec(s.slice(e + 1, e + 41))
        if (sub && /[\p{L}\p{M}]{2,}/u.test(sub[0])) return false
      }
      return true
    }
    if (len !== 3) return false
    if (SUB[next] !== undefined || SUP[next] !== undefined || PRIME[next] !== undefined) return true
    // NBS, BIl, nRT: có chữ hoa ở giữa / cuối nên không phải từ thường ("Khe", "Hai" chỉ hoa chữ đầu)
    if (/[A-Z]/.test(w.slice(1))) return true
    // mgh trong "W = mgh": phía trước là phép toán và phía sau là phép toán / dấu câu, hoặc đứng ngay trước dấu bằng
    const before = s.slice(0, p).trimEnd().slice(-1)
    const after = s.slice(e).trimStart()[0]
    if (after !== undefined && '=<>≤≥≈≠'.includes(after)) return true
    return before !== '' && '=+-−±×·/<>≤≥≈≠∈'.includes(before) && (after === undefined || '=+-−±×·)/<>≤≥≈≠.,;:'.includes(after))
  }

  // ----- hậu tố: chỉ số dưới, số mũ, dấu phẩy trên -----
  const parseAsciiSub = (/** @type {number} */ q) => {
    if (s[q] === '{') {
      const close = s.indexOf('}', q)
      if (close < 0 || close - q > 40) return null
      const inner = s.slice(q + 1, close)
      if (!inner || /[\n$\\{]/.test(inner)) return null
      return { tex: `{${subInner(inner)}}`, end: close + 1 }
    }
    const m = SUBWORD.exec(s.slice(q, q + 40))
    if (!m) return null
    let inner = subInner(m[0])
    let end = q + m[0].length
    if (s[end] === ',' && s[end + 1] === '[') {
      // N_s,[x₁,x₂] → N_{s,[x₁,x₂]}
      const g = parseGroup(end + 1)
      if (g && !g.round) {
        inner += `,${g.tex}`
        end = g.end
      }
    }
    return { tex: `{${inner}}`, end }
  }
  const parseAsciiSup = (/** @type {number} */ q) => {
    const c = s[q]
    if (c === '{') {
      const close = s.indexOf('}', q)
      const inner = close < 0 ? '' : s.slice(q + 1, close)
      if (!/^[\w+\-−.,]{1,12}$/.test(inner)) return null
      return { tex: inner.replace('−', '-').replace(',', '{,}'), end: close + 1 }
    }
    if (c === '(') {
      const g = parseGroup(q)
      return g ? { tex: g.inner || g.tex, end: g.end } : null
    }
    const m = /^[-−+]?\d+(?:[.,]\d+)?/.exec(s.slice(q, q + 12))
    if (m) return { tex: m[0].replace('−', '-').replace(',', '{,}'), end: q + m[0].length }
    if (isMathLetter(c) && !isLetterish(s[q + 1])) return { tex: letterTex(c).trim(), end: q + 1 }
    return null
  }
  /** @param {number} p @param {boolean} letterBase chữ cái được thêm chỉ số dưới và dấu phẩy trên; số và nhóm chỉ có số mũ */
  const parseSuffix = (p, letterBase) => {
    const out = { sub: '', sup: '', prime: 0, score: 0, end: p, subUnicode: false }
    let q = p
    for (;;) {
      const c = s[q]
      if (c === undefined) break
      if (letterBase && !out.sub && SUB[c] !== undefined) {
        let t = ''
        while (s[q] !== undefined && SUB[s[q]] !== undefined) t += SUB[s[q++]]
        out.sub = `{${t}}`
        out.subUnicode = true
        out.score++
        continue
      }
      if (letterBase && !out.sub && c === '_') {
        const r = parseAsciiSub(q + 1)
        if (!r) break
        out.sub = r.tex
        q = r.end
        out.score++
        continue
      }
      if (!out.sup && SUP[c] !== undefined) {
        let t = ''
        while (s[q] !== undefined && SUP[s[q]] !== undefined) t += SUP[s[q++]]
        out.sup = t
        out.score++
        continue
      }
      if (!out.sup && c === '^') {
        const r = parseAsciiSup(q + 1)
        if (!r) break
        out.sup = r.tex
        q = r.end
        out.score++
        continue
      }
      if (letterBase && !out.prime) {
        if (PRIME[c] !== undefined) {
          out.prime = PRIME[c]
          q++
          out.score++
          continue
        }
        if ((c === "'" || c === '’') && !isWord(s[q + 1])) {
          out.prime = 1
          q++
          out.score++
          continue
        }
      }
      break
    }
    out.end = q
    return out
  }
  const withSuffix = (/** @type {string} */ base, /** @type {{sub: string, sup: string, prime: number}} */ suf) => {
    let t = base
    if (suf.prime && !suf.sup) {
      t += "'".repeat(suf.prime)
      if (suf.sub) t += `_${suf.sub}`
    } else {
      if (suf.sub) t += `_${suf.sub}`
      if (suf.sup || suf.prime) t += `^{${'\\prime '.repeat(suf.prime)}${suf.sup}}`
    }
    return t
  }

  // ----- đơn vị -----
  const unitTex = (/** @type {string} */ u) => {
    let out = ''
    const re = /°C|°F|°|[μ\u00b5]|[Ω\u2126]|[A-Za-z]+|[/()]|[·⋅]|[⁰¹²³⁴⁵⁶⁷⁸⁹⁻]+|\^-?\d/g
    let m
    while ((m = re.exec(u))) {
      const t = m[0]
      if (t[0] === '°') out += t.length > 1 ? `^{\\circ}\\mathrm{${t[1]}}` : '^{\\circ}'
      else if (t === 'μ' || t === '\u00b5') out += '\\mu '
      else if (t === 'Ω' || t === '\u2126') out += '\\Omega '
      else if (LATIN.test(t[0])) out += `\\mathrm{${t}}`
      else if (t === '·' || t === '⋅') out += '\\cdot '
      else if (t === '/' || t === '(' || t === ')') out += t
      else if (t[0] === '^') out += `^{${t.slice(1)}}`
      else out += `^{${[...t].map((c) => SUP[c]).join('')}}`
    }
    return (u.startsWith('°') ? '' : '\\,') + out
  }
  /** @param {number} p @param {boolean} [afterSup] sau số mũ (10⁻³m): viết liền cũng chắc là đơn vị */
  const matchUnit = (p, afterSup = false) => {
    let q = p
    const spaced = isWs(s[q])
    if (spaced) q++
    UNIT.lastIndex = q
    const m = UNIT.exec(s)
    if (!m) return null
    const end = q + m[0].length
    if (isWord(s[end])) return null
    const u = m[0]
    if (!spaced && !afterSup && !(u.includes('/') ? UNIT_RATIOS.has(u) : UNIT_ADJACENT.has(u.replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹⁻]+$|\^-?\d$/, '')))) return null
    return { tex: unitTex(u), end }
  }

  // ----- nhân tử -----
  /** @returns {Node | null} */
  const parseNumber = (/** @type {number} */ p, /** @type {{unit?: boolean}} */ opts) => {
    NUMBER.lastIndex = p
    const m = NUMBER.exec(s)
    if (!m) return null
    let end = p + m[0].length
    const suf = parseSuffix(end, false)
    let tex = withSuffix(m[0].replace(',', '{,}'), suf)
    end = suf.end
    let kind = 'num'
    if (s[end] === '%') {
      tex += '\\%'
      end++
      kind = 'qty'
    } else if (s[end] === '°' && s[end + 1] !== 'C' && s[end + 1] !== 'F') {
      tex += '^{\\circ}' // 30°: độ (góc), đứng được trong đối số hàm: sin30°
      end++
    } else if (opts.unit !== false) {
      const u = matchUnit(end, suf.sup !== '')
      if (u) {
        tex += u.tex
        end = u.end
        kind = 'qty'
      }
    }
    return { tex, end, score: suf.score, v: false, kind }
  }
  /** @returns {Node | null} */
  const parseLetter = (/** @type {number} */ p) => {
    const ch = s[p]
    if (!isMathLetter(ch)) return null
    if (p < vStart || p >= vEnd) {
      let e = runEnd(p)
      let w = s.slice(p, e)
      const fp = FUNC_PREFIX.exec(w)
      if (fp && w.length > fp[0].length) {
        // cosα, sinφ, sinωt (đối số bắt đầu bằng chữ Hy Lạp). Không nhận "sinh", "tank": là chữ thường
        if (isGreek(w[fp[0].length])) return parseFunc(p, p + fp[0].length, fp[0])
      }
      // hàm viết dính sau biến: Acos(ωt + φ), 2πcos(πt): tách phần biến phía trước ra
      for (let k = 1; k <= 2 && k < w.length; k++) {
        const m = FUNC_PREFIX.exec(w.slice(k))
        if (!m) continue
        const after = s[p + k + m[0].length]
        if (after === '(' || isGreek(after)) {
          e = p + k
          w = s.slice(p, e)
        }
        break
      }
      if (!runOk(p, e)) return null
      if (FUNCS.has(w)) return parseFunc(p, e, w)
      if (SUP[s[e]] !== undefined && UNIT_LONE.has(w)) {
        // m², cm³: đơn vị, không phải biến mang số mũ
        let q = e
        while (SUP[s[q]] !== undefined) q++
        return { tex: unitTex(s.slice(p, q)).replace(/^\\,/, ''), end: q, score: 0, v: false, kind: 'qty' }
      }
      vStart = p
      vEnd = e
      vWord = w
    }
    const suf = parseSuffix(p + 1, true)
    let score = (isGreek(ch) ? 1 : 0) + suf.score
    // O₂, CO₂, N₂: công thức hóa học (chữ hoa + chỉ số dưới Unicode), tự nó chưa đủ để coi là công thức vật lý
    if (suf.subUnicode && !suf.sup && !suf.prime && /^[A-Z]+$/.test(vWord)) score -= 1
    return { tex: withSuffix(letterTex(ch), suf), end: suf.end, score, v: true, kind: 'letter' }
  }
  /** sin x · cos(α) · ln(x) · sqrt(a) · abs(x) @returns {Node | null} */
  const parseFunc = (/** @type {number} */ p, /** @type {number} */ e, /** @type {string} */ w) => {
    let arg = null
    if (s[e] === '(') arg = parseGroup(e)
    else if (w !== 'sqrt' && w !== 'abs') {
      const q = skipWs(e)
      const c = s[q]
      // viết liền: nhận đối số nào cũng được (cosα, sin2α); cách dấu cách: chỉ nhận số, chữ Hy Lạp hoặc một chữ cái đơn (sin x)
      if (q === e ? isMathLetter(c) || isDigit(c) : isDigit(c) || isGreek(c) || (isMathLetter(c) && !isLetterish(s[q + 1]))) {
        const a = parseSeq(q, { noOps: true, unit: false })
        if (a) {
          arg = { tex: a.parts.join(' '), end: a.end, score: a.score, v: a.v, kind: a.last.kind }
          // mẫu số là số thì thuộc đối số (sinπ/6 = sin(π/6)); mẫu số là biến thì không (cosα/Δt = cosα chia Δt)
          if (s[a.end] === '/' && isDigit(s[a.end + 1])) {
            const d = parseDenom(a.end + 1)
            if (d && fractionOk(a.start, a.end, d.end)) arg = { tex: `\\frac{${seqTex(a)}}{${seqTex(d)}}`, end: d.end, score: a.score + d.score + 2, v: a.v || d.v, kind: 'frac' }
          }
        }
      }
    }
    if (!arg || arg.kind === 'qty') return null
    const inner = arg.round ? arg.inner || arg.tex : arg.tex
    if (w === 'sqrt') return { tex: `\\sqrt{${inner}}`, end: arg.end, score: arg.score + 1, v: arg.v, kind: 'sqrt' }
    if (w === 'abs') return { tex: TALL.test(inner) ? `\\left|${inner}\\right|` : `|${inner}|`, end: arg.end, score: arg.score + 1, v: arg.v, kind: 'group' }
    return { tex: `\\${w} ${arg.tex}`, end: arg.end, score: arg.score + 1, v: arg.v, kind: 'func' }
  }
  /** @returns {Node | null} */
  const parseGroup = (/** @type {number} */ p) => {
    const open = s[p]
    const close = open === '(' ? ')' : open === '[' ? ']' : null
    if (!close) return null
    const inner = parseInnerList(skipWs(p + 1))
    if (!inner) return null
    const k = skipWs(inner.end)
    if (s[k] !== close) return null
    const t = inner.tex
    const tex = TALL.test(t) ? `\\left${open} ${t} \\right${close}` : `${open}${t}${close}`
    return { tex, end: k + 1, score: inner.score, v: inner.v, kind: 'group', inner: t, round: open === '(' }
  }
  const parseInnerList = (/** @type {number} */ p) => {
    const a = parseExpr(p, true)
    if (!a) return null
    let { tex, end, score, v } = a
    for (;;) {
      if (s[end] !== ',') break
      const k = skipWs(end + 1)
      const b = parseExpr(k, true)
      if (!b) break
      tex += k > end + 1 ? '{,}\\ ' : ',' // có khoảng trắng sau dấu phẩy: dùng {,} để KaTeX không thêm khoảng nữa
      tex += b.tex
      score += b.score
      v = v || b.v
      end = b.end
    }
    return { tex, end, score, v }
  }
  /** |x| @returns {Node | null} */
  const parseBar = (/** @type {number} */ p) => {
    const inner = parseExpr(skipWs(p + 1), true)
    if (!inner) return null
    const k = skipWs(inner.end)
    if (s[k] !== '|') return null
    const t = inner.tex
    return { tex: TALL.test(t) ? `\\left|${t}\\right|` : `|${t}|`, end: k + 1, score: inner.score + 1, v: inner.v, kind: 'group' }
  }
  /** @returns {Node | null} */
  const parseSqrt = (/** @type {number} */ p) => {
    const f = parseFactor(p + 1, { unit: false })
    if (!f || f.kind === 'qty') return null
    return { tex: `\\sqrt{${f.round ? f.inner || f.tex : f.tex}}`, end: f.end, score: f.score + 1, v: f.v, kind: 'sqrt' }
  }
  /** ⌊x⌋ ⌈x⌉ @returns {Node | null} */
  const parseFloorCeil = (/** @type {number} */ p) => {
    const floor = s[p] === '⌊'
    const inner = parseExpr(skipWs(p + 1), true)
    if (!inner) return null
    const k = skipWs(inner.end)
    if (s[k] !== (floor ? '⌋' : '⌉')) return null
    const [l, r] = floor ? ['\\lfloor', '\\rfloor'] : ['\\lceil', '\\rceil']
    const t = inner.tex
    return { tex: TALL.test(t) ? `\\left${l} ${t} \\right${r}` : `${l} ${t} ${r}`, end: k + 1, score: inner.score + 1, v: inner.v, kind: 'group' }
  }
  /** @returns {Node | null} */
  const parseFactor = (/** @type {number} */ p, /** @type {{unit?: boolean}} */ opts = {}) => guarded(() => parseFactorCore(p, opts))
  /** @returns {Node | null} */
  const parseFactorCore = (/** @type {number} */ p, /** @type {{unit?: boolean}} */ opts) => {
    const c = s[p]
    if (c === undefined) return null
    if (isDigit(c)) return parseNumber(p, opts)
    if (c === '(' || c === '[') {
      const g = parseGroup(p)
      if (!g) return null
      const suf = parseSuffix(g.end, false)
      if (!suf.sup) return g
      return { ...g, tex: withSuffix(g.tex, suf), end: suf.end, score: g.score + suf.score, round: false, inner: undefined }
    }
    if (c === '|') return parseBar(p)
    if (c === '√') return parseSqrt(p)
    if (c === '⌊' || c === '⌈') return parseFloorCeil(p)
    if (VULGAR[c] !== undefined) return { tex: VULGAR[c], end: p + 1, score: 0, v: false, kind: 'num' }
    if (isMathLetter(c)) return parseLetter(p)
    return null
  }

  // ----- tích, thương, tổng, so sánh -----
  const startsJux = (c) => c !== undefined && (isMathLetter(c) || c === '(' || c === '√' || c === '⌊' || c === '⌈')
  /** Hàm lượng giác / log viết ngay trước ngoặc hoặc chữ Hy Lạp (sin(ωt), sinπ/6): được ghép vào tích sau dấu cách (2a sinπ/6). */
  const isFuncStart = (/** @type {number} */ k) => {
    const m = FUNC_PREFIX.exec(s.slice(k, k + 8))
    return !!m && (s[k + m[0].length] === '(' || isGreek(s[k + m[0].length]))
  }
  const isUnitParen = (/** @type {number} */ k) => {
    UNIT.lastIndex = k + 1
    const um = UNIT.exec(s)
    return !!um && s[k + 1 + um[0].length] === ')'
  }
  /** Nối thêm nhân tử: viết liền (kλ, 2π, (a+b)c), có dấu · ×, hoặc cách một dấu cách trước chữ Hy Lạp / căn (k λ). @param {Seq} acc */
  const extendSeq = (/** @type {Seq} */ acc, /** @type {{ noOps?: boolean }} */ opts = {}) => {
    for (;;) {
      if (acc.last.kind === 'qty') break // đã có đơn vị: hết một đại lượng
      const j = acc.end
      const k0 = skipWs(j)
      const c = s[k0]
      if (!opts.noOps && (c === '·' || c === '×')) {
        const g = parseFactor(skipWs(k0 + 1))
        if (!g) break
        acc.parts.push(c === '·' ? '\\cdot' : '\\times', g.tex)
        acc.score += 1 + g.score
        acc.v = acc.v || g.v
        acc.single = null
        acc.last = g
        acc.end = g.end
        continue
      }
      let g = null
      if (k0 === j) {
        if (c === '(' && isUnitParen(k0)) break // u = 3cosπt(cm): (cm) là chú thích đơn vị, không phải nhân tử
        if (startsJux(c)) g = parseFactor(j)
      } else if (isGreek(c) || c === '√' || isFuncStart(k0)) g = parseFactor(k0)
      if (!g) break
      acc.parts.push(g.tex)
      acc.score += g.score
      acc.v = acc.v || g.v
      acc.single = null
      acc.last = g
      acc.end = g.end
    }
    return acc
  }
  /** @returns {Seq | null} */
  const parseSeq = (/** @type {number} */ p, /** @type {{unit?: boolean, noOps?: boolean}} */ opts = {}) => {
    const f = parseFactor(p, opts)
    if (!f) return null
    return extendSeq({ parts: [f.tex], start: p, end: f.end, score: f.score, v: f.v, single: f, last: f }, opts)
  }
  /** Mẫu số: các nhân tử viết liền nhau (aD, 2π, (kD)), dừng ở dấu cách hoặc phép toán. @returns {Seq | null} */
  const parseDenom = (/** @type {number} */ p) => {
    const f = parseFactor(p, { unit: false })
    if (!f) return null
    /** @type {Seq} */
    const acc = { parts: [f.tex], start: p, end: f.end, score: f.score, v: f.v, single: f, last: f }
    while (startsJux(s[acc.end])) {
      const g = parseFactor(acc.end, { unit: false })
      if (!g) break
      acc.parts.push(g.tex)
      acc.score += g.score
      acc.v = acc.v || g.v
      acc.single = null
      acc.last = g
      acc.end = g.end
    }
    return acc
  }
  const seqTex = (/** @type {Seq} */ q) => (q.single && q.single.round && q.single.inner ? q.single.inner : q.parts.join(' '))
  /** a/b có phải phân số của biến không? (loại: m/s, TN/TL, A/B/C/D, ngày 12/10/2026) */
  const fractionOk = (/** @type {number} */ a, /** @type {number} */ slash, /** @type {number} */ b) => {
    const num = s.slice(a, slash).replace(/\s/g, '')
    const den = s.slice(slash + 1, b).replace(/\s/g, '')
    if (UNIT_RATIOS.has(`${num}/${den}`)) return false
    if (/^[A-Z]{2,}$/.test(num) || /^[A-Z]{2,}$/.test(den)) return false
    if (/^[A-E]$/.test(num) && /^[A-E]$/.test(den)) return false
    if (/^\d+$/.test(num) && /^\d+$/.test(den) && (/^\/\d/.test(s.slice(b)) || /\d\/$/.test(s.slice(Math.max(0, a - 3), a)))) return false
    return true
  }
  /** @returns {{ tex: string, end: number, score: number, v: boolean, kind: string } | null} */
  const parseProd = (/** @type {number} */ p, /** @type {{unit?: boolean, noOps?: boolean}} */ opts = {}) => {
    let acc = parseSeq(p, opts)
    if (!acc) return null
    for (;;) {
      if (s[acc.end] !== '/') break
      const d = parseDenom(acc.end + 1)
      if (!d || !fractionOk(acc.start, acc.end, d.end)) break
      /** @type {Node} */
      let frac = { tex: `\\frac{${seqTex(acc)}}{${seqTex(d)}}`, end: d.end, score: acc.score + d.score + 2, v: acc.v || d.v, kind: 'frac' }
      const u = matchUnit(frac.end) // 5,2/11 mm: đơn vị thuộc cả thương
      if (u) frac = { ...frac, tex: frac.tex + u.tex, end: u.end, kind: 'qty' }
      acc = extendSeq({ parts: [frac.tex], start: acc.start, end: frac.end, score: frac.score, v: frac.v, single: null, last: frac }, opts)
    }
    return { tex: acc.parts.join(' '), end: acc.end, score: acc.score, v: acc.v, kind: acc.last.kind }
  }
  /** @returns {{ tex: string, end: number, score: number, v: boolean } | null} */
  const parseSum = (/** @type {number} */ p, /** @type {boolean} */ signOk) => {
    let q = p
    let lead = ''
    let score = 0
    const c = s[q]
    if (c === '±' || c === '∓' || c === '−') {
      lead = c === '±' ? '\\pm ' : c === '∓' ? '\\mp ' : '-'
      score += 1
      q = skipWs(q + 1)
    } else if (signOk && (c === '-' || c === '–' || c === '+')) {
      lead = c === '+' ? '+' : '-'
      q = skipWs(q + 1)
    }
    const a = parseProd(q)
    if (!a) return null
    let tex = lead + a.tex
    let end = a.end
    score += a.score
    let v = a.v
    let leftStart = q
    for (;;) {
      const k0 = skipWs(end)
      const op = s[k0]
      const spaced = k0 > end
      let optex = null
      if (op === '+') optex = '+'
      else if (op === '−' || op === '-') optex = '-'
      else if (op === '±') optex = '\\pm'
      else if (op === '∓') optex = '\\mp'
      else if (op === '–' && spaced && isWs(s[k0 + 1])) optex = '-'
      if (!optex) break
      const rStart = skipWs(k0 + 1)
      const b = parseProd(rStart)
      if (!b) break
      // Dấu + − chỉ tính là "có công thức" khi dính tới biến, và hai vế đều là biến thì phải ngắn gọn (chữ đơn, có chỉ số, có ngoặc):
      // tránh "1-b; 2-d", "(SGK-CD)", "ii-tn-1" thành công thức.
      if (op === '−' || op === '±' || op === '∓') score += 1
      else {
        const L = s.slice(leftStart, k0).trim()
        const R = s.slice(rStart, b.end).trim()
        const shortVars = /^[A-Za-z]$/.test(L) || /^[A-Za-z]$/.test(R) || /[^\x00-\x7f(]/.test(L + R)
        const bothSpaced = spaced && isWs(s[k0 + 1])
        // "P-T", "a-d" (tên đồ thị, khoảng ý a đến d) viết liền giữa hai chữ đơn: chưa đủ để coi là phép trừ
        const labelLike = op === '-' && !bothSpaced && /^[A-Za-z]$/.test(L) && /^[A-Za-z]$/.test(R)
        if (v && b.v) score += shortVars && !labelLike ? 1 : 0
        else if (v || b.v) score += op === '+' || bothSpaced ? 1 : 0
      }
      tex += ` ${optex} ${b.tex}`
      score += b.score
      v = v || b.v
      end = b.end
      leftStart = rStart
    }
    return { tex, end, score, v }
  }
  const matchRel = (/** @type {number} */ k) => {
    const c = s[k]
    if (c === undefined) return null
    const two = s.slice(k, k + 2)
    if (two === '<=') return { len: 2, tex: '\\le' }
    if (two === '>=') return { len: 2, tex: '\\ge' }
    if (two === '!=') return { len: 2, tex: '\\ne' }
    if (IN_SIGNS.has(c)) return { len: 1, tex: '\\in' }
    if (REL[c] !== undefined) return { len: 1, tex: REL[c] }
    return null
  }
  /** @returns {{ tex: string, end: number, score: number, v: boolean } | null} */
  const parseExpr = (/** @type {number} */ p, /** @type {boolean} */ signOk = false) => guarded(() => parseExprCore(p, signOk))
  /** @returns {{ tex: string, end: number, score: number, v: boolean } | null} */
  const parseExprCore = (/** @type {number} */ p, /** @type {boolean} */ signOk) => {
    const a = parseSum(p, signOk)
    if (!a) return null
    let { tex, end, score, v } = a
    for (;;) {
      const k0 = skipWs(end)
      const rel = matchRel(k0)
      if (!rel) break
      const b = parseSum(skipWs(k0 + rel.len), true)
      if (!b) break
      const rhs = rel.tex === '\\in' && /^[ZNRQC]$/.test(b.tex) ? `\\mathbb{${b.tex}}` : b.tex
      tex += ` ${rel.tex} ${rhs}`
      score += 2 + b.score
      v = v || b.v
      end = b.end
    }
    return { tex, end, score, v }
  }

  // ----- quét -----
  const canStart = (c) => c !== undefined && (isDigit(c) || isMathLetter(c) || '([|√⌊⌈±∓−'.includes(c) || VULGAR[c] !== undefined)
  /** @type {{ start: number, end: number, tex: string }[]} */
  const spans = []
  let i = 0
  while (i < n) {
    const c = s[i]
    // bỏ qua: không phải chỗ bắt đầu, đang giữa một từ, hoặc sau dấu gạch nối trong từ ghép / mã (cd5-ii-tn-1, I-âng)
    if (!canStart(c) || (i > 0 && isWord(s[i - 1])) || (i > 1 && s[i - 1] === '-' && isWord(s[i - 2]))) {
      i++
      continue
    }
    const r = parseExpr(i)
    if (r && r.score > 0 && !isWord(s[r.end])) {
      spans.push({ start: i, end: r.end, tex: tidy(r.tex) })
      i = r.end
      continue
    }
    i = Math.max(i + 1, r ? r.end : i + 1)
    while (i < n && isWord(s[i]) && isWord(s[i - 1])) i++ // đang giữa một từ: đi hết từ
  }
  return spans
}

/** Các đoạn công thức tìm được trong một chuỗi: [{ start, end, tex }] (dùng cho test / kiểm tra hàng loạt). @param {string} text */
export function findMathSpans(text) {
  if (typeof text !== 'string' || text.length < 2 || text.length > MAX_LEN || !HINT.test(text)) return []
  try {
    return findSpans(text)
  } catch {
    return [] // quy tắc lỗi bất ngờ thì giữ nguyên chữ, không làm hỏng trang
  }
}

/**
 * Tách một đoạn chữ thành các phần chữ thường và công thức.
 * standalone: đoạn chỉ gồm đúng một công thức → vẽ cỡ lớn (\displaystyle) để phân số dễ đọc.
 * @param {string} text
 * @param {{ standalone?: boolean }} [opts]
 * @returns {({ type: 'text', value: string } | { type: 'math', tex: string })[]}
 */
export function convertText(text, { standalone = false } = {}) {
  const spans = findMathSpans(text)
  if (!spans.length) return [{ type: 'text', value: text }]
  /** @type {({ type: 'text', value: string } | { type: 'math', tex: string })[]} */
  const out = []
  let pos = 0
  for (const sp of spans) {
    if (sp.start > pos) out.push({ type: 'text', value: text.slice(pos, sp.start) })
    let tex = sp.tex
    if (standalone && spans.length === 1 && !text.slice(0, sp.start).trim() && !text.slice(sp.end).replace(/[\s.,;:]+/g, '') && /\\frac/.test(tex)) {
      tex = `\\displaystyle ${tex}`
    }
    out.push({ type: 'math', tex })
    pos = sp.end
  }
  if (pos < text.length) out.push({ type: 'text', value: text.slice(pos) })
  return out
}

// ---------- Plugin remark ----------
// Nút không đụng tới: code, công thức có sẵn, HTML, link, ảnh (đường dẫn / base64 nằm ở đó).
const SKIP = new Set(['code', 'inlineCode', 'math', 'inlineMath', 'html', 'yaml', 'toml', 'link', 'linkReference', 'image', 'imageReference', 'definition'])

/** @param {any} node */
function walk(node) {
  const kids = node.children
  if (!Array.isArray(kids)) return
  for (let i = 0; i < kids.length; i++) {
    const k = kids[i]
    if (k.type === 'text') {
      const parts = convertText(k.value, { standalone: node.type === 'paragraph' && kids.length === 1 })
      if (parts.length === 1 && parts[0].type === 'text') continue
      const repl = parts.map((p) =>
        p.type === 'text'
          ? { type: 'text', value: p.value }
          : // đúng dạng nút công thức mà remark-math tạo ra, để rehype-katex vẽ như $...$
            { type: 'inlineMath', value: p.tex, data: { hName: 'code', hProperties: { className: ['language-math', 'math-inline'] }, hChildren: [{ type: 'text', value: p.tex }] } }
      )
      kids.splice(i, 1, ...repl)
      i += repl.length - 1
    } else if (!SKIP.has(k.type)) walk(k)
  }
}

/** Plugin remark: đổi công thức viết bằng chữ thường thành công thức LaTeX (xem đầu file). */
export function remarkAutoMath() {
  return (/** @type {any} */ tree) => walk(tree)
}
