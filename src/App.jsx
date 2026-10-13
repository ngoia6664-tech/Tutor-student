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

const TutorStudents = lazy(() => import('./pages/tutor/TutorStudents.jsx'))
const TutorAssignments = lazy(() => import('./pages/tutor/TutorAssignments.jsx'))
const AssignmentEditor = lazy(() => import('./pages/tutor/AssignmentEditor.jsx'))
const AssignmentTracking = lazy(() => import('./pages/tutor/AssignmentTracking.jsx'))
const ImportJson = lazy(() => import('./pages/tutor/ImportJson.jsx'))

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
        <Route index element={<TutorStudents />} />
        <Route path="assignments" element={<TutorAssignments />} />
        <Route path="assignments/new" element={<AssignmentEditor />} />
        <Route path="assignments/:id" element={<AssignmentTracking />} />
        <Route path="assignments/:id/edit" element={<AssignmentEditor />} />
        <Route path="import" element={<ImportJson />} />
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
