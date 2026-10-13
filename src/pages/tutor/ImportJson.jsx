import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { parseImport, SAMPLE_ASSIGNMENT, SAMPLE_LESSON } from '../../lib/importJson.js'
import { formatDate, TYPE_LABEL } from '../../lib/format.js'
import ErrorBox from '../../components/ErrorBox.jsx'
import Markdown from '../../components/Markdown.jsx'
import VideoEmbed from '../../components/VideoEmbed.jsx'

// Dán JSON → kiểm tra → xem trước → sang trang soạn để chọn học sinh và lưu
export default function ImportJson() {
  const navigate = useNavigate()
  const [text, setText] = useState('')
  const [result, setResult] = useState(null) // { draft, warnings }
  const [error, setError] = useState(null)

  function check() {
    setResult(null)
    setError(null)
    try {
      setResult(parseImport(text))
    } catch (e) {
      setError(e.message)
    }
  }

  async function pasteFromClipboard() {
    setError(null)
    try {
      const t = await navigator.clipboard.readText()
      setText(t)
      setResult(null)
    } catch {
      setError('Trình duyệt không cho đọc clipboard. Hãy bấm vào ô bên dưới và dán bằng Ctrl+V (hoặc giữ ngón tay → Dán).')
    }
  }

  function loadSample(sample) {
    setText(sample)
    setResult(null)
    setError(null)
  }

  function proceed() {
    const { draft } = result
    const target = draft.kind === 'lesson' ? '/tutor/lessons/new' : '/tutor/assignments/new'
    navigate(target, { state: { draft } })
  }

  return (
    <div>
      <div className="page-head">
        <h1>Dán JSON</h1>
      </div>

      <div className="card">
        <p className="muted small" style={{ marginTop: 0 }}>
          Dán bài giảng hoặc bài tập đã soạn sẵn. Trong JSON, dấu <code>\</code> của LaTeX phải viết thành <code>\\</code> (ví dụ{' '}
          <code>\\frac</code>); nếu quên, ứng dụng sẽ cố tự sửa và báo cho bạn.
        </p>
        <div className="row" style={{ marginBottom: '0.5rem' }}>
          <button type="button" className="btn btn-small" onClick={pasteFromClipboard}>
            📋 Dán từ clipboard
          </button>
          <button type="button" className="btn btn-small btn-ghost" onClick={() => loadSample(SAMPLE_LESSON)}>
            Mẫu bài giảng
          </button>
          <button type="button" className="btn btn-small btn-ghost" onClick={() => loadSample(SAMPLE_ASSIGNMENT)}>
            Mẫu bài tập
          </button>
        </div>
        <textarea
          rows={12}
          value={text}
          onChange={(e) => {
            setText(e.target.value)
            setResult(null)
          }}
          placeholder='{"kind":"assignment","title":"...","type":"homework","due_date":"2026-10-20","exercises":[...]}'
          spellCheck={false}
        />
        <div style={{ marginTop: '0.75rem' }}>
          <ErrorBox message={error} />
          <button type="button" className="btn btn-primary" onClick={check} disabled={!text.trim()}>
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
          <h2>Xem trước</h2>
          {result.draft.kind === 'lesson' ? <LessonPreview draft={result.draft} /> : <AssignmentPreview draft={result.draft} />}
          <div className="sticky-actions">
            <button type="button" className="btn btn-primary btn-big" onClick={proceed}>
              Tiếp tục: chọn học sinh & lưu →
            </button>
          </div>
        </>
      )}
    </div>
  )
}

function LessonPreview({ draft }) {
  return (
    <div className="card">
      <span className="badge badge-primary">Bài giảng</span>
      <h2 style={{ marginTop: '0.5rem' }}>{draft.title}</h2>
      <Markdown>{draft.content_md}</Markdown>
      {draft.video_url && (
        <div style={{ marginTop: '1rem' }}>
          <VideoEmbed url={draft.video_url} />
        </div>
      )}
    </div>
  )
}

function AssignmentPreview({ draft }) {
  return (
    <div className="card">
      <div className="row">
        <span className="badge badge-primary">Bài tập</span>
        <span className="badge">{TYPE_LABEL[draft.type]}</span>
        <span className="muted small">Hạn: {formatDate(draft.due_date)}</span>
      </div>
      <h2 style={{ marginTop: '0.5rem' }}>{draft.title}</h2>
      {draft.exercises.map((ex, i) => (
        <div key={i} className="question">
          <div className="question-label">Câu {i + 1}</div>
          <Markdown>{ex.question_md}</Markdown>
          {ex.answer_md && (
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
