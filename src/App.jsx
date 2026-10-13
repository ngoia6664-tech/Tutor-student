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
const StudentLessons = lazy(() => import('./pages/student/StudentLessons.jsx'))
const StudentLesson = lazy(() => import('./pages/student/StudentLesson.jsx'))

const TutorStudents = lazy(() => import('./pages/tutor/TutorStudents.jsx'))
const TutorAssignments = lazy(() => import('./pages/tutor/TutorAssignments.jsx'))
const AssignmentEditor = lazy(() => import('./pages/tutor/AssignmentEditor.jsx'))
const AssignmentTracking = lazy(() => import('./pages/tutor/AssignmentTracking.jsx'))
const ImportJson = lazy(() => import('./pages/tutor/ImportJson.jsx'))
const TutorLessons = lazy(() => import('./pages/tutor/TutorLessons.jsx'))
const TutorLessonView = lazy(() => import('./pages/tutor/TutorLessonView.jsx'))
const LessonEditor = lazy(() => import('./pages/tutor/LessonEditor.jsx'))

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<RootRedirect />} />
      <Route path="/login" element={<Login />} />

      {/* Chỉ gia sư. Học sinh vào đây sẽ bị chuyển về /student */}
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
        <Route path="lessons" element={<TutorLessons />} />
        <Route path="lessons/new" element={<LessonEditor />} />
        <Route path="lessons/:id" element={<TutorLessonView />} />
        <Route path="lessons/:id/edit" element={<LessonEditor />} />
        <Route path="import" element={<ImportJson />} />
        <Route path="*" element={<NotFound />} />
      </Route>

      {/* Chỉ học sinh. Gia sư vào đây sẽ được chuyển về /tutor */}
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
        <Route path="lessons" element={<StudentLessons />} />
        <Route path="lessons/:id" element={<StudentLesson />} />
        <Route path="*" element={<NotFound />} />
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}
