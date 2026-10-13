import { supabase, unwrap, LESSON_BUCKET } from './supabase.js'
import { safeFileName } from './files.js'

function randomFolder() {
  if (globalThis.crypto?.randomUUID) return crypto.randomUUID()
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

// Tải file đính kèm lên Storage, trả về đường dẫn
export async function uploadLessonFile(file) {
  const path = `${randomFolder()}/${safeFileName(file.name)}`
  unwrap(
    await supabase.storage.from(LESSON_BUCKET).upload(path, file, {
      contentType: file.type || 'application/octet-stream',
      upsert: false,
    })
  )
  return path
}

export async function removeLessonFile(path) {
  if (!path) return
  unwrap(await supabase.storage.from(LESSON_BUCKET).remove([path]))
}

// Link tải tạm thời (bucket riêng tư) – RLS chỉ cho học sinh được giao bài
export async function lessonFileUrl(path) {
  const data = unwrap(await supabase.storage.from(LESSON_BUCKET).createSignedUrl(path, 3600))
  return data.signedUrl
}

export async function deleteLesson(lesson) {
  unwrap(await supabase.from('lessons').delete().eq('id', lesson.id))
  if (lesson.file_path) {
    try {
      await removeLessonFile(lesson.file_path)
    } catch (e) {
      console.warn('Không xóa được file bài giảng', e)
    }
  }
}
