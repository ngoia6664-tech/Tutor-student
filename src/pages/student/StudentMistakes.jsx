import { useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase, unwrap } from '../../lib/supabase.js'
import { useAsync } from '../../lib/useAsync.js'
import { fetchStudentChapters } from '../../lib/chapters.js'
import { gradeLocal, readMastered, writeMastered } from '../../lib/practice.js'
import { useAuth } from '../../contexts/AuthContext.jsx'
import Loading from '../../components/Loading.jsx'
import ErrorBox from '../../components/ErrorBox.jsx'
import Markdown from '../../components/Markdown.jsx'
import ExerciseBody, { isAnswered, KIND_LABEL } from '../../components/ExerciseBody.jsx'
import FilterTree, { matchItem, selectionLabel, useTreeSelection } from '../../components/FilterTree.jsx'
import Icon from '../../components/Icon.jsx'

// Sổ câu sai: mọi câu máy chấm là sai trong các bài đã nộp. Học sinh làm lại, chấm ngay trên máy,
// không ảnh hưởng điểm. Câu ôn lại đúng được nhớ trên máy này và ẩn đi (bật "Hiện cả câu đã ôn đúng" để xem lại).
export default function StudentMistakes() {
  const { profile } = useAuth()
  const sel = useTreeSelection()
  const [mastered, setMastered] = useState(() => readMastered(profile.id))
  const [showMastered, setShowMastered] = useState(false)

  const { data, loading, error, reload } = useAsync(async () => {
    const [rows, chapters] = await Promise.all([
      supabase
        .from('submission_answers')
        .select('exercise_id, answer, exercise:exercises(id, sort_order, kind, question_md, options, assignment:assignments(id, title, chapter_id, chapter:chapters(title)))')
        .eq('student_id', profile.id)
        .eq('is_correct', false)
        .then(unwrap),
      fetchStudentChapters(profile.grade ?? null),
    ])
    const list = rows.filter((r) => r.exercise?.assignment)
    const ids = list.map((r) => r.exercise_id)
    const keys = ids.length
      ? await supabase.from('answer_keys').select('exercise_id, answer_md, method_md, correct').in('exercise_id', ids).then(unwrap)
      : []
    const keyById = Object.fromEntries(keys.map((k) => [k.exercise_id, k]))
    const items = list
      .map((r) => ({ ...r, ex: r.exercise, assignment: r.exercise.assignment, chapter_id: r.exercise.assignment.chapter_id, key: keyById[r.exercise_id] }))
      .sort((a, b) => a.assignment.title.localeCompare(b.assignment.title, 'vi') || a.ex.sort_order - b.ex.sort_order)
    return { items, chapters }
  }, [profile.id, profile.grade])

  function markMastered(id) {
    setMastered((prev) => {
      const next = new Set(prev).add(id)
      writeMastered(profile.id, next)
      return next
    })
  }

  const chapters = data?.chapters || []
  const chapterById = new Map(chapters.map((c) => [c.id, c]))
  const all = data?.items || []
  const inSel = all.filter((r) => matchItem(r, chapterById, sel))
  const rows = showMastered ? inSel : inSel.filter((r) => !mastered.has(r.exercise_id))
  const doneCount = inSel.length - inSel.filter((r) => !mastered.has(r.exercise_id)).length
  const where = selectionLabel(sel, chapterById, 'Bài khác')

  // Gom theo bài tập, giữ thứ tự đã sắp
  const groups = []
  rows.forEach((r) => {
    const last = groups.at(-1)
    if (last?.assignment.id === r.assignment.id) last.items.push(r)
    else groups.push({ assignment: r.assignment, items: [r] })
  })

  return (
    <div className="library">
      <FilterTree
        title="Ôn câu sai"
        icon="refresh"
        chapters={chapters}
        items={all}
        countIf={(r) => !mastered.has(r.exercise_id)}
        hideEmpty
        noneLabel="Bài khác"
        storageKey="mistakes-tree-open"
      />
      <section className="library-main">
        <div className="page-head">
          <div>
            <h1>
              <span className="title-icon"><Icon name="refresh" /></span>Ôn câu sai
            </h1>
            {where && <p className="muted small page-sub">{where}</p>}
          </div>
        </div>

        {loading && <Loading />}
        <ErrorBox message={error} onRetry={reload} />

        {!loading && !error && (
          <>
            <p className="muted small">
              Các câu bạn làm sai trong bài đã nộp. Làm lại để luyện, không tính điểm.
              {doneCount > 0 && (
                <>
                  {' '}Đã ôn đúng {doneCount}/{inSel.length} câu.{' '}
                  <label className="row" style={{ display: 'inline-flex', gap: '0.35rem' }}>
                    <input type="checkbox" checked={showMastered} onChange={(e) => setShowMastered(e.target.checked)} />
                    Hiện cả câu đã ôn đúng
                  </label>
                </>
              )}
            </p>

            {rows.length === 0 && (
              <div className="empty">
                {inSel.length === 0
                  ? where ? 'Mục này không có câu sai nào.' : 'Bạn chưa có câu sai nào. Tuyệt vời!'
                  : 'Bạn đã ôn đúng hết các câu sai ở mục này.'}
              </div>
            )}

            {groups.map((g) => (
              <div key={g.assignment.id} className="card">
                <div className="row row-between">
                  <h2 style={{ margin: 0 }}>{g.assignment.title}</h2>
                  <Link to={`/student/assignments/${g.assignment.id}`} className="btn btn-ghost btn-small">
                    <Icon name="open" /> Bài gốc
                  </Link>
                </div>
                {g.assignment.chapter && <span className="badge badge-primary">{g.assignment.chapter.title}</span>}
                {g.items.map((r) => (
                  <PracticeQuestion key={r.exercise_id} item={r} mastered={mastered.has(r.exercise_id)} onCorrect={() => markMastered(r.exercise_id)} />
                ))}
              </div>
            ))}
          </>
        )}
      </section>
    </div>
  )
}

function PracticeQuestion({ item, mastered, onCorrect }) {
  const { ex, key: k } = item
  const [value, setValue] = useState(null)
  const [result, setResult] = useState(undefined) // undefined: đang làm; true/false/null: đã kiểm tra
  const checked = result !== undefined

  function check() {
    const r = gradeLocal(ex.kind, k?.correct ?? null, value)
    setResult(r)
    if (r === true) onCorrect()
  }

  function retry() {
    setValue(null)
    setResult(undefined)
  }

  return (
    <div className="question">
      <div className="question-label">
        <span className="badge">{KIND_LABEL[ex.kind]}</span>
        {mastered && !checked && <span className="badge badge-ok">Đã ôn đúng</span>}
        {result === true && <span className="badge badge-ok">Đúng rồi!</span>}
        {result === false && <span className="badge badge-danger">Vẫn sai</span>}
      </div>

      <ExerciseBody
        ex={ex}
        mode={checked ? 'review' : 'answer'}
        name={`p-${ex.id}`}
        value={value}
        onChange={setValue}
        correct={checked ? k?.correct ?? null : null}
      />

      {checked && k?.method_md && (
        <div className="method-box">
          <div className="box-label">Phương pháp giải</div>
          <Markdown>{k.method_md}</Markdown>
        </div>
      )}
      {checked && !k && <p className="muted small">Gia sư chưa nhập đáp án cho câu này.</p>}

      <div className="row" style={{ marginTop: '0.5rem' }}>
        {checked ? (
          <button type="button" className="btn btn-small" onClick={retry}>
            <Icon name="undo" /> Làm lại
          </button>
        ) : (
          <button type="button" className="btn btn-primary btn-small" onClick={check} disabled={!isAnswered(ex, value)}>
            <Icon name="check" /> Kiểm tra
          </button>
        )}
      </div>
    </div>
  )
}
