// Phân tích JSON bài giảng / bài tập soạn sẵn ở bên ngoài.
//
// Vấn đề hay gặp: công thức LaTeX viết "\frac" thay vì "\\frac" trong JSON.
// JSON.parse sẽ hiểu "\f" là ký tự form-feed, "\t" là tab, "\n" là xuống dòng...
// → công thức hỏng mà không báo lỗi. Hàm fixLatexBackslashes sửa trước khi parse.

// Lệnh LaTeX bắt đầu bằng b, f, n, r, t, u (trùng với ký tự escape hợp lệ của JSON)
const AMBIGUOUS_LATEX = new Set([
  // b
  'beta', 'bar', 'begin', 'boxed', 'bf', 'big', 'bigg', 'bigl', 'bigr', 'biggl', 'biggr', 'binom',
  'bmod', 'bot', 'bullet', 'backslash', 'because', 'breve', 'bmatrix', 'bigcup', 'bigcap', 'bigodot',
  // f
  'frac', 'forall', 'flat', 'frown', 'footnotesize',
  // n
  'nu', 'neq', 'ne', 'nabla', 'newline', 'not', 'ni', 'neg', 'nearrow', 'nleq', 'ngeq', 'nmid',
  'notin', 'nolimits', 'normalsize', 'nwarrow', 'nexists',
  // r
  'rho', 'right', 'rightarrow', 'rightleftharpoons', 'rangle', 'rm', 'rceil', 'rfloor', 'rbrace',
  'rbrack', 'rvert', 'rVert', 'ref', 'root',
  // t
  'theta', 'tau', 'times', 'text', 'textbf', 'textit', 'textrm', 'textstyle', 'to', 'tan', 'tanh',
  'tilde', 'triangle', 'triangleq', 'top', 'tfrac', 'therefore', 'tag', 'tiny', 'texttt', 'textcolor',
  // u
  'underline', 'uparrow', 'Uparrow', 'upsilon', 'underbrace', 'updownarrow', 'unlhd',
])

const JSON_ESCAPES = new Set(['"', '\\', '/', 'b', 'f', 'n', 'r', 't', 'u'])

export function fixLatexBackslashes(text) {
  let out = ''
  let fixes = 0
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (ch !== '\\') {
      out += ch
      continue
    }
    const next = text[i + 1]
    if (next === undefined) {
      out += '\\\\'
      fixes++
      continue
    }
    // Đã escape đúng: "\\", "\"", "\/"
    if (next === '\\' || next === '"' || next === '/') {
      out += ch + next
      i++
      continue
    }
    if (JSON_ESCAPES.has(next)) {
      const word = /^[a-zA-Z]+/.exec(text.slice(i + 1))[0]
      const isUnicode = next === 'u' && /^u[0-9a-fA-F]{4}/.test(text.slice(i + 1))
      if (!isUnicode && word.length >= 2 && AMBIGUOUS_LATEX.has(word)) {
        out += '\\\\' // \frac → \\frac
        fixes++
      } else {
        out += ch // escape JSON hợp lệ như \n, \t
      }
      continue
    }
    // Escape không hợp lệ trong JSON (\alpha, \Delta, \sqrt, \(, \{ ...) → chắc chắn là LaTeX
    out += '\\\\'
    fixes++
  }
  return { text: out, fixes }
}

// Bỏ khung ```json ... ``` nếu dán nguyên câu trả lời của chatbot
function stripFences(text) {
  const m = /^```[a-zA-Z]*\s*\n([\s\S]*?)\n?```\s*$/.exec(text.trim())
  return m ? m[1] : text.trim()
}

function isNonEmptyString(v) {
  return typeof v === 'string' && v.trim() !== ''
}

function optString(v, field, errors) {
  if (v === undefined || v === null) return ''
  if (typeof v !== 'string') {
    errors.push(`"${field}" phải là chuỗi văn bản.`)
    return ''
  }
  return v
}

function validDate(s) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false
  const [y, m, d] = s.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d))
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d
}

// Trả về { draft, warnings } hoặc ném Error với danh sách lỗi dễ hiểu
export function parseImport(raw) {
  if (!raw || !raw.trim()) throw new Error('Chưa dán nội dung JSON.')
  const { text, fixes } = fixLatexBackslashes(stripFences(raw))
  const warnings = []
  if (fixes) warnings.push(`Đã tự sửa ${fixes} dấu "\\" của công thức LaTeX (trong JSON phải viết "\\\\frac" thay vì "\\frac"). Hãy xem kỹ bản xem trước.`)

  let obj
  try {
    obj = JSON.parse(text)
  } catch (e) {
    throw new Error(`JSON không hợp lệ: ${e.message}. Kiểm tra dấu phẩy, dấu ngoặc kép và ngoặc nhọn.`)
  }
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) throw new Error('JSON phải là một đối tượng { ... }.')

  const errors = []
  if (obj.kind !== 'lesson' && obj.kind !== 'assignment') {
    throw new Error('Thiếu hoặc sai "kind". Giá trị hợp lệ: "lesson" (bài giảng) hoặc "assignment" (bài tập).')
  }
  if (!isNonEmptyString(obj.title)) errors.push('Thiếu "title" (tiêu đề).')

  if (obj.kind === 'lesson') {
    const content_md = optString(obj.content_md, 'content_md', errors)
    if (!content_md.trim()) warnings.push('Bài giảng chưa có nội dung "content_md".')
    const video_url = optString(obj.video_url, 'video_url', errors)
    if (errors.length) throw new Error(errors.join('\n'))
    return { draft: { kind: 'lesson', title: obj.title.trim(), content_md, video_url }, warnings }
  }

  // Bài tập
  if (obj.type !== 'classwork' && obj.type !== 'homework') {
    errors.push('"type" phải là "classwork" (làm trên lớp) hoặc "homework" (về nhà).')
  }
  let due_date = ''
  if (obj.due_date !== undefined && obj.due_date !== null && obj.due_date !== '') {
    if (typeof obj.due_date !== 'string' || !validDate(obj.due_date)) errors.push('"due_date" phải có dạng YYYY-MM-DD, ví dụ "2026-10-20".')
    else due_date = obj.due_date
  }
  if (!Array.isArray(obj.exercises) || obj.exercises.length === 0) {
    errors.push('"exercises" phải là danh sách có ít nhất 1 câu.')
  }
  const exercises = (Array.isArray(obj.exercises) ? obj.exercises : []).map((ex, i) => {
    if (!ex || typeof ex !== 'object') {
      errors.push(`Câu ${i + 1}: phải là đối tượng { "question_md": ... }.`)
      return { question_md: '', answer_md: '', method_md: '' }
    }
    if (!isNonEmptyString(ex.question_md)) errors.push(`Câu ${i + 1}: thiếu "question_md" (đề bài).`)
    const answer_md = optString(ex.answer_md, `exercises[${i}].answer_md`, errors)
    const method_md = optString(ex.method_md, `exercises[${i}].method_md`, errors)
    if (!answer_md.trim() && !method_md.trim()) warnings.push(`Câu ${i + 1}: chưa có đáp án và phương pháp giải.`)
    return { question_md: typeof ex.question_md === 'string' ? ex.question_md : '', answer_md, method_md }
  })
  if (errors.length) throw new Error(errors.join('\n'))

  return { draft: { kind: 'assignment', title: obj.title.trim(), type: obj.type, due_date, exercises }, warnings }
}

export const SAMPLE_LESSON = JSON.stringify(
  {
    kind: 'lesson',
    title: 'Dao động điều hòa',
    content_md:
      '## 1. Phương trình\n\nLi độ: $x = A\\cos(\\omega t + \\varphi)$\n\nChu kì:\n\n$$T = \\frac{2\\pi}{\\omega}$$',
  },
  null,
  2
)

export const SAMPLE_ASSIGNMENT = JSON.stringify(
  {
    kind: 'assignment',
    title: 'Bài tập dao động điều hòa',
    type: 'homework',
    due_date: '2026-10-20',
    exercises: [
      {
        question_md: 'Một vật dao động với $\\omega = 4\\pi$ rad/s. Tính chu kì $T$.',
        method_md: 'Dùng công thức $T = \\dfrac{2\\pi}{\\omega}$.',
        answer_md: '$T = 0{,}5$ s',
      },
    ],
  },
  null,
  2
)
