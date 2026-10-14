import { Fragment } from 'react'
import { Link } from 'react-router-dom'
import { supabase, unwrap } from '../../lib/supabase.js'
import { useAsync } from '../../lib/useAsync.js'
import { formatDateTime } from '../../lib/format.js'
import { groupByChapter } from '../../lib/chapters.js'
import { useAuth } from '../../contexts/AuthContext.jsx'
import Loading from '../../components/Loading.jsx'
import ErrorBox from '../../components/ErrorBox.jsx'

// Bài giảng được giao, gom theo chương (chương xếp theo chuyên đề và thứ tự)
export default function StudentLessons() {
  const { profile } = useAuth()

  const { data, loading, error, reload } = useAsync(async () => {
    const rows = unwrap(
      await supabase
        .from('lesson_recipients')
        .select('lesson:lessons(id, title, file_path, video_url, created_at, chapter_id, chapter:chapters(id, title, section, sort_order))')
        .eq('student_id', profile.id)
    )
    // Trong mỗi chương: bài cũ trước, bài mới sau (đúng thứ tự học)
    const lessons = rows
      .map((r) => r.lesson)
      .filter(Boolean)
      .sort((a, b) => (a.created_at < b.created_at ? -1 : 1))
    const chapters = [...new Map(lessons.filter((l) => l.chapter).map((l) => [l.chapter.id, l.chapter])).values()]
    return { lessons, chapters }
  }, [profile.id])

  return (
    <div>
      <div className="page-head">
        <h1>Bài giảng</h1>
      </div>

      {loading && <Loading />}
      <ErrorBox message={error} onRetry={reload} />

      {!loading && !error && data.lessons.length === 0 && <div className="empty">Chưa có bài giảng nào được giao cho bạn.</div>}

      {!loading &&
        !error &&
        groupByChapter(data.lessons, data.chapters).map((g) => (
          <Fragment key={g.chapter?.id || 'none'}>
            <h2 className="section-title">{g.chapter ? g.chapter.title : 'Bài giảng khác'}</h2>
            <div className="list" style={{ marginBottom: '1.25rem' }}>
              {g.items.map((l) => (
                <Link key={l.id} to={`/student/lessons/${l.id}`} className="list-item">
                  <div className="list-item-title">📘 {l.title}</div>
                  <div className="row small">
                    {l.file_path && <span className="badge">📎 File</span>}
                    {l.video_url && <span className="badge">▶️ Video</span>}
                    <span className="muted">{formatDateTime(l.created_at)}</span>
                  </div>
                </Link>
              ))}
            </div>
          </Fragment>
        ))}
    </div>
  )
}
