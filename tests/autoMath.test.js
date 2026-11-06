import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import ReactMarkdown from 'react-markdown'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import katex from 'katex'
import { describe, expect, it } from 'vitest'
import { convertText, findMathSpans, remarkAutoMath } from '../src/lib/autoMath.js'

/** Chữ sau khi đổi: phần công thức đặt trong $...$ cho dễ đọc */
const show = (/** @type {string} */ text) => convertText(text).map((p) => (p.type === 'math' ? `$${p.tex}$` : p.value)).join('')

// Các chuỗi dưới đây lấy từ bài giảng / bài tập thật (Chủ đề 5 Giao thoa ánh sáng và các chủ đề Lý, Toán khác)
const CONVERT = [
  // dòng công thức của bài giảng
  ['i = λD/a', String.raw`$i = \frac{\lambda D}{a}$`],
  ['Δd_s = kλ, k ∈ Z', String.raw`$\Delta d_{s} = k \lambda$, $k \in \mathbb{Z}$`],
  ['Δφ = 2πΔd/λ', String.raw`$\Delta \varphi = \frac{2 \pi \Delta d}{\lambda}$`],
  ['|x_t,n| = (n − 0,5)i', String.raw`$|x_{t,n}| = (n - 0{,}5) i$`],
  ['i′/i = (λ′/λ)(D′/D)(a/a′)', String.raw`$\frac{i'}{i} = \left( \frac{\lambda'}{\lambda} \right) \left( \frac{D'}{D} \right) \left( \frac{a}{a'} \right)$`],
  ['N_s = 2⌊L/(2i)⌋ + 1', String.raw`$N_{s} = 2 \left\lfloor \frac{L}{2 i} \right\rfloor + 1$`],
  ['N_s,[x₁,x₂] = ⌊x₂/i⌋ − ⌈x₁/i⌉ + 1', String.raw`$N_{s,[x_{1},x_{2}]} = \left\lfloor \frac{x_{2}}{i} \right\rfloor - \left\lceil \frac{x_{1}}{i} \right\rceil + 1$`],
  ['N_vạch = N₁ + N₂ − N_trùng', String.raw`$N_{\text{vạch}} = N_{1} + N_{2} - N_{\text{trùng}}$`],
  ['λ_min ≤ λ ≤ λ_max', String.raw`$\lambda_{\text{min}} \le \lambda \le \lambda_{\text{max}}$`],
  ['Δx_n = n(λ_max − λ_min)D/a', String.raw`$\Delta x_{n} = \frac{n (\lambda_{\text{max}} - \lambda_{\text{min}}) D}{a}$`],
  // công thức nằm giữa câu
  ['Vân tối gần tâm nhất có |Δd| = λ/2, vân tối thứ hai có |Δd| = 3λ/2.', String.raw`Vân tối gần tâm nhất có $|\Delta d| = \frac{\lambda}{2}$, vân tối thứ hai có $|\Delta d| = \frac{3 \lambda}{2}$.`],
  ['Câu 1: Trong thí nghiệm I-âng, biết a = 0,4 mm, D = 1,2 m, nguồn S phát ra bức xạ đơn sắc có λ = 600 nm.', String.raw`Câu 1: Trong thí nghiệm I-âng, biết $a = 0{,}4\,\mathrm{mm}$, $D = 1{,}2\,\mathrm{m}$, nguồn S phát ra bức xạ đơn sắc có $\lambda = 600\,\mathrm{nm}$.`],
  ['Quang phổ bậc n nằm từ nλ_minD/a đến nλ_maxD/a.', String.raw`Quang phổ bậc n nằm từ $\frac{n \lambda_{\text{min}} D}{a}$ đến $\frac{n \lambda_{\text{max}} D}{a}$.`],
  ['Gọi d₁, d₂ là đường đi, Δd = d₂ − d₁.', String.raw`Gọi $d_{1}$, $d_{2}$ là đường đi, $\Delta d = d_{2} - d_{1}$.`],
  ['Cột A: 1. ia/D; 2. λD/a; 3. (k + 0,5)i; 4. ki.', String.raw`Cột A: 1. $\frac{i a}{D}$; 2. $\frac{\lambda D}{a}$; 3. $(k + 0{,}5) i$; 4. ki.`],
  // phương án trắc nghiệm viết kiểu Word
  ['bằng (k - (1)/(2))λ.', String.raw`bằng $\left( k - \frac{1}{2} \right) \lambda$.`],
  ['x = kλa/D với kϵZ', String.raw`$x = \frac{k \lambda a}{D}$ với $k \in \mathbb{Z}$`],
  ['d₂-d₁ =(k-1)λ/2 (k ∈ Z)', String.raw`$d_{2} - d_{1} = \frac{(k - 1) \lambda}{2}$ $(k \in \mathbb{Z})$`],
  ['± 9,6 mm.', String.raw`$\pm 9{,}6\,\mathrm{mm}$.`],
  ['0,232.10⁻³m', String.raw`$0{,}232.10^{-3}\,\mathrm{m}$`],
  ['13,92×10⁻³ m', String.raw`$13{,}92 \times 10^{-3}\,\mathrm{m}$`],
  ["Câu 23: λ' = 0,6μm.", String.raw`Câu 23: $\lambda' = 0{,}6\,\mu \mathrm{m}$.`],
  ['bước sóng λ’ thì khoảng vân tăng', String.raw`bước sóng $\lambda'$ thì khoảng vân tăng`],
  // lời giải có số liệu và đơn vị
  ['Chọn: λ = ax/(3D) = 1·3/(3·2) = 0,5 μm = 500 nm.', String.raw`Chọn: $\lambda = \frac{a x}{3 D} = \frac{1 \cdot 3}{3 \cdot 2} = 0{,}5\,\mu \mathrm{m} = 500\,\mathrm{nm}$.`],
  ['12 vân sáng liên tiếp tạo 11 khoảng vân: i = 5,2/11 mm.', String.raw`12 vân sáng liên tiếp tạo 11 khoảng vân: $i = \frac{5{,}2}{11}\,\mathrm{mm}$.`],
  ['x_M = 5λD/a = 6λD/(a + 0,2 mm).', String.raw`$x_{M} = \frac{5 \lambda D}{a} = \frac{6 \lambda D}{a + 0{,}2\,\mathrm{mm}}$.`],
  ['một đoạn nhỏ nhất là 1/7 m thì M chuyển thành vân tối.', String.raw`một đoạn nhỏ nhất là $\frac{1}{7}\,\mathrm{m}$ thì M chuyển thành vân tối.`],
  ['f = c/λ = 3×10⁸/(6×10⁻⁸) = 5×10¹⁵ Hz.', String.raw`$f = \frac{c}{\lambda} = \frac{3 \times 10^{8}}{6 \times 10^{-8}} = 5 \times 10^{15}\,\mathrm{Hz}$.`],
  ['Δh = 3 − 1 = 2 m', String.raw`$\Delta h = 3 - 1 = 2\,\mathrm{m}$`],
  ['I_max = (√I₁ + √I₂)² giảm, I_min = (√I₁ − √I₂)² tăng', String.raw`$I_{\text{max}} = \left( \sqrt{I_{1}} + \sqrt{I_{2}} \right)^{2}$ giảm, $I_{\text{min}} = \left( \sqrt{I_{1}} - \sqrt{I_{2}} \right)^{2}$ tăng`],
  ['Chọn: Vân tối thứ hai có abs(Δd) = (2 − 0,5)λ = 1,5λ.', String.raw`Chọn: Vân tối thứ hai có $|\Delta d| = (2 - 0{,}5) \lambda = 1{,}5 \lambda$.`],
  // vật lý khác: phân số biến, đơn vị ghép, tích nhiều chữ
  ['a = F/m', String.raw`$a = \frac{F}{m}$`],
  ['v = s/t', String.raw`$v = \frac{s}{t}$`],
  ['E = 3kT/2', String.raw`$E = \frac{3 k T}{2}$`],
  ['g = 10 m/s²', String.raw`$g = 10\,\mathrm{m}/\mathrm{s}^{2}$`],
  ['ρ = 8,9 g/cm³', String.raw`$\rho = 8{,}9\,\mathrm{g}/\mathrm{cm}^{3}$`],
  ['c = 4200 J/(kg·K)', String.raw`$c = 4200\,\mathrm{J}/(\mathrm{kg}\cdot \mathrm{K})$`],
  ['pV = nRT', String.raw`$p V = n R T$`],
  ['W = mgh', String.raw`$W = m g h$`],
  ['E₀ = NBSω', String.raw`$E_{0} = N B S \omega$`],
  ['S₂₀ = 8(2²⁰ − 1) − 20·21·41/6', String.raw`$S_{20} = 8 (2^{20} - 1) - \frac{20 \cdot 21 \cdot 41}{6}$`],
  ['(14000−m_NO)/28 + m_NO/30 = pV/(RT)', String.raw`$\frac{14000 - m_{\text{NO}}}{28} + \frac{m_{\text{NO}}}{30} = \frac{p V}{R T}$`],
  ['u_{k+1} − u_k = (u_k − u_{k−1})', String.raw`$u_{k+1} - u_{k} = (u_{k} - u_{k-1})$`],
  // hàm lượng giác: đối số dính liền, phân số có mẫu là số thuộc đối số, mẫu là biến thì không
  ['A = F·s·cosα', String.raw`$A = F \cdot s \cdot \cos \alpha$`],
  ['x = 2πcos(πt + 1,5π)', String.raw`$x = 2 \pi \cos (\pi t + 1{,}5 \pi)$`],
  ['e_c = −N·ΔB·S·cosα/Δt', String.raw`$e_{c} = -\frac{N \cdot \Delta B \cdot S \cdot \cos \alpha}{\Delta t}$`],
  ['2a sinπ/6 = a', String.raw`$2 a \sin \frac{\pi}{6} = a$`],
  ['Chọn: F = BIl·sinα = 2.10⁻⁴ N.', String.raw`Chọn: $F = B I l \cdot \sin \alpha = 2.10^{-4}\,\mathrm{N}$.`],
  ['thì α = 180°, cosα = −1, công âm', String.raw`thì $\alpha = 180^{\circ}$, $\cos \alpha = -1$, công âm`],
  ['Tính sin30° và cos60°', String.raw`Tính $\sin 30^{\circ}$ và $\cos 60^{\circ}$`],
  ['u = 3cosπt(cm)', String.raw`$u = 3 \cos \pi t$(cm)`],
]

// Văn xuôi, đơn vị, từ viết tắt, mã, công thức hóa học, tên đồ thị: phải giữ nguyên
const KEEP = [
  'Hôm nay trời đẹp, ta đi học. Do đó em rất vui.',
  'Nam đi bộ 5 km trong 2 h với tốc độ 2,5 km/h',
  'sáng/tối và/hoặc TN/TL km/h m/s (m/s)',
  'Chọn đáp án A/B/C/D',
  'ngày 12/10/2026',
  '1–b; 2–d; 3–a; 4–c',
  'Câu 2: (SBT - KNTT) Một trong hai khe bằng ½ cường độ sáng',
  'Học sinh nghe giảng, năng lượng không tự sinh ra',
  'Khí CO₂ và O₂ trong N₂, nước H₂O',
  'vl11-c2-cd5-ii-tn-1',
  'bai_giang',
  'đồ thị P-T và V-T, chọn a-d',
  'diện tích 5 m² và thể tích 3 cm³, đơn vị là m³',
  'Bước 2: tính i và đặt tọa độ',
  'Chương 2: Sóng',
  'Cho hai điểm A, B cách nhau 5 cm (hình a)',
  'Hình tự vẽ; (SGK-CD) Thầy đã sửa',
  'Chủ đề 5 - Giao thoa ánh sáng - Dạng 1',
  'Mục II · Bài tập',
  'Câu 3 : 5 vân sáng',
]

describe('convertText: đổi công thức viết bằng chữ thường sang LaTeX', () => {
  it.each(CONVERT)('%s', (input, expected) => {
    expect(show(input)).toBe(expected)
  })

  it.each(KEEP)('giữ nguyên: %s', (input) => {
    expect(show(input)).toBe(input)
  })

  it('mọi công thức sinh ra đều là LaTeX hợp lệ (KaTeX không báo lỗi)', () => {
    for (const [input] of CONVERT) {
      for (const sp of findMathSpans(input)) {
        expect(() => katex.renderToString(sp.tex, { throwOnError: true, strict: false }), `${input} → ${sp.tex}`).not.toThrow()
      }
    }
  })

  it('findMathSpans trả đúng vị trí đoạn công thức trong chuỗi gốc', () => {
    const text = 'Khoảng vân được tính bằng i = λD/a, còn x = ki.'
    const spans = findMathSpans(text)
    expect(spans.map((s) => text.slice(s.start, s.end))).toEqual(['i = λD/a', 'x = ki'])
  })

  it('đoạn chỉ gồm một công thức có phân số thì vẽ cỡ lớn (standalone)', () => {
    expect(convertText('i = λD/a', { standalone: true })).toEqual([{ type: 'math', tex: String.raw`\displaystyle i = \frac{\lambda D}{a}` }])
    expect(convertText('i = λD/a.', { standalone: true })[0]).toEqual({ type: 'math', tex: String.raw`\displaystyle i = \frac{\lambda D}{a}` })
    // có chữ xung quanh, hoặc không có phân số: giữ cỡ thường
    expect(show('Ta có i = λD/a')).not.toContain('displaystyle')
    expect(convertText('x = ki', { standalone: true })).toEqual([{ type: 'math', tex: 'x = k i' }])
  })

  it('đầu vào lạ không làm hỏng: rỗng, ngắn, không phải chuỗi', () => {
    expect(convertText('')).toEqual([{ type: 'text', value: '' }])
    expect(convertText('a')).toEqual([{ type: 'text', value: 'a' }])
    expect(findMathSpans(/** @type {any} */ (undefined))).toEqual([])
  })
})

describe('remarkAutoMath: plugin trên cây Markdown', () => {
  /** @param {any[]} children */
  const root = (children) => ({ type: 'root', children })
  const para = (/** @type {any[]} */ ...children) => ({ type: 'paragraph', children })
  const text = (/** @type {string} */ value) => ({ type: 'text', value })

  it('đổi nút chữ thành nút công thức đúng dạng remark-math tạo ra', () => {
    const tree = root([para(text('Ta có i = λD/a nên'))])
    remarkAutoMath()(tree)
    const kids = tree.children[0].children
    expect(kids.map((k) => k.type)).toEqual(['text', 'inlineMath', 'text'])
    expect(kids[1]).toEqual({
      type: 'inlineMath',
      value: String.raw`i = \frac{\lambda D}{a}`,
      data: { hName: 'code', hProperties: { className: ['language-math', 'math-inline'] }, hChildren: [{ type: 'text', value: String.raw`i = \frac{\lambda D}{a}` }] },
    })
  })

  it('đoạn chỉ có một công thức thì vẽ cỡ lớn, trong danh sách cũng vậy', () => {
    const tree = root([para(text('i = λD/a')), { type: 'list', children: [{ type: 'listItem', children: [para(text('x = (k + 0,5)i'))] }] }])
    remarkAutoMath()(tree)
    expect(tree.children[0].children[0].value).toBe(String.raw`\displaystyle i = \frac{\lambda D}{a}`)
    expect(tree.children[1].children[0].children[0].children[0].value).toBe(String.raw`x = (k + 0{,}5) i`)
  })

  it('không đụng vào code, công thức có sẵn, link, ảnh', () => {
    const untouched = [
      { type: 'inlineCode', value: 'a/b = c' },
      { type: 'inlineMath', value: 'a/b' },
      { type: 'link', url: 'https://x.y/a/b', children: [text('x = a/b')] },
      { type: 'image', url: 'data:image/png;base64,AAAA/BBB=', alt: 'i = λD/a' },
      { type: 'html', value: '<br/>' },
    ]
    const tree = root([para(...untouched)])
    const before = JSON.stringify(tree)
    remarkAutoMath()(tree)
    expect(JSON.stringify(tree)).toBe(before)
  })

  it('đi vào chữ đậm / nghiêng', () => {
    const tree = root([para({ type: 'strong', children: [text('Δd = kλ')] })])
    remarkAutoMath()(tree)
    expect(tree.children[0].children[0].children[0].type).toBe('inlineMath')
  })
})

describe('react-markdown + remark-math + remarkAutoMath + rehype-katex', () => {
  const html = (/** @type {string} */ md, /** @type {boolean} */ auto = true) =>
    renderToStaticMarkup(
      createElement(
        ReactMarkdown,
        {
          remarkPlugins: auto ? [remarkMath, remarkAutoMath] : [remarkMath],
          rehypePlugins: [[rehypeKatex, { throwOnError: false, strict: false }]],
          urlTransform: (/** @type {string} */ u) => u,
        },
        md
      )
    )

  it('công thức chữ thường được vẽ thành phân số KaTeX; tắt plugin thì không', () => {
    const md = '### Công thức\n\n- i = λD/a\n- x_t = (k + 0,5)i\n\nVới a = 0,4 mm thì D = 1,2 m.'
    const on = html(md)
    expect(on).toContain('class="mfrac"')
    expect(on).toContain('class="katex"')
    expect(on).not.toContain('katex-error')
    expect(html(md, false)).not.toContain('class="katex"')
  })

  it('code, link và ảnh nhúng base64 giữ nguyên', () => {
    const out = html('`a/b = c` và [x = a/b](https://ex.com/a/b) ![h](data:image/png;base64,AAAA/BBB=)')
    expect(out).toContain('<code>a/b = c</code>')
    expect(out).toContain('href="https://ex.com/a/b"')
    expect(out).toContain('>x = a/b</a>')
    expect(out).toContain('src="data:image/png;base64,AAAA/BBB="')
    expect(out).not.toContain('class="katex"')
  })

  it('công thức $...$ viết sẵn vẫn là của tác giả, không bị đổi', () => {
    const out = html('Cho $a/b$ và i = λD/a')
    expect(out.match(/class="mfrac"/g)).toHaveLength(1) // chỉ i = λD/a thành phân số; $a/b$ giữ dạng a/b
  })
})
