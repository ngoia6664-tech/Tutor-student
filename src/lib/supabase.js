import { createClient } from '@supabase/supabase-js'

// Đọc key từ biến môi trường (file .env), không hardcode
const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const configError =
  !url || !anonKey
    ? 'Thiếu VITE_SUPABASE_URL hoặc VITE_SUPABASE_ANON_KEY. Hãy tạo file .env từ .env.example (xem README) rồi chạy lại npm run dev.'
    : null

export const supabase = configError ? null : createClient(url, anonKey)

// Tên bucket Storage (tạo trong schema.sql)
export const LESSON_BUCKET = 'lesson-files'
export const SUBMISSION_BUCKET = 'submissions'

// Ném lỗi nếu truy vấn Supabase thất bại, trả về data nếu thành công
export function unwrap(result) {
  if (result.error) throw result.error
  return result.data
}
