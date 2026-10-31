// @ts-nocheck — nợ kiểu: xóa dòng này rồi chạy npm run typecheck để sửa
import { Fragment, useState } from 'react'
import Markdown from './Markdown.jsx'
import ExerciseBody, { KIND_LABEL } from './ExerciseBody.jsx'
import { PartHeading } from './ExamParts.jsx'
import { groupExercises, maxPoints, viNum } from '../lib/exam.js'

// Bảng đáp án cho gia sư. Hai cách xem:
//  - "Bảng đáp án": gọn để dò nhanh (lưới trắc nghiệm, bảng Đ/S, đáp số trả lời ngắn, đáp án tự luận)
//  - "Chi tiết từng câu": đề + đáp án + lời giải đầy đủ
export default function AnswerKey({ exercises, isExam }) {
  const [view, setView] = useState('table')
  const [openAll, setOpenAll] = useState(null) // null: mặc định theo loại câu; true/false: mở/thu hết lời giải
  const groups = groupExercises(exercises, isExam)
  const hasMethod = exercises.some((ex) => ex.method_md)

  return (
    <div className="card answer-key">
      <div className="row row-between" style={{ marginBottom: '0.75rem' }}>
        <h2 style={{ margin: 0 }}>Đáp án ({exercises.length} câu)</h2>
        <div className="chips" role="tablist">
          <button type="button" role="tab" aria-selected={view === 'table'} className={view === 'table' ? 'chip active' : 'chip'} onClick={() => setView('table')}>
            Bảng đáp án
          </button>
          <button type="button" role="tab" aria-selected={view === 'detail'} className={view === 'detail' ? 'chip active' : 'chip'} onClick={() => setView('detail')}>
            Chi tiết từng câu
          </button>
        </div>
      </div>

      {view === 'table' && <KeyTable groups={groups} isExam={isExam} />}

      {view === 'detail' && (
        <>
          {hasMethod && (
            <div className="row" style={{ marginBottom: '0.5rem' }}>
              <button type="button" className="btn btn-small btn-ghost" onClick={() => setOpenAll((v) => !(v ?? false))}>
                {openAll ? 'Thu gọn mọi lời giải' : 'Mở hết lời giải'}
              </button>
            </div>
          )}
          {groups.map((g) => (
            <Fragment key={g.part?.kind || 'all'}>
              {isExam && <PartHeading part={g.part} count={g.items.length} />}
              {g.items.map(({ ex, no }) => (
                <div key={ex.id} className="question">
                  <div className="question-label">
                    Câu {no} <span className="badge">{KIND_LABEL[ex.kind]}</span>
                    {isExam && maxPoints(ex) > 0 && <span className="badge badge-muted">{viNum(maxPoints(ex))} đ</span>}
                  </div>
                  <ExerciseBody ex={ex} mode="preview" name={`k-${ex.id}`} correct={ex.correct} />
                  {ex.kind === 'essay' && <EssayKey ex={ex} />}
                  {ex.kind !== 'essay' && ex.method_md && <Method md={ex.method_md} open={openAll ?? false} />}
                </div>
              ))}
            </Fragment>
          ))}
        </>
      )}
    </div>
  )
}

// Lời giải thu gọn được
function Method({ md, open }) {
  return (
    <details className="method-box" open={open} key={String(open)}>
      <summary className="box-label">Lời giải</summary>
      <Markdown>{md}</Markdown>
    </details>
  )
}

// Tự luận: đáp số nổi bật + lời giải mở sẵn
function EssayKey({ ex }) {
  if (!ex.answer_md && !ex.method_md) return <p className="muted small">Chưa nhập đáp án cho câu này.</p>
  return (
    <div className="essay-key">
      {ex.answer_md && (
        <div className="answer-box">
          <div className="box-label">Đáp án</div>
          <Markdown>{ex.answer_md}</Markdown>
        </div>
      )}
      {ex.method_md && (
        <div className="method-box">
          <div className="box-label">Lời giải</div>
          <Markdown>{ex.method_md}</Markdown>
        </div>
      )}
    </div>
  )
}

// Bảng đáp án gọn theo từng loại câu
function KeyTable({ groups, isExam }) {
  // Bài thường: vẫn gom theo loại câu để dò cho nhanh, giữ số câu gốc
  const all = groups.flatMap((g) => g.items.map((it) => ({ ...it, part: g.part })))
  const byKind = (kind) => all.filter((it) => it.ex.kind === kind)
  const mcq = byKind('mcq')
  const tf = byKind('true_false')
  const short = byKind('short')
  const blanks = byKind('fill_blank')
  const essays = byKind('essay')
  const title = (kind, fallback) => {
    const p = groups.find((g) => g.part?.kind === kind)?.part
    return isExam && p?.roman ? `Phần ${p.roman}. ${p.title}` : fallback
  }

  return (
    <div className="key-table">
      {mcq.length > 0 && (
        <section>
          <h3 className="key-title">{title('mcq', 'Trắc nghiệm')}</h3>
          <div className="key-mcq">
            {mcq.map((it) => (
              <div key={it.ex.id} className="key-mcq-cell" title={(it.ex.options || []).find((o) => o.label === it.ex.correct)?.text || ''}>
                <span className="key-no">{it.no}</span>
                <span className="key-ans">{it.ex.correct || '?'}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {tf.length > 0 && (
        <section>
          <h3 className="key-title">{title('true_false', 'Đúng / Sai')}</h3>
          <table className="key-tf">
            <thead>
              <tr>
                <th>Câu</th>
                {['a', 'b', 'c', 'd'].map((id) => (
                  <th key={id}>{id}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tf.map((it) => (
                <tr key={it.ex.id}>
                  <td className="key-no">{it.no}</td>
                  {['a', 'b', 'c', 'd'].map((id) => {
                    const v = it.ex.correct?.[id]
                    return (
                      <td key={id}>
                        {typeof v === 'boolean' ? <span className={`tf-key ${v ? 'tf-true' : 'tf-false'}`}>{v ? 'Đ' : 'S'}</span> : <span className="muted">—</span>}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {short.length > 0 && (
        <section>
          <h3 className="key-title">{title('short', 'Trả lời ngắn')}</h3>
          <div className="key-short">
            {short.map((it) => (
              <div key={it.ex.id} className="key-short-cell">
                <span className="key-no">Câu {it.no}</span>
                <strong>{typeof it.ex.correct === 'string' ? it.ex.correct.split(/\s*;\s*/).join(' hoặc ') : '?'}</strong>
              </div>
            ))}
          </div>
        </section>
      )}

      {blanks.length > 0 && (
        <section>
          <h3 className="key-title">Điền khuyết</h3>
          {blanks.map((it) => (
            <div key={it.ex.id} className="key-line">
              <span className="key-no">Câu {it.no}</span>
              <span>
                {(it.ex.options || []).map((b) => (
                  <span key={b.id} className="key-blank">
                    <b>{b.id})</b> {it.ex.correct?.[b.id] ?? '?'}
                  </span>
                ))}
              </span>
            </div>
          ))}
        </section>
      )}

      {essays.length > 0 && (
        <section>
          <h3 className="key-title">{isExam ? 'Tự luận (gia sư tự chấm)' : 'Tự luận'}</h3>
          {essays.map((it) => (
            <div key={it.ex.id} className="key-essay">
              <div className="key-essay-head">
                <span className="key-no">Câu {it.no}</span>
                <span className="key-essay-q">
                  <Markdown>{firstLine(it.ex.question_md)}</Markdown>
                </span>
              </div>
              <EssayKey ex={it.ex} />
            </div>
          ))}
        </section>
      )}
    </div>
  )
}

// Dòng đầu của đề (bỏ dòng mức độ in nghiêng) để nhận ra câu tự luận trong bảng gọn
function firstLine(md) {
  const lines = (md || '').split('\n').map((l) => l.trim()).filter((l) => l && !/^_.*_$/.test(l))
  const t = lines[0] || ''
  return t.length > 160 ? t.slice(0, 160) + '…' : t
}
