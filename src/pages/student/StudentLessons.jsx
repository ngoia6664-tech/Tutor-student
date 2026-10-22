import { useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase, unwrap } from '../../lib/supabase.js'
import { useAsync } from '../../lib/useAsync.js'
import { formatDate } from '../../lib/format.js'
import { useAuth } from '../../contexts/AuthContext.jsx'
import { useNotifications } from '../../contexts/NotificationsContext.jsx'
import Loading from '../../components/Loading.jsx'
import ErrorBox from '../../components/ErrorBox.jsx'
import ChapterGroups from '../../components/ChapterGroups.jsx'
import Icon from '../../components/Icon.jsx'

// Bài giảng (học sinh): mọi bài giảng được giao, gom theo chương; bấm bài là vào học ngay.
// Bài mới giao (chuông thông báo) nổi lên mục "Mới giao" ở đầu trang.
export default function StudentLessons() {
  const { profile } = useAuth()
  const { isNew } = useNotifications()
  const [q, setQ] = useState('')

  const { data, loading, error, reload } = useAsync(async () => {
    const [rows, chapters] = await Promise.all([
      supabase
        .from('lesson_recipients')
        .select('assigned_at, lesson:lessons(id, title, created_at, chapter_id, file_path, video_url)')
        .eq('student_id', profile.id)
        .then(unwrap),
      // RLS: học sinh chỉ đọc được các chương có bài được giao cho mình
      supabase.from('chapters').select('id, title, section, grade, subject, sort_order').then(unwrap),
    ])
    const lessons = rows
      .filter((r) => r.lesson)
      .map((r) => ({ ...r.lesson, assigned_at: r.assigned_at }))
      .sort((a, b) => (a.created_at < b.created_at ? -1 : 1))
    return { lessons, chapters }
  }, [profile.id])

  const lessons = data?.lessons || []
  const key = q.trim().toLowerCase()
  const shown = key ? lessons.filter((l) => l.title.toLowerCase().includes(key)) : lessons
  const fresh = shown.filter((l) => isNew(l.assigned_at))

  function renderLesson(l) {
    return (
      <Link key={l.id} to={`/student/lessons/${l.id}`} state={{ from: 'lessons' }} className="list-item">
        <div className="list-item-title">
          📘 {l.title} {isNew(l.assigned_at) && <span className="badge badge-new">Mới</span>}
        </div>
        <div className="row small">
          {l.file_path && <span className="badge">📎 File</span>}
          {l.video_url && <span className="badge">▶️ Video</span>}
          <span className="muted">{formatDate(l.created_at)}</span>
        </div>
      </Link>
    )
  }

  return (
    <div>
      <div className="page-head">
        <h1>
          <span className="title-icon">
            <Icon name="lesson" />
          </span>
          Bài giảng
        </h1>
      </div>

      {lessons.length > 4 && (
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Tìm bài giảng…"
          aria-label="Tìm bài giảng"
          style={{ marginBottom: '1rem' }}
        />
      )}

      {loading && <Loading />}
      <ErrorBox message={error} onRetry={reload} />

      {!loading && !error && lessons.length === 0 && <div className="empty">Chưa có bài giảng nào được giao cho bạn.</div>}
      {!loading && !error && lessons.length > 0 && shown.length === 0 && <div className="empty">Không tìm thấy bài giảng phù hợp.</div>}

      {!loading && !error && fresh.length > 0 && (
        <>
          <h2 className="section-title">Mới giao</h2>
          <div className="list" style={{ marginBottom: '1.25rem' }}>
            {fresh.map(renderLesson)}
          </div>
        </>
      )}
      {!loading && !error && shown.length > 0 && (
        <ChapterGroups items={shown} chapters={data.chapters} renderItem={renderLesson} chapterUrl={(id) => `/student/library/${id}`} />
      )}
    </div>
  )
}
