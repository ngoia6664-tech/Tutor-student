import { useState } from 'react'
import Markdown from './Markdown.jsx'

// Ô soạn Markdown có nút xem trước công thức.
// renderPreview: tùy chọn, thay cách hiển thị bản xem trước (vd. bài giảng chia thẻ theo mục)
export default function MarkdownField({ label, value, onChange, rows = 4, placeholder, required = false, renderPreview, hint }) {
  const [preview, setPreview] = useState(false)
  return (
    <div className="field">
      <div className="row row-between">
        <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>
          {label}
          {required && ' *'}
        </span>
        <div className="tabs">
          <button type="button" className={!preview ? 'tab active' : 'tab'} onClick={() => setPreview(false)}>
            Soạn
          </button>
          <button type="button" className={preview ? 'tab active' : 'tab'} onClick={() => setPreview(true)}>
            Xem trước
          </button>
        </div>
      </div>
      {preview ? (
        <div className="preview-box">
          {!value?.trim() ? <span className="muted">(trống)</span> : renderPreview ? renderPreview(value) : <Markdown>{value}</Markdown>}
        </div>
      ) : (
        <textarea rows={rows} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
      )}
      {hint && <span className="muted small">{hint}</span>}
    </div>
  )
}
