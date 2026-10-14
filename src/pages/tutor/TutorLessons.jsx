import { useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase, unwrap } from '../../lib/supabase.js'
import { useAsync } from '../../lib/useAsync.js'
import { errMsg } from '../../lib/errors.js'
import { formatDateTime } from '../../lib/format.js'
import { deleteLesson } from '../../lib/lessons.js'
import Loading from '../../components/Loading.jsx'
import ErrorBox from '../../components/ErrorBox.jsx'
import ChapterGroups, { ChapterFilter, filterByChapter } from '../../components/ChapterGroups.jsx'
import { fetchChapters } from '../../lib/chapters.js'

export default function TutorLessons() {
  const [actionError, setActionError] = useState(null)
  const [deleting, setDeleting] = useState(null)
  const [chapterFilter, setChapterFilter] = useState('all')

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
  const rows = filterByChapter(data?.list || [], chapterFilter)

  async function handleDelete(lesson) {
    if (!window.confirm(`Xóa bài giảng "${lesson.title}"? File đính kèm cũng bị xóa. Bài tập liên kết vẫn giữ.`)) return
    setDeleting(lesson.id)
    setActionError(null)
    try {
      await deleteLesson(lesson)
      reload()
    } catch (e) {
      setActionError(errMsg(e))
    } finally {
      setDeleting(null)
    }
  }

  return (
    <div>
      <div className="page-head">
        <h1>Bài giảng</h1>
        <div className="row">
          <Link className="btn" to="/tutor/import">
            Dán JSON
          </Link>
          <Link className="btn btn-primary" to="/tutor/lessons/new">
            + Soạn bài giảng
          </Link>
        </div>
      </div>

      <div className="chips" style={{ marginBottom: '1rem' }}>
        <ChapterFilter chapters={chapters} value={chapterFilter} onChange={setChapterFilter} />
      </div>

      <ErrorBox message={actionError} />
      {loading && <Loading />}
      <ErrorBox message={error} onRetry={reload} />

      {!loading && !error && rows.length === 0 && (
        <div className="empty">{chapterFilter !== 'all' ? 'Chương này chưa có bài giảng.' : 'Chưa có bài giảng nào.'}</div>
      )}

      {!loading && !error && rows.length > 0 && (
        <ChapterGroups
          items={rows}
          chapters={chapters}
          renderItem={(l) => (
            <div key={l.id} className="list-item">
              <Link to={`/tutor/lessons/${l.id}`} className="list-item-title" style={{ display: 'block', color: 'inherit' }}>
                {l.title}
              </Link>
              <div className="row small" style={{ marginBottom: '0.5rem' }}>
                <span className="badge">{l.lesson_recipients.length} học sinh</span>
                {l.file_path && <span className="badge">📎 File</span>}
                {l.video_url && <span className="badge">▶️ Video</span>}
                <span className="muted">{formatDateTime(l.created_at)}</span>
              </div>
              <div className="row">
                <Link className="btn btn-small" to={`/tutor/lessons/${l.id}`}>
                  Xem
                </Link>
                <Link className="btn btn-small" to={`/tutor/lessons/${l.id}/edit`}>
                  Sửa
                </Link>
                <button type="button" className="btn btn-small btn-danger" disabled={deleting === l.id} onClick={() => handleDelete(l)}>
                  {deleting === l.id ? 'Đang xóa...' : 'Xóa'}
                </button>
              </div>
            </div>
          )}
        />
      )}
    </div>
  )
}
