import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import { configError } from './lib/supabase.js'
import ConfigError from './pages/ConfigError.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import { AuthProvider } from './contexts/AuthContext.jsx'
import App from './App.jsx'

const root = createRoot(document.getElementById('root'))

// Thiếu .env thì báo lỗi rõ ràng thay vì trang trắng
if (configError) {
  root.render(<ConfigError message={configError} />)
} else {
  root.render(
    <StrictMode>
      <ErrorBoundary>
        <BrowserRouter>
          <AuthProvider>
            <App />
          </AuthProvider>
        </BrowserRouter>
      </ErrorBoundary>
    </StrictMode>
  )
}
