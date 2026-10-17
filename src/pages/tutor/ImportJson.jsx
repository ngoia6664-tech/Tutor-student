import { useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase, unwrap } from '../../lib/supabase.js'
import { useAsync } from '../../lib/useAsync.js'
import { chapterGroupLabel, fetchChapters, findChapter } from '../../lib/chapters.js'
import ChapterSelect from '../../components/ChapterSelect.jsx'
import { LessonBody, LessonHead } from '../../components/LessonView.jsx'
import { errMsg } from '../../lib/errors.js'
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

// Dán JSON hoặc chọn file .json → kiểm tra → xem trước → chọn học sinh → lưu
export default function ImportJson() {
  const navigate = useNavigate()
  const fileRef = useRef(null)
  const [text, setText] = useState('')
  const [includeNotes, setIncludeNotes] = useState(true)
  const [result, setResult] = useState(null) // { drafts, warnings, flags }
  const [opts, setOpts] = useState([]) // [{ include, due_date }] theo từng bản nháp
  const [studentIds, setStudentIds] = useState([])
  const [saved, setSaved] = useState({}) // index → id đã lưu (để thử lại không bị lưu trùng)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [saveError, setSaveError] = useState(null)
  const [linkLessonId, setLinkLessonId] = useState('') // bài giảng có sẵn để gắn bài tập (khi file không có bài giảng)
  const [chapterChoice, setChapterChoice] = useState('') // '' = không xếp chương | 'new' = tạo theo file | chapter_id
  const [reloadKey, setReloadKey] = useState(0)
  // Danh sách bài giảng + chương có sẵn (tải lại sau mỗi lần lưu để chương mới xuất hiện)
  const lists = useAsync(async () => {
    const [lessons, chapters] = await Promise.all([
      supabase.from('lessons').select('id, title, chapter_id').order('created_at', { ascending: false }).then(unwrap),
      fetchChapters(),
    ])
    return { lessons, chapters }
  }, [reloadKey])
  const lessonsList = { ...lists, data: lists.data?.lessons }
  const chapters = lists.data?.chapters || []

  function reset(newText) {
    setText(newText)
    setResult(null)
    setError(null)
    setSaveError(null)
    setSaved({})
  }

  function check(withNotes = includeNotes) {
    setResult(null)
    setError(null)
    setSaveError(null)
    setSaved({})
    try {
      const r = parseImport(text, { includeNotes: withNotes })
      setResult(r)
      setOpts(r.drafts.map((d) => ({ include: true, due_date: d.due_date || '', is_exam: !!d.is_exam })))
      // Chọn sẵn chương: có chương trùng tên thì dùng, chưa có thì đề xuất tạo mới
      const match = r.chapter ? findChapter(chapters, r.chapter) : null
      const choice = match ? match.id : r.chapter?.title ? 'new' : ''
      setChapterChoice(choice)
      // File chỉ có bài tập: gợi ý bài giảng cùng chương (ưu tiên cùng "Dạng")
      if (match && !r.drafts.some((d) => d.kind === 'lesson')) {
        const inChapter = (lists.data?.lessons || []).filter((l) => l.chapter_id === match.id)
        const sameDang = r.dang != null ? inChapter.find((l) => new RegExp(`Dạng\\s*${r.dang}(?!\\d)`, 'i').test(l.title)) : null
        setLinkLessonId((sameDang || inChapter[0])?.id || '')
      } else setLinkLessonId('')
    } catch (e) {
      setError(e.message)
    }
  }

  async function pasteFromClipboard() {
    setError(null)
    try {
      reset(await navigator.clipboard.readText())
    } catch {
      setError('Trình duyệt không cho đọc clipboard. Hãy bấm vào ô bên dưới và dán bằng Ctrl+V (hoặc giữ ngón tay → Dán).')
    }
  }

  async function pickFile(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    try {
      reset(await file.text())
    } catch (err) {
      setError(`Không đọc được file: ${errMsg(err)}`)
    }
  }

  const setOpt = (i, k, v) => setOpts((o) => o.map((x, j) => (j === i ? { ...x, [k]: v } : x)))

  // Mở trang soạn cho một phần (để sửa, gắn file, video...)
  function openEditor(draft, i) {
    const target = draft.kind === 'lesson' ? '/tutor/lessons/new' : '/tutor/assignments/new'
    navigate(target, { state: { draft: { ...draft, due_date: opts[i]?.due_date || '', is_exam: !!opts[i]?.is_exam } } })
  }

  async function saveAll() {
    const chosen = result.drafts.map((d, i) => ({ d, i })).filter(({ i }) => opts[i].include && !saved[i])
    if (!chosen.length) return setSaveError('Chưa chọn phần nào để lưu.')
    if (!studentIds.length && !window.confirm('Chưa chọn học sinh nào. Vẫn lưu?')) return

    setSaving(true)
    setSaveError(null)
    const done = { ...saved }
    try {
      // Chương: tạo mới (nếu chọn) rồi dùng chung cho mọi phần của file
      let chapterId = chapterChoice && chapterChoice !== 'new' ? chapterChoice : null
      // Tạo chương mới, hoặc chương tự khớp theo file (để bổ sung lớp/môn nếu chương cũ còn thiếu)
      const autoMatch = result.chapter ? findChapter(chapters, result.chapter) : null
      if (result.chapter?.title && (chapterChoice === 'new' || (autoMatch && chapterChoice === autoMatch.id))) {
        const c = result.chapter
        chapterId = unwrap(
          await supabase.rpc('ensure_chapter', { p_title: c.title, p_section: c.section || null, p_grade: c.grade ?? null, p_subject: c.subject || null })
        )
        setChapterChoice(chapterId)
      }
      // Lưu bài giảng trước để bài tập liên kết được với bài giảng
      let lessonId = Object.entries(done).find(([i]) => result.drafts[i].kind === 'lesson')?.[1] || linkLessonId || null
      for (const { d, i } of chosen.filter((c) => c.d.kind === 'lesson')) {
        lessonId = unwrap(
          await supabase.rpc('save_lesson', {
            p: { title: d.title, content_md: d.content_md, video_url: d.video_url || null, file_path: null, chapter_id: chapterId, student_ids: studentIds },
          })
        )
        done[i] = lessonId
        setSaved({ ...done })
      }
      for (const { d, i } of chosen.filter((c) => c.d.kind === 'assignment')) {
        done[i] = unwrap(
          await supabase.rpc('save_assignment', {
            p: {
              title: d.title,
              type: d.type,
              is_exam: !!opts[i].is_exam,
              due_date: opts[i].due_date || null,
              lesson_id: lessonId,
              chapter_id: chapterId,
              exercises: d.exercises.map(toExercisePayload),
              student_ids: studentIds,
            },
          })
        )
        setSaved({ ...done })
      }
    } catch (e) {
      setSaveError(`${errMsg(e)}. Những phần đã lưu được đánh dấu ✅; bấm lưu lại sẽ chỉ lưu phần còn thiếu.`)
    } finally {
      setSaving(false)
      setReloadKey((k) => k + 1)
    }
  }

  const drafts = result?.drafts || []
  const allSaved = drafts.length > 0 && drafts.every((_, i) => !opts[i]?.include || saved[i])
  const fileHasLesson = drafts.some((d) => d.kind === 'lesson')

  return (
    <div>
      <div className="page-head">
        <h1>
          <span className="title-icon"><Icon name="import" /></span>Dán JSON
        </h1>
      </div>

      <div className="card">
        <p className="muted small" style={{ marginTop: 0 }}>
          Nhận 2 định dạng: dạng ngắn <code>{'{"kind":"lesson"|"assignment", ...}'}</code> và dạng đầy đủ{' '}
          <code>{'{"schema":"tutor-lesson/v1", "lesson":{...}}'}</code> (lý thuyết + điền khuyết + trắc nghiệm + tự luận). Dạng đầy đủ được tách thành 1 bài
          giảng và các bài tập trên lớp / về nhà. Trong JSON, dấu <code>\</code> của LaTeX phải viết thành <code>\\</code>.
        </p>
        <input ref={fileRef} type="file" accept=".json,application/json,text/plain" className="hidden-input" onChange={pickFile} />
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
        <textarea
          className="code"
          rows={12}
          value={text}
          onChange={(e) => reset(e.target.value)}
          placeholder='{"schema":"tutor-lesson/v1","lesson":{...}}  hoặc  {"kind":"assignment",...}'
          spellCheck={false}
        />
        <label className="check">
          <input
            type="checkbox"
            checked={includeNotes}
            onChange={(e) => {
              setIncludeNotes(e.target.checked)
              if (result) check(e.target.checked)
            }}
          />
          <span className="small">Đưa trường "note" của từng câu vào lời giải cho học sinh xem (dạng đầy đủ)</span>
        </label>
        <div style={{ marginTop: '0.5rem' }}>
          <ErrorBox message={error} />
          <button type="button" className="btn btn-primary" onClick={() => check()} disabled={!text.trim()}>
            <Icon name="search" />
            Kiểm tra & xem trước
          </button>
        </div>
      </div>

      {result && (
        <>
          {result.warnings.map((w) => (
            <div key={w} className="alert alert-info">
              ⚠️ {w}
            </div>
          ))}
          {result.flags.length > 0 && (
            <div className="alert alert-info">
              <strong>Cần gia sư kiểm tra ({result.flags.length}) – không hiện cho học sinh:</strong>
              <ul style={{ margin: '0.4rem 0 0', paddingLeft: '1.2rem' }}>
                {result.flags.map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
            </div>
          )}

          <h2>Xem trước ({drafts.length} phần)</h2>
          {drafts.map((d, i) => (
            <div key={i} className="card">
              <div className="row row-between" style={{ marginBottom: '0.5rem' }}>
                <label className="check" style={{ padding: 0 }}>
                  <input type="checkbox" checked={opts[i]?.include ?? true} disabled={!!saved[i]} onChange={(e) => setOpt(i, 'include', e.target.checked)} />
                  <strong>{d.title}</strong>
                </label>
                {saved[i] ? (
                  <Link className="badge badge-ok" to={d.kind === 'lesson' ? `/tutor/lessons/${saved[i]}` : `/tutor/assignments/${saved[i]}`}>
                    ✅ Đã lưu – mở
                  </Link>
                ) : (
                  <button type="button" className="btn btn-small btn-ghost" onClick={() => openEditor(d, i)}>
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
              </div>
              {d.kind === 'assignment' && !saved[i] && (
                <div className="row" style={{ alignItems: 'flex-end' }}>
                  <label className="field" style={{ maxWidth: 260 }}>
                    <span>Hạn nộp</span>
                    <input type="date" value={opts[i]?.due_date || ''} onChange={(e) => setOpt(i, 'due_date', e.target.value)} />
                  </label>
                  <label className="exam-switch" style={{ marginBottom: '0.9rem' }}>
                    <input type="checkbox" checked={!!opts[i]?.is_exam} onChange={(e) => setOpt(i, 'is_exam', e.target.checked)} />
                    <span>
                      <strong>Đề thi</strong> (chấm theo thang THPT)
                    </span>
                  </label>
                  {d.looksLikeExam && !opts[i]?.is_exam && (
                    <span className="muted small" style={{ flexBasis: '100%', marginTop: '-0.5rem' }}>
                      Bài có cả câu đúng/sai và trả lời ngắn, giống cấu trúc đề thi THPT. Tích ô Đề thi nếu muốn chấm theo thang THPT.
                    </span>
                  )}
                </div>
              )}
              <details open={drafts.length === 1}>
                <summary style={{ cursor: 'pointer', fontWeight: 600 }}>Xem nội dung</summary>
                <div style={{ marginTop: '0.75rem' }}>
                  {d.kind === 'lesson' ? <LessonPreview draft={d} /> : <AssignmentPreview draft={d} dueDate={opts[i]?.due_date} />}
                </div>
              </details>
            </div>
          ))}

          {!allSaved && (
            <div className="card">
              <ChapterSelect
                chapters={chapters}
                value={chapterChoice}
                onChange={setChapterChoice}
                label="Xếp vào chương"
                extraOptions={
                  result.chapter?.title && !findChapter(chapters, result.chapter) ? (
                    <option value="new">
                      + Tạo chương mới: {result.chapter.title}
                      {chapterGroupLabel(result.chapter) !== 'Khác' ? ` (${chapterGroupLabel(result.chapter)})` : ''}
                    </option>
                  ) : null
                }
              />
              {!fileHasLesson && (
                <label className="field">
                  <span>Liên kết bài tập với bài giảng có sẵn (không bắt buộc)</span>
                  <select value={linkLessonId} onChange={(e) => setLinkLessonId(e.target.value)} disabled={lessonsList.loading}>
                    <option value="">— Không liên kết —</option>
                    {(lessonsList.data || []).map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.title}
                      </option>
                    ))}
                  </select>
                  {lessonsList.error && <span className="muted small">Không tải được danh sách bài giảng: {lessonsList.error}</span>}
                </label>
              )}
              <h2>Học sinh nhận</h2>
              <p className="muted small" style={{ marginTop: 0 }}>
                Áp dụng cho mọi phần được tick ở trên.
                {fileHasLesson ? ' Bài tập sẽ được liên kết với bài giảng trong cùng file.' : ''}
              </p>
              <StudentPicker value={studentIds} onChange={setStudentIds} />
            </div>
          )}

          <div className="sticky-actions">
            <ErrorBox message={saveError} />
            {allSaved ? (
              <div className="alert alert-ok" style={{ width: '100%' }}>
                Đã lưu xong. <Link to="/tutor/assignments">Xem danh sách bài tập</Link> · <Link to="/tutor/lessons">Xem bài giảng</Link>
              </div>
            ) : (
              <button type="button" className="btn btn-primary btn-big" onClick={saveAll} disabled={saving}>
                <Icon name="save" />
                {saving ? 'Đang lưu...' : `Lưu ${drafts.filter((_, i) => opts[i]?.include && !saved[i]).length} phần đã chọn`}
              </button>
            )}
          </div>
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
