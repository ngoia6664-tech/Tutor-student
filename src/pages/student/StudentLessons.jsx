import { useRemembered } from '../../lib/navMemory.js'
import { Link } from 'react-router-dom'
import { supabase, unwrap } from '../../lib/supabase.js'
import { useAsync } from '../../lib/useAsync.js'
import { formatDate } from '../../lib/format.js'
import { fetchStudentChapters } from '../../lib/chapters.js'
import { findStudyChapter, useStudyChapterId } from '../../lib/studyNow.js'
import { useAuth } from '../../contexts/AuthContext.jsx'
import { useNotifications } from '../../contexts/NotificationsContext.jsx'
import Loading from '../../components/Loading.jsx'
import ErrorBox from '../../components/ErrorBox.jsx'
import ChapterGroups from '../../components/ChapterGroups.jsx'
import FilterTree, { matchItem, selectionLabel, useTreeSelection } from '../../components/FilterTree.jsx'
import StudyNow from '../../components/StudyNow.jsx'
import StudyNowButton from '../../components/StudyNowButton.jsx'

// Bài giảng (học sinh): mọi bài giảng được giao, gom theo chương; bấm bài là vào học ngay.
// Cây bên trái (Môn › Chuyên đề › Chương của lớp mình) lọc danh sách; 📍 = chương đang học.
// Bài mới giao (chuông thông báo) nổi lên mục "Mới giao" ở đầu trang.
export default function StudentLessons() {
  const { profile } = useAuth()
  const { isNew } = useNotifications()
  const sel = useTreeSelection()
  const studyId = useStudyChapterId()
  const [q, setQ] = useRemembered('student-lessons-q', '', (v) => typeof v === 'string')

  const { data, loading, error, reload } = useAsync(async () => {
    const [rows, chapters] = await Promise.all([
      supabase
        .from('lesson_recipients')
        .select('assigned_at, lesson:lessons(id, title, created_at, chapter_id, file_path, video_url)')
        .eq('student_id', profile.id)
        .then(unwrap),
      fetchStudentChapters(profile.grade ?? null),
    ])
    const lessons = rows
      .filter((r) => r.lesson)
      .map((r) => ({ ...r.lesson, assigned_at: r.assigned_at }))
      .sort((a, b) => (a.created_at < b.created_at ? -1 : 1))
    return { lessons, chapters }
  }, [profile.id, profile.grade])

  const lessons = data?.lessons || []
  const chapters = data?.chapters || []
  const chapterById = new Map(chapters.map((c) => [c.id, c]))
  const where = selectionLabel(sel, chapterById, 'Bài khác')
  const now = findStudyChapter(chapters, studyId)
  const key = q.trim().toLowerCase()
  const shown = lessons.filter((l) => matchItem(l, chapterById, sel) && (!key || l.title.toLowerCase().includes(key)))
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
    <div className="library">
      <FilterTree
        title="Bài giảng"
        icon="lesson"
        chapters={chapters}
        items={lessons}
        badgeIf={(l) => isNew(l.assigned_at)}
        hideEmpty
        nowId={now?.id}
        noneLabel="Bài khác"
        storageKey="lessons-tree-open"
      />
      <section className="library-main">
        <div className="page-head">
          <div>
            <h1>Bài giảng</h1>
            {where && <p className="muted small page-sub">{where}</p>}
          </div>
          {chapterById.has(sel.ch) && <StudyNowButton chapterId={sel.ch} />}
        </div>
        {!where && !loading && <StudyNow chapter={now} />}

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
        {!loading && !error && lessons.length > 0 && shown.length === 0 && (
          <div className="empty">{key ? 'Không tìm thấy bài giảng phù hợp.' : 'Mục này chưa có bài giảng.'}</div>
        )}

        {!loading && !error && fresh.length > 0 && (
          <>
            <h2 className="section-title">Mới giao</h2>
            <div className="list" style={{ marginBottom: '1.25rem' }}>
              {fresh.map(renderLesson)}
            </div>
          </>
        )}
        {!loading && !error && shown.length > 0 && (
          <ChapterGroups items={shown} chapters={chapters} renderItem={renderLesson} chapterUrl={(id) => `/student/library/${id}`} nowId={now?.id} />
        )}
      </section>
    </div>
  )
}
