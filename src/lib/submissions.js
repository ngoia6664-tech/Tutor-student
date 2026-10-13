import { supabase, unwrap, SUBMISSION_BUCKET } from './supabase.js'

// Lấy danh sách ảnh bài nộp trong thư mục <student_id>/<assignment_id>
// và tạo link tạm (1 giờ) vì bucket là riêng tư.
export async function loadSubmissionImages(folder) {
  if (!folder) return []
  const files = unwrap(
    await supabase.storage.from(SUBMISSION_BUCKET).list(folder, {
      limit: 100,
      sortBy: { column: 'name', order: 'asc' },
    })
  )
  const real = (files || []).filter((f) => f.id) // bỏ các mục là thư mục con
  if (!real.length) return []
  const paths = real.map((f) => `${folder}/${f.name}`)
  const signed = unwrap(await supabase.storage.from(SUBMISSION_BUCKET).createSignedUrls(paths, 3600))
  return signed.filter((s) => s.signedUrl).map((s) => ({ path: s.path, url: s.signedUrl }))
}
