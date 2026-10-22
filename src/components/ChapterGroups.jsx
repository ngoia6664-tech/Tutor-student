import { Fragment } from 'react'
import { Link } from 'react-router-dom'
import { groupByChapter } from '../lib/chapters.js'

// Danh sách gom theo chương: tiêu đề chương (bấm để mở chương) + các bài bên dưới.
// chapterUrl: đường dẫn khi bấm tên chương (mặc định Thư viện gia sư)
export default function ChapterGroups({ items, chapters, renderItem, chapterUrl = (id) => `/tutor/library/${id}` }) {
  return groupByChapter(items, chapters).map((g) => (
    <Fragment key={g.chapter?.id || 'none'}>
      <h2 className="section-title">
        {g.chapter ? (
          <Link to={chapterUrl(g.chapter.id)} style={{ color: 'inherit', textDecoration: 'none' }}>
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
