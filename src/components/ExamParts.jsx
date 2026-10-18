import Icon from './Icon.jsx'
import { EXAM_MINUTES, examSummary, maxPoints, viNum } from '../lib/exam.js'
import { isAnswered } from './ExerciseBody.jsx'

// Tiêu đề một phần của đề thi: "PHẦN I. Trắc nghiệm nhiều phương án lựa chọn" + cách tính điểm
export function PartHeading({ part, count }) {
  if (!part) return null
  return (
    <div className="exam-part-head" id={`part-${part.kind}`}>
      <div className="exam-part-title">
        {part.roman ? `PHẦN ${part.roman}. ` : ''}
        {part.title}
        {count ? <span className="muted"> ({count} câu)</span> : null}
      </div>
      <div className="muted small">{part.note}</div>
    </div>
  )
}

// Phiếu trả lời: lưới số câu theo từng phần; câu đã làm được tô màu, bấm để nhảy tới câu
export function ExamNav({ groups, answers }) {
  const jump = (id) => document.getElementById(`q-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  const done = groups.reduce((n, g) => n + g.items.filter(({ ex }) => isAnswered(ex, answers[ex.id])).length, 0)
  const total = groups.reduce((n, g) => n + g.items.length, 0)
  return (
    <div className="card exam-nav">
      <div className="row row-between" style={{ marginBottom: '0.5rem' }}>
        <strong>Phiếu trả lời</strong>
        <span className="muted small">
          Đã làm {done}/{total} câu
        </span>
      </div>
      {groups.map((g) => (
        <div key={g.part?.kind || 'all'} className="exam-nav-part">
          {g.part?.roman && <span className="exam-nav-label">Phần {g.part.roman}</span>}
          <div className="exam-nav-grid">
            {g.items.map(({ ex, no }) => (
              <button
                key={ex.id}
                type="button"
                className={isAnswered(ex, answers[ex.id]) ? 'exam-nav-cell done' : 'exam-nav-cell'}
                onClick={() => jump(ex.id)}
                aria-label={`Câu ${no}${g.part?.roman ? ` phần ${g.part.roman}` : ''}`}
              >
                {no}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

// Điểm máy chấm của đề thi, chia theo phần. answers: { exercise_id: { points } }
export function ExamScoreCard({ exercises, answers, title = 'Điểm máy chấm (thang THPT)', children }) {
  const sum = examSummary(exercises, answers)
  if (!sum.parts.length) return null
  const standard = sum.max === 10
  return (
    <div className="card exam-score">
      <div className="exam-score-head">
        <span>{title}</span>
        <span className="exam-score-total">
          {viNum(standard ? sum.got : sum.score10)}
          <span className="muted"> / 10</span>
        </span>
      </div>
      <div className="exam-score-parts">
        {sum.parts.map((p) => (
          <div key={p.part.kind} className="exam-score-part">
            <span className="muted small">Phần {p.part.roman}</span>
            <strong>
              {viNum(p.got)}
              <span className="muted"> / {viNum(p.max)}</span>
            </strong>
            <div className="progress">
              <div className="progress-bar" style={{ width: `${p.max ? (p.got / p.max) * 100 : 0}%` }} />
            </div>
          </div>
        ))}
      </div>
      {!standard && (
        <p className="muted small" style={{ margin: '0.5rem 0 0' }}>
          Đề có {viNum(sum.max)} điểm máy chấm (không đúng chuẩn 18 – 4 – 6): đạt {viNum(sum.got)}/{viNum(sum.max)}, quy về thang 10 là {viNum(sum.score10)}.
        </p>
      )}
      {children}
    </div>
  )
}

// Nhãn điểm một câu trong đề thi, vd. "0,5 / 1 đ"
export function PointsBadge({ ex, answer }) {
  const max = maxPoints(ex)
  if (!max) return null
  if (!answer || answer.points === null || answer.points === undefined) return <span className="badge badge-muted">0 / {viNum(max)} đ</span>
  const got = Number(answer.points)
  const tone = got >= max ? 'badge-ok' : got > 0 ? 'badge-warn' : 'badge-danger'
  return (
    <span className={`badge ${tone}`}>
      {viNum(got)} / {viNum(max)} đ
    </span>
  )
}

// Tính giờ làm đề: bật/tắt + số phút (chuẩn THPT 50 phút)
export function ExamTimer({ timed, minutes, onSet }) {
  return (
    <div className="exam-timer-set">
      <label className="exam-switch">
        <input type="checkbox" checked={timed} onChange={(e) => onSet('timed', e.target.checked)} />
        <Icon name="clock" />
        <span>Tính giờ làm bài</span>
      </label>
      {timed && (
        <label className="exam-minutes">
          <input
            type="number"
            min="1"
            max="600"
            inputMode="numeric"
            value={minutes}
            onChange={(e) => onSet('time_limit', e.target.value)}
            aria-label="Số phút làm bài"
          />
          <span>phút</span>
          {String(minutes) !== String(EXAM_MINUTES) && (
            <button type="button" className="btn btn-small btn-ghost" onClick={() => onSet('time_limit', String(EXAM_MINUTES))}>
              Về {EXAM_MINUTES} phút
            </button>
          )}
        </label>
      )}
      <span className="muted small" style={{ flexBasis: '100%' }}>
        {timed
          ? 'Học sinh bấm "Bắt đầu làm bài" thì đồng hồ chạy; hết giờ bài tự nộp.'
          : 'Không tính giờ: học sinh làm thoải mái đến hạn nộp.'}
      </span>
    </div>
  )
}

