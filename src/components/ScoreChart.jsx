import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { viNum } from '../lib/exam.js'
import { celebrate, mascotSay } from '../lib/celebrate.js'
import { chapterStats, chartComment, chartStats, filterPoints, KINDS, movingAvg, pointComment, RANGES, WEAK } from '../lib/scoreChart.js'

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
// chapterLink(id): có thì hiện khối "Điểm theo chương" (trang gia sư), theo bộ lọc đang chọn.
export default function ScoreChart({ points, voice = 'student', quiet = false, chapterLink }) {
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
  const pts = filterPoints(points, kind, range)
  const st = chartStats(pts)
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

          {chapterLink && <ChapterScores points={pts} chapterLink={chapterLink} />}
        </>
      )}
    </section>
  )
}

// Điểm TB theo chương (cao → thấp), chương dưới WEAK tô vàng + "cần ôn"
function ChapterScores({ points, chapterLink }) {
  const rows = chapterStats(points)
  return (
    <div className="chapter-scores">
      <h3>Điểm theo chương</h3>
      {rows.map((c) => (
        <div key={c.id || 'none'} className={c.weak ? 'chapter-score weak' : 'chapter-score'}>
          <div className="chapter-score-head">
            <span className="chapter-score-name">
              {c.id ? <Link to={chapterLink(c.id)}>{c.title}</Link> : c.title}
              {c.weak && <span className="chapter-score-tag">cần ôn</span>}
            </span>
            <span className="chapter-score-num">
              <b>{viNum(c.avg)}</b> · {c.count} bài
            </span>
          </div>
          <div className="chapter-score-track" title={`TB ${viNum(c.avg)}/10${c.weak ? `, dưới ${WEAK}` : ''}`}>
            <div className="chapter-score-fill" style={{ width: `${Math.min(100, c.avg * 10)}%` }} />
          </div>
        </div>
      ))}
    </div>
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
