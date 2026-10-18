import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useAsync } from '../../lib/useAsync.js'
import { fetchStudentReport, STATE_LABEL, STATE_TONE } from '../../lib/studentReport.js'
import { fetchChapters } from '../../lib/chapters.js'
import { formatDate, formatDateTime, TYPE_LABEL } from '../../lib/format.js'
import { minutesUsed, viNum } from '../../lib/exam.js'
import Loading from '../../components/Loading.jsx'
import ErrorBox from '../../components/ErrorBox.jsx'
import Icon from '../../components/Icon.jsx'
import { EditStudent } from './TutorStudents.jsx'

const FILTERS = [
  { key: 'all', label: 'Tất cả' },
  { key: 'pending', label: 'Chưa nộp' },
  { key: 'done', label: 'Chờ chấm' },
  { key: 'checked', label: 'Đã chấm' },
]
const matchFilter = (r, f) => f === 'all' || (f === 'pending' ? r.state === 'todo' || r.state === 'overdue' : r.state === f)

// Trang một học sinh: tổng quan, điểm từng bài, bài giảng đã giao
export default function StudentDetail() {
  const { id } = useParams()
  const [tab, setTab] = useState('assignments')
  const [filter, setFilter] = useState('all')
  const [editing, setEditing] = useState(false)

  const { data, loading, error, reload } = useAsync(async () => {
    const [report, chapters] = await Promise.all([fetchStudentReport(id), fetchChapters()])
    return { ...report, chapterById: new Map(chapters.map((c) => [c.id, c])) }
  }, [id])

  if (loading && !data) return <Loading />
  if (error)
    return (
      <div>
        <ErrorBox message={error} onRetry={reload} />
        <Link to="/tutor">← Về danh sách học sinh</Link>
      </div>
    )

  const { student: s, assignments, lessons, summary: sum, chapterById } = data
  const chapterName = (cid) => chapterById.get(cid)?.title || ''
  const rows = assignments.filter((r) => matchFilter(r, filter))
  const countOf = (f) => assignments.filter((r) => matchFilter(r, f)).length

  return (
    <div>
      <Link to="/tutor" className="small">
        ← Học sinh
      </Link>
      <div className="card student-head" style={{ marginTop: '0.5rem' }}>
        <div className="student-avatar" aria-hidden="true">
          {(s.full_name || '?').trim().charAt(0).toUpperCase()}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 style={{ margin: 0 }}>{s.full_name || '(chưa đặt tên)'}</h1>
          <div className="row" style={{ marginTop: '0.35rem' }}>
            <span className="badge">{s.group_name ? `Nhóm ${s.group_name}` : 'Chưa có nhóm'}</span>
            <span className="badge">{s.grade ? `Lớp ${s.grade}` : 'Chưa rõ lớp'}</span>
            {s.subjects?.length > 0 && <span className="badge">{s.subjects.join(', ')}</span>}
          </div>
        </div>
        <button type="button" className="btn btn-small" onClick={() => setEditing((v) => !v)}>
          <Icon name="edit" />
          Sửa
        </button>
      </div>

      {editing && (
        <EditStudent
          student={s}
          onCancel={() => setEditing(false)}
          onSaved={() => {
            setEditing(false)
            reload()
          }}
        />
      )}

      <div className="stat-grid">
        <Stat label="Điểm trung bình" value={sum.avg === null ? '—' : viNum(sum.avg)} note={sum.checked ? `${sum.checked} bài đã chấm` : 'Chưa có bài chấm'} tone="primary" />
        <Stat label="Đã nộp" value={`${sum.submitted}/${sum.total}`} note={sum.submitRate === null ? 'Chưa giao bài' : `${sum.submitRate}% bài được giao`} />
        <Stat label="Chờ chấm" value={sum.done} note={sum.done ? 'Cần bạn chấm' : 'Không có'} tone={sum.done ? 'primary' : ''} />
        <Stat
          label="Chưa nộp"
          value={sum.todo + sum.overdue}
          note={sum.overdue ? `${sum.overdue} bài quá hạn` : 'Không có bài quá hạn'}
          tone={sum.overdue ? 'danger' : ''}
        />
        <Stat label="Bài giảng" value={sum.lessons} note="đã giao" />
      </div>

      <ScoreTrend rows={assignments} />

      <div className="tabs" style={{ margin: '0.5rem 0 1rem' }}>
        <button type="button" className={tab === 'assignments' ? 'tab active' : 'tab'} onClick={() => setTab('assignments')}>
          <Icon name="assignment" /> Bài tập ({assignments.length})
        </button>
        <button type="button" className={tab === 'lessons' ? 'tab active' : 'tab'} onClick={() => setTab('lessons')}>
          <Icon name="lesson" /> Bài giảng ({lessons.length})
        </button>
      </div>

      {tab === 'assignments' && (
        <>
          <div className="chips" style={{ marginBottom: '0.8rem' }}>
            {FILTERS.map((f) => (
              <button key={f.key} type="button" className={filter === f.key ? 'chip active' : 'chip'} onClick={() => setFilter(f.key)}>
                {f.label} ({countOf(f.key)})
              </button>
            ))}
          </div>
          {assignments.length === 0 && <div className="empty">Chưa giao bài tập nào cho học sinh này.</div>}
          {assignments.length > 0 && rows.length === 0 && <div className="empty">Không có bài nào ở mục này.</div>}
          {rows.length > 0 && (
            <div className="card table-wrap">
              <table className="table table-cards">
                <thead>
                  <tr>
                    <th>Bài tập</th>
                    <th>Giao ngày</th>
                    <th>Hạn</th>
                    <th>Trạng thái</th>
                    <th>Máy chấm</th>
                    <th>Điểm</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <AssignmentRow key={r.assignment.id} r={r} chapter={chapterName(r.assignment.chapter_id)} />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {tab === 'lessons' &&
        (lessons.length === 0 ? (
          <div className="empty">Chưa giao bài giảng nào cho học sinh này.</div>
        ) : (
          <div className="list">
            {lessons.map(({ lesson: l, assigned_at }) => (
              <Link key={l.id} to={`/tutor/lessons/${l.id}`} className="list-item">
                <div className="list-item-title">{l.title}</div>
                <div className="row small muted">
                  {chapterName(l.chapter_id) && <span>{chapterName(l.chapter_id)}</span>}
                  <span>Giao {formatDateTime(assigned_at || l.created_at)}</span>
                </div>
              </Link>
            ))}
          </div>
        ))}
    </div>
  )
}

function Stat({ label, value, note, tone = '' }) {
  return (
    <div className={`card stat ${tone ? `stat-${tone}` : ''}`}>
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
      {note && <div className="stat-note">{note}</div>}
    </div>
  )
}

function AssignmentRow({ r, chapter }) {
  const a = r.assignment
  const used = a.time_limit_minutes ? minutesUsed(r.started_at, r.submitted_at) : null
  return (
    <tr>
      <td>
        <Link to={`/tutor/assignments/${a.id}`} className="student-link">
          <strong>{a.title}</strong>
        </Link>
        <div className="small muted" style={{ marginTop: '0.25rem' }}>
          {a.is_exam && (
            <span className="badge badge-new" style={{ marginRight: '0.35rem' }}>
              Đề thi
            </span>
          )}
          {[TYPE_LABEL[a.type], chapter, `${r.count} câu`].filter(Boolean).join(' · ')}
        </div>
      </td>
      <td data-label="Giao ngày" className="small">
        {formatDate(r.assigned_at || a.created_at)}
      </td>
      <td data-label="Hạn" className="small">
        {a.due_date ? formatDate(a.due_date) : '—'}
      </td>
      <td data-label="Trạng thái">
        <span className={`badge badge-${STATE_TONE[r.state]}`}>{STATE_LABEL[r.state]}</span>
        {r.submitted_at && <div className="small muted">Nộp {formatDateTime(r.submitted_at)}</div>}
        {used !== null && (
          <div className="small muted">
            Làm {used}/{a.time_limit_minutes} phút
          </div>
        )}
      </td>
      <td data-label="Máy chấm">
        {!r.machine ? (
          <span className="muted">—</span>
        ) : r.machine.kind === 'exam' ? (
          <span>{viNum(r.machine.score10)}/10</span>
        ) : (
          <span>
            {r.machine.correct}/{r.machine.total} câu đúng
          </span>
        )}
      </td>
      <td data-label="Điểm">
        {r.state === 'checked' && r.score !== null ? <span className="score">{viNum(r.score)}</span> : <span className="muted">—</span>}
        {r.feedback && <div className="small muted feedback-clip" title={r.feedback}>“{r.feedback}”</div>}
      </td>
    </tr>
  )
}

// Điểm các bài đã chấm theo thời gian (cũ → mới), tối đa 12 bài gần nhất
function ScoreTrend({ rows }) {
  const pts = rows
    .filter((r) => r.state === 'checked' && r.score !== null)
    .sort((x, y) => String(x.submitted_at || '').localeCompare(String(y.submitted_at || '')))
    .slice(-12)
  if (pts.length < 2) return null
  const top = Math.max(10, ...pts.map((r) => r.score))
  return (
    <div className="card">
      <div className="row row-between">
        <h2 style={{ margin: 0 }}>Điểm các bài gần đây</h2>
        <span className="muted small">{pts.length} bài đã chấm, cũ → mới</span>
      </div>
      <div className="score-bars">
        {pts.map((r) => (
          <Link
            key={r.assignment.id}
            to={`/tutor/assignments/${r.assignment.id}`}
            className={`score-bar ${r.score >= 8 ? 'good' : r.score >= 5 ? 'mid' : 'low'}`}
            title={`${r.assignment.title}: ${viNum(r.score)} điểm`}
          >
            <span className="score-bar-num">{viNum(r.score)}</span>
            <span className="score-bar-fill" style={{ height: `${Math.max(4, (r.score / top) * 100)}%` }} />
          </Link>
        ))}
      </div>
    </div>
  )
}
