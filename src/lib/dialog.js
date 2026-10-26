// Hộp thoại có Gấu Trúc (components/DialogHost.jsx, đặt trong Layout) thay cho window.confirm / alert.
// Gọi được từ bất kỳ đâu, không cần truyền props:
//   if (!(await askConfirm({ ... }))) return
//   notifyDone({ title: 'Đã xóa', say: '...' })   // tự tắt sau 2 giây
// Chưa có DialogHost (vd. trang đăng nhập): dùng hộp mặc định của trình duyệt.

let host = null

// DialogHost đăng ký hàm mở hộp thoại; trả về hàm hủy đăng ký
export function registerDialogHost(open) {
  host = open
  return () => {
    if (host === open) host = null
  }
}

/**
 * Hỏi xác nhận. Trả về Promise<boolean> (bấm ra ngoài / Esc / Hủy = false).
 * - title: câu hỏi chính · message: giải thích thêm (không bắt buộc)
 * - say: lời gấu trong bong bóng
 * - scene: cảnh minh họa có sẵn (components/DialogScene.jsx): 'logout' cửa ra vào · 'submit' khay nộp bài ·
 *   'submitted' bài có dấu tích · 'delete' thùng rác + cảnh báo (gấu nghiêm mặt) · 'deleted' thùng rác sạch
 * - không có scene: pose 'sit' | 'teach' | 'cheer' | 'wait' | 'dizzy' + emoji cạnh gấu
 * - confirmText / cancelText · danger: nút xác nhận màu đỏ (xóa), khi đó mặc định chọn sẵn nút Hủy
 */
export function askConfirm(opts) {
  if (!host) return Promise.resolve(window.confirm([opts.title, opts.message].filter(Boolean).join('\n\n')))
  return new Promise((resolve) => host({ type: 'confirm', ...opts, resolve }))
}

/**
 * Thông báo xong việc (xóa / nộp thành công). Tự tắt sau autoClose ms (mặc định 2000),
 * bấm × hoặc bấm ra ngoài để tắt sớm. confetti: bắn pháo giấy (theo Cài đặt "Hiệu ứng ăn mừng").
 */
export function notifyDone(opts) {
  if (!host) return
  host({ type: 'done', scene: 'submitted', autoClose: 2000, ...opts })
}

/**
 * Báo lỗi / thông tin cần đọc (thay window.alert): không tự tắt, bấm × hoặc ra ngoài để đóng.
 */
export function notifyError(title, message) {
  if (!host) return window.alert([title, message].filter(Boolean).join('\n\n'))
  host({ type: 'done', title, message, say: 'Ối, có trục trặc rồi. Bạn thử lại nhé!' })
}

// Lời gấu cho từng hành động hay dùng
export function confirmDelete(kind, name, message) {
  return askConfirm({
    title: `Xóa ${kind} "${name}"?`,
    message,
    say: `Xóa ${kind} này thì không thể hoàn tác đâu nha. Bạn chắc chắn muốn xóa chứ?`,
    scene: 'delete',
    confirmText: 'Xóa',
    danger: true,
  })
}

// Chưa chọn học sinh nào mà vẫn lưu bài giảng / bài tập
export function confirmNoStudents(kind) {
  return askConfirm({
    title: 'Chưa chọn học sinh nào',
    message: `Lưu ${kind} mà chưa giao cho ai? Bạn có thể giao sau.`,
    say: 'Chưa có bạn nào nhận bài này đâu nha. Vẫn lưu chứ?',
    confirmText: 'Vẫn lưu',
  })
}

// Bỏ chọn học sinh đã nộp bài: bài nộp + điểm sẽ mất
export function confirmDropSubmitted(count) {
  return askConfirm({
    title: `Bỏ ${count} học sinh đã nộp bài?`,
    message: 'Bài nộp và điểm của các em sẽ bị xóa, không hoàn tác được.',
    say: 'Các bạn này đã nộp bài rồi đó. Bỏ chọn là mất cả bài nộp lẫn điểm luôn!',
    scene: 'delete',
    confirmText: 'Vẫn bỏ',
    danger: true,
  })
}

export function notifyDeleted(kind) {
  notifyDone({ title: `Đã xóa ${kind}`, say: `Xong rồi! ${kind[0].toUpperCase()}${kind.slice(1)} đã được dọn sạch sẽ ✨`, scene: 'deleted' })
}
