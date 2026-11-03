import { Link } from 'react-router-dom'
import { usePandaShop } from '../contexts/PandaShopContext.jsx'
import ContextPanel from './ContextPanel.jsx'

// Cột phải trang Ôn tập (học sinh): chủ đề còn nhiều câu sai nhất (bấm → lọc đúng chủ đề trên cây, ?ch=),
// lối sang mục Câu khó, và số khiên giữ chuỗi (PandaShopContext).

/**
 * @param {{
 *   wrong: { chapter_id: string | null }[],
 *   chapterById: Map<string, { id: string, title: string }>,
 *   hardCount: number,
 *   onShowHard: () => void,
 *   onShowWrong: () => void,
 * }} props wrong: câu sai chưa "đã thuộc"
 */
export default function MistakesPanel({ wrong, chapterById, hardCount, onShowHard, onShowWrong }) {
  const shields = usePandaShop()?.data?.shields
  const byChapter = new Map()
  for (const r of wrong) {
    const c = r.chapter_id ? chapterById.get(r.chapter_id) : null
    if (c) byChapter.set(c.id, { c, n: (byChapter.get(c.id)?.n || 0) + 1 })
  }
  const top = [...byChapter.values()].sort((a, b) => b.n - a.n).slice(0, 3)

  return (
    <ContextPanel title="Nên ôn trước" icon="flag">
      {top.length ? (
        <ul className="ctx-feed">
          {top.map(({ c, n }) => (
            <li key={c.id}>
              <Link to={`/student/mistakes?ch=${c.id}`} className="ctx-feed-row" onClick={onShowWrong}>
                <span className="ctx-feed-main">
                  <b>{c.title}</b>
                  <span className="muted">
                    {n} <span className="ctx-wrong">câu sai</span> chưa thuộc
                  </span>
                </span>
                <span className="ctx-go">Ôn</span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="muted small ctx-empty">Không còn câu sai nào chưa thuộc. Làm thêm bài để có câu ôn.</p>
      )}
      <div className="ctx-split">
        <button type="button" className="ctx-row" onClick={onShowHard}>
          <span className="ctx-row-text">Câu khó đã đánh dấu</span>
          <span className="ctx-count">{hardCount}</span>
        </button>
        {typeof shields === 'number' && (
          <p className="small ctx-note ctx-shield">
            <span aria-hidden="true">🛡️</span> {shields} khiên giữ chuỗi: lỡ quên một ngày Ôn tập, khiên tự giữ chuỗi cho bạn.
          </p>
        )}
      </div>
    </ContextPanel>
  )
}
