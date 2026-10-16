import { Link } from 'react-router-dom'
import Icon from '../components/Icon.jsx'

export default function NotFound() {
  return (
    <div className="page narrow">
      <div className="card">
        <h2>Không tìm thấy trang</h2>
        <p className="muted">Đường dẫn không tồn tại hoặc đã bị xóa.</p>
        <Link className="btn" to="/">
          <Icon name="home" />
          Về trang chủ
        </Link>
      </div>
    </div>
  )
}
