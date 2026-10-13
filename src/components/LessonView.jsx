import { useAsync } from '../lib/useAsync.js'
import { lessonFileUrl } from '../lib/lessons.js'
import { displayFileName } from '../lib/files.js'
import { formatDateTime } from '../lib/format.js'
import Markdown from './Markdown.jsx'
import VideoEmbed from './VideoEmbed.jsx'
import ErrorBox from './ErrorBox.jsx'

function LessonFile({ path }) {
  const { data: url, loading, error, reload } = useAsync(() => lessonFileUrl(path), [path])
  if (loading) return <span className="muted small">Đang chuẩn bị file...</span>
  if (error) return <ErrorBox message={`Không mở được file: ${error}`} onRetry={reload} />
  return (
    <a className="btn" href={url} target="_blank" rel="noopener noreferrer">
      📎 {displayFileName(path)}
    </a>
  )
}

// Hiển thị một bài giảng: nội dung có công thức, file đính kèm, video
export default function LessonView({ lesson }) {
  return (
    <div className="card">
      <h1>{lesson.title}</h1>
      <p className="muted small" style={{ marginTop: 0 }}>
        Đăng lúc {formatDateTime(lesson.created_at)}
      </p>
      {lesson.content_md?.trim() ? <Markdown>{lesson.content_md}</Markdown> : <p className="muted">Bài giảng không có nội dung chữ.</p>}

      {(lesson.file_path || lesson.video_url) && <hr style={{ border: 0, borderTop: '1px solid var(--border)', margin: '1rem 0' }} />}
      {lesson.file_path && (
        <div style={{ marginBottom: '1rem' }}>
          <div className="box-label">File đính kèm</div>
          <LessonFile path={lesson.file_path} />
        </div>
      )}
      {lesson.video_url && (
        <div>
          <div className="box-label">Video</div>
          <VideoEmbed url={lesson.video_url} />
        </div>
      )}
    </div>
  )
}
