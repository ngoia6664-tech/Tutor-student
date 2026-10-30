import { supabase, unwrap } from './supabase.js'
import { deleteAssignment } from './assignments.js'
import { deleteLesson } from './lessons.js'

// Sửa nhiều / Xóa nhiều (gia sư). items = [{ kind: 'lesson'|'assignment', id, title, file_path?, submitted?, chapter_id? }]
// submitted: số học sinh đã nộp bài tập (để cảnh báo trước khi xóa).
const TABLE = { lesson: 'lessons', assignment: 'assignments' }

// "3 bài giảng + 2 bài tập"
export function itemsLabel(items) {
  const lessons = items.filter((it) => it.kind === 'lesson').length
  const assignments = items.filter((it) => it.kind === 'assignment').length
  return [lessons && `${lessons} bài giảng`, assignments && `${assignments} bài tập`].filter(Boolean).join(' + ') || '0 bài'
}

// Lời xác nhận trước khi xóa: nói rõ cái gì mất, bài nào đã có học sinh nộp
export function deleteWarning(items) {
  const parts = [`Sẽ xóa vĩnh viễn ${itemsLabel(items)}.`]
  if (items.some((it) => it.kind === 'lesson')) parts.push('Bài giảng: file đính kèm cũng bị xóa, bài tập liên kết vẫn giữ.')
  if (items.some((it) => it.kind === 'assignment')) parts.push('Bài tập: toàn bộ câu hỏi, đáp án, bài nộp và điểm sẽ mất.')
  const submitted = items.filter((it) => it.kind === 'assignment' && it.submitted > 0)
  if (submitted.length) parts.push(`⚠️ ${submitted.length} bài tập đã có học sinh nộp bài.`)
  return parts.join(' ')
}

// Chuyển chương: CHỈ đổi chapter_id, mọi trường khác giữ nguyên. chapterId '' / null = "Chưa xếp chương".
// Trả { moved, failed: [{ item, error }] } — bảng nào lỗi thì các bài của bảng đó nằm trong failed.
export async function moveToChapter(items, chapterId) {
  let moved = 0
  const failed = []
  for (const kind of Object.keys(TABLE)) {
    const list = items.filter((it) => it.kind === kind)
    if (!list.length) continue
    try {
      const rows = unwrap(
        await supabase
          .from(TABLE[kind])
          .update({ chapter_id: chapterId || null })
          .in('id', list.map((it) => it.id))
          .select('id'),
      )
      // RLS chặn thì không báo lỗi mà chỉ cập nhật 0 dòng → so lại từng bài
      const ok = new Set((rows || []).map((r) => r.id))
      moved += ok.size
      for (const it of list) if (!ok.has(it.id)) failed.push({ item: it, error: new Error('Không có quyền hoặc bài đã bị xóa.') })
    } catch (error) {
      for (const it of list) failed.push({ item: it, error })
    }
  }
  return { moved, failed }
}

// Xóa từng bài (lần lượt, tránh dồn tải lên Supabase) bằng đúng hàm xóa một bài đang dùng.
// Bài lỗi không chặn bài khác. Trả { done, failed: [{ item, error }] }
export async function deleteItems(items) {
  let done = 0
  const failed = []
  for (const it of items) {
    try {
      if (it.kind === 'lesson') await deleteLesson(it)
      else if (it.kind === 'assignment') await deleteAssignment(it.id)
      else throw new Error('Loại mục không hỗ trợ.')
      done += 1
    } catch (error) {
      failed.push({ item: it, error })
    }
  }
  return { done, failed }
}

// Bài giảng, bài tập nằm trong các chương (để xóa kèm khi xóa chương)
export async function chapterContent(chapterIds) {
  const [lessons, assignments] = await Promise.all([
    supabase.from('lessons').select('id, title, file_path, chapter_id').in('chapter_id', chapterIds).then(unwrap),
    supabase.from('assignments').select('id, title, chapter_id, assignment_recipients(status)').in('chapter_id', chapterIds).then(unwrap),
  ])
  return [
    ...lessons.map((l) => ({ kind: 'lesson', ...l })),
    ...assignments.map((a) => ({
      kind: 'assignment',
      id: a.id,
      title: a.title,
      chapter_id: a.chapter_id,
      submitted: a.assignment_recipients.filter((r) => r.status !== 'todo').length,
    })),
  ]
}

// Xóa nhiều chương. content = null: bài bên trong giữ lại (về "Chưa xếp chương", như xóa một chương);
// content = danh sách từ chapterContent: xóa các bài đó trước. Chương còn bài xóa lỗi thì GIỮ chương.
// Trả { chapters: số chương đã xóa, kept: số chương giữ lại, done, failed, chapterError }
export async function deleteChapters(chapterIds, content = null) {
  const r = content?.length ? await deleteItems(content) : { done: 0, failed: [] }
  const blocked = new Set(r.failed.map((f) => f.item.chapter_id))
  const ids = chapterIds.filter((id) => !blocked.has(id))
  let chapterError = null
  if (ids.length) {
    try {
      unwrap(await supabase.from('chapters').delete().in('id', ids))
    } catch (e) {
      chapterError = e
    }
  }
  const chapters = chapterError ? 0 : ids.length
  return { chapters, kept: chapterIds.length - chapters, ...r, chapterError }
}
