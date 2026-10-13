import { Route, Routes } from 'react-router-dom'
import Login from './pages/Login.jsx'
import NotFound from './pages/NotFound.jsx'
import Layout from './components/Layout.jsx'
import ProtectedRoute from './components/ProtectedRoute.jsx'
import RootRedirect from './components/RootRedirect.jsx'

function Placeholder({ title }) {
  return (
    <div className="card">
      <h2>{title}</h2>
      <p className="muted">Đang xây dựng.</p>
    </div>
  )
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<RootRedirect />} />
      <Route path="/login" element={<Login />} />

      <Route
        path="/tutor"
        element={
          <ProtectedRoute role="tutor">
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Placeholder title="Trang gia sư" />} />
        <Route path="*" element={<NotFound />} />
      </Route>

      <Route
        path="/student"
        element={
          <ProtectedRoute role="student">
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Placeholder title="Trang học sinh" />} />
        <Route path="*" element={<NotFound />} />
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}
