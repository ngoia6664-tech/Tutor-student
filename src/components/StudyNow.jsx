import { Link } from 'react-router-dom'

// Dòng nhắc "Bạn đang học đến chương X, chủ đề Y" (học sinh). Bấm tên chủ đề → chủ đề đó trong Thư viện.
// Chưa đánh dấu chủ đề nào: gợi ý cách đánh dấu.
export default function StudyNow({ chapter }) {
  if (!chapter)
    return (
      <p className="study-now study-now-empty">
        <span className="study-now-pin" aria-hidden="true">📍</span>
        <span>
          Chưa đánh dấu chủ đề đang học. Chọn một chủ đề ở cây bên trái (hoặc trong{' '}
          <Link to="/student/library">Thư viện</Link>) rồi bấm nút <b>📍 Đánh dấu đang học</b> ở đầu trang. Mở một bài
          tập để làm thì app cũng tự nhớ.
        </span>
      </p>
    )
  return (
    <p className="study-now">
      <span className="study-now-pin" aria-hidden="true">📍</span>
      <span>
        Bạn đang học đến {chapter.section && (
          <>
            <b>{chapter.section}</b>,{' '}
          </>
        )}
        <Link to={`/student/library/${chapter.id}`}>
          <b>{chapter.title}</b>
        </Link>
      </span>
    </p>
  )
}
