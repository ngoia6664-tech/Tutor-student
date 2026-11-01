import { Link } from 'react-router-dom'
import { buildTree, libraryUrl, sectionText, subjectLabel } from '../lib/chapters.js'
import { splitTitle, subjectKind } from '../lib/chapterArt.js'
import Icon from './Icon.jsx'

// Trang một lớp / một môn (Thư viện gia sư; học sinh truyền url = studentLibraryUrl) dạng kệ sách: mỗi môn một kệ, mỗi chuyên đề một cuốn. Bấm cuốn nào → vào chuyên đề đó.
// Máy có chuột: chỉ thấy gáy; rê chuột (hoặc Tab tới) thì cuốn đó nhô lên và bìa hiện ở khoảng trống phía trên kệ,
// không che cuốn nào. Máy cảm ứng / màn hẹp: bìa thành thẻ ngang trong danh sách, ẩn gáy.
// Mỗi cuốn vẽ sẵn cả gáy lẫn bìa, hiệu ứng hoàn toàn bằng CSS (library.css), không cần state.

/** @typedef {{ id: string, grade?: unknown, subject?: string | null, section?: string | null, lessons?: unknown, assignments?: unknown }} Chapter */

/** @typedef {(...keys: string[]) => string} UrlOf link tới lớp / môn / chuyên đề (mặc định libraryUrl của gia sư) */

/** @param {{ chapters: Chapter[], count: (v: unknown) => number, url?: UrlOf }} props */
export default function GradeShelf({ chapters, count, url = libraryUrl }) {
  const grade = buildTree(chapters)[0]
  if (!grade) return null
  return grade.subjects.map((s) => <Shelf key={s.key} grade={grade.key} subject={s} count={count} url={url} />)
}

/**
 * @param {{
 *   grade: string,
 *   subject: { key: string, subject: string | null, sections: { key: string, section: string | null, chapters: Chapter[] }[] },
 *   count: (v: unknown) => number,
 *   url: UrlOf,
 * }} props
 */
function Shelf({ grade, subject, count, url }) {
  const { sections } = subject
  const kind = subjectKind(subject.subject)
  /** @param {Chapter[]} list @param {'lessons' | 'assignments'} f */
  const total = (list, f) => list.reduce((n, c) => n + count(c[f]), 0)

  return (
    // --n: số cuốn (tối đa 5) để CSS tính chiều dài tối thiểu của kệ, đủ chỗ cho bìa mở ra
    <section className={`shelf is-${kind}`} style={/** @type {import('react').CSSProperties} */ ({ '--n': Math.min(sections.length, 5) })}>
      <h2 className="section-title shelf-head">
        <Link to={url(grade, subject.key)}>{subjectLabel(subject.subject)}</Link>
        <span>{sections.length} chuyên đề</span>
      </h2>
      <div className="shelf-board">
        <ul className="shelf-row">
          {sections.map((x, i) => {
            // Chữ giữ nguyên như gia sư gõ (không viết hoa toàn bộ) cho dễ đọc trên gáy dọc
            const label = sectionText(x.section)
            const { num, name } = splitTitle(label, i)
            return (
              <li key={x.key} className="shelf-book">
                <Link className="shelf-link" to={url(grade, subject.key, x.key)} aria-label={`${label}: ${x.chapters.length} chương`}>
                  <span className="shelf-spine" aria-hidden="true">
                    <b>{num}</b>
                    <span className="shelf-spine-name">{name}</span>
                  </span>
                  <span className="shelf-cover" aria-hidden="true">
                    <span className="shelf-cover-top">
                      <span className="subject-chip">{subjectLabel(subject.subject)}</span>
                      <span className="shelf-num">Chuyên đề {num}</span>
                    </span>
                    <span className="shelf-title">{name}</span>
                    <span className="shelf-stats">
                      <span>
                        <Icon name="book" size={15} />
                        <b>{x.chapters.length}</b> chương
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
