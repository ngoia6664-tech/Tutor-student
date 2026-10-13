import { useState } from 'react'
import Markdown from './Markdown.jsx'

// Ô soạn Markdown có nút xem trước công thức
export default function MarkdownField({ label, value, onChange, rows = 4, placeholder, required = false }) {
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
        <div className="preview-box">{value?.trim() ? <Markdown>{value}</Markdown> : <span className="muted">(trống)</span>}</div>
      ) : (
        <textarea rows={rows} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
      )}
    </div>
  )
}
