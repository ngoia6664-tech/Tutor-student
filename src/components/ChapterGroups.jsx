import { Fragment } from 'react'
import { Link } from 'react-router-dom'
import { groupByChapter, groupBySection } from '../lib/chapters.js'

// Ô lọc theo chương: 'all' | 'none' (chưa xếp) | chapter_id
export function ChapterFilter({ chapters, value, onChange }) {
  return (
    <select className="chapter-filter" value={value} onChange={(e) => onChange(e.target.value)} aria-label="Lọc theo chương">
      <option value="all">Tất cả chương</option>
      {groupBySection(chapters).map((g) => (
        <optgroup key={g.key} label={g.label}>
          {g.chapters.map((c) => (
            <option key={c.id} value={c.id}>
              {c.title}
            </option>
          ))}
        </optgroup>
      ))}
      <option value="none">Chưa xếp chương</option>
    </select>
  )
}

export function filterByChapter(items, filter) {
  if (filter === 'all') return items
  if (filter === 'none') return items.filter((it) => !it.chapter_id)
  return items.filter((it) => it.chapter_id === filter)
}

// Danh sách gom theo chương: tiêu đề chương (bấm để mở chương) + các bài bên dưới
export default function ChapterGroups({ items, chapters, renderItem }) {
  return groupByChapter(items, chapters).map((g) => (
    <Fragment key={g.chapter?.id || 'none'}>
      <h2 className="section-title">
        {g.chapter ? (
          <Link to={`/tutor/chapters/${g.chapter.id}`} style={{ color: 'inherit', textDecoration: 'none' }}>
            {g.chapter.title}
          </Link>
        ) : (
          'Chưa xếp chương'
        )}
      </h2>
      <div className="list" style={{ marginBottom: '1.25rem' }}>
        {g.items.map(renderItem)}
      </div>
    </Fragment>
  ))
}
