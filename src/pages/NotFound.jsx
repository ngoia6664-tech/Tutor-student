import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <div className="page narrow">
      <div className="card">
        <h2>Không tìm thấy trang</h2>
        <p className="muted">Đường dẫn không tồn tại hoặc đã bị xóa.</p>
        <Link className="btn" to="/">
          Về trang chủ
        </Link>
      </div>
    </div>
  )
}
