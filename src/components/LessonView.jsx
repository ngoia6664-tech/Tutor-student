// @ts-nocheck — nợ kiểu: xóa dòng này rồi chạy npm run typecheck để sửa
import { useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAsync } from '../lib/useAsync.js'
import { lessonFileUrl } from '../lib/lessons.js'
import { displayFileName } from '../lib/files.js'
import { formatDateTime } from '../lib/format.js'
import Markdown from './Markdown.jsx'
import VideoEmbed from './VideoEmbed.jsx'
import ErrorBox from './ErrorBox.jsx'
import Icon from './Icon.jsx'

// Dấu phân trang trong Markdown (một dòng riêng). Bài nhập JSON có "page" ở từng mục sẽ có dấu này;
// bài cũ không có dấu → mặc định xem cả bài, bấm "Xem theo trang" thì mỗi mục "## " là một trang.
// Không lưu gì thêm vào cơ sở dữ liệu: dấu nằm ngay trong content_md.
export const PAGE_BREAK = '<!-- trang -->'
const PAGE_MARK = /^\s*<!--\s*trang\s*-->\s*$/i

// Tách nội dung Markdown thành: dòng thông tin (dòng đầu dạng _..._), phần mở đầu,
// các mục theo tiêu đề "## " (mỗi mục một thẻ) và các trang.
export function splitLesson(md) {
  const head = []
  const rawPages = [] // [{ lead: [], sections: [{ title, lines }] }]
  let page = null
  let section = null
  let inFence = false
  let marked = false
  for (const line of (md || '').split('\n')) {
    if (/^\s*(```|~~~)/.test(line)) inFence = !inFence
    if (!inFence && PAGE_MARK.test(line)) {
      marked = true
      page = { lead: [], sections: [] }
      rawPages.push(page)
      section = null
    } else if (!inFence && /^##\s+/.test(line)) {
      if (!page) {
        page = { lead: [], sections: [] }
        rawPages.push(page)
      }
      section = { title: line.replace(/^##\s+/, '').trim(), lines: [] }
      page.sections.push(section)
    } else if (section) section.lines.push(line)
    else if (page) page.lead.push(line)
    else head.push(line)
  }

  let intro = head.join('\n').trim()
  let eyebrow = null
  const m = /^_([^_\n]+)_[ \t]*(\n|$)/.exec(intro)
  if (m) {
    eyebrow = m[1].trim()
    intro = intro.slice(m[0].length).trim()
  }
  const toSection = (s) => ({ title: s.title, body: s.lines.join('\n').trim() })
  const sections = rawPages.flatMap((p) => p.sections.map(toSection))
  const pages = marked
    ? rawPages.map((p) => ({ lead: p.lead.join('\n').trim(), sections: p.sections.map(toSection) })).filter((p) => p.lead || p.sections.length)
    : sections.map((s) => ({ lead: '', sections: [s] }))
  return { eyebrow, intro, sections, pages, marked }
}

const pageTitle = (p, i) => p.sections[0]?.title || `Trang ${i + 1}`

function Section({ s }) {
  return (
    <section className="card lesson-section">
      <Markdown>{`## ${s.title}\n\n${s.body}`}</Markdown>
    </section>
  )
}

function PageContent({ p }) {
  return (
    <>
      {p.lead && <Markdown className="lesson-intro">{p.lead}</Markdown>}
      {p.sections.map((s, i) => (
        <Section key={i} s={s} />
      ))}
    </>
  )
}

// Thanh chuyển trang: trước / chọn trang / sau
function Pager({ pages, index, onChange }) {
  const last = pages.length - 1
  return (
    <nav className="lesson-pager" aria-label="Chuyển trang bài giảng">
      <button type="button" className="btn btn-small" disabled={index <= 0} onClick={() => onChange(index - 1)}>
        ← Trước
      </button>
      <select className="lesson-pager-select" value={index} onChange={(e) => onChange(Number(e.target.value))} aria-label="Chọn trang">
        {pages.map((p, i) => (
          <option key={i} value={i}>
            {i + 1}/{pages.length} · {pageTitle(p, i)}
          </option>
        ))}
      </select>
      <button type="button" className="btn btn-small btn-primary" disabled={index >= last} onClick={() => onChange(index + 1)}>
        Sau →
      </button>
    </nav>
  )
}

// Phần thân bài giảng. Không có "paged": hiện cả bài (dùng cho xem trước khi nhập JSON / soạn bài;
// bài có dấu phân trang thì chèn vạch "Trang n" để thấy được cách chia).
// Có "paged": chỉ hiện trang "page" (đếm từ 0) kèm thanh chuyển trang ở trên và dưới.
export function LessonBody({ content, paged = false, page = 0, onPage }) {
  const { intro, sections, pages, marked } = splitLesson(content)
  if (!intro && !sections.length && !pages.length) return <p className="muted">Bài giảng không có nội dung chữ.</p>

  if (paged && pages.length) {
    const index = Math.min(Math.max(page, 0), pages.length - 1)
    return (
      <>
        {index === 0 && intro && <Markdown className="lesson-intro">{intro}</Markdown>}
        {pages.length > 1 && <Pager pages={pages} index={index} onChange={onPage} />}
        <PageContent p={pages[index]} />
        {pages.length > 1 && <Pager pages={pages} index={index} onChange={onPage} />}
      </>
    )
  }

  return (
    <>
      {intro && <Markdown className="lesson-intro">{intro}</Markdown>}
      {marked
        ? pages.map((p, i) => (
            <div key={i}>
              {pages.length > 1 && <p className="lesson-page-divider">Trang {i + 1}</p>}
              <PageContent p={p} />
            </div>
          ))
        : sections.map((s, i) => <Section key={i} s={s} />)}
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

// Hiển thị một bài giảng: tiêu đề, các mục (mỗi mục một thẻ) hoặc từng trang, file đính kèm, video.
// Chế độ xem và trang đang mở nằm trên URL (?xem=trang|ca-bai&trang=3) nên tải lại vẫn đúng chỗ.
export default function LessonView({ lesson }) {
  const [params, setParams] = useSearchParams()
  const top = useRef(null)
  const { pages, marked } = splitLesson(lesson.content_md)
  const xem = params.get('xem')
  // Bài có dấu phân trang mặc định xem theo trang; bài cũ mặc định xem cả bài như trước
  const paged = pages.length > 1 && (xem ? xem === 'trang' : marked)
  const page = Math.min(Math.max((Number(params.get('trang')) || 1) - 1, 0), Math.max(pages.length - 1, 0))

  function update(next) {
    setParams(
      (p) => {
        const q = new URLSearchParams(p)
        Object.entries(next).forEach(([k, v]) => (v === null ? q.delete(k) : q.set(k, v)))
        return q
      },
      { replace: true }
    )
  }

  function goPage(i) {
    update({ trang: String(i + 1) })
    top.current?.scrollIntoView({ block: 'start' })
  }

  return (
    <article className="lesson" ref={top}>
      <LessonHead title={lesson.title} content={lesson.content_md}>
        <div className="row row-between lesson-meta">
          <p className="muted small" style={{ margin: 0 }}>
            Đăng lúc {formatDateTime(lesson.created_at)}
            {paged && ` · ${pages.length} trang`}
          </p>
          {pages.length > 1 && (
            <button
              type="button"
              className="btn btn-small btn-ghost"
              onClick={() => update(paged ? { xem: 'ca-bai', trang: null } : { xem: 'trang', trang: null })}
            >
              <Icon name={paged ? 'file' : 'book'} />
              {paged ? 'Xem cả bài' : 'Xem theo trang'}
            </button>
          )}
        </div>
      </LessonHead>

      <LessonBody content={lesson.content_md} paged={paged} page={page} onPage={goPage} />

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
