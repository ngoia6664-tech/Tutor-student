// @ts-nocheck — nợ kiểu: xóa dòng này rồi chạy npm run typecheck để sửa
import { Link } from 'react-router-dom'
import { supabase, unwrap } from '../../lib/supabase.js'
import { useAsync } from '../../lib/useAsync.js'
import { formatDateTime, formatScore } from '../../lib/format.js'
import { fetchStudentChapters } from '../../lib/chapters.js'
import { loadRetries, retryScore } from '../../lib/retries.js'
import { useAuth } from '../../contexts/AuthContext.jsx'
import Loading from '../../components/Loading.jsx'
import ErrorBox from '../../components/ErrorBox.jsx'
import { StatusBadge, TypeBadge } from '../../components/Badges.jsx'
import FilterTree, { matchItem, selectionLabel, useTreeSelection } from '../../components/FilterTree.jsx'
import Icon from '../../components/Icon.jsx'
import ScoreChart from '../../components/ScoreChart.jsx'
import { machineSummary } from '../../lib/studentReport.js'
import { toPoints } from '../../lib/scoreChart.js'

// Bài đã nộp: điểm và nhận xét (nếu gia sư đã chấm); cây bên trái lọc theo chương.
// Điểm TB chỉ tính điểm chính thức (lần nộp đầu); điểm các lần tự làm lại hiện nhỏ, nhạt bên dưới.
export default function StudentResults() {
  const { profile } = useAuth()
  const sel = useTreeSelection()

  const { data, loading, error, reload } = useAsync(async () => {
    const [rows, chapters, retries, answers] = await Promise.all([
      supabase
        .from('assignment_recipients')
        .select(
          'status, submitted_at, score, feedback, assignment:assignments(id, title, type, due_date, is_exam, chapter_id, chapter:chapters(title), exercises(id, kind))',
        )
        .eq('student_id', profile.id)
        .in('status', ['done', 'checked'])
        .order('submitted_at', { ascending: false })
        .then(unwrap),
      fetchStudentChapters(profile.grade ?? null),
      loadRetries({ student_id: profile.id }),
      // Điểm máy chấm từng câu: để biểu đồ có điểm cho bài chấm máy hoàn toàn khi gia sư chưa chấm
      supabase.from('submission_answers').select('exercise_id, is_correct, points').eq('student_id', profile.id).then(unwrap),
    ])
    const retriesOf = {}
    for (const r of retries) (retriesOf[r.assignment_id] ??= []).push(r)
    const ansByExercise = Object.fromEntries(answers.map((a) => [a.exercise_id, a]))
    return {
      list: rows
        .filter((r) => r.assignment)
        .map((r) => ({
          ...r,
          chapter_id: r.assignment.chapter_id,
          retries: retriesOf[r.assignment.id] || [],
          machine: machineSummary(r.assignment, r.assignment.exercises || [], ansByExercise),
        })),
      chapters,
    }
  }, [profile.id, profile.grade])

  const chapters = data?.chapters || []
  const chapterById = new Map(chapters.map((c) => [c.id, c]))
  const rows = (data?.list || []).filter((r) => matchItem(r, chapterById, sel))
  const where = selectionLabel(sel, chapterById, 'Bài khác')
  // Điểm trung bình các bài đã chấm trong mục đang xem
  const scored = rows.filter((r) => r.status === 'checked' && r.score !== null)
  const avg = scored.length ? scored.reduce((n, r) => n + Number(r.score), 0) / scored.length : null

  return (
    <div className="library">
      <FilterTree title="Kết quả" icon="results" chapters={chapters} items={data?.list || []} hideEmpty noneLabel="Bài khác" storageKey="results-tree-open" />
      <section className="library-main">
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

        {loading && <Loading />}
        <ErrorBox message={error} onRetry={reload} />

        {!loading && !error && rows.length === 0 && <div className="empty">{where ? 'Mục này chưa có bài đã nộp.' : 'Bạn chưa nộp bài nào.'}</div>}

        {!loading && !error && (
          <ScoreChart points={toPoints(rows, { linkOf: (aid) => `/student/assignments/${aid}`, chapterOf: (r) => r.assignment.chapter?.title })} quiet={!!where} />
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
                  <p className="retry-line">↻ Làm lại: {r.retries.map((t) => `lần ${t.attempt_no} ${retryScore(t, r.assignment.is_exam)}`).join(' · ')}</p>
                )}
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
