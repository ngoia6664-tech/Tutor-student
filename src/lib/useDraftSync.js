import { useCallback, useEffect, useRef, useState } from 'react'
import { deleteServerDraft, draftCount, fetchServerDraft, pushServerDraft, readDraftTime } from './drafts.js'

const PUSH_DELAY_MS = 2000

// Đồng bộ bản nháp trang làm bài lên máy chủ để đổi thiết bị vẫn còn (bản trên máy vẫn là nơi ghi tức thì).
// Mở bài: lấy bản trên máy chủ, mới hơn bản trên máy thì thay vào (trừ khi học sinh đã gõ trong lúc chờ).
// Sau đó mỗi lần sửa, chờ 2 giây rồi đẩy lên; rời trang thì đẩy nốt. Lỗi mạng / bảng chưa có: bỏ qua, vẫn dùng bản trên máy.
// shortcut: tải bản máy chủ lỗi thì cả phiên không đẩy lên (tránh đè bản mới hơn), nâng cấp: thử tải lại.
// Trả về `clear`: gọi khi đã nộp bài để xóa bản nháp trên máy chủ và ngừng đồng bộ.
/**
 * @param {string} assignmentId @param {boolean} retry @param {string} key khóa nháp trên máy
 * @param {Record<string, any>} answers @param {(a: Record<string, any>) => void} setAnswers
 */
export function useDraftSync(assignmentId, retry, key, answers, setAnswers) {
  const [synced, setSynced] = useState(false)
  const first = useRef(answers) // nếu answers đã khác → học sinh đã gõ
  const latest = useRef(answers)
  latest.current = answers
  const pushed = useRef(/** @type {string | null} */ (null)) // JSON bản đã đẩy / đã nhận từ máy chủ
  const done = useRef(false)
  const ready = useRef(false)

  useEffect(() => {
    let off = false
    fetchServerDraft(assignmentId, retry)
      .then((s) => {
        if (off) return
        if (s) {
          pushed.current = JSON.stringify(s.answers)
          if (s.at > readDraftTime(key) && latest.current === first.current) setAnswers(s.answers)
        }
        ready.current = true
        setSynced(true)
      })
      .catch(() => {})
    return () => {
      off = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assignmentId, retry, key])

  const push = useCallback(() => {
    const a = latest.current
    const json = JSON.stringify(a)
    if (done.current || !ready.current || json === pushed.current || !draftCount(a)) return
    pushed.current = json
    pushServerDraft(assignmentId, retry, a).catch(() => {
      if (pushed.current === json) pushed.current = null
    })
  }, [assignmentId, retry])

  useEffect(() => {
    if (!synced) return
    const t = setTimeout(push, PUSH_DELAY_MS)
    return () => clearTimeout(t)
  }, [synced, answers, push])

  // Rời trang: đẩy nốt những gì gõ trong 2 giây cuối
  useEffect(() => push, [push])

  return useCallback(() => {
    done.current = true
    deleteServerDraft(assignmentId, retry).catch(() => {})
  }, [assignmentId, retry])
}
