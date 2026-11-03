import { Link } from 'react-router-dom'
import ContextPanel from './ContextPanel.jsx'
import Icon from './Icon.jsx'
import { chartStats, pointScore } from '../lib/scoreChart.js'
import { viNum } from '../lib/exam.js'

// Cột phải trang Kết quả (học sinh): đường xu hướng điểm 10 bài gần nhất (thang 10) + so với 3 bài trước,
// và 3 bài nộp gần đây có nút Xem. Biểu đồ lớn có lọc vẫn ở nội dung chính (ScoreChart); đây chỉ là tóm tắt.

const W = 280
const H = 72
const PAD = 8
const N = 10

/**
 * @param {{
 *   points: { id: string, title: string, score: number, to: string }[],
 *   recent: { status: string, score: number | null, machine?: any, assignment: { id: string, title: string } }[],
 * }} props
 */
export default function ResultsTrendPanel({ points, recent }) {
  if (!points.length && !recent.length) return null
  const last = points.slice(-N)
  const stats = chartStats(points)
  const step = last.length > 1 ? (W - PAD * 2) / (last.length - 1) : 0
  const xy = last.map((p, i) => ({ ...p, x: last.length > 1 ? PAD + i * step : W / 2, y: PAD + (1 - p.score / 10) * (H - PAD * 2) }))
  const line = xy.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
  const area = xy.length > 1 ? `M${xy[0].x},${H - PAD} L${line.replaceAll(' ', ' L')} L${xy.at(-1).x},${H - PAD} Z` : ''
  const end = xy.at(-1)
  const trend = stats.trend

  return (
    <ContextPanel title="Xu hướng điểm" icon="trend">
      {xy.length > 0 && (
        <>
          <div className="ctx-trend-head">
            <span className="ctx-avg">
              <span className="muted">Điểm TB {stats.count} bài</span>
              <strong className="ctx-bignum">{viNum(stats.avg)}</strong>
            </span>
            {trend !== null && (
              <span className={`ctx-trend ${trend > 0 ? 'is-up' : trend < 0 ? 'is-down' : ''}`}>
                <span aria-hidden="true">{trend > 0 ? '↑' : trend < 0 ? '↓' : '→'}</span>{' '}
                {trend === 0 ? 'Giữ nguyên' : `${trend > 0 ? 'Tăng' : 'Giảm'} ${viNum(Math.abs(trend))}`}
                <span className="muted"> so với 3 bài trước</span>
              </span>
            )}
          </div>
          <svg
            className="ctx-spark"
            viewBox={`0 0 ${W} ${H}`}
            role="img"
            aria-label={`Điểm ${last.length} bài gần nhất: ${last.map((p) => viNum(p.score)).join(', ')}`}
          >
            {/* Vạch mốc 5 điểm (trung bình thang 10): mờ, chỉ để định vị */}
            <line x1={PAD} x2={W - PAD} y1={H / 2} y2={H / 2} className="ctx-spark-grid" />
            {area && <path d={area} className="ctx-spark-area" />}
            {xy.length > 1 && <polyline points={line} className="ctx-spark-line" />}
            {xy.map((p) => (
              // Vùng rê lớn hơn chấm; tooltip = tên bài + điểm (mở bài: danh sách bên dưới / biểu đồ lớn)
              <circle key={p.id + p.x} cx={p.x} cy={p.y} r="10" className="ctx-spark-hit">
                <title>{`${p.title}: ${viNum(p.score)} điểm`}</title>
              </circle>
            ))}
            {end && <circle cx={end.x} cy={end.y} r="4" className="ctx-spark-end" />}
          </svg>
        </>
      )}
      {recent.length > 0 && (
        <>
          <h3 className="ctx-sub">
            <Icon name="clock" size={16} />
            Bài nộp gần đây
          </h3>
          <ul className="ctx-feed">
            {recent.map((r) => {
              const s = pointScore(r)
              return (
                <li key={r.assignment.id}>
                  <Link to={`/student/assignments/${r.assignment.id}`} className="ctx-feed-row">
                    <span className="ctx-feed-main">
                      <b>{r.assignment.title}</b>
                      {s === null ? (
                        <span className="muted">Chờ gia sư chấm</span>
                      ) : (
                        <span className="ctx-score">{viNum(Math.round(s * 100) / 100)} điểm</span>
                      )}
                    </span>
                    <span className="ctx-go">Xem</span>
                  </Link>
                </li>
              )
            })}
          </ul>
        </>
      )}
    </ContextPanel>
  )
}
