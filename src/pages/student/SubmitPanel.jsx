import { useEffect, useRef, useState } from 'react'
import { supabase, unwrap, SUBMISSION_BUCKET } from '../../lib/supabase.js'
import { errMsg } from '../../lib/errors.js'
import { compressImage } from '../../lib/files.js'
import ErrorBox from '../../components/ErrorBox.jsx'
import { isAnswered } from '../../components/ExerciseBody.jsx'
import Icon from '../../components/Icon.jsx'

const MAX_IMAGES = 15

function extFor(type) {
  if (type === 'image/png') return 'png'
  if (type === 'image/webp') return 'webp'
  if (type === 'image/heic' || type === 'image/heif') return 'heic'
  return 'jpg'
}

// Ảnh bài làm (không bắt buộc) + nút Nộp bài
// labels: nhãn câu để nhắc câu chưa làm (đề thi: "I.3", "II.1"...)
// autoSubmit: đề tính giờ đã hết giờ → nộp ngay, không hỏi lại (lỗi mạng thì vẫn bấm nộp lại được)
// retry(payload): đang làm lại bài đã nộp → không đính kèm ảnh, nộp qua hàm này; onSubmitted nhận kết quả trả về
export default function SubmitPanel({ assignmentId, studentId, exercises, answers, labels, onSubmitted, autoSubmit = false, retry = null }) {
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

  // Hết giờ: tự nộp đúng một lần (giữ hàm submit mới nhất để gửi câu trả lời mới nhất)
  const submitRef = useRef(null)
  const autoDone = useRef(false)
  useEffect(() => {
    if (autoSubmit && !autoDone.current) {
      autoDone.current = true
      submitRef.current?.(true)
    }
  }, [autoSubmit])

  const unanswered = exercises.filter((ex) => !isAnswered(ex, answers[ex.id]))
  const hasEssay = exercises.some((ex) => ex.kind === 'essay')

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

  async function submit(force = false) {
    // Câu tự luận chưa gõ nhưng có ảnh thì coi như đã làm
    const missing = unanswered.filter((ex) => !(ex.kind === 'essay' && items.length))
    const ask = missing.length
      ? `Còn ${missing.length} câu chưa trả lời (câu ${missing.map((ex) => labels?.[ex.id] || exercises.indexOf(ex) + 1).join(', ')}). Vẫn nộp bài?`
      : retry
        ? 'Nộp lần làm lại này? Điểm chính thức vẫn giữ theo lần nộp đầu.'
        : 'Nộp bài? Sau khi nộp sẽ không sửa được, và đáp án sẽ hiện ra.'
    if (!force && !window.confirm(ask)) return

    setBusy(true)
    setError(null)
    try {
      const payload = Object.fromEntries(exercises.filter((ex) => answers[ex.id]).map((ex) => [ex.id, answers[ex.id]]))
      if (retry) {
        setProgress('Đang nộp bài...')
        onSubmitted(await retry(payload))
        return
      }
      // 1) Tải ảnh (nếu có) lên Storage, đã thu nhỏ
      const folder = `${studentId}/${assignmentId}`
      const stamp = Date.now()
      for (let i = 0; i < items.length; i++) {
        setProgress(`Đang tải ảnh ${i + 1}/${items.length}...`)
        const file = await compressImage(items[i].file)
        const type = file.type || 'image/jpeg'
        const path = `${folder}/${stamp}-${String(i + 1).padStart(2, '0')}.${extFor(type)}`
        unwrap(await supabase.storage.from(SUBMISSION_BUCKET).upload(path, file, { contentType: type, upsert: false }))
      }
      // 2) Gửi câu trả lời; máy chủ lưu, chấm trắc nghiệm và đánh dấu đã nộp
      setProgress('Đang nộp bài...')
      unwrap(await supabase.rpc('submit_assignment', { p_assignment_id: assignmentId, p_answers: payload }))
      onSubmitted()
    } catch (e) {
      setError(errMsg(e))
    } finally {
      setBusy(false)
      setProgress('')
    }
  }

  submitRef.current = submit

  return (
    <div className="card submit-card">
      <h2>{retry ? 'Nộp lần làm lại' : 'Nộp bài'}</h2>
      <p className="muted small" style={{ marginTop: 0 }}>
        {unanswered.length
          ? `Đã trả lời ${exercises.length - unanswered.length}/${exercises.length} câu.`
          : `Đã trả lời đủ ${exercises.length} câu.`}{' '}
        {retry ? 'Lần làm lại không đính kèm ảnh; câu tự luận hãy gõ trực tiếp rồi tự so với đáp án.' : hasEssay ? 'Câu tự luận có thể gõ trực tiếp hoặc chụp ảnh bài làm.' : 'Có thể đính kèm ảnh nháp nếu muốn.'}
      </p>

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

      {!retry && (
        <div className="row" style={{ marginBottom: '0.75rem' }}>
          <button type="button" className="btn btn-small" disabled={busy} onClick={() => cameraRef.current?.click()}>
            <Icon name="camera" />
            Chụp ảnh
          </button>
          <button type="button" className="btn btn-small" disabled={busy} onClick={() => galleryRef.current?.click()}>
            <Icon name="image" />
            Chọn ảnh
          </button>
          <span className="muted small">Không bắt buộc</span>
        </div>
      )}

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

      <button type="button" className="btn btn-primary btn-block btn-big" disabled={busy} onClick={() => submit()}>
        <Icon name="send" />
        {busy ? 'Đang nộp...' : 'Nộp bài'}
      </button>
    </div>
  )
}
