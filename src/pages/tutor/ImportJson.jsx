import { useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase, unwrap } from '../../lib/supabase.js'
import { useAsync } from '../../lib/useAsync.js'
import { chapterGroupLabel, fetchChapters, findChapter } from '../../lib/chapters.js'
import ChapterSelect from '../../components/ChapterSelect.jsx'
import { LessonBody, LessonHead } from '../../components/LessonView.jsx'
import { errMsg } from '../../lib/errors.js'
import { askConfirm } from '../../lib/dialog.js'
import { parseImport, SAMPLE_ASSIGNMENT, SAMPLE_LESSON } from '../../lib/importJson.js'
import { SAMPLE_TUTOR_LESSON } from '../../lib/importTutorLesson.js'
import { formatDate, TYPE_LABEL } from '../../lib/format.js'
import { toExercisePayload } from '../../lib/assignments.js'
import ExerciseBody, { KIND_LABEL } from '../../components/ExerciseBody.jsx'
import ErrorBox from '../../components/ErrorBox.jsx'
import Markdown from '../../components/Markdown.jsx'
import VideoEmbed from '../../components/VideoEmbed.jsx'
import StudentPicker from '../../components/StudentPicker.jsx'
import Icon from '../../components/Icon.jsx'
import { ExamTimer } from '../../components/ExamParts.jsx'
import { EXAM_MINUTES } from '../../lib/exam.js'
import LessonSelect from '../../components/LessonSelect.jsx'

// Chương liên kết lần dán trước (lưu trên máy này)
const LAST_CHAPTER_KEY = 'import.lastChapterId'
function readLastChapter() {
  try {
    return localStorage.getItem(LAST_CHAPTER_KEY)
  } catch {
    return null
  }
}
function writeLastChapter(id) {
  try {
    localStorage.setItem(LAST_CHAPTER_KEY, id)
  } catch {
    /* trình duyệt chặn lưu: bỏ qua */
  }
}

// Số phút làm bài gửi lên máy chủ: chỉ đề thi có bật tính giờ (số phút sai thì dùng 50)
function timeLimitOf(o) {
  if (!o?.is_exam || !o.timed) return null
  const n = parseInt(o.time_limit, 10)
  return n >= 1 && n <= 600 ? n : EXAM_MINUTES
}

const normTitle = (s) => (s || '').trim().toLowerCase().replace(/\s+/g, ' ')
// Sắp tên file theo số tự nhiên: dang2 đứng trước dang10
const byName = (a, b) => a.name.localeCompare(b.name, 'vi', { numeric: true })
// Khóa chương của một file, để nhận ra các file cùng chương trong một lần nhập
function chapterKey(s) {
  if (!s.chapterChoice) return ''
  return s.chapterChoice === 'new' ? `new:${normTitle(s.result?.chapter?.title)}` : s.chapterChoice
}
const lessonDraftOf = (s) => s?.result?.drafts.find((d) => d.kind === 'lesson')

// Dán JSON hoặc chọn một / nhiều file .json → kiểm tra → xem trước → chọn học sinh → lưu.
// Mỗi file (hoặc một lần dán) là một "nguồn": có chương + bài giảng liên kết riêng; mỗi phần trong nguồn có hạn nộp,
// đề thi và danh sách học sinh riêng (mặc định theo danh sách chung).
export default function ImportJson() {
  const navigate = useNavigate()
  const fileRef = useRef(null)
  const nextId = useRef(0)
  const [text, setText] = useState('')
  const [batch, setBatch] = useState(false) // đang nhập nhiều file cùng lúc
  const [includeNotes, setIncludeNotes] = useState(true)
  const [sources, setSources] = useState([]) // [{ id, name, text, result, error, chapterChoice, fromLast, linkLessonId }]
  const [opts, setOpts] = useState({}) // "idNguồn-sốPhần" → { include, due_date, is_exam, timed, time_limit, studentIds (null = danh sách chung) }
  const [studentIds, setStudentIds] = useState([])
  const [saved, setSaved] = useState({}) // khóa phần → id đã lưu (để thử lại không bị lưu trùng)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [saveError, setSaveError] = useState(null)
  const [allChapter, setAllChapter] = useState('')
  const [allDue, setAllDue] = useState('')
  const [reloadKey, setReloadKey] = useState(0)
  // Danh sách bài giảng, bài tập (để báo trùng tên) + chương có sẵn (tải lại sau mỗi lần lưu để chương mới xuất hiện)
  const lists = useAsync(async () => {
    const [lessons, chapters, assignments] = await Promise.all([
      supabase.from('lessons').select('id, title, chapter_id').order('created_at', { ascending: false }).then(unwrap),
      fetchChapters(),
      supabase.from('assignments').select('id, title').then(unwrap),
    ])
    return { lessons, chapters, assignments }
  }, [reloadKey])
  const lessonsList = { ...lists, data: lists.data?.lessons }
  const chapters = lists.data?.chapters || []
  const existingTitles = new Set([...(lists.data?.lessons || []), ...(lists.data?.assignments || [])].map((x) => normTitle(x.title)))

  function reset(newText) {
    setText(newText)
    setBatch(false)
    setSources([])
    setError(null)
    setSaveError(null)
    setSaved({})
  }

  // Đọc một nguồn + chọn sẵn chương: trùng tên thì dùng; không thì lấy chương đã liên kết lần trước; không có nữa mới đề xuất tạo mới
  function prepare(src, withNotes) {
    const s = { id: src.id, name: src.name, text: src.text, result: null, error: null, chapterChoice: '', fromLast: false, linkLessonId: '' }
    try {
      s.result = parseImport(s.text, { includeNotes: withNotes })
    } catch (e) {
      s.error = e.message
      return s
    }
    const match = s.result.chapter ? findChapter(chapters, s.result.chapter) : null
    const last = chapters.find((c) => c.id === readLastChapter())
    const choiceId = match?.id || last?.id || null
    s.chapterChoice = choiceId || (s.result.chapter?.title ? 'new' : '')
    s.fromLast = !match && !!last
    return s
  }

  // File chỉ có bài tập: gợi ý bài giảng cùng chương trong lần nhập này, rồi tới bài giảng có sẵn (ưu tiên cùng "Dạng")
  function suggestLesson(s, all) {
    const drafts = s.result?.drafts || []
    if (!drafts.some((d) => d.kind === 'assignment') || drafts.some((d) => d.kind === 'lesson')) return ''
    const dang = s.result.dang
    const sameDang = (title) => dang != null && new RegExp(`Dạng\\s*${dang}(?!\\d)`, 'i').test(title)
    const key = chapterKey(s)
    if (!key) return ''
    const inBatch = all.filter((o) => o.id !== s.id && lessonDraftOf(o) && chapterKey(o) === key)
    const pick = inBatch.find((o) => sameDang(lessonDraftOf(o).title)) || inBatch[0]
    if (pick) return `batch:${pick.id}`
    if (s.chapterChoice === 'new') return ''
    const inChapter = (lists.data?.lessons || []).filter((l) => l.chapter_id === s.chapterChoice)
    return (inChapter.find((l) => sameDang(l.title)) || inChapter[0])?.id || ''
  }

  const defaultOpts = (d) => ({
    include: !existingTitles.has(normTitle(d.title)),
    due_date: d.due_date || '',
    is_exam: !!d.is_exam,
    timed: d.time_limit_minutes !== null,
    time_limit: String(d.time_limit_minutes || EXAM_MINUTES),
    studentIds: null,
  })
  const optsOf = (s) => Object.fromEntries((s.result?.drafts || []).map((d, i) => [`${s.id}-${i}`, defaultOpts(d)]))

  function load(list) {
    list.forEach((s) => (s.linkLessonId = suggestLesson(s, list)))
    setSources(list)
    setOpts(Object.assign({}, ...list.map(optsOf)))
    setSaved({})
    setError(null)
    setSaveError(null)
  }

  function check(withNotes = includeNotes) {
    const s = prepare({ id: nextId.current++, name: null, text }, withNotes)
    if (s.error) {
      setSources([])
      return setError(s.error)
    }
    load([s])
  }

  async function pasteFromClipboard() {
    setError(null)
    try {
      reset(await navigator.clipboard.readText())
    } catch {
      setError('Trình duyệt không cho đọc clipboard. Hãy bấm vào ô bên dưới và dán bằng Ctrl+V (hoặc giữ ngón tay → Dán).')
    }
  }

  // Một file → đưa vào ô dán như cũ; nhiều file → kiểm tra luôn từng file
  async function loadFiles(files) {
    if (!files.length) return
    try {
      const list = await Promise.all(files.map(async (f) => ({ id: nextId.current++, name: f.name, text: await f.text() })))
      if (list.length === 1) return reset(list[0].text)
      list.sort(byName)
      setText('')
      setBatch(true)
      load(list.map((f) => prepare(f, includeNotes)))
    } catch (err) {
      setError(`Không đọc được file: ${errMsg(err)}`)
    }
  }

  function pickFile(e) {
    const files = [...(e.target.files || [])]
    e.target.value = ''
    loadFiles(files)
  }

  function dropFiles(e) {
    e.preventDefault()
    const files = [...(e.dataTransfer?.files || [])].filter((f) => /\.(json|txt)$/i.test(f.name) || /json|text/.test(f.type))
    if (files.length) loadFiles(files)
  }

  const setOpt = (key, k, v) => setOpts((o) => ({ ...o, [key]: { ...o[key], [k]: v } }))
  const setSource = (id, patch) => setSources((list) => list.map((s) => (s.id === id ? { ...s, ...patch } : s)))

  // Sửa JSON của một file lỗi rồi kiểm tra lại riêng file đó
  function recheck(id) {
    const s = prepare(sources.find((x) => x.id === id), includeNotes)
    const all = sources.map((x) => (x.id === id ? s : x))
    s.linkLessonId = suggestLesson(s, all)
    setSources(all)
    setOpts((o) => ({ ...o, ...optsOf(s) }))
  }

  function removeSource(id) {
    setSources((list) =>
      list.filter((s) => s.id !== id).map((s) => (s.linkLessonId === `batch:${id}` ? { ...s, linkLessonId: '' } : s))
    )
  }

  // Đặt cùng một chương cho mọi file, rồi gợi ý lại bài giảng liên kết theo chương mới
  function applyChapterToAll() {
    const next = sources.map((s) => (s.result ? { ...s, chapterChoice: allChapter, fromLast: false } : s))
    next.forEach((s) => (s.linkLessonId = suggestLesson(s, next)))
    setSources(next)
  }

  function applyDueToAll() {
    setOpts((o) => {
      const n = { ...o }
      for (const r of rows) if (r.d.kind === 'assignment' && !saved[r.key]) n[r.key] = { ...n[r.key], due_date: allDue }
      return n
    })
  }

  // Mở trang soạn cho một phần (để sửa, gắn file, video...)
  function openEditor(draft, key) {
    const o = opts[key]
    const target = draft.kind === 'lesson' ? '/tutor/lessons/new' : '/tutor/assignments/new'
    navigate(target, { state: { draft: { ...draft, due_date: o?.due_date || '', is_exam: !!o?.is_exam, time_limit_minutes: timeLimitOf(o) } } })
  }

  const rows = sources.flatMap((s) => (s.result?.drafts || []).map((d, i) => ({ s, d, key: `${s.id}-${i}` })))
  const receiversOf = (key) => opts[key]?.studentIds ?? studentIds

  async function saveAll() {
    const chosen = rows.filter((r) => opts[r.key]?.include && !saved[r.key])
    if (!chosen.length) return setSaveError('Chưa chọn phần nào để lưu.')
    const noOne = chosen.filter((r) => !receiversOf(r.key).length).length
    if (
      noOne &&
      !(await askConfirm({
        title: 'Chưa chọn học sinh',
        message: noOne === chosen.length ? 'Chưa chọn học sinh nào. Vẫn lưu?' : `${noOne} phần chưa có học sinh nhận. Vẫn lưu?`,
        confirmText: 'Vẫn lưu',
      }))
    )
      return

    setSaving(true)
    setSaveError(null)
    const done = { ...saved }
    let lastChapter = null
    try {
      // Chương của từng file: tạo mới (nếu chọn) hoặc chương tự khớp (để bổ sung lớp/môn nếu chương cũ còn thiếu)
      const chapterOf = {}
      const made = {} // nhiều file cùng chương mới chỉ tạo một lần
      for (const s of new Set(chosen.map((r) => r.s))) {
        let id = s.chapterChoice && s.chapterChoice !== 'new' ? s.chapterChoice : null
        const c = s.result.chapter
        const autoMatch = c ? findChapter(chapters, c) : null
        if (c?.title && (s.chapterChoice === 'new' || (autoMatch && s.chapterChoice === autoMatch.id))) {
          const k = chapterKey(s)
          if (!made[k]) {
            made[k] = unwrap(await supabase.rpc('ensure_chapter', { p_title: c.title, p_section: c.section || null, p_grade: c.grade ?? null, p_subject: c.subject || null }))
          }
          id = made[k]
          setSource(s.id, { chapterChoice: id })
        }
        chapterOf[s.id] = id
        if (id) lastChapter = id
      }
      // Lưu bài giảng trước để bài tập liên kết được với bài giảng (cùng file, hoặc file bài giảng cùng lần nhập)
      const lessonOf = {}
      for (const r of rows) if (r.d.kind === 'lesson' && done[r.key]) lessonOf[r.s.id] = done[r.key]
      for (const { s, d, key } of chosen.filter((r) => r.d.kind === 'lesson')) {
        done[key] = unwrap(
          await supabase.rpc('save_lesson', {
            p: { title: d.title, content_md: d.content_md, video_url: d.video_url || null, file_path: null, chapter_id: chapterOf[s.id], student_ids: receiversOf(key) },
          })
        )
        lessonOf[s.id] = done[key]
        setSaved({ ...done })
      }
      for (const { s, d, key } of chosen.filter((r) => r.d.kind === 'assignment')) {
        const o = opts[key]
        const link = s.linkLessonId || ''
        const lessonId = lessonOf[s.id] || (link.startsWith('batch:') ? lessonOf[link.slice(6)] : link) || null
        done[key] = unwrap(
          await supabase.rpc('save_assignment', {
            p: {
              title: d.title,
              type: d.type,
              is_exam: !!o.is_exam,
              time_limit_minutes: timeLimitOf(o),
              due_date: o.due_date || null,
              lesson_id: lessonId,
              chapter_id: chapterOf[s.id],
              exercises: d.exercises.map(toExercisePayload),
              student_ids: receiversOf(key),
            },
          })
        )
        setSaved({ ...done })
      }
    } catch (e) {
      setSaveError(`${errMsg(e)}. Những phần đã lưu được đánh dấu ✅; bấm lưu lại sẽ chỉ lưu phần còn thiếu.`)
    } finally {
      // Nhớ chương vừa liên kết cho lần dán sau
      if (lastChapter) writeLastChapter(lastChapter)
      setSaving(false)
      setReloadKey((k) => k + 1)
    }
  }

  const pending = rows.filter((r) => opts[r.key]?.include && !saved[r.key]).length
  const allSaved = rows.length > 0 && rows.every((r) => !opts[r.key]?.include || saved[r.key])
  const failed = sources.filter((s) => s.error).length
  const sourceDone = (s) => (s.result?.drafts || []).every((_, i) => saved[`${s.id}-${i}`] || !opts[`${s.id}-${i}`]?.include)

  function chapterLabel(s) {
    if (!s.chapterChoice) return 'Chưa xếp chương'
    if (s.chapterChoice === 'new') return `Tạo chương mới: ${s.result.chapter?.title}`
    return chapters.find((c) => c.id === s.chapterChoice)?.title || 'Chương đã chọn'
  }
  function linkLabel(s) {
    const link = s.linkLessonId
    if (link.startsWith('batch:')) return `🔗 ${lessonDraftOf(sources.find((o) => `batch:${o.id}` === link))?.title || ''}`
    if (link) return `🔗 ${(lists.data?.lessons || []).find((l) => l.id === link)?.title || 'Bài giảng có sẵn'}`
    return '🔗 Chưa gắn bài giảng'
  }

  // Cảnh báo + ghi chú cần gia sư kiểm tra của một nguồn
  function renderNotes(s) {
    return (
      <>
        {s.result.warnings.map((w) => (
          <div key={w} className="alert alert-info">
            ⚠️ {w}
          </div>
        ))}
        {s.result.flags.length > 0 && (
          <div className="alert alert-info">
            <strong>Cần gia sư kiểm tra ({s.result.flags.length}) – không hiện cho học sinh:</strong>
            <ul style={{ margin: '0.4rem 0 0', paddingLeft: '1.2rem' }}>
              {s.result.flags.map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>
          </div>
        )}
      </>
    )
  }

  // Chương + bài giảng liên kết của một nguồn
  function renderSettings(s) {
    const drafts = s.result.drafts
    const needLink = drafts.some((d) => d.kind === 'assignment') && !drafts.some((d) => d.kind === 'lesson')
    const batchLesson = s.linkLessonId.startsWith('batch:') ? lessonDraftOf(sources.find((o) => `batch:${o.id}` === s.linkLessonId)) : null
    return (
      <>
        <ChapterSelect
          chapters={chapters}
          value={s.chapterChoice}
          onChange={(v) => setSource(s.id, { chapterChoice: v, fromLast: false })}
          label="Xếp vào chương"
          extraTop={
            s.result.chapter?.title && !findChapter(chapters, s.result.chapter)
              ? [
                  {
                    value: 'new',
                    label: `+ Tạo chương mới: ${s.result.chapter.title}${chapterGroupLabel(s.result.chapter) !== 'Khác' ? ` (${chapterGroupLabel(s.result.chapter)})` : ''}`,
                  },
                ]
              : []
          }
          hint={s.fromLast && s.chapterChoice !== 'new' ? 'Đã chọn sẵn chương bạn liên kết ở lần dán trước.' : null}
        />
        {needLink &&
          (batchLesson ? (
            <p className="small" style={{ margin: '0 0 0.75rem' }}>
              🔗 Bài tập sẽ liên kết với bài giảng <strong>{batchLesson.title}</strong> trong lần nhập này.{' '}
              <button type="button" className="btn btn-small btn-ghost" onClick={() => setSource(s.id, { linkLessonId: '' })}>
                Đổi
              </button>
            </p>
          ) : (
            <LessonSelect
              label="Liên kết bài tập với bài giảng có sẵn (không bắt buộc)"
              lessons={lessonsList.data}
              chapters={chapters}
              value={s.linkLessonId}
              onChange={(v) => setSource(s.id, { linkLessonId: v })}
              focusChapterId={s.chapterChoice !== 'new' ? s.chapterChoice : ''}
              disabled={lessonsList.loading}
              hint={lessonsList.error ? `Không tải được danh sách bài giảng: ${lessonsList.error}` : null}
            />
          ))}
      </>
    )
  }

  // Một phần (bài giảng / bài tập) trong bản xem trước
  function renderDraft({ d, key }) {
    const o = opts[key] || {}
    const own = o.studentIds
    return (
      <>
        <div className="row row-between" style={{ marginBottom: '0.5rem' }}>
          <label className="check" style={{ padding: 0 }}>
            <input type="checkbox" checked={o.include ?? true} disabled={!!saved[key]} onChange={(e) => setOpt(key, 'include', e.target.checked)} />
            <strong>
              {d.kind === 'lesson' ? '📘' : '✏️'} {d.title}
            </strong>
          </label>
          {saved[key] ? (
            <Link className="badge badge-ok" to={d.kind === 'lesson' ? `/tutor/lessons/${saved[key]}` : `/tutor/assignments/${saved[key]}`}>
              ✅ Đã lưu – mở
            </Link>
          ) : (
            <button type="button" className="btn btn-small btn-ghost" onClick={() => openEditor(d, key)}>
              <Icon name="edit" />
              Sửa trong trang soạn
            </button>
          )}
        </div>
        <div className="row" style={{ marginBottom: '0.5rem' }}>
          <span className="badge badge-primary">{d.kind === 'lesson' ? 'Bài giảng' : 'Bài tập'}</span>
          {d.kind === 'assignment' && (
            <>
              <span className="badge">{TYPE_LABEL[d.type]}</span>
              <span className="badge">{d.exercises.length} câu</span>
              {d.flaggedCount > 0 && <span className="badge badge-warn">{d.flaggedCount} câu có ghi chú cần xem</span>}
            </>
          )}
          {!saved[key] && existingTitles.has(normTitle(d.title)) && <span className="badge badge-warn">Trùng tên bài đã có</span>}
        </div>
        {!saved[key] && rows.length > 1 && (
          <div style={{ marginBottom: '0.5rem' }}>
            <div className="row">
              <span className={own ? 'small' : 'small muted'}>
                👥 {own ? `Giao riêng: ${own.length} học sinh` : `Theo danh sách chung (${studentIds.length})`}
              </span>
              <button type="button" className="btn btn-small btn-ghost" onClick={() => setOpt(key, 'studentIds', own ? null : [...studentIds])}>
                {own ? 'Dùng danh sách chung' : 'Giao riêng'}
              </button>
            </div>
            {own && <StudentPicker value={own} onChange={(v) => setOpt(key, 'studentIds', v)} />}
          </div>
        )}
        {d.kind === 'assignment' && !saved[key] && (
          <div className="row" style={{ alignItems: 'flex-end' }}>
            <label className="field" style={{ maxWidth: 260 }}>
              <span>Hạn nộp</span>
              <input type="date" value={o.due_date || ''} onChange={(e) => setOpt(key, 'due_date', e.target.value)} />
            </label>
            <label className="exam-switch" style={{ marginBottom: '0.9rem' }}>
              <input type="checkbox" checked={!!o.is_exam} onChange={(e) => setOpt(key, 'is_exam', e.target.checked)} />
              <span>
                <strong>Đề thi</strong> (chấm theo thang THPT)
              </span>
            </label>
            {o.is_exam && <ExamTimer timed={!!o.timed} minutes={o.time_limit} onSet={(k, v) => setOpt(key, k, v)} />}
            {d.looksLikeExam && !o.is_exam && (
              <span className="muted small" style={{ flexBasis: '100%', marginTop: '-0.5rem' }}>
                Bài có cả câu đúng/sai và trả lời ngắn, giống cấu trúc đề thi THPT. Tích ô Đề thi nếu muốn chấm theo thang THPT.
              </span>
            )}
          </div>
        )}
        <details open={rows.length === 1}>
          <summary style={{ cursor: 'pointer', fontWeight: 600 }}>Xem nội dung</summary>
          <div style={{ marginTop: '0.75rem' }}>
            {d.kind === 'lesson' ? <LessonPreview draft={d} /> : <AssignmentPreview draft={d} dueDate={o.due_date} />}
          </div>
        </details>
      </>
    )
  }

  const single = !batch && sources[0]?.result ? sources[0] : null

  return (
    <div>
      <div className="page-head">
        <h1>
          <span className="title-icon"><Icon name="import" /></span>Dán JSON
        </h1>
      </div>

      <div className="card" onDragOver={(e) => e.preventDefault()} onDrop={dropFiles}>
        <p className="muted small" style={{ marginTop: 0 }}>
          Nhận 2 định dạng: dạng ngắn <code>{'{"kind":"lesson"|"assignment", ...}'}</code> và dạng đầy đủ{' '}
          <code>{'{"schema":"tutor-lesson/v1", "lesson":{...}}'}</code> (lý thuyết + điền khuyết + trắc nghiệm + tự luận). Dạng đầy đủ được tách thành 1 bài
          giảng và các bài tập trên lớp / về nhà. Trong JSON, dấu <code>\</code> của LaTeX phải viết thành <code>\\</code>. Có thể chọn (hoặc kéo thả)
          nhiều file một lúc.
        </p>
        <input ref={fileRef} type="file" multiple accept=".json,application/json,text/plain" className="hidden-input" onChange={pickFile} />
        <div className="row" style={{ marginBottom: '0.5rem' }}>
          <button type="button" className="btn btn-small" onClick={() => fileRef.current?.click()}>
            <Icon name="folder" />
            Chọn file .json
          </button>
          <button type="button" className="btn btn-small" onClick={pasteFromClipboard}>
            <Icon name="clipboard" />
            Dán từ clipboard
          </button>
          <button type="button" className="btn btn-small btn-ghost" onClick={() => reset(SAMPLE_TUTOR_LESSON)}>
            <Icon name="file" />
            Mẫu đầy đủ
          </button>
          <button type="button" className="btn btn-small btn-ghost" onClick={() => reset(SAMPLE_LESSON)}>
            <Icon name="file" />
            Mẫu bài giảng
          </button>
          <button type="button" className="btn btn-small btn-ghost" onClick={() => reset(SAMPLE_ASSIGNMENT)}>
            <Icon name="file" />
            Mẫu bài tập
          </button>
        </div>
        {batch ? (
          <div className="row row-between" style={{ marginBottom: '0.5rem' }}>
            <span className="small">
              <strong>Đã chọn {sources.length} file</strong>
              {failed > 0 && <span className="import-failed"> · {failed} file lỗi</span>}
            </span>
            <button type="button" className="btn btn-small btn-ghost" onClick={() => reset('')} disabled={saving}>
              Bỏ hết, quay lại ô dán
            </button>
          </div>
        ) : (
          <textarea
            className="code"
            rows={12}
            value={text}
            onChange={(e) => reset(e.target.value)}
            placeholder='{"schema":"tutor-lesson/v1","lesson":{...}}  hoặc  {"kind":"assignment",...}'
            spellCheck={false}
          />
        )}
        <label className="check">
          <input
            type="checkbox"
            checked={includeNotes}
            onChange={(e) => {
              setIncludeNotes(e.target.checked)
              if (batch) load(sources.map((s) => prepare(s, e.target.checked)))
              else if (sources.length) check(e.target.checked)
            }}
          />
          <span className="small">Đưa trường "note" của từng câu vào lời giải cho học sinh xem (dạng đầy đủ)</span>
        </label>
        <div style={{ marginTop: '0.5rem' }}>
          <ErrorBox message={error} />
          {!batch && (
            <button type="button" className="btn btn-primary" onClick={() => check()} disabled={!text.trim()}>
              <Icon name="search" />
              Kiểm tra & xem trước
            </button>
          )}
        </div>
      </div>

      {sources.length > 0 && (
        <>
          {single && renderNotes(single)}

          {!allSaved && rows.length > 0 && (
            <div className="card">
              <h2 style={{ marginTop: 0 }}>{batch ? 'Áp dụng chung' : 'Học sinh nhận'}</h2>
              <p className="muted small" style={{ marginTop: 0 }}>
                Danh sách học sinh áp dụng cho mọi phần được tick bên dưới, trừ phần bấm "Giao riêng".
                {single?.result.drafts.some((d) => d.kind === 'lesson') ? ' Bài tập sẽ được liên kết với bài giảng trong cùng file.' : ''}
              </p>
              <StudentPicker value={studentIds} onChange={setStudentIds} />
              {single && <div style={{ marginTop: '1rem' }}>{renderSettings(single)}</div>}
              {batch && (
                <div style={{ marginTop: '1rem' }}>
                  <ChapterSelect chapters={chapters} value={allChapter} onChange={setAllChapter} label="Đặt cùng một chương cho mọi file (không bắt buộc)" />
                  <div className="row" style={{ marginTop: '-0.25rem', marginBottom: '0.75rem' }}>
                    <button type="button" className="btn btn-small" onClick={applyChapterToAll}>
                      Áp chương này cho mọi file
                    </button>
                    <span className="muted small">Mặc định mỗi file tự khớp chương ghi trong file.</span>
                  </div>
                  {rows.some((r) => r.d.kind === 'assignment') && (
                    <div className="row" style={{ alignItems: 'flex-end' }}>
                      <label className="field" style={{ maxWidth: 260 }}>
                        <span>Hạn nộp chung</span>
                        <input type="date" value={allDue} onChange={(e) => setAllDue(e.target.value)} />
                      </label>
                      <button type="button" className="btn btn-small" style={{ marginBottom: '0.9rem' }} onClick={applyDueToAll}>
                        Áp cho mọi bài tập
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <h2>{batch ? `Xem trước (${sources.length} file · ${rows.length} phần)` : `Xem trước (${rows.length} phần)`}</h2>
          {single &&
            rows.map((r) => (
              <div key={r.key} className="card">
                {renderDraft(r)}
              </div>
            ))}
          {batch &&
            sources.map((s) => {
              const anySaved = (s.result?.drafts || []).some((_, i) => saved[`${s.id}-${i}`])
              return (
                <div key={s.id} className="card import-file">
                  <div className="row row-between import-file-head">
                    <span className="small muted">📄 {s.name}</span>
                    {!anySaved && (
                      <button type="button" className="btn btn-small btn-ghost" onClick={() => removeSource(s.id)} disabled={saving} title="Bỏ file này">
                        ✕
                      </button>
                    )}
                  </div>
                  {s.error ? (
                    <>
                      <ErrorBox message={s.error} />
                      <details>
                        <summary style={{ cursor: 'pointer', fontWeight: 600 }}>Xem / sửa JSON</summary>
                        <textarea className="code" rows={10} value={s.text} onChange={(e) => setSource(s.id, { text: e.target.value })} spellCheck={false} />
                        <button type="button" className="btn btn-small btn-primary" onClick={() => recheck(s.id)}>
                          <Icon name="search" />
                          Kiểm tra lại
                        </button>
                      </details>
                    </>
                  ) : (
                    <>
                      {renderNotes(s)}
                      {!sourceDone(s) && (
                        <details className="import-file-settings">
                          <summary>
                            📂 {chapterLabel(s)}
                            {s.result.drafts.some((d) => d.kind === 'assignment') && !lessonDraftOf(s) ? ` · ${linkLabel(s)}` : ''}
                          </summary>
                          <div style={{ marginTop: '0.75rem' }}>{renderSettings(s)}</div>
                        </details>
                      )}
                      {rows
                        .filter((r) => r.s.id === s.id)
                        .map((r) => (
                          <div key={r.key} className="import-part">
                            {renderDraft(r)}
                          </div>
                        ))}
                    </>
                  )}
                </div>
              )
            })}

          {rows.length > 0 && (
            <div className="sticky-actions">
              <ErrorBox message={saveError} />
              {allSaved ? (
                <div className="alert alert-ok" style={{ width: '100%' }}>
                  Đã lưu xong. <Link to="/tutor/assignments">Xem danh sách bài tập</Link> · <Link to="/tutor/lessons">Xem bài giảng</Link>
                </div>
              ) : (
                <button type="button" className="btn btn-primary btn-big" onClick={saveAll} disabled={saving}>
                  <Icon name="save" />
                  {saving ? 'Đang lưu...' : `Lưu ${pending} phần đã chọn`}
                </button>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}


// Xem trước đúng như học sinh sẽ thấy: dòng thông tin, tiêu đề, mỗi mục một thẻ
function LessonPreview({ draft }) {
  return (
    <div className="lesson">
      <LessonHead title={draft.title} content={draft.content_md} />
      <LessonBody content={draft.content_md} />
      {draft.video_url && (
        <div style={{ marginTop: '1rem' }}>
          <VideoEmbed url={draft.video_url} />
        </div>
      )}
    </div>
  )
}

function AssignmentPreview({ draft, dueDate }) {
  return (
    <div>
      <p className="muted small" style={{ marginTop: 0 }}>
        Hạn: {formatDate(dueDate)}
      </p>
      {draft.exercises.map((ex, i) => (
        <div key={i} className="question">
          <div className="question-label">
            Câu {i + 1} <span className="badge">{KIND_LABEL[ex.kind || 'essay']}</span>
          </div>
          <ExerciseBody ex={{ kind: 'essay', ...ex }} mode="preview" correct={ex.correct} name={`p-${i}`} />
          {ex.answer_md && (ex.kind || 'essay') === 'essay' && (
            <div className="answer-box">
              <div className="box-label">Đáp án</div>
              <Markdown>{ex.answer_md}</Markdown>
            </div>
          )}
          {ex.method_md && (
            <div className="method-box">
              <div className="box-label">Phương pháp giải</div>
              <Markdown>{ex.method_md}</Markdown>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
