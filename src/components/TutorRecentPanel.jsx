import { Link } from 'react-router-dom'
import { supabase, unwrap } from '../lib/supabase.js'
import { useAsync } from '../lib/useAsync.js'
import { CtxCard } from './ContextPanel.jsx'
import { timeAgo } from './NotificationBell.jsx'

// Khối mặc định cột phải của gia sư: 3 mục vừa giao gần nhất (bài tập hoặc bài giảng), bấm để mở lại.
// Gom theo bài (một bài giao cho nhiều học sinh = một dòng, kèm số học sinh). Không có gì vừa giao thì ẩn hẳn.
const LIMIT = 40 // số dòng giao gần nhất lấy về để gom (đủ cho 3 bài khác nhau)

/** @param {{ id: string, title: string, assigned_at: string }[]} rows @param {(id: string) => string} toOf @param {string} kind */
function group(rows, toOf, kind) {
  /** @type {Map<string, { key: string, title: string, kind: string, to: string, at: string, n: number }>} */
  const m = new Map()
  for (const r of rows) {
    const cur = m.get(r.id)
    if (cur) cur.n += 1
    else m.set(r.id, { key: `${kind}:${r.id}`, title: r.title, kind, to: toOf(r.id), at: r.assigned_at, n: 1 })
  }
  return [...m.values()]
}

export default function TutorRecentPanel() {
  const { data } = useAsync(async () => {
    const [a, l] = await Promise.all([
      supabase.from('assignment_recipients').select('assigned_at, assignment:assignments(id, title)').order('assigned_at', { ascending: false }).limit(LIMIT).then(unwrap),
      supabase.from('lesson_recipients').select('assigned_at, lesson:lessons(id, title)').order('assigned_at', { ascending: false }).limit(LIMIT).then(unwrap),
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
            <Link to={x.to} className="ctx-feed-row">
              <span className="ctx-feed-main">
                <b>{x.title}</b>
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
