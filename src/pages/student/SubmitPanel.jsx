import { useEffect, useRef, useState } from 'react'
import { supabase, unwrap, SUBMISSION_BUCKET } from '../../lib/supabase.js'
import { errMsg } from '../../lib/errors.js'
import { compressImage } from '../../lib/files.js'
import ErrorBox from '../../components/ErrorBox.jsx'

const MAX_IMAGES = 15

function extFor(type) {
  if (type === 'image/png') return 'png'
  if (type === 'image/webp') return 'webp'
  if (type === 'image/heic' || type === 'image/heif') return 'heic'
  return 'jpg'
}

// Khu vực chọn ảnh bài làm + nút Nộp bài
export default function SubmitPanel({ assignmentId, studentId, onSubmitted }) {
  const [items, setItems] = useState([]) // [{ file, url }]
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState('')
  const [error, setError] = useState(null)
  const cameraRef = useRef(null)
  const galleryRef = useRef(null)
  const itemsRef = useRef(items)
  itemsRef.current = items

  // Giải phóng bộ nhớ ảnh xem trước khi rời trang
  useEffect(() => () => itemsRef.current.forEach((it) => URL.revokeObjectURL(it.url)), [])

  function addFiles(fileList) {
    setError(null)
    const files = Array.from(fileList || []).filter((f) => f.type.startsWith('image/') || f.type === '')
    if (!files.length) return
    const room = MAX_IMAGES - itemsRef.current.length
    if (files.length > room) setError(`Tối đa ${MAX_IMAGES} ảnh cho một bài.`)
    const added = files.slice(0, Math.max(0, room)).map((file) => ({ file, url: URL.createObjectURL(file) }))
    setItems((prev) => [...prev, ...added])
  }

  function removeAt(index) {
    URL.revokeObjectURL(items[index].url)
    setItems((prev) => prev.filter((_, i) => i !== index))
  }

  async function submit() {
    if (!items.length) {
      setError('Hãy chụp hoặc chọn ít nhất 1 ảnh bài làm trước khi nộp.')
      return
    }
    if (!window.confirm('Nộp bài? Sau khi nộp sẽ không sửa được, và đáp án sẽ hiện ra.')) return

    setBusy(true)
    setError(null)
    try {
      const folder = `${studentId}/${assignmentId}`
      const stamp = Date.now()
      // 1) Tải từng ảnh lên Storage (đã thu nhỏ)
      for (let i = 0; i < items.length; i++) {
        setProgress(`Đang tải ảnh ${i + 1}/${items.length}...`)
        const file = await compressImage(items[i].file)
        const type = file.type || 'image/jpeg'
        const path = `${folder}/${stamp}-${String(i + 1).padStart(2, '0')}.${extFor(type)}`
        unwrap(await supabase.storage.from(SUBMISSION_BUCKET).upload(path, file, { contentType: type, upsert: false }))
      }
      // 2) Đánh dấu đã nộp. Máy chủ (trigger) tự ghi đường dẫn và giờ nộp.
      setProgress('Đang ghi nhận bài nộp...')
      const row = unwrap(
        await supabase
          .from('assignment_recipients')
          .update({ status: 'done', submission_path: folder, submitted_at: new Date().toISOString() })
          .eq('assignment_id', assignmentId)
          .eq('student_id', studentId)
          .select()
          .maybeSingle()
      )
      if (!row) throw new Error('Không ghi nhận được bài nộp (có thể bài đã được nộp trước đó). Hãy tải lại trang.')
      onSubmitted()
    } catch (e) {
      setError(errMsg(e))
    } finally {
      setBusy(false)
      setProgress('')
    }
  }

  return (
    <div className="card">
      <h2>Nộp bài</h2>
      <p className="muted small">Làm bài ra giấy, chụp ảnh rõ từng trang rồi bấm "Nộp bài". Có thể chọn nhiều ảnh.</p>

      {/* capture="environment": mở thẳng camera sau trên điện thoại */}
      <input
        ref={cameraRef}
        className="hidden-input"
        type="file"
        accept="image/*"
        capture="environment"
        onChange={(e) => {
          addFiles(e.target.files)
          e.target.value = ''
        }}
      />
      <input
        ref={galleryRef}
        className="hidden-input"
        type="file"
        accept="image/*"
        multiple
        onChange={(e) => {
          addFiles(e.target.files)
          e.target.value = ''
        }}
      />

      <div className="row" style={{ marginBottom: '0.75rem' }}>
        <button type="button" className="btn" disabled={busy} onClick={() => cameraRef.current?.click()}>
          📷 Chụp ảnh
        </button>
        <button type="button" className="btn" disabled={busy} onClick={() => galleryRef.current?.click()}>
          🖼️ Chọn từ thư viện
        </button>
      </div>

      {items.length > 0 && (
        <div className="thumbs" style={{ marginBottom: '0.75rem' }}>
          {items.map((it, i) => (
            <div key={it.url} className="thumb">
              <img src={it.url} alt={`Ảnh ${i + 1}`} />
              {!busy && (
                <button type="button" className="thumb-remove" aria-label={`Bỏ ảnh ${i + 1}`} onClick={() => removeAt(i)}>
                  ×
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      <ErrorBox message={error} />
      {progress && <div className="alert alert-info">{progress}</div>}

      <button type="button" className="btn btn-primary btn-block btn-big" disabled={busy || !items.length} onClick={submit}>
        {busy ? 'Đang nộp...' : `Nộp bài${items.length ? ` (${items.length} ảnh)` : ''}`}
      </button>
    </div>
  )
}
