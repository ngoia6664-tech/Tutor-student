# Claude — Handoff ca gần nhất

> Ghi đè mỗi ca, không giữ lịch sử dài hạn (lịch sử xem `git log`).

## Last task
Ca 26/10/2026, 2 commit: `de1313e` (tính năng chấm bài) + commit hiệu năng / hộp thoại ngay sau. Owner yêu cầu:
1. **Cho nộp lại sau khi chấm**: Owner báo đã lưu chấm thì không cho học sinh nộp lại được.
2. **Lời phê từng câu** khi chấm, nhãn "Giáo viên chấm:".
3. **Câu sai hiện ở đầu bài chấm**, bấm để nhảy (giống thanh câu chưa làm).
4. **Trang chấm lag khi gõ** → rồi mở rộng: mọi ô nhập làm cả trang vẽ lại (vd. Nhập JSON chọn đề THPT rồi chỉnh giờ thi rất lag).
5. **Mọi hộp hỏi / báo của app** đổi thành hộp thoại có gấu (như đăng xuất, xóa chương).

## Status
DONE trong code, `npm run build` qua, đã commit + push. Chưa thử trên trình duyệt / điện thoại.
**Có đổi schema**: phải chạy lại `supabase/schema.sql` (bảng mới `answer_comments`) trước khi QA mục 2.

## Đã làm
### 1. Cho nộp lại (`AssignmentTracking.jsx` › `GradeCard.reopen`)
- Nút "Cho nộp lại" đã có từ trước nhưng dùng `window.confirm` → bị chặn trong app cài trên điện thoại (PWA), bấm không có tác dụng
  (nguyên nhân suy ra, chưa tái hiện trên máy Owner). Đổi sang `askConfirm`.
- Khi mở lại: lưu lời phê từng câu + nhận xét chung trước, rồi xóa ảnh nộp kèm, đưa về `todo` (giữ `score`, `feedback`; câu trả lời cũ vẫn giữ).
  Xong hiện `notifyDone`. Thẻ chấm ghi "↻ Đã mở lại cho học sinh nộp lại" khi `todo` mà đã có câu trả lời.
- Học sinh (`StudentAssignment` › `AnswerView`): `reopened` = không phải làm lại luyện tập + có `submission_answers` + status `todo`
  → khung "Gia sư đã cho bạn nộp lại bài này" kèm nhận xét chung + số câu có lời phê; lời phê hiện dưới từng câu khi sửa.
### 2. Lời phê "Giáo viên chấm:" (bảng `answer_comments`, `src/lib/answerNotes.js`)
- Bảng mới: khóa `(exercise_id, student_id)`, FK tới `assignment_recipients` (cascade). RLS: gia sư toàn quyền, học sinh chỉ đọc của mình.
  Tách khỏi `submission_answers` vì `submit_assignment` xóa / ghi lại câu trả lời khi nộp lại, và câu bỏ trống vẫn phê được.
- `loadAnswerNotes(assignmentId, studentId?)` → `{ student_id: { exercise_id: note } }`; bảng chưa có thì trả `{}` (không làm hỏng trang).
  `saveAnswerNotes(..., notes, prev)` chỉ gửi câu thay đổi: có chữ → upsert, xóa trắng → xóa dòng.
- Gia sư: ô textarea dưới từng câu trong `AnswerSheet`; ghi khi "Lưu chấm" hoặc "Cho nộp lại". `fetchAssignmentFull` trả thêm `notesByStudent`.
- Học sinh: `TeacherNote` (khung viền đỏ `.teacher-note`) dưới câu ở ReviewView (ẩn khi đang xem một lần làm lại) và ở AnswerView khi được mở lại.
### 3. Thanh câu sai (`src/components/ResultProgress.jsx`, CSS cuối phần thanh tiến độ trong `styles/attempts.css`)
- Dùng lại khung `.answer-progress` + `useStickyTop` (export lại từ `AnswerProgress.jsx`). Đầu thanh: Đúng / Sai / Bỏ trống / tổng; vạch xanh = tỉ lệ đúng.
  Mở ra: chip "Câu sai" (đỏ), "Bỏ trống", "Có lời phê" (tím) → bấm nhảy tới `${idPrefix}${exercise_id}`. Nhớ mở / thu gọn ở localStorage `result-progress-open`.
- Học sinh: đầu ReviewView (theo lần đang xem). Gia sư: đầu `AnswerSheet` khi đã nộp, câu có id `g-<exercise_id>`.
- Câu đúng/sai 4 ý chỉ đúng một phần (`is_correct=false`) được tính là "Sai".
### 4. Hiệu năng ô nhập
- Nguyên nhân chính: mỗi phím gõ vẽ lại cả trang → mọi `Markdown` dựng lại + KaTeX + `themedSvg`.
- `components/Markdown.jsx`: bọc `memo`, plugin / `components` thành hằng số module → chỉ vẽ lại khi chữ đổi (có lợi cho cả app).
- `AssignmentTracking`: `AnswerSheet` memo, mỗi câu là `SheetQuestion` memo, `onNote` qua `useCallback`; `questionLabels` / `groupExercises` qua `useMemo`.
- `AssignmentEditor`: mỗi câu là `ExerciseEditCard` memo; `set` / `updateEx` / `moveEx` / `removeEx` qua `useCallback`, `labels` qua `useMemo`.
- `ImportJson`: `LessonPreview` / `AssignmentPreview` bọc memo.
### 5. Hộp thoại có gấu thay toàn bộ `window.confirm` / `window.alert` (`src/lib/dialog.js`)
- Hàm mới: `notifyError(title, message)` (hộp không tự tắt), `confirmNoStudents(kind)`, `confirmDropSubmitted(count)` (cảnh xóa, nút đỏ).
- Đã thay: lưu bài tập / bài giảng khi chưa chọn học sinh, bỏ chọn học sinh đã nộp (AssignmentEditor, QuickAssign), xóa góp ý (TutorFeedback, `confirmDelete`),
  lỗi đánh dấu câu khó (MarkHard), chấm bài chưa nộp + Cho nộp lại (AssignmentTracking). `grep window.confirm|window.alert` trong `src/` chỉ còn fallback trong `dialog.js`.

## Files changed
Mới: `src/lib/answerNotes.js`, `src/components/ResultProgress.jsx`.
Sửa: `supabase/schema.sql`, `src/lib/assignments.js`, `src/lib/dialog.js`, `src/components/{AnswerProgress,Markdown,MarkHard,QuickAssign}.jsx`,
`src/pages/tutor/{AssignmentTracking,AssignmentEditor,ImportJson,LessonEditor,TutorFeedback}.jsx`, `src/pages/student/StudentAssignment.jsx`,
`src/styles/attempts.css`, `CLAUDE.md`.

## Kiểm tra đã làm
- `npm run build` qua. Chưa chạy thử trên trình duyệt / điện thoại, chưa đo hiệu năng thật.

## Needs QA (Codex)
0. Chạy lại `supabase/schema.sql` trong SQL Editor.
1. Cho nộp lại: chấm (Lưu chấm) → "Cho nộp lại" → hộp gấu hiện (cả trên app cài điện thoại) → học sinh thấy khung "Gia sư đã cho bạn nộp lại",
   câu trả lời cũ còn, nhận xét + lời phê hiện; nộp lại → gia sư thấy "Chờ chấm", chấm lại được. Ảnh nộp cũ đã bị xóa.
2. Lời phê: gõ dưới vài câu (kể cả câu bỏ trống) → Lưu chấm → tải lại vẫn còn; xóa trắng một câu → Lưu → mất ở phía học sinh.
   Học sinh thấy khung "Giáo viên chấm:" dưới đúng câu; xem một lần làm lại thì không hiện. Học sinh khác không đọc được (RLS).
3. Thanh câu sai: học sinh xem bài đã nộp + gia sư trang chấm → số Đúng / Sai / Bỏ trống đúng; bấm chip nhảy đúng câu, đầu câu không bị thanh che;
   đề thi nhãn "I.3"; thu gọn được; điện thoại 360–390 px không tràn ngang.
4. Hiệu năng: đề dài nhiều công thức — gõ điểm / nhận xét / lời phê ở trang chấm; đổi giờ thi, hạn nộp ở Nhập JSON và Soạn bài tập → không còn khựng.
   Soạn bài tập: sửa nội dung, đổi loại câu, lên / xuống / xóa câu vẫn đúng; nút "Xem trước" vẫn hiện công thức.
5. Hộp thoại: lưu bài tập / bài giảng không chọn học sinh; bỏ chọn học sinh đã nộp (soạn bài + nút Giao nhanh); xóa góp ý; Esc / bấm ngoài = Hủy.

## Known limits
- Ô dán JSON lớn ở Nhập JSON vẫn vẽ lại trang mỗi ký tự (nhẹ hơn nhiều vì phần xem trước đã memo); nếu còn chậm với file rất dài thì tách riêng ô này.
- Lời phê không tự xóa khi học sinh nộp lại: gia sư tự sửa / xóa khi chấm lần sau.
- Mở lại bài vẫn giữ `score` cũ trong `assignment_recipients` (trạng thái `todo`) cho tới khi chấm lại.
