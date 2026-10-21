import { Navigate, Route, Routes, useLocation, useParams } from 'react-router-dom'
import Login from './pages/Login.jsx'
import NotFound from './pages/NotFound.jsx'
import Layout from './components/Layout.jsx'
import ProtectedRoute from './components/ProtectedRoute.jsx'
import RootRedirect from './components/RootRedirect.jsx'
import { Pages } from './pages/registry.js'

const {
  StudentHome,
  StudentAssignment,
  StudentResults,
  StudentMistakes,
  StudentLibrary,
  StudentLesson,
  TutorStudents,
  StudentDetail,
  Library,
  TutorAssignments,
  AssignmentEditor,
  AssignmentTracking,
  ImportJson,
  TutorReports,
  TutorLessons,
  TutorLessonView,
  LessonEditor,
} = Pages

// /tutor/chapters(/:id) → /tutor/library(/:id), giữ nguyên ?lop=&mon=&cd=
function OldChaptersRedirect() {
  const { id } = useParams()
  const { search } = useLocation()
  return <Navigate to={(id ? `/tutor/library/${id}` : '/tutor/library') + search} replace />
}

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
        <Route path="students/:id" element={<StudentDetail />} />
        <Route path="library/:id?" element={<Library />} />
        {/* Link cũ của mục Chương */}
        <Route path="chapters" element={<OldChaptersRedirect />} />
        <Route path="chapters/:id" element={<OldChaptersRedirect />} />
        <Route path="assignments" element={<TutorAssignments />} />
        <Route path="assignments/new" element={<AssignmentEditor />} />
        <Route path="assignments/:id" element={<AssignmentTracking />} />
        <Route path="assignments/:id/edit" element={<AssignmentEditor />} />
        <Route path="lessons" element={<TutorLessons />} />
        <Route path="lessons/new" element={<LessonEditor />} />
        <Route path="lessons/:id" element={<TutorLessonView />} />
        <Route path="lessons/:id/edit" element={<LessonEditor />} />
        <Route path="import" element={<ImportJson />} />
        <Route path="reports" element={<TutorReports />} />
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
        <Route path="mistakes" element={<StudentMistakes />} />
        <Route path="library/:id?" element={<StudentLibrary />} />
        {/* Trang "Bài giảng" cũ nay nằm trong Thư viện */}
        <Route path="lessons" element={<Navigate to="/student/library" replace />} />
        <Route path="lessons/:id" element={<StudentLesson />} />
        <Route path="*" element={<NotFound />} />
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}
