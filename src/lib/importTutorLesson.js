// Chuyển file định dạng "tutor-lesson/v1" (lý thuyết + trắc nghiệm + điền khuyết + tự luận)
// thành: 1 bài giảng + tối đa 2 bài tập (làm trên lớp / về nhà, theo trường "assignment").

const TYPE_TITLE = { classwork: 'Bài tập trên lớp', homework: 'Bài tập về nhà' }

const str = (v) => (typeof v === 'string' ? v.trim() : v === undefined || v === null ? '' : String(v))
const arr = (v) => (Array.isArray(v) ? v : [])
const bullets = (list) => arr(list).map(str).filter(Boolean).map((x) => `- ${x}`).join('\n')
const numbered = (list) => arr(list).map(str).filter(Boolean).map((x, i) => `${i + 1}. ${x}`).join('\n')
const join = (parts) => parts.filter((p) => p && p.trim()).join('\n\n')

// "11", 11, "Lớp 11" → 11; không rõ → null
function toGrade(v) {
  const n = parseInt(String(v ?? '').replace(/[^0-9]/g, ''), 10)
  return n >= 1 && n <= 12 ? n : null
}

function normalizeType(v) {
  return v === 'classwork' || v === 'homework' ? v : 'homework'
}

// ----- Bài giảng -----
const IMG_DATA = /^data:image\/(png|jpe?g|gif|webp|svg\+xml);base64,[a-z0-9+/=\s]+$/i

// Hình minh họa → ảnh Markdown có chú thích: ![chú thích](src "chú thích")
function diagramMd(d, where, warnings) {
  const src = str(d?.src).replace(/\s+/g, '')
  if (!IMG_DATA.test(src) && !/^https:\/\//i.test(src)) {
    warnings.push(`${where}: bỏ qua một hình vì "src" không phải ảnh base64 (png, jpg, gif, webp, svg) hoặc link https.`)
    return ''
  }
  const caption = str(d.caption).replace(/["\n\]]/g, ' ')
  return caption ? `![${caption}](${src} "${caption}")` : `![](${src})`
}

// File có phần lý thuyết thật không (file "bài tập trên lớp" thường để sections rỗng)
function hasTheory(lesson) {
  const t = lesson.theory || {}
  return arr(t.sections).length > 0 || arr(t.summary_1_min).length > 0
}

// Dòng thông tin đầu bài: Vật lý · Lớp 11 · Chuyên đề 2: Sóng · Ngày 1 - Bài giảng Dạng 1
function metaLine(lesson) {
  return [str(lesson.subject), lesson.grade ? `Lớp ${str(lesson.grade)}` : '', str(lesson.chapter), str(lesson.part)].filter(Boolean).join(' · ')
}

// Bài giảng: mỗi mục là một "## tiêu đề" → hiển thị thành một thẻ riêng (xem LessonView)
function buildLessonMd(lesson, warnings) {
  const theory = lesson.theory || {}
  const meta = metaLine(lesson)
  const plan = str(theory.plan) || (lesson.estimated_minutes ? `Thời lượng khoảng ${lesson.estimated_minutes} phút.` : '')

  const sections = arr(theory.sections).map((s, i) =>
    join([
      `## ${str(s.title) || 'Mục ' + (i + 1)}`,
      str(s.explain),
      ...arr(s.paragraphs).map(str),
      ...arr(s.diagrams).map((d) => diagramMd(d, `Mục "${str(s.title)}"`, warnings)),
      s.analogy ? `### Hình dung dễ hiểu\n\n${str(s.analogy)}` : '',
      arr(s.key_points).length ? `### Ý chính\n\n${bullets(s.key_points)}` : '',
      arr(s.formulas).length ? `### Công thức\n\n${bullets(s.formulas)}` : '',
      s.example_from_source ? `### Ví dụ\n\n${str(s.example_from_source)}` : '',
      s.comparison ? `### Ghi nhớ\n\n${str(s.comparison)}` : '',
      arr(s.common_mistakes).length ? `### Lỗi hay gặp\n\n${bullets(s.common_mistakes)}` : '',
    ])
  )

  const methods = arr(lesson.exercises?.problem_types)
    .filter((pt) => arr(pt.method).length)
    .map((pt) => join([`### ${str(pt.title) || str(pt.id)}`, numbered(pt.method)]))

  return join([
    meta ? `_${meta}_` : '',
    plan ? `> ${plan}` : '',
    ...sections,
    arr(theory.summary_1_min).length ? `## Tóm tắt 1 phút\n\n${bullets(theory.summary_1_min)}` : '',
    methods.length ? `## Phương pháp giải các dạng bài\n\n${methods.join('\n\n')}` : '',
  ])
}

// ----- Câu hỏi -----
// Loại câu đã hiện ở nhãn "Trắc nghiệm / Điền khuyết / Tự luận", nên đề chỉ ghi mức độ
function levelLine(level) {
  const l = str(level)
  return l ? `_Mức độ: ${l}_` : ''
}

function noteBlock(note, includeNotes) {
  return includeNotes && str(note) ? `**Lưu ý:** ${str(note)}` : ''
}

// Điền khuyết: mỗi ý (a, b, c...) là một ô để học sinh gõ đáp án
function fromFillBlank(fb, includeNotes) {
  const items = arr(fb.items).map((it, i) => ({
    id: str(it.id) || String.fromCharCode(97 + i),
    statement: str(it.statement),
    answer: str(it.answer),
  }))
  return {
    type: normalizeType(fb.assignment),
    flagged: !!str(fb.note),
    exercise: {
      kind: 'fill_blank',
      question_md: join([levelLine(fb.level), 'Điền vào chỗ trống:']),
      options: items.map(({ id, statement }) => ({ id, statement })),
      correct: Object.fromEntries(items.map(({ id, answer }) => [id, answer])),
      answer_md: items.map((it) => `**${it.id})** ${it.answer}`).join('\n\n'),
      method_md: join([noteBlock(fb.note, includeNotes), fb.source ? `_Nguồn: ${str(fb.source)}_` : '']),
    },
  }
}

// Trắc nghiệm: phương án hiện thành nút chọn; lý do đúng/sai chỉ nằm ở lời giải
function fromMcq(q, includeNotes) {
  const options = arr(q.options).map((o, i) => ({
    label: str(o.label) || String.fromCharCode(65 + i),
    text: str(o.text),
    reason: str(o.reason),
  }))
  const correct = options.find((o) => o.label === str(q.answer))
  const head = levelLine(q.level)
  const method_md = join([
    q.core ? `**Cốt lõi:** ${str(q.core)}` : '',
    options.some((o) => o.reason) ? `**Phân tích từng phương án:**\n\n${options.map((o) => `- **${o.label}.** ${o.reason}`).join('\n')}` : '',
    noteBlock(q.note, includeNotes),
    q.source ? `_Nguồn: ${str(q.source)}_` : '',
  ])

  // Không xác định được phương án đúng → giữ dạng tự luận để gia sư tự chấm
  if (options.length < 2 || !correct) {
    return {
      type: normalizeType(q.assignment),
      flagged: true,
      invalid: true,
      exercise: {
        kind: 'essay',
        question_md: join([head, str(q.stem), options.map((o) => `- **${o.label}.** ${o.text}`).join('\n')]),
        answer_md: str(q.answer),
        method_md,
      },
    }
  }
  return {
    type: normalizeType(q.assignment),
    flagged: !!str(q.note),
    exercise: {
      kind: 'mcq',
      question_md: join([head, str(q.stem)]),
      options: options.map(({ label, text }) => ({ label, text })),
      correct: correct.label,
      answer_md: `**${correct.label}.** ${correct.text}`,
      method_md,
    },
  }
}

function fromProblem(p, typeTitle, includeNotes) {
  return {
    type: normalizeType(p.assignment),
    flagged: !!str(p.note),
    exercise: {
      kind: 'essay',
      question_md: join([typeTitle ? `_${typeTitle}_` : '', str(p.statement)]),
      answer_md: str(p.answer),
      method_md: join([
        arr(p.solution).length ? `**Lời giải:**\n\n${numbered(p.solution)}` : '',
        noteBlock(p.note, includeNotes),
        p.source ? `_Nguồn: ${str(p.source)}_` : '',
      ]),
    },
  }
}

// Trả về { drafts, warnings, flags }
export function convertTutorLessonV1(obj, { includeNotes = true } = {}) {
  const lesson = obj.lesson
  if (!lesson || typeof lesson !== 'object') throw new Error('File "tutor-lesson/v1" thiếu đối tượng "lesson".')

  const topic = str(lesson.topic) || str(lesson.title) || str(lesson.id)
  if (!topic) throw new Error('Thiếu "lesson.topic" (tên bài).')

  const warnings = []
  const drafts = []

  // Tên chương (topic) đã hiện ở nhóm/nhãn chương, nên tên bài chỉ cần "part"
  // (vd. "Ngày 1 - Bài giảng Dạng 1"); không có part thì dùng topic
  const part = str(lesson.part)
  const baseTitle = part || topic

  if (hasTheory(lesson)) {
    drafts.push({ kind: 'lesson', title: baseTitle, content_md: buildLessonMd(lesson, warnings), video_url: str(lesson.video_url) })
  } else {
    warnings.push('File không có phần lý thuyết ("theory.sections" rỗng) nên chỉ tạo bài tập. Bạn có thể liên kết bài tập với một bài giảng đã có ở bên dưới.')
  }

  // Gom câu hỏi theo loại bài: điền khuyết → trắc nghiệm → tự luận
  const ex = lesson.exercises || {}
  const converted = [
    ...arr(ex.fill_blank).map((fb) => fromFillBlank(fb, includeNotes)),
    ...arr(ex.mcq).map((q) => fromMcq(q, includeNotes)),
    ...arr(ex.problem_types).flatMap((pt) => arr(pt.problems).map((p) => fromProblem(p, str(pt.title), includeNotes))),
  ].filter((c) => c.exercise.question_md.trim())
  const invalid = converted.filter((c) => c.invalid).length
  if (invalid) warnings.push(`${invalid} câu trắc nghiệm không xác định được phương án đúng, đã chuyển thành câu tự luận.`)

  const types = ['classwork', 'homework'].filter((type) => converted.some((c) => c.type === type))
  for (const type of types) {
    const list = converted.filter((c) => c.type === type)
    drafts.push({
      kind: 'assignment',
      // Chỉ có một loại bài và "part" đã nói rõ (vd. "Bài tập trên lớp") thì không thêm hậu tố
      title: types.length === 1 && part ? baseTitle : `${baseTitle} – ${TYPE_TITLE[type]}`,
      type,
      due_date: '',
      exercises: list.map((c) => c.exercise),
      flaggedCount: list.filter((c) => c.flagged).length,
    })
  }
  if (!converted.length && !drafts.length) warnings.push('File không có câu hỏi nào ("exercises"), nên không tạo bài tập.')
  if (!drafts.length) throw new Error('File không có nội dung để nhập.')

  return {
    drafts,
    warnings,
    flags: arr(lesson.review_flags).map(str).filter(Boolean),
    // Chương = topic (vd. Chủ đề 4), chuyên đề = chapter (vd. Chuyên đề 2: Sóng), kèm lớp + môn
    chapter: { title: topic, section: str(lesson.chapter), grade: toGrade(lesson.grade), subject: str(lesson.subject) },
    dang: lesson.dang ?? null,
  }
}

export const SAMPLE_TUTOR_LESSON = JSON.stringify(
  {
    schema: 'tutor-lesson/v1',
    lesson: {
      subject: 'Vật lý',
      grade: '11',
      chapter: 'Chuyên đề 2: Sóng',
      topic: 'Chủ đề 4: Giao thoa sóng cơ',
      theory: {
        sections: [
          {
            title: 'Vị trí cực đại và cực tiểu',
            explain: 'Đại lượng quyết định là hiệu đường đi d₂ − d₁.',
            formulas: ['Cực đại: d₂ − d₁ = kλ', 'Cực tiểu: d₂ − d₁ = (k + 1/2)λ'],
          },
        ],
        summary_1_min: ['λ = v/f.'],
      },
      exercises: {
        mcq: [
          {
            assignment: 'classwork',
            level: 'nhận biết',
            stem: 'Khoảng cách giữa hai cực đại liên tiếp trên đường nối hai nguồn bằng',
            options: [
              { label: 'A', text: 'λ', reason: 'Sai.' },
              { label: 'B', text: 'λ/2', reason: 'Đúng.' },
            ],
            answer: 'B',
            core: 'Cực đại liền kề cách nhau λ/2.',
          },
        ],
        problem_types: [
          {
            title: 'Dạng 1: Điều kiện cực đại – cực tiểu',
            method: ['Tính λ = v/f.'],
            problems: [
              {
                assignment: 'homework',
                statement: 'v = 20 cm/s, f = 40 Hz. Tính khoảng cách giữa hai cực đại liền kề.',
                solution: ['λ = 0,5 cm.', 'λ/2 = 0,25 cm.'],
                answer: '0,25 cm',
              },
            ],
          },
        ],
      },
      review_flags: [],
    },
  },
  null,
  2
)
