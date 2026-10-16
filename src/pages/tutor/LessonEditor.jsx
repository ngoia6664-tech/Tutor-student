import { useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { supabase, unwrap } from '../../lib/supabase.js'
import { useAsync } from '../../lib/useAsync.js'
import { errMsg } from '../../lib/errors.js'
import { displayFileName } from '../../lib/files.js'
import { removeLessonFile, uploadLessonFile } from '../../lib/lessons.js'
import Loading from '../../components/Loading.jsx'
import ErrorBox from '../../components/ErrorBox.jsx'
import MarkdownField from '../../components/MarkdownField.jsx'
import { LessonBody } from '../../components/LessonView.jsx'
import ChapterSelect from '../../components/ChapterSelect.jsx'
import { fetchChapters } from '../../lib/chapters.js'
import { packImages, unpackImages } from '../../lib/svg.js'
import StudentPicker from '../../components/StudentPicker.jsx'
import Icon from '../../components/Icon.jsx'

const MAX_FILE_MB = 50

// Soạn / sửa bài giảng. Dùng cho /tutor/lessons/new, /tutor/lessons/:id/edit và bản nháp từ "Dán JSON".
export default function LessonEditor() {
  const { id } = useParams()
  const location = useLocation()
  const draft = location.state?.draft
  const presetChapter = location.state?.chapterId || draft?.chapter_id || ''

  const { data, loading, error, reload } = useAsync(async () => {
    const chapters = await fetchChapters()
    if (!id) {
      return {
        chapters,
        id: null,
        chapter_id: presetChapter,
        title: draft?.title || '',
        content_md: draft?.content_md || '',
        video_url: draft?.video_url || '',
        file_path: null,
        student_ids: [],
      }
    }
    const lesson = unwrap(await supabase.from('lessons').select('*, lesson_recipients(student_id)').eq('id', id).maybeSingle())
    if (!lesson) throw new Error('Không tìm thấy bài giảng (có thể đã bị xóa).')
    return {
      chapters,
      id: lesson.id,
      chapter_id: lesson.chapter_id || '',
      title: lesson.title,
      content_md: lesson.content_md || '',
      video_url: lesson.video_url || '',
      file_path: lesson.file_path,
      student_ids: lesson.lesson_recipients.map((r) => r.student_id),
    }
  }, [id])

  if (loading) return <Loading />
  if (error)
    return (
      <div>
        <ErrorBox message={error} onRetry={reload} />
        <Link to="/tutor/lessons">← Danh sách bài giảng</Link>
      </div>
    )
  return <LessonForm key={id || 'new'} initial={data} fromImport={!!draft && !id} />
}

function LessonForm({ initial, fromImport }) {
  const navigate = useNavigate()
  // Ảnh nhúng (base64 rất dài) được thay bằng mã ngắn (hinh-1)... trong ô soạn; lưu thì đổi lại
  const [packed] = useState(() => packImages(initial.content_md))
  const [form, setForm] = useState(() => ({ ...initial, content_md: packed.text }))
  const [newFile, setNewFile] = useState(null)
  const [removeOld, setRemoveOld] = useState(false)
  const [saving, setSaving] = useState(false)
  const [progress, setProgress] = useState('')
  const [error, setError] = useState(null)
  const isEdit = !!initial.id
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  function pickFile(e) {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (!f) return
    if (f.size > MAX_FILE_MB * 1024 * 1024) {
      setError(`File lớn hơn ${MAX_FILE_MB}MB. Hãy nén lại hoặc đưa lên Google Drive rồi dán link vào nội dung.`)
      return
    }
    setError(null)
    setNewFile(f)
  }

  async function save(e) {
    e.preventDefault()
    setError(null)
    if (!form.title.trim()) return setError('Hãy nhập tiêu đề bài giảng.')
    if (form.video_url.trim() && !/^https?:\/\//i.test(form.video_url.trim())) return setError('Link video phải bắt đầu bằng http:// hoặc https://')
    if (!form.student_ids.length && !window.confirm('Chưa chọn học sinh nào. Vẫn lưu?')) return

    setSaving(true)
    let uploaded = null
    try {
      // 1) Tải file mới (nếu có)
      if (newFile) {
        setProgress('Đang tải file lên...')
        uploaded = await uploadLessonFile(newFile)
      }
      const oldPath = initial.file_path
      const filePath = uploaded || (removeOld ? null : oldPath)

      // 2) Lưu bài giảng + danh sách học sinh trong 1 transaction
      setProgress('Đang lưu bài giảng...')
      const lessonId = unwrap(
        await supabase.rpc('save_lesson', {
          p: {
            id: form.id,
            title: form.title.trim(),
            chapter_id: form.chapter_id || null,
            content_md: unpackImages(form.content_md, packed.images),
            video_url: form.video_url.trim() || null,
            file_path: filePath,
            student_ids: form.student_ids,
          },
        })
      )

      // 3) Dọn file cũ nếu đã thay hoặc gỡ
      if (oldPath && oldPath !== filePath) {
        try {
          await removeLessonFile(oldPath)
        } catch (err) {
          console.warn('Không xóa được file cũ', err)
        }
      }
      navigate(`/tutor/lessons/${lessonId}`, { replace: true })
    } catch (err) {
      // Lưu thất bại: xóa file vừa tải để không để rác trong Storage
      if (uploaded) removeLessonFile(uploaded).catch(() => {})
      setError(errMsg(err))
      setSaving(false)
      setProgress('')
    }
  }

  const currentFile = newFile ? newFile.name : !removeOld && initial.file_path ? displayFileName(initial.file_path) : null

  return (
    <form onSubmit={save}>
      <div className="page-head">
        <h1>
          <span className="title-icon"><Icon name="lesson" /></span>{isEdit ? 'Sửa bài giảng' : 'Soạn bài giảng'}
        </h1>
        <Link to="/tutor/lessons">← Danh sách</Link>
      </div>

      {fromImport && <div className="alert alert-info">Đã nạp nội dung từ JSON. Kiểm tra lại, chọn học sinh nhận rồi bấm Lưu.</div>}

      <div className="card">
        <label className="field">
          <span>Tiêu đề *</span>
          <input type="text" value={form.title} onChange={(e) => set('title', e.target.value)} required />
        </label>
        <ChapterSelect chapters={initial.chapters} value={form.chapter_id} onChange={(v) => set('chapter_id', v)} />
        <MarkdownField
          label="Nội dung (Markdown + công thức $...$, $$...$$)"
          rows={14}
          value={form.content_md}
          onChange={(v) => set('content_md', v)}
          renderPreview={(v) => <LessonBody content={unpackImages(v, packed.images)} />}
          hint={
            packed.images.length
              ? `Có ${packed.images.length} hình nhúng, hiển thị gọn là (hinh-1), (hinh-2)... Giữ nguyên các mã này để không mất hình; có thể di chuyển chúng. Mỗi mục "## Tiêu đề" là một thẻ khi học sinh xem.`
              : 'Mỗi mục bắt đầu bằng "## Tiêu đề" sẽ thành một thẻ riêng khi học sinh xem; "### ..." là tiêu đề nhỏ trong mục.'
          }
          placeholder={'## Tiêu đề mục\n\nCông thức: $F = ma$\n\n$$T = \\frac{2\\pi}{\\omega}$$'}
        />

        <div className="field">
          <span>File đính kèm (PDF, Word, ảnh... tối đa {MAX_FILE_MB}MB)</span>
          {currentFile && (
            <div className="row">
              <span className="badge">📎 {currentFile}</span>
              <button
                type="button"
                className="btn btn-small btn-ghost"
                onClick={() => (newFile ? setNewFile(null) : setRemoveOld(true))}
              >
                <Icon name="trash" />
                Gỡ file
              </button>
            </div>
          )}
          <input type="file" onChange={pickFile} />
          {removeOld && !newFile && initial.file_path && (
            <span className="muted small">
              File cũ sẽ bị xóa khi lưu.{' '}
              <button type="button" className="btn btn-small btn-ghost" onClick={() => setRemoveOld(false)}>
                <Icon name="undo" />
                Hoàn tác
              </button>
            </span>
          )}
        </div>

        <label className="field">
          <span>Link video (YouTube sẽ được nhúng trực tiếp)</span>
          <input
            type="url"
            value={form.video_url}
            onChange={(e) => set('video_url', e.target.value)}
            placeholder="https://www.youtube.com/watch?v=..."
          />
        </label>
      </div>

      <div className="card">
        <h2>Học sinh nhận bài giảng</h2>
        <StudentPicker value={form.student_ids} onChange={(v) => set('student_ids', v)} />
      </div>

      <div className="sticky-actions">
        <ErrorBox message={error} />
        {progress && <div className="alert alert-info">{progress}</div>}
        <button type="submit" className="btn btn-primary btn-big" disabled={saving}>
          <Icon name="save" />
          {saving ? 'Đang lưu...' : isEdit ? 'Lưu thay đổi' : 'Lưu và giao bài giảng'}
        </button>
      </div>
    </form>
  )
}
