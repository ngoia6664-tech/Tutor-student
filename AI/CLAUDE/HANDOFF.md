# Claude — Handoff ca gần nhất

> Ghi đè mỗi ca, không giữ lịch sử dài hạn (lịch sử xem `git log`).

## Last task
Ca 25/10/2026 (commit `e228df6`, sau `c9c43af`). Owner yêu cầu:
1. **Ảnh SVG nhúng mờ trên nền tối**: chữ / viền màu xanh đậm, teal đậm chìm vào nền tối.
2. **Trang chấm bài khó dùng**: phải cuộn qua bảng đáp án rồi qua thẻ của từng học sinh; muốn một dòng tên học sinh để bấm chuyển,
   luôn hiện khi đang chấm bạn khác; gấu có lời thông báo.
3. **Thanh tiến độ khi làm bài**: chip câu chưa làm ghi "Câu X" → chỉ ghi "X".

## Status
DONE trong code, `npm run build` qua, đã commit + push. Chưa thử trên trình duyệt / điện thoại. Không đổi schema.

## Đã làm
### 1. Ảnh SVG trên nền tối (`src/lib/svg.js`, `flipNeutral`)
- Trước: app tối chỉ đảo màu trung tính (đen / xám), màu có sắc giữ nguyên → xanh đậm mờ.
- Giờ (chỉ khi app tối, chỉ hình **không** có khối `@media (prefers-color-scheme: dark)` riêng):
  màu có sắc tối (độ sáng cảm nhận < 0,5) → giữ sắc, nâng HSL lightness lên ≥ 0,72;
  màu có sắc rất nhạt (> 0,85, vd. nền ô xanh nhạt) → hạ lightness ≤ 0,2 để chữ đã làm sáng vẫn nổi. Theme sáng không đổi.
### 2. Chấm bài (`src/pages/tutor/AssignmentTracking.jsx`, CSS mới `src/styles/grading.css`)
- `GradeSwitcher`: thanh dính dưới header (dùng `useStickyTop` export từ `AnswerProgress.jsx`), một dòng chip tên học sinh vuốt ngang:
  chấm màu trạng thái (vàng chưa nộp / tím chờ chấm / xanh đã chấm) + điểm nếu đã chấm; chip đang chọn tự cuộn vào giữa dòng.
- Chỉ hiện `GradeCard` của học sinh đang chọn (mặc định: đầu danh sách, bài chờ chấm lên trước). Đổi học sinh → cuộn về đầu thẻ chấm.
  Chấm xong danh sách sắp xếp lại nhưng giữ nguyên bạn đang xem.
- `GradeCard` mở sẵn bài làm + đáp án khi học sinh đã nộp (trước phải bấm "Xem bài làm").
- Bảng đáp án (`AnswerKey`) + ghi chú cấu trúc đề chuyển xuống **cuối** trang.
- Gấu (`mascotSay`): mở trang nói số bài chờ chấm (một lần); đổi học sinh nói theo trạng thái ("Chấm bài của X nào ✏️" /
  "X chưa nộp bài đâu nha" / "Bài của X chấm rồi: n điểm").
### 3. Chip câu chưa làm (`src/components/AnswerProgress.jsx`, `styles/attempts.css`)
- Chip chỉ ghi số / nhãn đề ("3", "I.3"), `min-width: 2.2rem` để dễ bấm.

## Files changed
Mới: `src/styles/grading.css`. Sửa: `src/lib/svg.js`, `src/components/AnswerProgress.jsx`, `src/pages/tutor/AssignmentTracking.jsx`,
`src/styles/attempts.css`, `src/index.css`, `CLAUDE.md`.

## Kiểm tra đã làm
- `npm run build` qua. Chưa chạy thử trên trình duyệt / điện thoại.

## Needs QA (Codex)
1. Ảnh SVG trong bài giảng (file JSON mẫu "Từ khối lượng đến số mol"): theme tối chữ / viền đọc rõ; ô nền nhạt thành tối, chữ vẫn nổi;
   theme sáng như cũ; hình có khối dark riêng không đổi.
2. Chấm bài: thanh chọn học sinh dính dưới header khi cuộn; nhiều học sinh vuốt ngang được, không tràn ngang trang (360–390 px);
   bấm tên → đổi bài + cuộn về đầu thẻ; chấm / "Cho nộp lại" xong vẫn ở bạn đó; trạng thái + điểm trên chip cập nhật;
   bài chưa giao ai → hiện "Chọn học sinh"; gấu nói đúng câu; tắt Linh vật thì không lỗi.
3. Làm bài: chip câu chưa làm hiện "3" / "I.3", bấm vẫn nhảy đúng câu.
4. Còn tồn từ ca trước (`c9c43af`, `b0470a2`): chạy lại `supabase/schema.sql` rồi QA gấu bị chọc, hộp thoại có gấu, xóa chuyên đề,
   ghi chú câu khó, QA4-01..03 — chi tiết xem `git show c9c43af:AI/CLAUDE/HANDOFF.md`.

## Known limits
- Đảo màu SVG theo ngưỡng độ sáng: màu tươi độ sáng vừa (vd. đỏ tươi) giữ nguyên; `opacity` thấp trong hình không được xử lý.
- Thanh chọn học sinh không có nút "bài tiếp theo"; chuyển bằng cách bấm tên.
