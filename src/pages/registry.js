import { lazy } from 'react'

// Mỗi trang là một file JS riêng, chỉ tải khi cần (mở app nhanh trên điện thoại).
const loaders = {
  student: {
    StudentHome: () => import('./student/StudentHome.jsx'),
    StudentAssignment: () => import('./student/StudentAssignment.jsx'),
    StudentResults: () => import('./student/StudentResults.jsx'),
    StudentLessons: () => import('./student/StudentLessons.jsx'),
    StudentLesson: () => import('./student/StudentLesson.jsx'),
  },
  tutor: {
    TutorStudents: () => import('./tutor/TutorStudents.jsx'),
    TutorAssignments: () => import('./tutor/TutorAssignments.jsx'),
    AssignmentEditor: () => import('./tutor/AssignmentEditor.jsx'),
    AssignmentTracking: () => import('./tutor/AssignmentTracking.jsx'),
    ImportJson: () => import('./tutor/ImportJson.jsx'),
    TutorLessons: () => import('./tutor/TutorLessons.jsx'),
    TutorLessonView: () => import('./tutor/TutorLessonView.jsx'),
    LessonEditor: () => import('./tutor/LessonEditor.jsx'),
  },
}

export const Pages = Object.fromEntries(
  Object.values(loaders).flatMap((group) => Object.entries(group).map(([name, load]) => [name, lazy(load)]))
)

// Sau khi đăng nhập, tải sẵn các trang của vai trò đó lúc trình duyệt rảnh,
// để bấm menu là trang hiện ngay, không phải chờ tải mã.
let done = false
export function prefetchPages(role) {
  if (done || !loaders[role]) return
  done = true
  const run = () => Object.values(loaders[role]).forEach((load) => load().catch(() => {}))
  if ('requestIdleCallback' in window) window.requestIdleCallback(run, { timeout: 3000 })
  else setTimeout(run, 1500)
}
