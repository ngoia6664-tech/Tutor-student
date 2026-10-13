// Hiện khi thiếu biến môi trường Supabase (thay vì trang trắng)
export default function ConfigError({ message }) {
  return (
    <div className="page narrow">
      <div className="alert alert-error" role="alert">
        <strong>Chưa cấu hình Supabase.</strong> {message}
      </div>
    </div>
  )
}
