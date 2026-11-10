import Loading from './Loading.jsx'

// Trang gốc "/": luôn mở trang chủ giới thiệu (home.html, trang riêng ngoài SPA).
// Vào app qua nút Đăng nhập → /login (đã đăng nhập thì /login tự chuyển theo vai trò).
export default function RootRedirect() {
  window.location.replace('/home.html')
  return <Loading full />
}
