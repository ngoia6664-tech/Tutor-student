import { useAsync } from '../lib/useAsync.js'
import { lessonFileUrl } from '../lib/lessons.js'
import { displayFileName } from '../lib/files.js'
import { formatDateTime } from '../lib/format.js'
import Markdown from './Markdown.jsx'
import VideoEmbed from './VideoEmbed.jsx'
import ErrorBox from './ErrorBox.jsx'
import Icon from './Icon.jsx'

// Tách nội dung Markdown thành: dòng thông tin (dòng đầu dạng _..._), phần mở đầu,
// và các mục theo tiêu đề "## ". Mỗi mục được hiển thị trong một thẻ riêng.
export function splitLesson(md) {
  const sections = [{ title: null, lines: [] }]
  let inFence = false
  for (const line of (md || '').split('\n')) {
    if (/^\s*(```|~~~)/.test(line)) inFence = !inFence
    if (!inFence && /^##\s+/.test(line) && !/^###/.test(line)) sections.push({ title: line.replace(/^##\s+/, '').trim(), lines: [] })
    else sections[sections.length - 1].lines.push(line)
  }
  let intro = sections[0].lines.join('\n').trim()
  let eyebrow = null
  const m = /^_([^_\n]+)_[ \t]*(\n|$)/.exec(intro)
  if (m) {
    eyebrow = m[1].trim()
    intro = intro.slice(m[0].length).trim()
  }
  return {
    eyebrow,
    intro,
    sections: sections.slice(1).map((s) => ({ title: s.title, body: s.lines.join('\n').trim() })),
  }
}

// Phần thân bài giảng (dùng cho trang xem, xem trước khi nhập JSON)
export function LessonBody({ content }) {
  const { intro, sections } = splitLesson(content)
  if (!intro && !sections.length) return <p className="muted">Bài giảng không có nội dung chữ.</p>
  return (
    <>
      {intro && <Markdown className="lesson-intro">{intro}</Markdown>}
      {sections.map((s, i) => (
        <section key={i} className="card lesson-section">
          <Markdown>{`## ${s.title}\n\n${s.body}`}</Markdown>
        </section>
      ))}
    </>
  )
}

// Dòng thông tin + tiêu đề bài
export function LessonHead({ title, content, children }) {
  const { eyebrow } = splitLesson(content)
  return (
    <header className="lesson-head">
      {eyebrow && <p className="lesson-eyebrow">{eyebrow}</p>}
      <h1>{title}</h1>
      {children}
    </header>
  )
}

function LessonFile({ path }) {
  const { data: url, loading, error, reload } = useAsync(() => lessonFileUrl(path), [path])
  if (loading) return <span className="muted small">Đang chuẩn bị file...</span>
  if (error) return <ErrorBox message={`Không mở được file: ${error}`} onRetry={reload} />
  return (
    <a className="btn" href={url} target="_blank" rel="noopener noreferrer">
      <Icon name="file" />
      {displayFileName(path)}
    </a>
  )
}

// Hiển thị một bài giảng: tiêu đề, các mục (mỗi mục một thẻ), file đính kèm, video
export default function LessonView({ lesson }) {
  return (
    <article className="lesson">
      <LessonHead title={lesson.title} content={lesson.content_md}>
        <p className="muted small" style={{ margin: 0 }}>
          Đăng lúc {formatDateTime(lesson.created_at)}
        </p>
      </LessonHead>

      <LessonBody content={lesson.content_md} />

      {(lesson.file_path || lesson.video_url) && (
        <section className="card lesson-section">
          {lesson.file_path && (
            <div style={{ marginBottom: lesson.video_url ? '1rem' : 0 }}>
              <h2>File đính kèm</h2>
              <LessonFile path={lesson.file_path} />
            </div>
          )}
          {lesson.video_url && (
            <div>
              <h2>Video</h2>
              <VideoEmbed url={lesson.video_url} />
            </div>
          )}
        </section>
      )}
    </article>
  )
}
