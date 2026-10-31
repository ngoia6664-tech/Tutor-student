// @ts-nocheck — nợ kiểu: xóa dòng này rồi chạy npm run typecheck để sửa
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase, unwrap } from '../../lib/supabase.js'
import { useAsync } from '../../lib/useAsync.js'
import { buildTree, fetchChapters, gradeLabel, sectionLabel, subjectLabel } from '../../lib/chapters.js'
import { formatDateTime } from '../../lib/format.js'
import { questionLabels } from '../../lib/exam.js'
import { errMsg } from '../../lib/errors.js'
import { REPORTS_CHANGED } from '../../lib/reports.js'
import Loading from '../../components/Loading.jsx'
import ErrorBox from '../../components/ErrorBox.jsx'
import Markdown from '../../components/Markdown.jsx'
import Icon from '../../components/Icon.jsx'
import ExerciseBody, { KIND_LABEL } from '../../components/ExerciseBody.jsx'

const RESOLVED_LABEL = { fixed: 'Đã sửa', dismissed: 'Không lỗi' }
const RESOLVED_BADGE = { fixed: 'badge-ok', dismissed: 'badge-muted' }

async function fetchReports() {
  const [reports, chapters] = await Promise.all([
    supabase
      .from('question_reports')
      .select(
        'id, exercise_id, note, status, created_at, resolved_at, student:profiles(id, full_name), ' +
          'exercise:exercises(id, sort_order, kind, question_md, options, assignment_id, answer_keys(answer_md, method_md, correct), ' +
          'assignment:assignments(id, title, chapter_id, is_exam))'
      )
      .order('created_at', { ascending: false })
      .then(unwrap),
    fetchChapters(),
  ])
  // Số thứ tự câu trong bài (đề thi đánh số theo phần: I.3, II.1…)
  const assignmentIds = [...new Set(reports.map((r) => r.exercise?.assignment_id).filter(Boolean))]
  const all = assignmentIds.length
    ? unwrap(await supabase.from('exercises').select('id, sort_order, kind, assignment_id').in('assignment_id', assignmentIds).order('sort_order'))
    : []
  const labels = {}
  for (const aid of assignmentIds) {
    const exs = all.filter((e) => e.assignment_id === aid).map((e) => ({ ...e, kind: e.kind || 'essay' }))
    const isExam = reports.find((r) => r.exercise?.assignment_id === aid)?.exercise.assignment?.is_exam
    Object.assign(labels, questionLabels(exs, !!isExam))
  }
  return { reports: reports.filter((r) => r.exercise), chapters, labels }
}

// Gom báo lỗi: câu → bài tập → chương, rồi dựng cây Lớp › Môn › Chuyên đề › Chương
function groupReports(reports, chapters, labels) {
  const byEx = new Map()
  for (const r of reports) {
    if (!byEx.has(r.exercise_id)) byEx.set(r.exercise_id, { ex: r.exercise, label: labels[r.exercise_id] || String(r.exercise.sort_order), reports: [] })
    byEx.get(r.exercise_id).reports.push(r)
  }
  const byAssignment = new Map()
  for (const q of byEx.values()) {
    const a = q.ex.assignment
    if (!byAssignment.has(a.id)) byAssignment.set(a.id, { assignment: a, questions: [] })
    byAssignment.get(a.id).questions.push(q)
  }
  for (const g of byAssignment.values()) g.questions.sort((x, y) => x.ex.sort_order - y.ex.sort_order)

  const chapterIds = new Set(chapters.map((c) => c.id))
  const used = chapters.filter((c) => [...byAssignment.values()].some((g) => g.assignment.chapter_id === c.id))
  const assignmentsOf = (cid) => [...byAssignment.values()].filter((g) => g.assignment.chapter_id === cid)
  const loose = [...byAssignment.values()].filter((g) => !chapterIds.has(g.assignment.chapter_id))
  return { tree: buildTree(used), assignmentsOf, loose }
}

const countIn = (groups) => groups.reduce((s, g) => s + g.questions.length, 0)

export default function TutorReports() {
  const [tab, setTab] = useState('open')
  const { data, loading, error, reload } = useAsync(fetchReports, [])

  if (loading && !data) return <Loading />
  if (error) return <ErrorBox message={missingTable(error) ? 'Chưa có bảng báo lỗi đề. Hãy chạy lại file supabase/schema.sql trong SQL Editor của Supabase.' : error} onRetry={reload} />

  const isOpen = (r) => r.status === 'open'
  const openReports = data.reports.filter(isOpen)
  const doneReports = data.reports.filter((r) => !isOpen(r))
  const shown = tab === 'open' ? openReports : doneReports
  const { tree, assignmentsOf, loose } = groupReports(shown, data.chapters, data.labels)
  const qCount = (list) => new Set(list.map((r) => r.exercise_id)).size

  const changed = () => {
    window.dispatchEvent(new Event(REPORTS_CHANGED))
    reload()
  }

  return (
    <div>
      <div className="page-head">
        <h1>
          <span className="title-icon">
            <Icon name="flag" />
          </span>
          Báo lỗi đề
        </h1>
      </div>
      <p className="muted small" style={{ marginTop: 0 }}>
        Các câu học sinh báo lỗi, xếp theo Lớp › Môn › Chuyên đề › Chương › Bài tập. Sửa câu rồi bấm "Đã sửa xong", hoặc bấm "Câu không lỗi" nếu đề đúng.
      </p>

      <div className="tabs" style={{ margin: '0.5rem 0 1rem' }}>
        <button type="button" className={tab === 'open' ? 'tab active' : 'tab'} onClick={() => setTab('open')}>
          <Icon name="flag" /> Chờ xem ({qCount(openReports)})
        </button>
        <button type="button" className={tab === 'done' ? 'tab active' : 'tab'} onClick={() => setTab('done')}>
          <Icon name="check" /> Đã xử lý ({qCount(doneReports)})
        </button>
      </div>

      {shown.length === 0 && <div className="empty">{tab === 'open' ? '🎉 Không có câu nào đang bị báo lỗi.' : 'Chưa xử lý báo lỗi nào.'}</div>}

      <div className="rp-tree">
        {tree.map((g) => {
          const gAs = g.subjects.flatMap((s) => s.sections.flatMap((x) => x.chapters.flatMap((c) => assignmentsOf(c.id))))
          return (
            <Branch key={g.key} icon="grade" label={gradeLabel(g.grade)} count={countIn(gAs)} level={0}>
              {g.subjects.map((s) => {
                const sAs = s.sections.flatMap((x) => x.chapters.flatMap((c) => assignmentsOf(c.id)))
                return (
                  <Branch key={s.key} icon="book" label={subjectLabel(s.subject)} count={countIn(sAs)} level={1}>
                    {s.sections.map((x) => {
                      const xAs = x.chapters.flatMap((c) => assignmentsOf(c.id))
                      return (
                        <Branch key={x.key} icon="folder" label={sectionLabel(x.section)} count={countIn(xAs)} level={2}>
                          {x.chapters.map((c) => (
                            <Branch key={c.id} icon="file" label={c.title} count={countIn(assignmentsOf(c.id))} level={3}>
                              {assignmentsOf(c.id).map((ag) => (
                                <AssignmentGroup key={ag.assignment.id} group={ag} tab={tab} onChanged={changed} />
                              ))}
                            </Branch>
                          ))}
                        </Branch>
                      )
                    })}
                  </Branch>
                )
              })}
            </Branch>
          )
        })}
        {loose.length > 0 && (
          <Branch icon="inbox" label="Bài tập chưa xếp chương" count={countIn(loose)} level={0}>
            {loose.map((ag) => (
              <AssignmentGroup key={ag.assignment.id} group={ag} tab={tab} onChanged={changed} />
            ))}
          </Branch>
        )}
      </div>
    </div>
  )
}

const missingTable = (msg) => /question_reports/.test(String(msg)) && /(does not exist|schema cache|not find)/i.test(String(msg))

function Branch({ icon, label, count, level, children }) {
  return (
    <details className={`rp-branch rp-l${level}`} open>
      <summary>
        <span className="rp-caret" aria-hidden="true">
          ›
        </span>
        <Icon name={icon} size={16} />
        <span className="rp-label">{label}</span>
        <span className="tp-count" title="Số câu bị báo lỗi">
          {count}
        </span>
      </summary>
      <div className="rp-children">{children}</div>
    </details>
  )
}

function AssignmentGroup({ group, tab, onChanged }) {
  const a = group.assignment
  return (
    <div className="rp-assignment">
      <div className="rp-assignment-head">
        <Icon name="assignment" size={16} />
        <Link to={`/tutor/assignments/${a.id}`} className="rp-assignment-title">
          {a.title}
        </Link>
        {a.is_exam && <span className="badge badge-new">Đề thi</span>}
      </div>
      {group.questions.map((q) => (
        <QuestionReport key={q.ex.id} q={q} assignmentId={a.id} tab={tab} onChanged={onChanged} />
      ))}
    </div>
  )
}

function QuestionReport({ q, assignmentId, tab, onChanged }) {
  const navigate = useNavigate()
  const [busy, setBusy] = useState(null)
  const [error, setError] = useState(null)
  const ex = { ...q.ex, kind: q.ex.kind || 'essay' }
  const key = Array.isArray(ex.answer_keys) ? ex.answer_keys[0] : ex.answer_keys

  async function resolve(status) {
    setBusy(status)
    setError(null)
    try {
      unwrap(
        await supabase
          .from('question_reports')
          .update({ status, resolved_at: new Date().toISOString() })
          .eq('exercise_id', ex.id)
          .eq('status', 'open')
      )
      onChanged()
    } catch (err) {
      setError(errMsg(err))
      setBusy(null)
    }
  }

  return (
    <div className="card rp-question" id={`rp-${ex.id}`}>
      <div className="question-label">
        Câu {q.label}
        <span className="badge">{KIND_LABEL[ex.kind]}</span>
        <span className="badge badge-warn">
          {q.reports.length} báo lỗi
        </span>
      </div>
      <ExerciseBody ex={ex} mode="preview" name={`rp-${ex.id}`} correct={key?.correct ?? null} />
      {(key?.answer_md || key?.method_md) && (
        <details className="rp-key">
          <summary>Xem đáp án / lời giải</summary>
          {key.answer_md && (
            <div className="answer-box">
              <div className="box-label">Đáp án</div>
              <Markdown>{key.answer_md}</Markdown>
            </div>
          )}
          {key.method_md && (
            <div className="method-box">
              <div className="box-label">Phương pháp giải</div>
              <Markdown>{key.method_md}</Markdown>
            </div>
          )}
        </details>
      )}

      <ul className="rp-notes">
        {q.reports.map((r) => (
          <li key={r.id}>
            <div className="rp-note-head">
              <Link to={`/tutor/students/${r.student?.id}`}>{r.student?.full_name || 'Học sinh'}</Link>
              <span className="muted small">{formatDateTime(r.created_at)}</span>
              {r.status !== 'open' && (
                <span className={`badge ${RESOLVED_BADGE[r.status]}`}>
                  {RESOLVED_LABEL[r.status]}
                  {r.resolved_at ? ` · ${formatDateTime(r.resolved_at)}` : ''}
                </span>
              )}
            </div>
            <p className="rp-note">{r.note}</p>
          </li>
        ))}
      </ul>

      {error && <p className="qr-error small">{error}</p>}
      <div className="row">
        <button
          type="button"
          className="btn btn-small"
          onClick={() => navigate(`/tutor/assignments/${assignmentId}/edit`, { state: { focusExercise: ex.id, returnTo: '/tutor/reports' } })}
        >
          <Icon name="edit" size={15} />
          Sửa câu
        </button>
        {tab === 'open' && (
          <>
            <button type="button" className="btn btn-small btn-primary" onClick={() => resolve('fixed')} disabled={!!busy}>
              <Icon name="check" size={15} />
              {busy === 'fixed' ? 'Đang lưu…' : 'Đã sửa xong'}
            </button>
            <button type="button" className="btn btn-small btn-ghost" onClick={() => resolve('dismissed')} disabled={!!busy}>
              {busy === 'dismissed' ? 'Đang lưu…' : 'Câu không lỗi'}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
