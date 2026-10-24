import Markdown from './Markdown.jsx'

// Hiển thị một câu hỏi theo loại (tự luận / trắc nghiệm / điền khuyết / đúng-sai / trả lời ngắn).
// mode:
//   'answer'  – học sinh đang làm: chọn / gõ được
//   'review'  – xem lại sau khi nộp: hiện lựa chọn của học sinh + đáp án đúng
//   'preview' – gia sư xem trước: hiện đáp án đúng
// value: câu trả lời { choice } | { blanks: {a: ...} } | { tf: {a: true, ...} } | { text }
// correct: đáp án máy chấm (chỉ có sau khi nộp, hoặc với gia sư)
// photoHint: câu tự luận gợi ý "có thể chụp ảnh bài làm" (tắt ở luồng không đính ảnh: làm lại, Ôn tập)
export default function ExerciseBody({ ex, mode, value, onChange, correct, name, photoHint = true }) {
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
            // Chưa có đáp án để so (hoặc gia sư đang ẩn đáp án): giữ lựa chọn trung tính, không tô sai
            else if (mode === 'review' && picked && correct != null && !isRight) state = 'is-wrong'
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

      {ex.kind === 'true_false' && <TrueFalseTable ex={ex} mode={mode} value={value} onChange={onChange} correct={correct} name={name} />}

      {ex.kind === 'short' && <ShortAnswer mode={mode} value={value} onChange={onChange} correct={correct} />}

      {ex.kind === 'essay' && mode === 'answer' && (
        <textarea
          className="essay-input"
          rows={3}
          value={value?.text ?? ''}
          placeholder={photoHint ? 'Gõ bài làm (không bắt buộc – có thể chụp ảnh bài làm ở cuối trang)' : 'Gõ bài làm'}
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

// Đúng/sai: bảng 4 ý, mỗi ý chọn Đúng hoặc Sai.
// Xem lại: tô xanh ý chọn đúng, đỏ ý chọn sai, cột "Đáp án" ghi Đ / S.
function TrueFalseTable({ ex, mode, value, onChange, correct, name }) {
  const picked = value?.tf || {}
  const showKey = mode !== 'answer' && correct && typeof correct === 'object'
  const pick = (id, v) => onChange?.({ tf: { ...picked, [id]: v } })
  return (
    <table className="tf-table">
      <thead>
        <tr>
          <th className="tf-id">Ý</th>
          <th>Nội dung</th>
          <th className="tf-col">Đúng</th>
          <th className="tf-col">Sai</th>
          {showKey && <th className="tf-col">Đáp án</th>}
        </tr>
      </thead>
      <tbody>
        {(ex.options || []).map((o) => {
          const mine = picked[o.id]
          const key = showKey ? correct[o.id] : undefined
          const rowState = mode === 'review' && mine !== undefined && key !== undefined ? (mine === key ? 'is-right' : 'is-wrong') : ''
          return (
            <tr key={o.id} className={rowState}>
              <td className="tf-id">{o.id})</td>
              <td className="tf-statement">
                <Markdown>{o.statement}</Markdown>
              </td>
              {[true, false].map((v) => (
                <td key={String(v)} className="tf-col">
                  <label className={`tf-pick ${mine === v ? 'is-picked' : ''} ${mode === 'preview' && key === v ? 'is-key' : ''}`}>
                    <input
                      type="radio"
                      name={`${name}-${o.id}`}
                      checked={mine === v}
                      disabled={mode !== 'answer'}
                      onChange={() => pick(o.id, v)}
                      aria-label={`Ý ${o.id}: ${v ? 'Đúng' : 'Sai'}`}
                    />
                    <span>{v ? 'Đ' : 'S'}</span>
                  </label>
                </td>
              ))}
              {showKey && (
                <td className="tf-col">
                  <span className={`tf-key ${key ? 'tf-true' : 'tf-false'}`}>{key === undefined ? '—' : key ? 'Đúng' : 'Sai'}</span>
                </td>
              )}
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}

// Trả lời ngắn: một ô nhập (thường là số)
function ShortAnswer({ mode, value, onChange, correct }) {
  const typed = value?.text ?? ''
  if (mode === 'answer')
    return (
      <div className="short-answer">
        <input
          type="text"
          value={typed}
          placeholder="Nhập đáp số, vd. 1,89"
          aria-label="Câu trả lời"
          onChange={(e) => onChange?.({ text: e.target.value })}
        />
        <span className="muted small">Dùng dấu phẩy cho số thập phân; làm tròn theo yêu cầu của đề.</span>
      </div>
    )
  const key = typeof correct === 'string' ? correct : null
  return (
    <div className="short-review">
      {mode === 'review' && (
        <div className="short-line">
          <span className="muted small">Bạn trả lời:</span> {typed.trim() ? <strong>{typed}</strong> : <em className="muted">(bỏ trống)</em>}
        </div>
      )}
      {key && (
        <div className="short-line">
          <span className="muted small">Đáp án:</span> <strong className="short-key">{key.split(/\s*;\s*/).join(' hoặc ')}</strong>
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
  if (ex.kind === 'true_false') return (ex.options || []).every((o) => typeof value.tf?.[o.id] === 'boolean')
  return !!value.text?.trim()
}

export const KIND_LABEL = { essay: 'Tự luận', mcq: 'Trắc nghiệm', fill_blank: 'Điền khuyết', true_false: 'Đúng / Sai', short: 'Trả lời ngắn' }
