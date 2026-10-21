# Gia sư Vật lý — bản đồ dự án cho Claude

React 19 + Vite 8 + react-router 7, backend Supabase (Postgres + RLS + Storage), deploy Vercel (SPA).
Markdown + KaTeX cho nội dung. Không có test tự động, không có linter. Kiểm tra: `npm run build`.
Mọi chữ hiển thị và comment viết **tiếng Việt**. Ưu tiên giao diện điện thoại.

## Quy tắc tiết kiệm ngữ cảnh (bắt buộc)
- **Không đọc nguyên file** `README.md`, `supabase/schema.sql`, `package-lock.json`, `dist/`.
  Dùng Grep tìm đúng chỗ rồi Read với `offset`/`limit`.
- File > 15KB (AssignmentEditor, ImportJson, Library, StudentAssignment, importTutorLesson,
  AssignmentTracking): grep tên hàm/chuỗi cần sửa trước, chỉ đọc đoạn liên quan.
- Đã biết file cần sửa thì mở thẳng, không liệt kê lại thư mục.
- Không cần khảo sát lại cấu trúc: dùng bản đồ bên dưới. Nếu bản đồ sai/thiếu, sửa file này.

## Bản đồ code
- `src/main.jsx` điểm vào · `src/App.jsx` route · `src/pages/registry.js` lazy-load trang + prefetch theo vai trò.
- `src/contexts/` — `AuthContext` (phiên + profile/role), `NotificationsContext` (bài mới cho học sinh).
- `src/pages/tutor/` — `TutorStudents` (/tutor), `StudentDetail`, `Library` (cây Lớp›Môn›Chuyên đề›Chương),
  `TutorAssignments`, `AssignmentEditor` (soạn/sửa bài tập), `AssignmentTracking` (theo dõi/chấm),
  `TutorLessons`, `TutorLessonView`, `LessonEditor`, `ImportJson` (dán JSON), `TutorReports` (báo lỗi đề).
- `src/pages/student/` — `StudentHome`, `StudentAssignment` (làm/nộp bài) + `SubmitPanel`, `StudentResults`,
  `StudentMistakes` (Ôn câu sai: câu `is_correct=false`, làm lại chấm trên máy qua `lib/practice.js`),
  `StudentLibrary`, `StudentLesson`.
- PWA: `public/manifest.webmanifest`, `public/sw.js` (chỉ cache index.html + /assets, không cache Supabase),
  đăng ký trong `main.jsx` (chỉ bản build), `components/InstallBanner.jsx` gợi ý cài app.
- `src/lib/` — `supabase` client · `useAsync` hook tải dữ liệu · `errors` lỗi→tiếng Việt · `format` ngày/nhãn ·
  `files` tên file, nén ảnh · `chapters` cây chương, sắp xếp, URL thư viện · `exam` đề THPT (điểm, phần, giờ) ·
  `importJson` đọc/kiểm tra JSON · `importTutorLesson` định dạng `tutor-lesson/v1` → bài giảng + bài tập ·
  `outline` đọc mục lục dán vào · `studentReport` thống kê học sinh · `svg` đổi màu SVG theo theme, gói ảnh ·
  `theme` · `reports` đếm báo lỗi · `assignments`/`lessons`/`students`/`submissions` truy vấn.
- `src/components/` — `ExerciseBody` (hiển thị 1 câu theo loại), `ExamParts` (phần đề, phiếu trả lời, đồng hồ),
  `AnswerKey` (bảng đáp án gia sư), `TreePicker`/`ChapterSelect`/`LessonSelect` (ô chọn dạng cây),
  `TreeNav` (cây mục lục, nhớ nút mở), `FilterTree` (lọc theo cây qua URL `?lop=&mon=&cd=&ch=`),
  `ChapterForms`, `ChapterGroups`, `OutlineImport`, `ReportQuestion`, `NotificationBell`, `Layout`,
  `ProtectedRoute`, `Markdown`/`MarkdownField`, `Icon`, `ThemeToggle`.
- Loại câu hỏi: tự luận, trắc nghiệm, điền khuyết, đúng/sai (4 ý), trả lời ngắn.

## CSS
`src/index.css` chỉ `@import` các file trong `src/styles/` (thứ tự = thứ tự cascade). Màu dùng biến trong `base.css`;
theme qua `<html data-theme="dark|light">`.
- `base` biến màu, nền, chữ · `layout` khung trang, thanh trên, menu · `components` khối, nhãn, nút, skeleton, form,
  thông báo, loading, đăng nhập · `content` bài giảng, markdown, câu hỏi/đáp án, ảnh nộp, bảng, soạn thảo, video, điểm
- `mobile` media query điện thoại chung · `library` thư viện dạng cây · `notifications` chuông + toast · `icons`
- `exam` đề THPT + tính giờ · `student-detail` trang một học sinh · `tree-picker` nhập mục lục + ô chọn cây ·
  `reports` báo lỗi đề
Thêm style mới: đặt vào file đúng chủ đề (hoặc tạo file mới + thêm `@import`), không dồn vào `index.css`.

## Supabase (`supabase/schema.sql`, ~1050 dòng, chạy lại được nhiều lần)
Tìm bằng `grep -n "<tên bảng hoặc hàm>"`. Các phần (số dòng xấp xỉ):
1. Bảng ~10–178: `profiles`, `lessons`, `lesson_recipients`, `assignments`, `exercises`, `answer_keys`,
   `assignment_recipients`, `submission_answers`, `chapters` + các khối "Nâng cấp" (`alter table ... add column if not exists`)
2–4. ~180–260: `is_tutor()`, trigger `handle_new_user`, trigger `guard_assignment_recipient_update`
5. RLS ~262–420: policy theo từng bảng (comment `-- ---------- <bảng> ----------`)
6. Hàm ~424–980: `save_lesson`, `save_assignment`, `ensure_chapter`, chấm điểm (`normalize_answer`, `short_match`,
   `tf_count`, `grade_answer`, `answer_points`), `submit_assignment`, `start_assignment`, `mark_notifications_seen`,
   bảng `question_reports` + `report_exercise`
7. Storage ~984–cuối: bucket riêng tư + policy
Đổi schema: thêm khối idempotent (`if not exists`, `create or replace`) để người dùng chạy lại cả file trong SQL Editor.

## Phạm vi
App chỉ lo bài giảng + bài tập. Không thêm lịch học, điểm danh, học phí (đã có app khác).

## Bất biến quan trọng
- Đáp án nằm ở `answer_keys` (tách khỏi `exercises`); học sinh chỉ đọc được sau khi nộp (RLS). Không bao giờ gửi đáp án
  xuống trình duyệt học sinh trước khi nộp; chấm điểm làm ở SQL (`submit_assignment`).
- Học sinh không UPDATE `assignment_recipients` / không ghi `submission_answers` trực tiếp, chỉ qua hàm RPC.
- Lưu nhiều bảng dùng RPC `save_assignment` / `save_lesson` (1 transaction).
- Trang mới: thêm vào `pages/registry.js` + route trong `App.jsx`.
