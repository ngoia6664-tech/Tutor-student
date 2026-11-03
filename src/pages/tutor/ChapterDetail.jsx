import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase, unwrap } from '../../lib/supabase.js'
import { useAsync } from '../../lib/useAsync.js'
import { formatDate, formatDateTime } from '../../lib/format.js'
import { errMsg } from '../../lib/errors.js'
import { confirmDelete, notifyDone, notifyError } from '../../lib/dialog.js'
import { itemsLabel, moveToFolder } from '../../lib/bulk.js'
import { groupByFolder } from '../../lib/folders.js'
import Loading from '../../components/Loading.jsx'
import ErrorBox from '../../components/ErrorBox.jsx'
import FolderBox from '../../components/FolderBox.jsx'
import { DueBadge, TypeBadge } from '../../components/Badges.jsx'
import { libraryUrl, UNSORTED } from '../../lib/chapters.js'
import { clearRecent } from '../../lib/recentChapters.js'
import Icon from '../../components/Icon.jsx'
import { AssignDialog, deletePicked, MoveDialog, SelectBar, SelectCheck, SelectModes, useAssignSelection } from '../../components/QuickAssign.jsx'

const OUT = 'none' // ô chọn thư mục: "Chưa xếp" (ra khỏi thư mục)

// Nội dung một chủ đề (cột phải của Thư viện): các bài giảng, bài tập bên trong, kèm tình hình nộp bài.
// Có thư mục thì bài gom theo từng thư mục (khối gập / mở), bài chưa xếp để cuối. Chuyển bài vào thư mục: Sửa nhiều → thanh dưới.
// onChanged: báo Thư viện tải lại số bài của từng chủ đề sau khi Sửa nhiều / Xóa nhiều
// id = UNSORTED: mục "Chưa xếp chủ đề" (bài có chapter_id trống): không thư mục, không sửa / xóa chủ đề
export default function ChapterDetail({ id, reloadKey = 0, onEdit, onDelete, onChanged }) {
  const unsorted = id === UNSORTED
  const pick = useAssignSelection()
  const [assigning, setAssigning] = useState(null)
  const [moving, setMoving] = useState(null)
  const [naming, setNaming] = useState(null) // { id?, name }: đang tạo / đổi tên thư mục
  // Sang chủ đề khác: thoát chế độ chọn, không mang tick cũ theo
  useEffect(() => {
    pick.stop()
    setNaming(null)
    clearRecent(id) // đã mở thì tắt nhãn "Mới"
  }, [id]) // eslint-disable-line react-hooks/exhaustive-deps
  const { data, loading, error, reload } = useAsync(async () => {
    const inChapter = (q) => (unsorted ? q.is('chapter_id', null) : q.eq('chapter_id', id))
    const [chapter, lessons, assignments, folders] = await Promise.all([
      unsorted ? { id: null, title: 'Chưa xếp chủ đề' } : supabase.from('chapters').select('*').eq('id', id).maybeSingle().then(unwrap),
      inChapter(supabase.from('lessons').select('id, title, file_path, created_at, folder_id, lesson_recipients(student_id)')).order('created_at').then(unwrap),
      inChapter(supabase.from('assignments').select('id, title, type, due_date, created_at, folder_id, assignment_recipients(status)')).order('created_at').then(unwrap),
      unsorted ? [] : supabase.from('chapter_folders').select('id, name').eq('chapter_id', id).order('created_at').then(unwrap),
    ])
    if (!chapter) throw new Error('Không tìm thấy chủ đề (có thể đã bị xóa).')
    return { chapter, lessons, assignments, folders }
  }, [id, reloadKey])

  if (loading) return <Loading />
  if (error)
    return (
      <div>
        <ErrorBox message={error} onRetry={reload} />
        <Link to={libraryUrl()}>← Thư viện</Link>
      </div>
    )

  const { chapter, lessons, assignments, folders } = data
  const newState = unsorted ? {} : { state: { chapterId: chapter.id } }
  const here = unsorted ? 'nào chưa xếp chủ đề' : 'trong chủ đề này'
  const lessonItem = (l) => ({ kind: 'lesson', id: l.id, title: l.title, file_path: l.file_path })
  const assignmentItem = (a) => ({ kind: 'assignment', id: a.id, title: a.title, submitted: a.assignment_recipients.filter((r) => r.status !== 'todo').length })
  const changed = () => {
    reload()
    onChanged?.()
  }

  async function saveFolder(e) {
    e.preventDefault()
    const name = naming.name.trim()
    if (!name) return
    try {
      if (naming.id) unwrap(await supabase.from('chapter_folders').update({ name }).eq('id', naming.id))
      else unwrap(await supabase.from('chapter_folders').insert({ chapter_id: chapter.id, name }))
      setNaming(null)
      reload()
    } catch (err) {
      notifyError('Không lưu được thư mục', errMsg(err))
    }
  }

  async function removeFolder(f, count) {
    const msg = count ? `${count} bài bên trong sẽ về mục "Chưa xếp thư mục", không bài nào bị xóa.` : 'Thư mục đang trống.'
    if (!(await confirmDelete('thư mục', f.name, msg))) return
    try {
      unwrap(await supabase.from('chapter_folders').delete().eq('id', f.id))
      reload()
    } catch (err) {
      notifyError('Không xóa được thư mục', errMsg(err))
    }
  }

  async function moveInto(folderId) {
    const items = pick.items
    if (!items.length) return
    const { moved, failed } = await moveToFolder(items, folderId === OUT ? null : folderId)
    if (failed.length) {
      notifyError(`Đã chuyển ${moved}/${items.length} bài`, failed.map((f) => `"${f.item.title}" (${errMsg(f.error)})`).join('; '))
    } else {
      const name = folders.find((f) => f.id === folderId)?.name
      notifyDone({ title: `Đã chuyển ${itemsLabel(items)}`, say: name ? `Đã xếp vào thư mục "${name}" rồi nhé 📂` : 'Đã đưa ra khỏi thư mục 📂' })
      pick.stop()
    }
    reload()
  }

  const lessonRow = (l) => {
    const item = lessonItem(l)
    return (
      <div key={l.id} className={pick.has('lesson', l.id) ? 'list-item is-picked' : 'list-item'}>
        <div className="list-item-title assign-title">
          <SelectCheck sel={pick} item={item} />
          <Link to={`/tutor/lessons/${l.id}`} style={{ color: 'inherit' }}>
            📘 {l.title}
          </Link>
        </div>
        <div className="row small">
          <AssignButton count={l.lesson_recipients.length} onClick={() => setAssigning([item])} />
          <span className="muted">{formatDateTime(l.created_at)}</span>
        </div>
      </div>
    )
  }

  const assignmentRow = (a) => {
    const cnt = { todo: 0, done: 0, checked: 0 }
    a.assignment_recipients.forEach((r) => (cnt[r.status] += 1))
    const item = assignmentItem(a)
    return (
      <div key={a.id} className={pick.has('assignment', a.id) ? 'list-item is-picked' : 'list-item'}>
        <div className="list-item-title assign-title">
          <SelectCheck sel={pick} item={item} />
          <Link to={`/tutor/assignments/${a.id}`} style={{ color: 'inherit' }}>
            ✏️ {a.title}
          </Link>
        </div>
        <div className="row small">
          <AssignButton count={a.assignment_recipients.length} onClick={() => setAssigning([item])} />
          <TypeBadge type={a.type} />
          <DueBadge date={a.due_date} />
          {a.due_date && <span className="muted">Hạn: {formatDate(a.due_date)}</span>}
        </div>
        <div className="row small" style={{ marginTop: '0.4rem' }}>
          <span className="badge badge-warn">{cnt.todo} chưa nộp</span>
          <span className="badge badge-primary">{cnt.done} chờ chấm</span>
          <span className="badge badge-ok">{cnt.checked} đã chấm</span>
        </div>
      </div>
    )
  }

  return (
    <div className="assign-space">
      {/* Đường dẫn Lớp › Môn › Chương (có menu chọn nhanh) do Library.jsx vẽ ngay phía trên */}
      <header className="lesson-head" style={{ marginTop: 0 }}>
        <h1>{chapter.title}</h1>
        <div className="row">
          <Link className="btn btn-small btn-primary" to="/tutor/lessons/new" {...newState}>
            <Icon name="plus" />
            Bài giảng
          </Link>
          <Link className="btn btn-small btn-primary" to="/tutor/assignments/new" {...newState}>
            <Icon name="plus" />
            Bài tập
          </Link>
          {!unsorted && (
            <button type="button" className="btn btn-small" onClick={() => setNaming({ name: '' })}>
              <Icon name="folder" />
              Thư mục mới
            </button>
          )}
          {lessons.length + assignments.length > 0 && <SelectModes sel={pick} />}
          {onEdit && !unsorted && (
            <button type="button" className="btn btn-small" onClick={() => onEdit(chapter)}>
              <Icon name="edit" />
              Sửa chủ đề
            </button>
          )}
          {onDelete && !unsorted && (
            <button type="button" className="btn btn-small btn-danger" onClick={() => onDelete(chapter, lessons.length + assignments.length)}>
              <Icon name="trash" />
              Xóa
            </button>
          )}
        </div>
      </header>
      {unsorted && <p className="muted small">Bài chưa thuộc chủ đề nào (chưa chọn chủ đề, hoặc chủ đề đã bị xóa). Bấm Sửa nhiều → chọn bài → Chuyển chủ đề để xếp vào chủ đề.</p>}

      {naming && (
        <form className="folder-form" onSubmit={saveFolder}>
          <input
            type="text"
            autoFocus
            maxLength={80}
            value={naming.name}
            onChange={(e) => setNaming({ ...naming, name: e.target.value })}
            placeholder="Tên thư mục, vd. Lý thuyết, Đề ôn tập"
            aria-label="Tên thư mục"
          />
          <button type="submit" className="btn btn-small btn-primary" disabled={!naming.name.trim()}>
            <Icon name="save" />
            {naming.id ? 'Đổi tên' : 'Tạo thư mục'}
          </button>
          <button type="button" className="btn btn-small" onClick={() => setNaming(null)}>
            Hủy
          </button>
        </form>
      )}

      {folders.length === 0 ? (
        <>
          <h2 className="section-title">Bài giảng ({lessons.length})</h2>
          {lessons.length === 0 ? (
            <div className="empty" style={{ marginBottom: '1.25rem' }}>
              Không có bài giảng {here}.
            </div>
          ) : (
            <div className="list" style={{ marginBottom: '1.25rem' }}>
              {lessons.map(lessonRow)}
            </div>
          )}

          <h2 className="section-title">Bài tập ({assignments.length})</h2>
          {assignments.length === 0 ? <div className="empty">Không có bài tập {here}.</div> : <div className="list">{assignments.map(assignmentRow)}</div>}
        </>
      ) : (
        groupByFolder(folders, lessons, assignments).map(({ folder, lessons: ls, assignments: as }) => {
          const n = ls.length + as.length
          if (!folder)
            return (
              n > 0 && (
                <section key="loose">
                  <h2 className="section-title">Chưa xếp thư mục ({n})</h2>
                  <div className="list">
                    {ls.map(lessonRow)}
                    {as.map(assignmentRow)}
                  </div>
                </section>
              )
            )
          return (
            <FolderBox
              key={folder.id}
              name={folder.name}
              count={n}
              actions={
                <>
                  <button type="button" className="btn btn-small btn-ghost" onClick={() => setNaming({ id: folder.id, name: folder.name })} aria-label={`Đổi tên thư mục ${folder.name}`} title="Đổi tên">
                    <Icon name="edit" />
                  </button>
                  <button type="button" className="btn btn-small btn-ghost" onClick={() => removeFolder(folder, n)} aria-label={`Xóa thư mục ${folder.name}`} title="Xóa thư mục">
                    <Icon name="trash" />
                  </button>
                </>
              }
            >
              {ls.map(lessonRow)}
              {as.map(assignmentRow)}
            </FolderBox>
          )
        })
      )}

      <SelectBar
        sel={pick}
        visible={[...lessons.map(lessonItem), ...assignments.map(assignmentItem)]}
        onAssign={setAssigning}
        onMove={setMoving}
        onDelete={async (items) => {
          if (await deletePicked(items)) {
            pick.stop()
            changed()
          }
        }}
        extra={
          pick.mode === 'edit' &&
          folders.length > 0 && (
            <label className="assign-bar-extra">
              <Icon name="folder" />
              <select value="" disabled={!pick.items.length} onChange={(e) => moveInto(e.target.value)} aria-label="Chuyển bài đã chọn vào thư mục">
                <option value="" disabled>
                  Vào thư mục…
                </option>
                {folders.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
                <option value={OUT}>Chưa xếp (ra khỏi thư mục)</option>
              </select>
            </label>
          )
        }
      />
      {moving && (
        <MoveDialog
          items={moving}
          onClose={() => setMoving(null)}
          onSaved={(ok) => {
            if (ok) pick.stop()
            changed()
          }}
        />
      )}
      {assigning && (
        <AssignDialog
          items={assigning}
          onClose={() => setAssigning(null)}
          onSaved={() => {
            if (assigning.length > 1) pick.stop()
            reload()
          }}
        />
      )}
    </div>
  )
}

function AssignButton({ count, onClick }) {
  return (
    <button type="button" className="btn btn-small" onClick={onClick} title="Chọn học sinh nhận bài">
      <Icon name="users" />
      Giao ({count})
    </button>
  )
}
