// Chuyển lỗi kỹ thuật thành câu tiếng Việt dễ hiểu
export function errMsg(err) {
  if (!err) return 'Lỗi không xác định'
  const raw = typeof err === 'string' ? err : err.message || err.error_description || JSON.stringify(err)

  if (/Invalid login credentials/i.test(raw)) return 'Email hoặc mật khẩu không đúng.'
  if (/Email not confirmed/i.test(raw)) return 'Email chưa được xác nhận. Gia sư cần bật "Auto Confirm" khi tạo tài khoản (xem README).'
  if (/Failed to fetch|NetworkError|Load failed/i.test(raw)) return 'Không kết nối được máy chủ. Kiểm tra mạng hoặc VITE_SUPABASE_URL.'
  if (/JWT expired/i.test(raw)) return 'Phiên đăng nhập đã hết hạn. Hãy đăng xuất và đăng nhập lại.'
  if (/row-level security|violates row-level/i.test(raw)) return 'Bạn không có quyền thực hiện thao tác này.'
  if (/Payload too large|exceeded the maximum allowed size/i.test(raw)) return 'File quá lớn.'
  if (/mime type .* is not supported/i.test(raw)) return 'Định dạng file không được hỗ trợ.'
  // CSDL trên Supabase còn là bản cũ (thiếu cột/bảng/hàm mới của app)
  if (/column .* does not exist|relation .* does not exist|Could not find the .* in the schema cache|function .* does not exist/i.test(raw))
    return `Cơ sở dữ liệu chưa được cập nhật theo phiên bản app mới (${raw}). Gia sư hãy mở Supabase > SQL Editor, dán TOÀN BỘ file supabase/schema.sql và bấm Run (chạy lại an toàn, không mất dữ liệu), rồi tải lại trang.`
  return raw
}
