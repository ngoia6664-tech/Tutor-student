import { Fragment } from 'react'
import { Link } from 'react-router-dom'
import { groupByChapter } from '../lib/chapters.js'

// Danh sách gom theo chương: tiêu đề chương (bấm để mở chương) + các bài bên dưới.
// chapterUrl: đường dẫn khi bấm tên chương (mặc định Thư viện gia sư)
// nowId: chương học sinh đang học → nhãn "📍 Đang học" cạnh tên chương
export default function ChapterGroups({ items, chapters, renderItem, chapterUrl = (id) => `/tutor/library/${id}`, nowId }) {
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
        {g.chapter && g.chapter.id === nowId && (
          <span className="badge badge-now" style={{ marginLeft: '0.5rem' }}>
            📍 Đang học
          </span>
        )}
      </h2>
      <div className="list" style={{ marginBottom: '1.25rem' }}>
        {g.items.map(renderItem)}
      </div>
    </Fragment>
  ))
}
