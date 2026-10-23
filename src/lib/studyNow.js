import { useSyncExternalStore } from 'react'
import { supabase, unwrap } from './supabase.js'
import { useAuth } from '../contexts/AuthContext.jsx'

// Chương "đang học" của học sinh: lưu trên máy chủ (profiles.study_chapter_id), đổi qua RPC set_study_chapter.
// - Tự đổi khi học sinh mở một bài tập CHƯA NỘP để làm → chương của bài tập đó (trang StudentAssignment).
// - Học sinh tự bấm "📍 Đánh dấu đang học" ở một chương / bài giảng (components/StudyNowButton.jsx).
// - Không làm gì thì giữ nguyên chương đã đánh dấu. Gia sư giao bài mới KHÔNG làm đổi.
// Hồ sơ trong AuthContext chỉ tải lúc đăng nhập, nên giá trị đổi trong phiên giữ ở đây (theo từng tài khoản).
let local = { userId: null, id: undefined }
const listeners = new Set()
const subscribe = (fn) => (listeners.add(fn), () => listeners.delete(fn))
const snapshot = () => local

export function useStudyChapterId() {
  const { profile } = useAuth()
  const s = useSyncExternalStore(subscribe, snapshot)
  if (s.userId === profile?.id && s.id !== undefined) return s.id
  return profile?.study_chapter_id ?? null
}

// Đặt chương đang học (null = bỏ). current: giá trị đang hiện, trùng thì không gọi máy chủ.
export async function setStudyChapter(userId, chapterId, current) {
  if (!userId || chapterId === current) return
  unwrap(await supabase.rpc('set_study_chapter', { p_chapter_id: chapterId }))
  local = { userId, id: chapterId }
  listeners.forEach((fn) => fn())
}

// Chương đang học trong danh sách chương của trang (không có trong cây → null)
export const findStudyChapter = (chapters, id) => (id ? chapters.find((c) => c.id === id) || null : null)
