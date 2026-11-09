import { useState } from 'react'
import { Link } from 'react-router-dom'
import { buildTree, courseLabel, libraryUrl, sectionText, subjectLabel } from '../lib/chapters.js'
import { splitTitle, subjectKind } from '../lib/chapterArt.js'
import Icon from './Icon.jsx'

const VIEW_KEY = 'library-shelf-view'
function loadView() {
  try {
    return localStorage.getItem(VIEW_KEY) === 'shelf' ? 'shelf' : 'cards'
  } catch {
    return 'cards'
  }
}

// Trang một lớp / một môn / một khóa (Thư viện gia sư; học sinh truyền url = studentLibraryUrl):
// Mặc định hiển thị dạng Lưới thẻ chương (is-cards) để nhìn bao quát toàn bộ chương, tên chương và số lượng bài mà không để trống màn hình;
// có nút chuyển nhanh sang dạng Kệ sách cổ điển (is-shelf).
/** @typedef {{ id: string, grade?: unknown, subject?: string | null, section?: string | null, course_id?: string | null, lessons?: unknown, assignments?: unknown }} Chapter */

/** @typedef {(...keys: string[]) => string} UrlOf link tới lớp / môn / khóa / chương (mặc định libraryUrl của gia sư) */

/** @param {{ chapters: Chapter[], count: (v: unknown) => number, url?: UrlOf, courses?: { id: string, title: string }[], singleCourse?: boolean }} props */
export default function GradeShelf({ chapters, count, url = libraryUrl, courses = [], singleCourse = false }) {
  const [mode, setMode] = useState(loadView)
  // Khóa chỉ để lấy tên: khóa chưa có chủ đề không thành kệ trống
  const grade = buildTree(chapters, courses.filter((k) => chapters.some((c) => c.course_id === k.id)))[0]
  if (!grade) return null

  function setView(next) {
    if (next === mode) return
    setMode(next)
    try {
      localStorage.setItem(VIEW_KEY, next)
    } catch {
      // bỏ qua
    }
  }

  const shelves = grade.subjects.flatMap((s) =>
    s.courses.map((k) => ({
      key: `${s.key}|${k.key}`,
      title: singleCourse
        ? 'Danh sách chương'
        : s.courses.length === 1 && !k.course
          ? subjectLabel(s.subject)
          : `${subjectLabel(s.subject)} · ${courseLabel(k.course)}`,
      to: singleCourse ? undefined : url(grade.key, s.key, k.key),
      subject: s.subject,
      sections: k.sections,
      bookUrl: (/** @type {string} */ x) => url(grade.key, s.key, k.key, x),
    }))
  )

  return (
    <div className={`shelf-group is-${mode}`}>
      <div className="shelf-toolbar">
        <div className="shelf-view-switcher" role="radiogroup" aria-label="Chế độ hiển thị">
          <button
            type="button"
            className={`shelf-switch-btn ${mode === 'cards' ? 'is-active' : ''}`}
            onClick={() => setView('cards')}
            title="Dạng lưới thẻ chương"
            aria-pressed={mode === 'cards'}
          >
            <Icon name="grid" size={14} />
            <span>Lưới thẻ</span>
          </button>
          <button
            type="button"
            className={`shelf-switch-btn ${mode === 'shelf' ? 'is-active' : ''}`}
            onClick={() => setView('shelf')}
            title="Dạng kệ sách cổ điển"
            aria-pressed={mode === 'shelf'}
          >
            <Icon name="book" size={14} />
            <span>Kệ sách</span>
          </button>
        </div>
      </div>
      <div className="shelf-list">
        {shelves.map((sh) => (
          <Shelf
            key={sh.key}
            title={sh.title}
            to={sh.to}
            subject={sh.subject}
            sections={sh.sections}
            count={count}
            bookUrl={sh.bookUrl}
          />
        ))}
      </div>
    </div>
  )
}

/**
 * @param {{
 *   title: string,
 *   to?: string,
 *   subject: string | null,
 *   sections: { key: string, section: string | null, chapters: Chapter[] }[],
 *   count: (v: unknown) => number,
 *   bookUrl: (sectionKey: string) => string,
 * }} props
 */
function Shelf({ title, to, subject, sections, count, bookUrl }) {
  const kind = subjectKind(subject)
  /** @param {Chapter[]} list @param {'lessons' | 'assignments'} f */
  const total = (list, f) => list.reduce((n, c) => n + count(c[f]), 0)

  return (
    // --n: số cuốn (tối đa 5) để CSS tính chiều dài tối thiểu của kệ, đủ chỗ cho bìa mở ra
    <section className={`shelf is-${kind}`} style={/** @type {import('react').CSSProperties} */ ({ '--n': Math.min(sections.length, 5) })}>
      <h2 className="section-title shelf-head">
        {to ? <Link to={to}>{title}</Link> : <b>{title}</b>}
        <span>{sections.length} chương</span>
      </h2>
      <div className="shelf-board">
        <ul className="shelf-row">
          {sections.map((x, i) => {
            // Chữ giữ nguyên như gia sư gõ (không viết hoa toàn bộ) cho dễ đọc trên gáy dọc
            const label = sectionText(x.section)
            const { num, name } = splitTitle(label, i)
            return (
              <li key={x.key} className="shelf-book">
                <Link className="shelf-link" to={bookUrl(x.key)} aria-label={`${label}: ${x.chapters.length} chủ đề`}>
                  <span className="shelf-spine" aria-hidden="true">
                    <b>{num}</b>
                    <span className="shelf-spine-name">{name}</span>
                  </span>
                  <span className="shelf-cover" aria-hidden="true">
                    <span className="shelf-cover-top">
                      <span className="subject-chip">{subjectLabel(subject)}</span>
                      <span className="shelf-num">Chương {num}</span>
                    </span>
                    <span className="shelf-title">{name}</span>
                    <span className="shelf-stats">
                      <span>
                        <Icon name="book" size={15} />
                        <b>{x.chapters.length}</b> chủ đề
                      </span>
                      <span>
                        <Icon name="lesson" size={15} />
                        <b>{total(x.chapters, 'lessons')}</b> bài giảng
                      </span>
                      <span>
                        <Icon name="assignment" size={15} />
                        <b>{total(x.chapters, 'assignments')}</b> bài tập
                      </span>
                    </span>
                  </span>
                </Link>
              </li>
            )
          })}
        </ul>
      </div>
    </section>
  )
}
