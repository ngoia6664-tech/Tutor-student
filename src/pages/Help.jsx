import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext.jsx'
import Icon from '../components/Icon.jsx'
import Markdown from '../components/Markdown.jsx'
import { filterHelp } from '../lib/help/filter.js'
import { STUDENT_HELP } from '../lib/help/student.js'
import { TUTOR_HELP } from '../lib/help/tutor.js'

// Trang Hỏi đáp (/student/help, /tutor/help): mỗi vai trò chỉ thấy bộ câu hỏi của mình.
export default function Help() {
  const { profile } = useAuth()
  const [query, setQuery] = useState('')
  const q = query.trim()
  const sections = filterHelp(profile.role === 'tutor' ? TUTOR_HELP : STUDENT_HELP, q)
  const count = sections.reduce((n, s) => n + s.items.length, 0)

  return (
    <section className="help">
      <div className="page-head">
        <h1>
          <span className="title-icon"><Icon name="help" /></span>Câu hỏi thường gặp
        </h1>
      </div>

      <div className="help-search">
        <Icon name="search" />
        <input
          type="search"
          placeholder="Bạn đang cần tìm gì? Ví dụ: nộp lại"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Tìm trong câu hỏi thường gặp"
        />
      </div>
      <p className="help-count muted small" role="status">
        {q && count > 0 ? `Tìm thấy ${count} câu` : ''}
      </p>

      {count === 0 && (
        <div className="empty">
          <p>Không có câu nào khớp "{q}". Thử gõ từ ngắn hơn.</p>
          <button type="button" className="btn btn-small" onClick={() => setQuery('')}>
            Xem tất cả câu hỏi
          </button>
        </div>
      )}

      {sections.map((s) => (
        <div key={s.title} className="help-group">
          <h2>
            <Icon name={s.icon} />
            {s.title}
          </h2>
          <div className="help-list">
            {s.items.map((it) => (
              // Đang tìm thì mở sẵn, vì từ khóa có thể nằm trong câu trả lời
              <details key={it.q} className="help-item" open={!!q}>
                <summary>
                  <span>{it.q}</span>
                  <Icon name="right" className="help-chevron" />
                </summary>
                <div className="help-answer">
                  <Markdown>{it.a}</Markdown>
                </div>
              </details>
            ))}
          </div>
        </div>
      ))}
    </section>
  )
}
