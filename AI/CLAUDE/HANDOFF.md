# Claude — Handoff ca gần nhất

> Ghi đè mỗi ca, không giữ lịch sử dài hạn (lịch sử xem `git log`).

## Last task
Ca 24/10/2026 (sau commit `eb813d8`): Owner yêu cầu **4 tính năng làm bài / chấm bài**, sau đó bổ sung nút "Câu khó" ở mục Câu sai:
1. Gia sư xem đáp án ngay trong bài làm của học sinh khi chấm.
2. Học sinh đánh dấu **câu khó** để làm lại sau (như báo lỗi đề), chỉ mất khi bấm bỏ đánh dấu, làm lại không giới hạn.
3. Học sinh **làm lại bài đã nộp** tối đa 3 lần; điểm chính thức vẫn là lần nộp đầu (trừ khi gia sư "Cho nộp lại").
4. **Thanh tiến độ** đã làm / chưa làm / tổng dính dưới header khi làm bài, ẩn/hiện được, bấm câu chưa làm để nhảy tới.

## Status
DONE trong code, `npm run build` qua, đã commit + push (gồm cả bản sửa 3 lỗi Codex báo bên dưới). Codex đã QA vòng 1 (`AI/CODEX/HANDOFF.md`).

## Sửa lỗi Codex QA vòng 1 (cần Codex chạy lại bước tái hiện)
- **QA4-01** nhảy câu bị thanh tiến độ che: `AnswerProgress` đo header + chính thanh (ResizeObserver) → biến `--answer-offset` trên `<html>`
  (gỡ khi rời trang); `attempts.css` `.question { scroll-margin-top: calc(var(--answer-offset, 64px) + 0.75rem) }`;
  nhảy câu dùng `block: 'start'` (cả `AnswerProgress` và phiếu trả lời `ExamNav` trong `ExamParts.jsx`).
- **QA4-02** gia sư ẩn đáp án → lựa chọn đúng bị tô đỏ: `ExerciseBody` MCQ chỉ gán `is-wrong` khi có `correct` để so;
  ẩn đáp án → lựa chọn trung tính (badge đúng/sai/điểm ở đầu câu vẫn giữ).
- **QA4-03** gợi ý "có thể chụp ảnh" ở luồng không đính ảnh: `ExerciseBody` thêm prop `photoHint` (mặc định true);
  tắt ở lần làm lại (`AnswerView` retry) và trang Ôn tập.
- Needs QA lại: QA4-01 (390×844 + desktop, thanh mở/thu, câu cao hơn màn hình, phiếu trả lời đề thi), QA4-02 (Ẩn/Hiện đáp án đề THPT), QA4-03.
**Owner phải chạy lại `supabase/schema.sql`** trong SQL Editor (thêm bảng + hàm mới, idempotent). Chưa chạy thì trang vẫn mở được
(các truy vấn mới bỏ qua lỗi), nhưng nút Câu khó / Làm lại báo lỗi.

## Đã làm
### Schema (`supabase/schema.sql`, cuối mục 6, trước Storage)
- Bảng `question_marks (exercise_id, student_id, created_at)`, PK 2 cột. RLS: gia sư toàn quyền; học sinh select/delete của mình,
  insert chỉ câu thuộc bài được giao cho mình.
- Bảng `assignment_retries (assignment_id, student_id, attempt_no 1..3, answers jsonb, correct, auto_total, points, max_points, submitted_at)`,
  FK tới `assignment_recipients` (cascade). RLS: gia sư toàn quyền, học sinh chỉ select của mình.
- RPC `submit_retry(p_assignment_id, p_answers)` (security definer): khóa dòng `assignment_recipients`, chỉ cho khi status ≠ 'todo',
  tối đa 3 lần; chấm bằng `grade_answer` / `answer_points` có sẵn; lưu tóm tắt điểm; KHÔNG đụng `assignment_recipients` / `submission_answers`.

### 1. Gia sư xem đáp án (`pages/tutor/AssignmentTracking.jsx`)
- `AnswerSheet`: mỗi câu hiện ô **Đáp án** (`answer_md`), **Phương pháp giải** (`method_md`), tô đáp án đúng; nút **Ẩn/Hiện đáp án**.
  Câu chưa có đáp án ghi "Câu này chưa nhập đáp án".
- Nút "Xem bài làm & đáp án" hiện với mọi bài đã nộp (trước chỉ khi có câu trả lời gõ/chọn → bài chỉ nộp ảnh không xem được đề + đáp án).

### 2. Câu khó
- `components/MarkHard.jsx` + `lib/marks.js` (`loadMarks`, `setMark`). Nút ☆ "Câu khó" / ★ "Bỏ đánh dấu" trên nhãn câu, trước nút Báo lỗi đề,
  ở cả lúc làm bài, xem lại bài, làm lại.
- Trang `StudentMistakes` (menu học sinh đổi tên **"Ôn câu sai" → "Ôn tập"**): 2 mục **Câu sai** / **⭐ Câu khó**.
  Mục Câu khó: làm lại vô hạn, chấm trên máy, chỉ mất khi bỏ đánh dấu. Mục Câu sai cũng có nút Câu khó; đánh dấu xong câu sang mục Câu khó ngay.
  Bài gốc chưa nộp → khóa nút kiểm tra, ghi "chưa có đáp án" (đáp án chỉ mở sau khi nộp — giữ bất biến).
  Câu tự luận: nút "Xem đáp án" hiện đáp án + phương pháp.

### 3. Làm lại bài (tối đa 3 lần)
- `lib/retries.js`: `MAX_RETRIES`, `loadRetries`, `submitRetry`, `retryScore` (đề thi "x/10", bài thường "a/b câu đúng").
- `StudentAssignment`: `ReviewView` có thẻ **"Các lần làm"** (`RetryCard`): chip **Chính thức** đậm (điểm gia sư, chưa chấm thì điểm máy),
  chip các lần làm lại nhỏ/nhạt, bấm để xem đáp án đúng/sai của lần đó; nút "Làm lại bài (còn n/3 lần)".
  Làm lại = `AnswerView` với `retry`: bài trống, không tính giờ, không ảnh, nháp riêng `draft-retry:*`, có nút "Thôi, không làm lại".
- `SubmitPanel`: prop `retry(payload)` → bỏ phần ảnh, nộp qua `submit_retry`.
- Điểm làm lại hiện nhạt (`.retry-line`) ở `StudentResults` và thẻ chấm của gia sư. Điểm TB học sinh chỉ tính điểm chính thức (không đổi).
- Lời xác nhận "Cho nộp lại" của gia sư ghi thêm: lần nộp tới sẽ thành bài chính thức.

### 4. Thanh tiến độ (`components/AnswerProgress.jsx`)
- `position: sticky`, `top` = chiều cao `.topbar` (đo bằng ResizeObserver). "Đã làm x · Chưa làm y / tổng" + vạch tiến độ;
  mở ra liệt kê chip câu chưa làm (nhãn như đề, vd. "I.3"), bấm cuộn tới câu. Ẩn/Hiện nhớ ở localStorage `answer-progress-open`.

## Files changed
Mới: `src/components/AnswerProgress.jsx`, `src/components/MarkHard.jsx`, `src/lib/marks.js`, `src/lib/retries.js`, `src/styles/attempts.css`.
Sửa: `supabase/schema.sql`, `src/pages/student/StudentAssignment.jsx`, `src/pages/student/SubmitPanel.jsx`, `src/pages/student/StudentMistakes.jsx`,
`src/pages/student/StudentResults.jsx`, `src/pages/tutor/AssignmentTracking.jsx`, `src/pages/tutor/TutorFeedback.jsx` (nhãn trang "Ôn tập"),
`src/lib/assignments.js` (`fetchAssignmentFull` trả thêm `retriesByStudent`), `src/components/Icon.jsx` (icon `star`),
`src/components/Layout.jsx` (nhãn menu), `src/index.css` (import attempts.css), `src/components/ExerciseBody.jsx`, `src/components/ExamParts.jsx` (sửa QA4-01..03), `CLAUDE.md`, `CURRENT_STATE.md`.

## Kiểm tra đã làm
- `npm run build` qua.
- Chưa chạy SQL trên Supabase, chưa thử trên trình duyệt / điện thoại.

## Quyết định tự chọn (Owner có thể đổi)
- Gia sư "Cho nộp lại" **không** xóa các lần làm lại cũ; chúng vẫn tính vào giới hạn 3 lần.
- Câu tự luận chỉ nộp bằng ảnh vẫn tính "chưa làm" trên thanh tiến độ.
- Đề thi có tính giờ: lần làm lại không tính giờ.

## Needs QA (Codex)
1. Chạy lại `schema.sql` không lỗi (chạy 2 lần liên tiếp).
2. Gia sư: "Xem bài làm & đáp án" có đáp án + phương pháp mọi loại câu; Ẩn/Hiện đáp án; bài chỉ nộp ảnh vẫn mở được.
3. Câu khó: đánh dấu khi đang làm / sau khi nộp / ở mục Câu sai → có trong Ôn tập › Câu khó; tải lại vẫn còn; làm lại nhiều lần;
   "Bỏ đánh dấu" mới mất. Bài chưa nộp: câu khó không kiểm tra được và KHÔNG lộ đáp án (kiểm tra network).
4. Làm lại: đủ 3 lần thì hết nút; lần thứ 4 gọi thẳng RPC bị từ chối; bấm nộp 2 lần nhanh không tạo quá 3 lần;
   điểm chính thức và Điểm TB ở Kết quả không đổi; chip các lần + xem lại từng lần đúng; nháp làm lại không lẫn nháp bài chính thức.
5. Gia sư "Cho nộp lại" → học sinh nộp lại → thành điểm chính thức; các lần làm lại vẫn hiện.
6. Thanh tiến độ: dính dưới header khi cuộn (iPhone, Android, desktop, PWA), không che menu / chuông thông báo;
   số câu cập nhật khi trả lời; bấm chip nhảy đúng câu; ẩn/hiện nhớ sau tải lại; đề thi tính giờ vẫn hiện đồng hồ nổi bình thường.
7. Giao diện theme sáng + tối cho thanh tiến độ, nút Câu khó, thẻ "Các lần làm".

## Known limits
- Lần làm lại không đính kèm ảnh; câu tự luận lần làm lại không được chấm (học sinh tự so đáp án).
