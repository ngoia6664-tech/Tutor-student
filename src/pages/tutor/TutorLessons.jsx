// @ts-nocheck — nợ kiểu: xóa dòng này rồi chạy npm run typecheck để sửa
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase, unwrap } from '../../lib/supabase.js'
import { useAsync } from '../../lib/useAsync.js'
import { errMsg } from '../../lib/errors.js'
import { formatDateTime } from '../../lib/format.js'
import { deleteLesson } from '../../lib/lessons.js'
import Loading from '../../components/Loading.jsx'
import ErrorBox from '../../components/ErrorBox.jsx'
import ChapterGroups from '../../components/ChapterGroups.jsx'
import FilterTree, { matchItem, selectionLabel, useTreeSelection } from '../../components/FilterTree.jsx'
import { fetchChapters } from '../../lib/chapters.js'
import Icon from '../../components/Icon.jsx'
import { confirmDelete, notifyDeleted } from '../../lib/dialog.js'
import { AssignDialog, deletePicked, MoveDialog, SelectBar, SelectCheck, SelectModes, useAssignSelection } from '../../components/QuickAssign.jsx'

// Bài giảng (gia sư): cây Lớp › Môn › Chuyên đề › Chương bên trái để lọc, danh sách bên phải
export default function TutorLessons() {
  const [actionError, setActionError] = useState(null)
  const [deleting, setDeleting] = useState(null)
  const sel = useTreeSelection()
  const pick = useAssignSelection()
  const [assigning, setAssigning] = useState(null)
  const [moving, setMoving] = useState(null)

  const { data, loading, error, reload } = useAsync(async () => {
    const [list, chapters] = await Promise.all([
      supabase
        .from('lessons')
        .select('id, title, file_path, video_url, created_at, chapter_id, lesson_recipients(student_id)')
        .order('created_at', { ascending: false })
        .then(unwrap),
      fetchChapters(),
    ])
    return { list, chapters }
  }, [])
  const chapters = data?.chapters || []
  const chapterById = new Map(chapters.map((c) => [c.id, c]))
  const rows = (data?.list || []).filter((l) => matchItem(l, chapterById, sel))
  const where = selectionLabel(sel, chapterById, 'Chưa xếp chương')

  async function handleDelete(lesson) {
    if (!(await confirmDelete('bài giảng', lesson.title, 'File đính kèm cũng bị xóa. Bài tập liên kết vẫn giữ.'))) return
    setDeleting(lesson.id)
    setActionError(null)
    try {
      await deleteLesson(lesson)
      reload()
      notifyDeleted('bài giảng')
    } catch (e) {
      setActionError(errMsg(e))
    } finally {
      setDeleting(null)
    }
  }

  // Mục dùng cho chọn nhiều; file_path để xóa luôn file đính kèm
  const itemOf = (l) => ({ kind: 'lesson', id: l.id, title: l.title, file_path: l.file_path })

  function renderLesson(l) {
    const item = itemOf(l)
    return (
      <div key={l.id} className={pick.has('lesson', l.id) ? 'list-item is-picked' : 'list-item'}>
        <div className="list-item-title assign-title">
          <SelectCheck sel={pick} item={item} />
          <Link to={`/tutor/lessons/${l.id}`} style={{ color: 'inherit' }}>
            📘 {l.title}
          </Link>
        </div>
        <div className="row small" style={{ marginBottom: '0.5rem' }}>
          <span className="badge">{l.lesson_recipients.length} học sinh</span>
          {l.file_path && <span className="badge">📎 File</span>}
          {l.video_url && <span className="badge">▶️ Video</span>}
          <span className="muted">{formatDateTime(l.created_at)}</span>
        </div>
        <div className="row">
          <Link className="btn btn-small" to={`/tutor/lessons/${l.id}`}>
            <Icon name="eye" />
            Xem
          </Link>
          <button type="button" className="btn btn-small" onClick={() => setAssigning([item])}>
            <Icon name="users" />
            Giao ({l.lesson_recipients.length})
          </button>
          <Link className="btn btn-small" to={`/tutor/lessons/${l.id}/edit`}>
            <Icon name="edit" />
            Sửa
          </Link>
          <button type="button" className="btn btn-small btn-danger" disabled={deleting === l.id} onClick={() => handleDelete(l)}>
            <Icon name="trash" />
            {deleting === l.id ? 'Đang xóa...' : 'Xóa'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="library">
      <FilterTree title="Bài giảng" icon="lesson" chapters={chapters} items={data?.list || []} gradeTabs storageKey="lessons-tree-open" />
      <section className="library-main">
        <div className="page-head">
          <div>
            <h1>
              <span className="title-icon"><Icon name="lesson" /></span>Bài giảng
            </h1>
            {where && <p className="muted small page-sub">{where}</p>}
          </div>
          <div className="row">
            <SelectModes sel={pick} />
            <Link className="btn" to="/tutor/import">
              <Icon name="import" />
              Dán JSON
            </Link>
            <Link className="btn btn-primary" to="/tutor/lessons/new" state={sel.ch && sel.ch !== 'none' ? { chapterId: sel.ch } : undefined}>
              <Icon name="plus" />
              Soạn bài giảng
            </Link>
          </div>
        </div>

        <ErrorBox message={actionError} />
        {loading && <Loading />}
        <ErrorBox message={error} onRetry={reload} />

        {!loading && !error && rows.length === 0 && <div className="empty">{where ? 'Mục này chưa có bài giảng.' : 'Chưa có bài giảng nào.'}</div>}

        {!loading && !error && rows.length > 0 && sel.ch && <div className="list">{rows.map(renderLesson)}</div>}
        {!loading && !error && rows.length > 0 && !sel.ch && <ChapterGroups items={rows} chapters={chapters} renderItem={renderLesson} />}
        <SelectBar
          sel={pick}
          visible={rows.map(itemOf)}
          onAssign={setAssigning}
          onMove={setMoving}
          onDelete={async (items) => {
            if (await deletePicked(items)) {
              pick.stop()
              reload()
            }
          }}
        />
        {moving && (
          <MoveDialog
            items={moving}
            onClose={() => setMoving(null)}
            onSaved={(ok) => {
              if (ok) pick.stop()
              reload()
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
      </section>
    </div>
  )
}
