import { Component } from 'react'
import Icon from './Icon.jsx'

// Bắt lỗi khi render để không bao giờ hiện trang trắng
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    console.error('Lỗi giao diện:', error, info)
  }

  render() {
    if (this.state.error) {
      return (
        <div className="page narrow">
          <div className="alert alert-error" role="alert">
            <strong>Trang gặp lỗi:</strong> {String(this.state.error.message || this.state.error)}
            <div className="alert-actions">
              <button type="button" className="btn btn-small" onClick={() => window.location.reload()}>
                <Icon name="refresh" />
                Tải lại trang
              </button>
              <a className="btn btn-small btn-ghost" href="/">
                <Icon name="home" />
                Về trang chủ
              </a>
            </div>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
