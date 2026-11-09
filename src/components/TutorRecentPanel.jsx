import { Link } from 'react-router-dom'
import { supabase, unwrap } from '../lib/supabase.js'
import { useAsync } from '../lib/useAsync.js'
import { CtxCard } from './ContextPanel.jsx'
import { timeAgo } from './NotificationBell.jsx'

// Khối mặc định cột phải của gia sư: 3 mục vừa giao gần nhất (bài tập hoặc bài giảng), bấm để mở lại.
// Gom theo bài (một bài giao cho nhiều học sinh = một dòng, kèm số học sinh). Không có gì vừa giao thì ẩn hẳn.
const LIMIT = 40 // số dòng giao gần nhất lấy về để gom (đủ cho 3 bài khác nhau)

// Tách phần tên Chủ đề / Chương dài ở đầu tiêu đề bài tập (vd. "Chủ đề 1: Cấu trúc của chất – Sự chuyển thể – Mục IV: Bài tập...")
// để làm nổi bật tên Mục / Bài tập chính, còn tên Chủ đề hiển thị gọn thành nhãn phụ phía trên.
/** @param {string} rawTitle @param {string | null} [chapterTitle] */
function splitItemTitle(rawTitle, chapterTitle) {
  const title = (rawTitle || '').trim()
  const ch = (chapterTitle || '').trim()
  if (ch && title.toLowerCase().startsWith(ch.toLowerCase())) {
    const rest = title.slice(ch.length).replace(/^[\s–—\-:·]+/, '').trim()
    if (rest) return { topic: ch, mainTitle: rest }
  }
  const secMatch = title.match(/^(.*?)\s+[–—-]\s+((?:Mục|Dạng|Phần|Đề|Bài tập|Phiếu)\s+.+)$/i)
  if (secMatch) {
    return { topic: secMatch[1].trim(), mainTitle: secMatch[2].trim() }
  }
  const parts = title.split(/\s+[–—-]\s+/)
  if (parts.length >= 3 && /^(chủ đề|chương|chuyên đề)\b/i.test(parts[0])) {
    return {
      topic: parts.slice(0, -1).join(' – '),
      mainTitle: parts[parts.length - 1],
    }
  }
  return { topic: ch && ch !== title ? ch : '', mainTitle: title }
}

/** @param {{ id: string, title: string, chapter?: { title?: string } | null, assigned_at: string }[]} rows @param {(id: string) => string} toOf @param {string} kind */
function group(rows, toOf, kind) {
  /** @type {Map<string, { key: string, topic: string, mainTitle: string, title: string, kind: string, to: string, at: string, n: number }>} */
  const m = new Map()
  for (const r of rows) {
    const cur = m.get(r.id)
    if (cur) cur.n += 1
    else {
      const { topic, mainTitle } = splitItemTitle(r.title, r.chapter?.title)
      m.set(r.id, { key: `${kind}:${r.id}`, topic, mainTitle, title: r.title, kind, to: toOf(r.id), at: r.assigned_at, n: 1 })
    }
  }
  return [...m.values()]
}

export default function TutorRecentPanel() {
  const { data } = useAsync(async () => {
    const [a, l] = await Promise.all([
      // quiet: bài khóa tự có sẵn cho học sinh, không phải "vừa giao"
      supabase.from('assignment_recipients').select('assigned_at, assignment:assignments(id, title, chapter:chapters(title))').eq('quiet', false).order('assigned_at', { ascending: false }).limit(LIMIT).then(unwrap),
      supabase.from('lesson_recipients').select('assigned_at, lesson:lessons(id, title, chapter:chapters(title))').eq('quiet', false).order('assigned_at', { ascending: false }).limit(LIMIT).then(unwrap),
    ])
    const items = [
      ...group(a.filter((r) => r.assignment).map((r) => ({ ...r.assignment, assigned_at: r.assigned_at })), (id) => `/tutor/assignments/${id}`, 'Bài tập'),
      ...group(l.filter((r) => r.lesson).map((r) => ({ ...r.lesson, assigned_at: r.assigned_at })), (id) => `/tutor/lessons/${id}`, 'Bài giảng'),
    ]
    return items.sort((x, y) => (x.at < y.at ? 1 : -1)).slice(0, 3)
  }, [])

  if (!data?.length) return null
  return (
    <CtxCard title="Vừa giao" icon="send" className="ctx-default ctx-top ctx-recent">
      <ul className="ctx-feed">
        {data.map((x) => (
          <li key={x.key}>
            <Link to={x.to} className="ctx-feed-row" title={x.title}>
              <span className="ctx-feed-main">
                {x.topic && <span className="ctx-feed-topic">{x.topic}</span>}
                <b>{x.mainTitle}</b>
                <span className="muted">
                  {x.kind} · {x.n} học sinh · {timeAgo(x.at)}
                </span>
              </span>
              <span className="ctx-go">Mở</span>
            </Link>
          </li>
        ))}
      </ul>
    </CtxCard>
  )
}
