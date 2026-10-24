import { useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase, unwrap } from '../../lib/supabase.js'
import { useAsync } from '../../lib/useAsync.js'
import { fetchStudentChapters } from '../../lib/chapters.js'
import { gradeLocal, readMastered, writeMastered } from '../../lib/practice.js'
import { celebrate, mascotSay } from '../../lib/celebrate.js'
import { useAuth } from '../../contexts/AuthContext.jsx'
import Loading from '../../components/Loading.jsx'
import ErrorBox from '../../components/ErrorBox.jsx'
import Markdown from '../../components/Markdown.jsx'
import ExerciseBody, { isAnswered, KIND_LABEL } from '../../components/ExerciseBody.jsx'
import FilterTree, { matchItem, selectionLabel, useTreeSelection } from '../../components/FilterTree.jsx'
import MarkHard from '../../components/MarkHard.jsx'
import Icon from '../../components/Icon.jsx'

const EXERCISE_FIELDS = 'id, sort_order, kind, question_md, options, assignment:assignments(id, title, chapter_id, chapter:chapters(title))'

// Ôn tập, 2 mục:
// - Câu sai: mọi câu máy chấm là sai trong các bài đã nộp. Câu ôn lại đúng được nhớ trên máy này và ẩn đi
//   (bật "Hiện cả câu đã ôn đúng" để xem lại).
// - Câu khó: câu học sinh tự đánh dấu khi làm / xem bài; làm lại bao nhiêu lần cũng được,
//   chỉ mất khỏi danh sách khi bấm "Bỏ đánh dấu".
// Chấm ngay trên máy, không ảnh hưởng điểm.
export default function StudentMistakes() {
  const { profile } = useAuth()
  const sel = useTreeSelection()
  const [tab, setTab] = useState('wrong') // 'wrong' | 'hard'
  const [mastered, setMastered] = useState(() => readMastered(profile.id))
  const [showMastered, setShowMastered] = useState(false)
  // Câu vừa bấm đánh dấu / bỏ đánh dấu trên trang này: { exercise_id: true | false }
  const [marked, setMarkedState] = useState({})

  const { data, loading, error, reload } = useAsync(async () => {
    const [rows, marks, recs, chapters] = await Promise.all([
      supabase
        .from('submission_answers')
        .select(`exercise_id, answer, exercise:exercises(${EXERCISE_FIELDS})`)
        .eq('student_id', profile.id)
        .eq('is_correct', false)
        .then(unwrap),
      // Bảng câu khó chưa có (chưa chạy lại schema.sql) thì coi như chưa đánh dấu câu nào
      supabase
        .from('question_marks')
        .select(`exercise_id, created_at, exercise:exercises(${EXERCISE_FIELDS})`)
        .eq('student_id', profile.id)
        .then(({ data, error }) => (error ? [] : data)),
      supabase.from('assignment_recipients').select('assignment_id, status').eq('student_id', profile.id).then(unwrap),
      fetchStudentChapters(profile.grade ?? null),
    ])
    const wrongList = rows.filter((r) => r.exercise?.assignment)
    const hardList = marks.filter((r) => r.exercise?.assignment)
    const ids = [...new Set([...wrongList, ...hardList].map((r) => r.exercise_id))]
    const keys = ids.length
      ? await supabase.from('answer_keys').select('exercise_id, answer_md, method_md, correct').in('exercise_id', ids).then(unwrap)
      : []
    const keyById = Object.fromEntries(keys.map((k) => [k.exercise_id, k]))
    const statusOf = Object.fromEntries(recs.map((r) => [r.assignment_id, r.status]))
    const toItem = (r) => ({
      exercise_id: r.exercise_id,
      ex: r.exercise,
      assignment: r.exercise.assignment,
      chapter_id: r.exercise.assignment.chapter_id,
      key: keyById[r.exercise_id],
      // Bài gốc chưa nộp: chưa có đáp án để kiểm tra (đáp án chỉ mở sau khi nộp)
      locked: statusOf[r.exercise.assignment.id] === 'todo',
    })
    const order = (a, b) => a.assignment.title.localeCompare(b.assignment.title, 'vi') || a.ex.sort_order - b.ex.sort_order
    return { wrong: wrongList.map(toItem).sort(order), hard: hardList.map(toItem).sort(order), chapters }
  }, [profile.id, profile.grade])

  function markMastered(id) {
    setMastered((prev) => {
      const next = new Set(prev).add(id)
      writeMastered(profile.id, next)
      return next
    })
  }

  function setMarked(id, on) {
    setMarkedState((prev) => ({ ...prev, [id]: on }))
  }

  const hardTab = tab === 'hard'
  const chapters = data?.chapters || []
  const chapterById = new Map(chapters.map((c) => [c.id, c]))
  const wrongAll = data?.wrong || []
  // Câu khó = câu đã đánh dấu lúc tải trang + câu sai vừa đánh dấu ở mục Câu sai, trừ câu vừa bỏ đánh dấu
  const hardIds = new Set((data?.hard || []).map((r) => r.exercise_id))
  const isMarked = (id) => marked[id] ?? hardIds.has(id)
  const hardAll = [...(data?.hard || []), ...wrongAll.filter((r) => !hardIds.has(r.exercise_id))]
    .filter((r) => isMarked(r.exercise_id))
    .sort((a, b) => a.assignment.title.localeCompare(b.assignment.title, 'vi') || a.ex.sort_order - b.ex.sort_order)
  const all = hardTab ? hardAll : wrongAll
  const inSel = all.filter((r) => matchItem(r, chapterById, sel))
  const rows = hardTab || showMastered ? inSel : inSel.filter((r) => !mastered.has(r.exercise_id))
  const doneCount = hardTab ? 0 : inSel.length - inSel.filter((r) => !mastered.has(r.exercise_id)).length
  const where = selectionLabel(sel, chapterById, 'Bài khác')

  // Gom theo bài tập, giữ thứ tự đã sắp
  const groups = []
  rows.forEach((r) => {
    const last = groups.at(-1)
    if (last?.assignment.id === r.assignment.id) last.items.push(r)
    else groups.push({ assignment: r.assignment, items: [r] })
  })

  const wrongLeft = wrongAll.filter((r) => !mastered.has(r.exercise_id)).length

  return (
    <div className="library">
      <FilterTree
        title="Ôn tập"
        icon="refresh"
        chapters={chapters}
        items={all}
        countIf={hardTab ? undefined : (r) => !mastered.has(r.exercise_id)}
        hideEmpty
        noneLabel="Bài khác"
        storageKey="mistakes-tree-open"
      />
      <section className="library-main">
        <div className="page-head">
          <div>
            <h1>
              <span className="title-icon"><Icon name="refresh" /></span>Ôn tập
            </h1>
            {where && <p className="muted small page-sub">{where}</p>}
          </div>
        </div>

        <div className="chips" role="tablist" style={{ marginBottom: '0.75rem' }}>
          <button type="button" role="tab" aria-selected={!hardTab} className={hardTab ? 'chip' : 'chip active'} onClick={() => setTab('wrong')}>
            Câu sai{data ? ` (${wrongLeft})` : ''}
          </button>
          <button type="button" role="tab" aria-selected={hardTab} className={hardTab ? 'chip active' : 'chip'} onClick={() => setTab('hard')}>
            ⭐ Câu khó{data ? ` (${hardAll.length})` : ''}
          </button>
        </div>

        {loading && <Loading />}
        <ErrorBox message={error} onRetry={reload} />

        {!loading && !error && (
          <>
            {hardTab ? (
              <p className="muted small">
                Các câu bạn đánh dấu "Câu khó" khi làm bài. Làm lại bao nhiêu lần cũng được, không tính điểm; bấm "Bỏ đánh dấu" khi đã chắc chắn.
              </p>
            ) : (
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
            )}

            {rows.length === 0 && (
              <div className="empty">
                {hardTab
                  ? where
                    ? 'Mục này chưa có câu khó nào.'
                    : 'Chưa có câu khó nào. Khi làm bài, bấm ☆ "Câu khó" ở câu muốn làm lại sau.'
                  : inSel.length === 0
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
                  <PracticeQuestion
                    key={`${tab}-${r.exercise_id}`}
                    item={r}
                    mastered={!hardTab && mastered.has(r.exercise_id)}
                    onCorrect={hardTab ? undefined : () => markMastered(r.exercise_id)}
                    mark={
                      <MarkHard
                        key={String(isMarked(r.exercise_id))}
                        exerciseId={r.exercise_id}
                        studentId={profile.id}
                        marked={isMarked(r.exercise_id)}
                        onChange={(on) => setMarked(r.exercise_id, on)}
                      />
                    }
                  />
                ))}
              </div>
            ))}
          </>
        )}
      </section>
    </div>
  )
}

const PRAISE = ['Chính xác! Lần này bạn làm đúng rồi 🎉', 'Tuyệt vời, sửa sai thành công!', 'Đúng rồi! Tiến bộ thấy rõ luôn 🚀']
const pick = (list) => list[Math.floor(Math.random() * list.length)]

// mark: nút "Câu khó" / "Bỏ đánh dấu"
function PracticeQuestion({ item, mastered, onCorrect, mark }) {
  const { ex, key: k, locked } = item
  const [value, setValue] = useState(null)
  const [result, setResult] = useState(undefined) // undefined: đang làm; true/false/null: đã kiểm tra
  const checked = result !== undefined

  function check() {
    const r = gradeLocal(ex.kind, k?.correct ?? null, value)
    setResult(r)
    if (r === true) {
      onCorrect?.()
      celebrate(pick(PRAISE))
    } else if (r === false) {
      mascotSay('Chưa đúng rồi, xem phương pháp giải rồi làm lại nhé 💪')
    }
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
        {mark}
      </div>

      <ExerciseBody
        ex={ex}
        mode={checked ? 'review' : 'answer'}
        name={`p-${ex.id}`}
        photoHint={false}
        value={value}
        onChange={setValue}
        correct={checked ? k?.correct ?? null : null}
      />

      {checked && ex.kind === 'essay' && k?.answer_md && (
        <div className="answer-box">
          <div className="box-label">Đáp án</div>
          <Markdown>{k.answer_md}</Markdown>
        </div>
      )}
      {checked && k?.method_md && (
        <div className="method-box">
          <div className="box-label">Phương pháp giải</div>
          <Markdown>{k.method_md}</Markdown>
        </div>
      )}
      {checked && !k && !locked && <p className="muted small">Gia sư chưa nhập đáp án cho câu này.</p>}
      {locked && <p className="muted small">Bài gốc chưa nộp nên chưa có đáp án. Nộp bài rồi quay lại đây để kiểm tra.</p>}

      <div className="row" style={{ marginTop: '0.5rem' }}>
        {checked ? (
          <button type="button" className="btn btn-small" onClick={retry}>
            <Icon name="undo" /> Làm lại
          </button>
        ) : (
          <button
            type="button"
            className="btn btn-primary btn-small"
            onClick={check}
            disabled={locked || !isAnswered(ex, value)}
          >
            <Icon name="check" /> {ex.kind === 'essay' ? 'Xem đáp án' : 'Kiểm tra'}
          </button>
        )}
      </div>
    </div>
  )
}
