import { useDeferredValue, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase, unwrap } from '../../lib/supabase.js'
import { useAsync } from '../../lib/useAsync.js'
import { formatDateTime, formatScore, matchTitle } from '../../lib/format.js'
import { fetchStudentChapters } from '../../lib/chapters.js'
import { loadRetries, retryScore } from '../../lib/retries.js'
import { useAuth } from '../../contexts/AuthContext.jsx'
import Loading from '../../components/Loading.jsx'
import ErrorBox from '../../components/ErrorBox.jsx'
import { StatusBadge, TypeBadge } from '../../components/Badges.jsx'
import FilterTree, { matchItem, selectionLabel, useTreeSelection } from '../../components/FilterTree.jsx'
import Icon from '../../components/Icon.jsx'
import CustomSelect from '../../components/CustomSelect.jsx'
import ScoreChart from '../../components/ScoreChart.jsx'
import { toPoints } from '../../lib/scoreChart.js'
import ResultsTrendPanel from '../../components/ResultsTrendPanel.jsx'

// Bài đã nộp: điểm và nhận xét (nếu gia sư đã chấm); cây bên trái lọc theo chủ đề.
// Điểm TB chỉ tính điểm chính thức (lần nộp đầu); điểm các lần tự làm lại hiện nhỏ, nhạt bên dưới.
export default function StudentResults() {
  const { profile } = useAuth()
  const sel = useTreeSelection()
  const [query, setQuery] = useState('')
  const deferredQuery = useDeferredValue(query)
  const [filterScore, setFilterScore] = useState('all') // 'all' | 'high' | 'medium' | 'low' | 'pending'
  const [sortBy, setSortBy] = useState('recent') // 'recent' | 'score_desc' | 'score_asc'

  const { data, loading, error, reload } = useAsync(async () => {
    const [rows, chapters, retries] = await Promise.all([
      supabase
        .from('assignment_recipients')
        .select(
          'status, submitted_at, score, feedback, assignment:assignments(id, title, type, due_date, is_exam, chapter_id, chapter:chapters(title))',
        )
        .eq('student_id', profile.id)
        .in('status', ['done', 'checked'])
        .order('submitted_at', { ascending: false })
        .then(unwrap),
      fetchStudentChapters(profile.grade ?? null),
      loadRetries({ student_id: profile.id }),
    ])
    const retriesOf = {}
    for (const r of retries) (retriesOf[r.assignment_id] ??= []).push(r)
    // Không có điểm máy: xu hướng điểm của học sinh chỉ tính bài gia sư đã lưu chấm
    return {
      list: rows
        .filter((r) => r.assignment)
        .map((r) => ({
          ...r,
          chapter_id: r.assignment.chapter_id,
          retries: retriesOf[r.assignment.id] || [],
        })),
      chapters,
    }
  }, [profile.id, profile.grade])

  const chapters = data?.chapters || []
  const chapterById = new Map(chapters.map((c) => [c.id, c]))
  const baseRows = (data?.list || []).filter((r) => matchItem(r, chapterById, sel))
  const where = selectionLabel(sel, chapterById, 'Bài khác')

  // Lọc và sắp xếp
  const rows = useMemo(() => {
    let list = baseRows

    // Tìm kiếm tên bài tập hoặc chương (dùng deferredQuery)
    const q = deferredQuery.trim()
    if (q) {
      list = list.filter(
        (r) =>
          matchTitle(r.assignment.title, q) ||
          (r.assignment.chapter && matchTitle(r.assignment.chapter.title, q))
      )
    }

    // Lọc theo phổ điểm / trạng thái
    if (filterScore === 'high') {
      list = list.filter((r) => r.status === 'checked' && r.score !== null && Number(r.score) >= 8)
    } else if (filterScore === 'medium') {
      list = list.filter((r) => r.status === 'checked' && r.score !== null && Number(r.score) >= 5 && Number(r.score) < 8)
    } else if (filterScore === 'low') {
      list = list.filter((r) => r.status === 'checked' && r.score !== null && Number(r.score) < 5)
    } else if (filterScore === 'pending') {
      list = list.filter((r) => r.status === 'done' || r.score === null)
    }

    // Sắp xếp
    return [...list].sort((a, b) => {
      if (sortBy === 'score_desc') {
        const scA = a.score !== null ? Number(a.score) : -1
        const scB = b.score !== null ? Number(b.score) : -1
        return scB - scA
      }
      if (sortBy === 'score_asc') {
        const scA = a.score !== null ? Number(a.score) : 999
        const scB = b.score !== null ? Number(b.score) : 999
        return scA - scB
      }
      // mặc định recent
      return (b.submitted_at || '').localeCompare(a.submitted_at || '')
    })
  }, [baseRows, query, filterScore, sortBy])

  // Điểm trung bình các bài đã chấm trong mục đang xem
  const scored = rows.filter((r) => r.status === 'checked' && r.score !== null)
  const avg = scored.length ? scored.reduce((n, r) => n + Number(r.score), 0) / scored.length : null

  const points = toPoints(rows, { linkOf: (aid) => `/student/assignments/${aid}`, chapterOf: (r) => r.assignment.chapter?.title })
  const isFiltering = query.trim().length > 0 || filterScore !== 'all' || sortBy !== 'recent'

  return (
    <div className="library">
      {/* Cột phải: xu hướng + 3 bài gần đây, theo đúng mục đang chọn trên cây */}
      {data && <ResultsTrendPanel points={points} recent={rows.slice(0, 3)} />}
      <FilterTree title="Kết quả" icon="results" chapters={chapters} items={data?.list || []} hideEmpty noneLabel="Bài khác" storageKey="results-tree-open" />
      <section className="library-main library-panel">
        <div className="page-head">
          <div>
            <h1>
              <span className="title-icon"><Icon name="results" /></span>Kết quả
            </h1>
            {where && <p className="muted small page-sub">{where}</p>}
          </div>
          {avg !== null && (
            <div className="avg-score" title={`Trung bình ${scored.length} bài đã chấm`}>
              <span className="muted small">Điểm TB</span>
              <span className="score">{formatScore(Math.round(avg * 100) / 100)}</span>
            </div>
          )}
        </div>

        {/* Thanh tìm kiếm & bộ lọc kết quả */}
        {data && baseRows.length > 1 && (
          <div style={{ marginBottom: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <div className="row" style={{ gap: '0.5rem', flexWrap: 'wrap' }}>
              <div style={{ position: 'relative', flex: '1 1 200px', minWidth: '180px' }}>
                <input
                  type="search"
                  className="assign-search"
                  style={{ width: '100%', paddingLeft: '2.1rem' }}
                  placeholder="Tìm theo tên bài tập..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  aria-label="Tìm bài đã nộp"
                />
                <span style={{ position: 'absolute', left: '0.7rem', top: '50%', transform: 'translateY(-50%)', opacity: 0.5, pointerEvents: 'none' }}>
                  <Icon name="search" size={15} />
                </span>
              </div>

              <CustomSelect
                value={sortBy}
                onChange={setSortBy}
                options={[
                  { value: 'recent', label: 'Mới nộp nhất', icon: 'clock' },
                  { value: 'score_desc', label: 'Điểm cao ➔ thấp', icon: 'trend' },
                  { value: 'score_asc', label: 'Điểm thấp ➔ cao', icon: 'trend' },
                ]}
                prefixLabel="Sắp xếp: "
                icon="clock"
                ariaLabel="Sắp xếp kết quả"
              />
            </div>

            <div className="chips" style={{ margin: 0, flexWrap: 'wrap', gap: '0.35rem' }}>
              <button
                type="button"
                className={`chip${filterScore === 'all' ? ' active' : ''}`}
                onClick={() => setFilterScore('all')}
              >
                Tất cả ({baseRows.length})
              </button>
              <button
                type="button"
                className={`chip${filterScore === 'high' ? ' active' : ''}`}
                onClick={() => setFilterScore('high')}
              >
                🌟 Giỏi (≥ 8.0)
              </button>
              <button
                type="button"
                className={`chip${filterScore === 'medium' ? ' active' : ''}`}
                onClick={() => setFilterScore('medium')}
              >
                👍 Đạt (5.0 - 7.9)
              </button>
              <button
                type="button"
                className={`chip${filterScore === 'low' ? ' active' : ''}`}
                onClick={() => setFilterScore('low')}
              >
                ⚠️ Cần ôn lại (&lt; 5.0)
              </button>
              <button
                type="button"
                className={`chip${filterScore === 'pending' ? ' active' : ''}`}
                onClick={() => setFilterScore('pending')}
              >
                ⏳ Chờ chấm
              </button>
              {isFiltering && (
                <button
                  type="button"
                  className="btn btn-ghost btn-small"
                  onClick={() => {
                    setQuery('')
                    setFilterScore('all')
                    setSortBy('recent')
                  }}
                  style={{ padding: '0.1rem 0.4rem' }}
                >
                  <Icon name="close" size={13} /> Xóa lọc
                </button>
              )}
            </div>
          </div>
        )}

        {loading && <Loading />}
        <ErrorBox message={error} onRetry={reload} />

        {!loading && !error && rows.length === 0 && (
          <div className="empty">
            {isFiltering
              ? 'Không tìm thấy bài nộp nào phù hợp với bộ lọc.'
              : where
                ? 'Mục này chưa có bài đã nộp.'
                : 'Bạn chưa nộp bài nào.'}
          </div>
        )}

        {!loading && !error && !isFiltering && (
          <ScoreChart points={points} quiet={!!where} />
        )}

        {!loading && !error && rows.length > 0 && (
          <div className="list">
            {rows.map((r) => (
              <Link key={r.assignment.id} to={`/student/assignments/${r.assignment.id}`} className="list-item">
                <div className="row row-between">
                  <div className="list-item-title">{r.assignment.title}</div>
                  {r.status === 'checked' && <span className="score">{formatScore(r.score)}</span>}
                </div>
                <div className="row">
                  {r.assignment.chapter && <span className="badge badge-primary">{r.assignment.chapter.title}</span>}
                  <TypeBadge type={r.assignment.type} />
                  <StatusBadge status={r.status} />
                  <span className="muted small">Nộp: {formatDateTime(r.submitted_at)}</span>
                </div>
                {r.status === 'checked' && r.feedback && (
                  <p className="small" style={{ margin: '0.5rem 0 0', whiteSpace: 'pre-wrap' }}>
                    💬 {r.feedback.length > 160 ? r.feedback.slice(0, 160) + '…' : r.feedback}
                  </p>
                )}
                {r.retries.length > 0 && (
                  <p className="retry-line">↻ Làm lại: {r.retries.map((t) => `lần ${t.attempt_no} ${retryScore(t, false)}`).join(' · ')}</p>
                )}
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
