import Markdown from './Markdown.jsx'

// Hiển thị một câu hỏi theo loại (tự luận / trắc nghiệm / điền khuyết).
// mode:
//   'answer'  – học sinh đang làm: chọn / gõ được
//   'review'  – xem lại sau khi nộp: hiện lựa chọn của học sinh + đáp án đúng
//   'preview' – gia sư xem trước: hiện đáp án đúng
// value: câu trả lời { choice } | { blanks: {a: ...} } | { text }
// correct: đáp án máy chấm (chỉ có sau khi nộp, hoặc với gia sư)
export default function ExerciseBody({ ex, mode, value, onChange, correct, name }) {
  const readOnly = mode !== 'answer'

  return (
    <div className="exercise-body">
      <Markdown>{ex.question_md}</Markdown>

      {ex.kind === 'mcq' && (
        <div className="choices" role="radiogroup">
          {(ex.options || []).map((o) => {
            const picked = value?.choice === o.label
            const isRight = correct != null && correct === o.label
            let state = ''
            if (mode !== 'answer' && isRight) state = 'is-right'
            else if (mode === 'review' && picked && !isRight) state = 'is-wrong'
            return (
              <label key={o.label} className={`choice ${picked ? 'is-picked' : ''} ${state}`}>
                <input
                  type="radio"
                  name={name}
                  value={o.label}
                  checked={picked}
                  disabled={readOnly}
                  onChange={() => onChange?.({ choice: o.label })}
                />
                <span className="choice-label">{o.label}</span>
                <span className="choice-text">
                  <Markdown>{o.text}</Markdown>
                </span>
                {mode === 'review' && picked && <span className="choice-tag">Bạn chọn</span>}
                {mode !== 'answer' && isRight && <span className="choice-tag">Đáp án</span>}
              </label>
            )
          })}
          {mode === 'review' && !value?.choice && <p className="muted small">Bạn chưa chọn phương án nào.</p>}
        </div>
      )}

      {ex.kind === 'fill_blank' && (
        <div className="blanks">
          {(ex.options || []).map((b) => {
            const typed = value?.blanks?.[b.id] ?? ''
            const key = correct && typeof correct === 'object' ? correct[b.id] : null
            return (
              <div key={b.id} className="blank">
                <div className="blank-statement">
                  <span className="blank-id">{b.id})</span>
                  <Markdown>{b.statement}</Markdown>
                </div>
                {mode === 'answer' && (
                  <input
                    type="text"
                    value={typed}
                    placeholder="Gõ đáp án"
                    aria-label={`Đáp án ý ${b.id}`}
                    onChange={(e) => onChange?.({ blanks: { ...(value?.blanks || {}), [b.id]: e.target.value } })}
                  />
                )}
                {mode === 'review' && (
                  <div className="blank-typed">
                    <span className="muted small">Bạn viết:</span> {typed.trim() ? typed : <em className="muted">(bỏ trống)</em>}
                  </div>
                )}
                {mode !== 'answer' && key != null && (
                  <div className="blank-key">
                    <span className="muted small">Đáp án:</span> {key}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {ex.kind === 'essay' && mode === 'answer' && (
        <textarea
          className="essay-input"
          rows={3}
          value={value?.text ?? ''}
          placeholder="Gõ bài làm (không bắt buộc – có thể chụp ảnh bài làm ở cuối trang)"
          onChange={(e) => onChange?.({ text: e.target.value })}
        />
      )}
      {ex.kind === 'essay' && mode === 'review' && value?.text?.trim() && (
        <div className="essay-typed">
          <div className="box-label">Bài làm đã gõ</div>
          <p style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{value.text}</p>
        </div>
      )}
    </div>
  )
}

// Câu đã có trả lời chưa (để nhắc trước khi nộp)
export function isAnswered(ex, value) {
  if (!value) return false
  if (ex.kind === 'mcq') return !!value.choice
  if (ex.kind === 'fill_blank') return (ex.options || []).every((b) => (value.blanks?.[b.id] || '').trim())
  return !!value.text?.trim()
}

export const KIND_LABEL = { essay: 'Tự luận', mcq: 'Trắc nghiệm', fill_blank: 'Điền khuyết' }
