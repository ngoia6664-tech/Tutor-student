import { Fragment } from 'react'
import { Link } from 'react-router-dom'
import { groupByChapter } from '../lib/chapters.js'

// Danh sách gom theo chương: tiêu đề chương (bấm để mở chương) + các bài bên dưới
export default function ChapterGroups({ items, chapters, renderItem }) {
  return groupByChapter(items, chapters).map((g) => (
    <Fragment key={g.chapter?.id || 'none'}>
      <h2 className="section-title">
        {g.chapter ? (
          <Link to={`/tutor/library/${g.chapter.id}`} style={{ color: 'inherit', textDecoration: 'none' }}>
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
