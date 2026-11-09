import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase, unwrap } from '../../lib/supabase.js'
import { useAsync } from '../../lib/useAsync.js'
import { formatDate, formatDateTime } from '../../lib/format.js'
import { errMsg } from '../../lib/errors.js'
import { askConfirm, confirmDelete, notifyDone, notifyError } from '../../lib/dialog.js'
import { itemsLabel, moveToFolder } from '../../lib/bulk.js'
import { groupByFolder } from '../../lib/folders.js'
import Loading from '../../components/Loading.jsx'
import ErrorBox from '../../components/ErrorBox.jsx'
import FolderBox from '../../components/FolderBox.jsx'
import { DueBadge, TypeBadge } from '../../components/Badges.jsx'
import { libraryUrl, UNSORTED } from '../../lib/chapters.js'
import { clearRecent } from '../../lib/recentChapters.js'
import Icon from '../../components/Icon.jsx'
import CustomSelect from '../../components/CustomSelect.jsx'
import { AssignDialog, deletePicked, MoveDialog, NotifyDialog, SelectBar, SelectCheck, SelectModes, useAssignSelection } from '../../components/QuickAssign.jsx'

const OUT = 'none' // ô chọn thư mục: "Chưa xếp" (ra khỏi thư mục)

// Nội dung một chủ đề (cột phải của Thư viện): các bài giảng, bài tập bên trong, kèm tình hình nộp bài.
export default function ChapterDetail({ id, reloadKey = 0, onEdit, onDelete, onChanged }) {
  const unsorted = id === UNSORTED
  const pick = useAssignSelection()
  const [assigning, setAssigning] = useState(null)
  const [moving, setMoving] = useState(null)
  const [dest, setDest] = useState('') // thư mục đích đã chọn, bấm "Chuyển" mới thực thi
  const [naming, setNaming] = useState(null) // { id?, name }: đang tạo / đổi tên thư mục
  const [notifying, setNotifying] = useState(null) // key bài chọn sẵn khi mở bảng Báo học sinh

  // Sang chủ đề khác: thoát chế độ chọn, không mang tick cũ theo
  useEffect(() => {
    pick.stop()
    setNaming(null)
    clearRecent(id) // đã mở thì tắt nhãn "Mới"
  }, [id]) // eslint-disable-line react-hooks/exhaustive-deps

  const { data, loading, error, reload } = useAsync(async () => {
    const inChapter = (q) => (unsorted ? q.is('chapter_id', null) : q.eq('chapter_id', id))
    const [chapter, lessons, assignments, folders] = await Promise.all([
      unsorted
        ? { id: null, title: 'Chưa xếp chủ đề' }
        : supabase.from('chapters').select('*, course:courses(id, title)').eq('id', id).maybeSingle().then(unwrap),
      inChapter(supabase.from('lessons').select('id, title, file_path, created_at, folder_id, hidden, lesson_recipients(student_id, from_course, quiet)'))
        .order('created_at')
        .then(unwrap),
      inChapter(supabase.from('assignments').select('id, title, type, due_date, created_at, folder_id, hidden, assignment_recipients(status, from_course, quiet)'))
        .order('created_at')
        .then(unwrap),
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
  // Chủ đề trong khóa: bài kèm khóa để bảng Giao hỏi "giao cả khóa?"; nút Ẩn / Mở / Báo cho từng bài
  const course = chapter.course || null
  const lessonItem = (l) => ({ kind: 'lesson', id: l.id, title: l.title, file_path: l.file_path, course })
  const assignmentItem = (a) => ({
    kind: 'assignment',
    id: a.id,
    title: a.title,
    submitted: a.assignment_recipients.filter((r) => r.status !== 'todo').length,
    course,
  })
  // Bài đang mở có học sinh qua khóa chưa được báo (cho nút "Báo học sinh…" ở đầu chủ đề)
  const waitingAll = [
    ...lessons.filter((l) => !l.hidden && l.lesson_recipients.some((r) => r.from_course && r.quiet)).map(lessonItem),
    ...assignments.filter((a) => !a.hidden && a.assignment_recipients.some((r) => r.from_course && r.quiet)).map(assignmentItem),
  ]
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

  // Ẩn / mở một bài với học sinh có khóa (máy chủ tự thêm / bỏ bài chưa làm của các bạn)
  async function setHidden(kind, item, hidden) {
    try {
      unwrap(await supabase.from(kind === 'lesson' ? 'lessons' : 'assignments').update({ hidden }).eq('id', item.id))
      changed()
      if (!hidden) notifyCourse(kind, item)
    } catch (err) {
      notifyError(hidden ? 'Không ẩn được bài' : 'Không mở được bài', errMsg(err))
    }
  }

  // Báo cho học sinh có khóa: mở bảng chọn bài + học sinh / nhóm (NotifyDialog)
  const notifyCourse = (kind, item) => setNotifying([`${kind}:${item.id}`])

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
          <AssignButton count={l.lesson_recipients.filter((r) => !r.from_course).length} onClick={() => setAssigning([item])} />
          {course && (
            <CourseControls
              hidden={l.hidden}
              viaCourse={l.lesson_recipients.filter((r) => r.from_course).length}
              waiting={l.lesson_recipients.filter((r) => r.from_course && r.quiet).length}
              onToggle={() => setHidden('lesson', item, !l.hidden)}
              onNotify={() => notifyCourse('lesson', item)}
            />
          )}
          <span className="muted">{formatDateTime(l.created_at)}</span>
        </div>
      </div>
    )
  }

  const assignmentRow = (a) => {
    const cnt = { todo: 0, done: 0, checked: 0 }
    // Bài tự học qua khóa chưa làm không tính "chưa nộp" (không có hạn, không bắt buộc)
    a.assignment_recipients.forEach((r) => !(r.from_course && r.status === 'todo') && (cnt[r.status] += 1))
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
          <AssignButton count={a.assignment_recipients.filter((r) => !r.from_course).length} onClick={() => setAssigning([item])} />
          {course && (
            <CourseControls
              hidden={a.hidden}
              viaCourse={a.assignment_recipients.filter((r) => r.from_course).length}
              waiting={a.assignment_recipients.filter((r) => r.from_course && r.quiet).length}
              onToggle={() => setHidden('assignment', item, !a.hidden)}
              onNotify={() => notifyCourse('assignment', item)}
            />
          )}
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
          {course && waitingAll.length > 0 && (
            <button type="button" className="btn btn-small" onClick={() => setNotifying(waitingAll.map((it) => `${it.kind}:${it.id}`))} title="Báo nhiều bài cùng lúc cho học sinh / nhóm bạn chọn">
              <Icon name="bell" />
              Báo học sinh…
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
      {course && (
        <p className="muted small">
          🎓 Thuộc khóa <b>{course.title}</b>: học sinh có khóa tự thấy mọi bài đang mở ở đây. Bấm <b>Ẩn với học sinh</b> với bài chưa muốn cho xem, <b>Báo</b> khi
          muốn các bạn làm cho buổi tới.
        </p>
      )}
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
              <p>Không có bài giảng {here}.</p>
              {!unsorted && (
                <Link className="btn btn-small btn-primary" to="/tutor/lessons/new" {...newState}>
                  <Icon name="plus" />
                  Bài giảng
                </Link>
              )}
            </div>
          ) : (
            <div className="list" style={{ marginBottom: '1.25rem' }}>
              {lessons.map(lessonRow)}
            </div>
          )}

          <h2 className="section-title">Bài tập ({assignments.length})</h2>
          {assignments.length === 0 ? (
            <div className="empty">
              <p>Không có bài tập {here}.</p>
              {!unsorted && (
                <Link className="btn btn-small btn-primary" to="/tutor/assignments/new" {...newState}>
                  <Icon name="plus" />
                  Bài tập
                </Link>
              )}
            </div>
          ) : <div className="list">{assignments.map(assignmentRow)}</div>}
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
            <span className="assign-bar-extra">
              <CustomSelect
                value={dest}
                disabled={!pick.items.length}
                onChange={setDest}
                placeholder="Chọn thư mục đích…"
                icon="folder"
                placement="top"
                searchable={folders.length >= 6}
                ariaLabel="Thư mục đích"
                className="folder-dest-select"
                options={[
                  ...folders.map((f) => ({ value: f.id, label: f.name, icon: 'folder' })),
                  { value: OUT, label: 'Chưa xếp (ra khỏi thư mục)', icon: 'folder' },
                ]}
              />
              <button
                type="button"
                className="btn btn-small btn-primary"
                disabled={!pick.items.length || !dest}
                onClick={async () => {
                  await moveInto(dest)
                  setDest('')
                }}
              >
                Chuyển
              </button>
            </span>
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
      {notifying && (
        <NotifyDialog
          items={[...lessons.filter((l) => !l.hidden).map(lessonItem), ...assignments.filter((a) => !a.hidden).map(assignmentItem)]}
          picked={notifying}
          onClose={() => setNotifying(null)}
          onSaved={reload}
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
    <button
      type="button"
      className="btn btn-small"
      onClick={onClick}
      title={count > 0 ? `Đã giao riêng cho ${count} học sinh (không tính bạn có bài qua khóa). Bấm để chọn học sinh nhận bài` : 'Chọn học sinh nhận bài'}
    >
      <Icon name="users" />
      {count > 0 ? `Giao · ${count} học sinh` : 'Giao bài'}
    </button>
  )
}

// Bài trong khóa: số học sinh thấy qua khóa + Ẩn / Mở + Báo học sinh (waiting: số bạn chưa được báo)
function CourseControls({ hidden, viaCourse, waiting, onToggle, onNotify }) {
  if (hidden)
    return (
      <>
        <span className="badge badge-muted">
          <Icon name="lock" size={13} /> Đang ẩn
        </span>
        <button type="button" className="btn btn-small" onClick={onToggle} title="Cho học sinh có khóa thấy bài này">
          <Icon name="eye" />
          Hiện cho học sinh
        </button>
      </>
    )
  return (
    <>
      <span className="badge" title={`${viaCourse} học sinh thấy bài này nhờ có khóa`}>
        🎓 {viaCourse} bạn qua khóa
      </span>
      <button type="button" className="btn btn-small" onClick={onToggle} title="Ẩn với học sinh có khóa (bài các bạn đã làm vẫn giữ)">
        <Icon name="lock" />
        Ẩn với học sinh
      </button>
      {waiting > 0 ? (
        <button
          type="button"
          className="btn btn-small"
          onClick={onNotify}
          title={`${waiting} bạn chưa được báo. Chọn học sinh / nhóm để báo: có chuông, vào Bài cần làm`}
        >
          <Icon name="bell" />
          Báo {waiting} bạn
        </button>
      ) : (
        viaCourse > 0 && <span className="muted small">🔔 đã báo hết</span>
      )}
    </>
  )
}
