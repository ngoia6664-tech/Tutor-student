import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import { configError } from './lib/supabase.js'
import ConfigError from './pages/ConfigError.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import { AuthProvider } from './contexts/AuthContext.jsx'
import App from './App.jsx'
import SpaceBackdrop from './components/SpaceBackdrop.jsx'
import { installPressFx } from './lib/pressFx.js'

installPressFx()

// Tab mở từ trước khi deploy bản mới: file JS cũ đã bị xóa → tải lại trang một lần để lấy bản mới (tránh màn trống)
window.addEventListener('vite:preloadError', (e) => {
  if (sessionStorage.getItem('reloaded-for-update')) return
  e.preventDefault()
  sessionStorage.setItem('reloaded-for-update', '1')
  location.reload()
})
setTimeout(() => sessionStorage.removeItem('reloaded-for-update'), 10000)

// Service worker (cài app lên màn hình chính). Chỉ bản build, để lúc dev không bị dùng file cũ
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => {}))
}

const root = createRoot(document.getElementById('root'))

// Thiếu .env thì báo lỗi rõ ràng thay vì trang trắng
if (configError) {
  root.render(<ConfigError message={configError} />)
} else {
  root.render(
    <StrictMode>
      <ErrorBoundary>
        <SpaceBackdrop />
        <BrowserRouter>
          <AuthProvider>
            <App />
          </AuthProvider>
        </BrowserRouter>
      </ErrorBoundary>
    </StrictMode>
  )
}
