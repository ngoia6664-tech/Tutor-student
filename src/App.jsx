import { lazy } from 'react'
import { Route, Routes } from 'react-router-dom'
import Login from './pages/Login.jsx'
import NotFound from './pages/NotFound.jsx'
import Layout from './components/Layout.jsx'
import ProtectedRoute from './components/ProtectedRoute.jsx'
import RootRedirect from './components/RootRedirect.jsx'

// Tải trang khi cần để học sinh trên điện thoại mở app nhanh hơn
const StudentHome = lazy(() => import('./pages/student/StudentHome.jsx'))
const StudentAssignment = lazy(() => import('./pages/student/StudentAssignment.jsx'))
const StudentResults = lazy(() => import('./pages/student/StudentResults.jsx'))

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
        <Route index element={<StudentHome />} />
        <Route path="assignments/:id" element={<StudentAssignment />} />
        <Route path="results" element={<StudentResults />} />
        <Route path="*" element={<NotFound />} />
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}
