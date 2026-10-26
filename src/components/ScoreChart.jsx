import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { viNum } from '../lib/exam.js'
import { celebrate, mascotSay } from '../lib/celebrate.js'
import {
  chapterTree,
  chartComment,
  chartStats,
  filterPoints,
  inChapter,
  KINDS,
  movingAvg,
  NO_CHAPTER,
  pointComment,
  RANGES,
  WEAK,
  weakGroupKeys,
} from '../lib/scoreChart.js'

// Khung SVG (viewBox), co giãn theo bề rộng thẻ
const W = 340
const H = 220
const PAD = { l: 30, r: 14, t: 14, b: 26 }
const PASS = 5 // vạch mốc

const ddmm = (d) => {
  const t = new Date(d)
  return `${String(t.getDate()).padStart(2, '0')}/${t.getMonth() + 1}`
}

// Biểu đồ đường điểm theo thời gian: lọc loại bài + khoảng thời gian, 4 ô số liệu, chạm điểm → thẻ bài.
// points: từ lib/scoreChart.js toPoints (cũ → mới). Không có điểm nào thì không hiện.
// voice: 'student' | 'tutor' — gấu nhận xét khi mở (mỗi phiên chỉ một lần cho mỗi lần có điểm mới).
// quiet: không nhận xét khi mở (vd. Kết quả đang lọc một chương trên cây).
// Trang gia sư truyền thêm chapterById + chapter/onChapter (chương đang lọc, giữ ở trang cha để lọc cả danh sách bài)
// + chapterLink(id) + backState ({ backTo, backLabel } cho nút quay về trong Thư viện)
// → hiện cây "Điểm theo chương" theo bộ lọc loại bài / thời gian; bấm chương = lọc tại chỗ.
export default function ScoreChart({ points, voice = 'student', quiet = false, chapterById, chapter = null, onChapter, chapterLink, backState }) {
  const [kind, setKind] = useState('all')
  const [range, setRange] = useState('90')
  const [picked, setPicked] = useState(null)

  // Gấu nhận xét: khóa theo bài mới nhất → điểm mới thì nói lại, tải lại trang thì im
  const last = points[points.length - 1]
  const sayKey = last && !quiet ? `mascot-chart:${voice}:${last.id}:${points.length}:${last.to}` : ''
  useEffect(() => {
    if (!sayKey) return
    try {
      if (sessionStorage.getItem(sayKey)) return
    } catch {
      /* không đọc được thì vẫn nói */
    }
    const c = chartComment(points, voice)
    if (!c) return
    // Gấu tải lười: đợi một chút để kịp lắng nghe sự kiện.
    // Chỉ đánh dấu "đã nói" khi nói thật (StrictMode / rời trang sớm hủy hẹn giờ thì lần sau vẫn nói)
    const t = setTimeout(() => {
      try {
        sessionStorage.setItem(sayKey, '1')
      } catch {
        /* bỏ qua */
      }
      if (c.cheer) celebrate(c.text)
      else mascotSay(c.text)
    }, 1200)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sayKey])

  if (!points.length) return null

  const choose = (p) => {
    setPicked(p.id)
    if (voice !== 'student') return
    const text = pointComment(p, points)
    if (text) mascotSay(text)
  }
  const base = filterPoints(points, kind, range)
  const pts = base.filter((p) => inChapter(p.chapterId, chapter))
  const st = chartStats(pts)
  const withTree = !!(chapterById && onChapter)
  const chapterTitle = chapter === NO_CHAPTER ? 'Bài khác' : chapterById?.get(chapter)?.title || points.find((p) => p.chapterId === chapter)?.chapter
  const sel = pts.find((p) => p.id === picked) || pts[pts.length - 1]

  const top = Math.max(10, ...pts.map((p) => p.score))
  const x0 = PAD.l + 8
  const x1 = W - PAD.r - 8
  const x = (i) => (pts.length === 1 ? (x0 + x1) / 2 : x0 + (i * (x1 - x0)) / (pts.length - 1))
  const y = (s) => PAD.t + (1 - s / top) * (H - PAD.t - PAD.b)
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => f * top)
  const line = pts.map((p, i) => `${x(i)},${y(p.score)}`).join(' ')
  const avgLine = pts.length >= 4 ? movingAvg(pts).map((m) => `${x(m.i)},${y(m.v)}`).join(' ') : ''
  // Nhãn ngày: tối đa 5 mốc chia đều
  const labelIdx = pts.length <= 5 ? pts.map((_, i) => i) : [0, 1, 2, 3, 4].map((k) => Math.round((k * (pts.length - 1)) / 4))
  const r = pts.length > 30 ? 3 : 4.5

  return (
    <section className="card score-chart">
      <div className="row row-between">
        <h2 style={{ margin: 0 }}>Biểu đồ học tập</h2>
        <select className="score-chart-range" value={range} onChange={(e) => setRange(e.target.value)} aria-label="Khoảng thời gian">
          {RANGES.map((o) => (
            <option key={o.key} value={o.key}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      <div className="chips">
        {KINDS.map((k) => (
          <button key={k.key} type="button" className={kind === k.key ? 'chip active' : 'chip'} onClick={() => setKind(k.key)}>
            {k.label}
          </button>
        ))}
      </div>

      {withTree && chapter && (
        <div className="score-chart-filter">
          <span className="score-chart-filter-chip">
            Đang xem: <b>{chapterTitle || 'Chương'}</b>
            <button type="button" onClick={() => onChapter(null)} aria-label="Bỏ lọc chương" title="Xem tất cả">
              ✕
            </button>
          </span>
          {chapter !== NO_CHAPTER && chapterLink && (
            <Link to={chapterLink(chapter)} state={backState} className="small">
              Mở chương trong Thư viện ›
            </Link>
          )}
        </div>
      )}

      <div className="score-chart-stats">
        <ChartStat label="Trung bình" value={st.avg === null ? '—' : viNum(st.avg)} />
        <ChartStat label="Cao nhất" value={st.max === null ? '—' : viNum(st.max)} />
        <ChartStat label="Số bài" value={st.count} />
        <ChartStat
          label="Xu hướng"
          value={st.trend === null ? '—' : st.trend > 0 ? `▲ ${viNum(st.trend)}` : st.trend < 0 ? `▼ ${viNum(-st.trend)}` : '= 0'}
          tone={st.trend > 0 ? 'up' : st.trend < 0 ? 'down' : ''}
          title="TB 3 bài gần nhất so với 3 bài trước đó"
        />
      </div>

      {pts.length === 0 ? (
        <div className="empty">Chưa có bài nào có điểm trong mục này.</div>
      ) : (
        <>
          <svg viewBox={`0 0 ${W} ${H}`} className="score-chart-svg" role="img" aria-label={`Biểu đồ điểm ${pts.length} bài, trung bình ${viNum(st.avg)}`}>
            {ticks.map((t) => (
              <g key={t}>
                <line x1={PAD.l} x2={W - PAD.r} y1={y(t)} y2={y(t)} className="sc-grid" />
                <text x={PAD.l - 6} y={y(t) + 4} textAnchor="end" className="sc-label">
                  {viNum(t)}
                </text>
              </g>
            ))}
            <line x1={PAD.l} x2={W - PAD.r} y1={y(PASS)} y2={y(PASS)} className="sc-pass" />
            {pts.length > 1 && <polygon points={`${line} ${x(pts.length - 1)},${y(0)} ${x(0)},${y(0)}`} className="sc-area" />}
            {sel && <line x1={x(pts.indexOf(sel))} x2={x(pts.indexOf(sel))} y1={PAD.t} y2={y(0)} className="sc-cursor" />}
            {avgLine && <polyline points={avgLine} className="sc-avg" />}
            {pts.length > 1 && <polyline points={line} className="sc-line" />}
            {pts.map((p, i) => {
              const cx = x(i)
              const cy = y(p.score)
              const on = p === sel
              return (
                <g
                  key={p.id}
                  className={on ? 'sc-pt on' : 'sc-pt'}
                  tabIndex={0}
                  role="button"
                  aria-label={`${p.title}: ${viNum(p.score)} điểm`}
                  onClick={() => choose(p)}
                  onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), choose(p))}
                >
                  <circle cx={cx} cy={cy} r={14} className="sc-hit" />
                  {on && <circle cx={cx} cy={cy} r={r + 5} className="sc-ring" />}
                  {p.isExam ? (
                    <polygon points={`${cx},${cy - r - 2} ${cx + r + 2},${cy} ${cx},${cy + r + 2} ${cx - r - 2},${cy}`} className="sc-dot exam" />
                  ) : (
                    <circle cx={cx} cy={cy} r={r} className="sc-dot" />
                  )}
                </g>
              )
            })}
            {labelIdx.map((i) => (
              <text key={i} x={x(i)} y={H - 8} textAnchor="middle" className="sc-label">
                {ddmm(pts[i].date)}
              </text>
            ))}
          </svg>

          <div className="score-chart-legend">
            <span>
              <i className="lg-line" /> Điểm từng bài
            </span>
            <span>
              <i className="lg-exam" /> Đề thi
            </span>
            {avgLine && (
              <span>
                <i className="lg-avg" /> TB 3 bài gần nhất
              </span>
            )}
            <span>
              <i className="lg-pass" /> Mốc {PASS} điểm
            </span>
          </div>

          {sel && (
            <div className="score-chart-pick">
              <div className="score-chart-pick-text">
                <b>{sel.title}</b>
                <span className="muted small">
                  Nộp {ddmm(sel.date)}
                  {sel.chapter && ` · ${sel.chapter}`}
                </span>
              </div>
              <span className="score">{viNum(sel.score)}</span>
              <Link to={sel.to} className="btn btn-small btn-primary">
                Xem bài
              </Link>
            </div>
          )}
          <p className="muted small score-chart-hint">Chạm vào một điểm để xem bài đó</p>

        </>
      )}

      {withTree && base.length > 0 && <ChapterScores points={base} chapterById={chapterById} chapter={chapter} onChapter={onChapter} />}
    </section>
  )
}

// Điểm TB theo cây Lớp › Môn › Chuyên đề › Chương; chương dưới WEAK tô vàng + "cần ôn".
// Nhóm có chương cần ôn mở sẵn; bấm chương = lọc biểu đồ + danh sách bài (bấm lại = bỏ lọc)
function ChapterScores({ points, chapterById, chapter, onChapter }) {
  const tree = chapterTree(points, chapterById)
  const [open, setOpen] = useState(() => new Set(weakGroupKeys(tree)))
  const allKeys = groupKeys(tree)
  const allOpen = allKeys.length > 0 && allKeys.every((k) => open.has(k))
  const toggle = (k) =>
    setOpen((s) => {
      const n = new Set(s)
      n.has(k) ? n.delete(k) : n.add(k)
      return n
    })

  return (
    <div className="chapter-scores">
      <div className="row row-between">
        <h3>Điểm theo chương</h3>
        {allKeys.length > 0 && (
          <button type="button" className="btn btn-small" onClick={() => setOpen(new Set(allOpen ? [] : allKeys))}>
            {allOpen ? 'Gập hết' : 'Mở hết'}
          </button>
        )}
      </div>
      <ul className="cs-tree">
        {tree.map((n) => (
          <ChapterNode key={n.key || n.id || NO_CHAPTER} node={n} open={open} toggle={toggle} chapter={chapter} onChapter={onChapter} />
        ))}
      </ul>
      <p className="muted small" style={{ margin: 0 }}>
        Bấm vào một chương để lọc biểu đồ và danh sách bài tập.
      </p>
    </div>
  )
}

function groupKeys(tree, out = []) {
  for (const n of tree) {
    if (n.type !== 'group') continue
    out.push(n.key)
    groupKeys(n.children, out)
  }
  return out
}

function ChapterNode({ node: n, open, toggle, chapter, onChapter }) {
  if (n.type === 'group') {
    const isOpen = open.has(n.key)
    return (
      <li className="cs-group">
        <button type="button" className="cs-group-head" onClick={() => toggle(n.key)} aria-expanded={isOpen}>
          <span className="cs-caret" aria-hidden="true">
            {isOpen ? '▾' : '▸'}
          </span>
          <span className="cs-group-name">
            {n.label}
            {n.weak && !isOpen && (
              <span className="chapter-score-tag" title="Có chương cần ôn">
                ⚠ cần ôn
              </span>
            )}
          </span>
          <span className="chapter-score-num">
            <b>{viNum(n.avg)}</b> · {n.count} bài
          </span>
        </button>
        {isOpen && (
          <ul className="cs-tree">
            {n.children.map((c) => (
              <ChapterNode key={c.key || c.id} node={c} open={open} toggle={toggle} chapter={chapter} onChapter={onChapter} />
            ))}
          </ul>
        )}
      </li>
    )
  }
  const key = n.id || NO_CHAPTER
  const on = chapter === key
  return (
    <li>
      <button
        type="button"
        className={`chapter-score${n.weak ? ' weak' : ''}${on ? ' on' : ''}`}
        onClick={() => onChapter(on ? null : key)}
        aria-pressed={on}
      >
        <span className="chapter-score-head">
          <span className="chapter-score-name">
            {n.title}
            {n.weak && <span className="chapter-score-tag">cần ôn</span>}
          </span>
          <span className="chapter-score-num">
            <b>{viNum(n.avg)}</b> · {n.count} bài
          </span>
        </span>
        <span className="chapter-score-track" title={`TB ${viNum(n.avg)}/10${n.weak ? `, dưới ${WEAK}` : ''}`}>
          <span className="chapter-score-fill" style={{ width: `${Math.min(100, n.avg * 10)}%` }} />
        </span>
      </button>
    </li>
  )
}

function ChartStat({ label, value, tone = '', title }) {
  return (
    <div className={`score-chart-stat ${tone}`} title={title}>
      <span className="muted small">{label}</span>
      <b>{value}</b>
    </div>
  )
}
