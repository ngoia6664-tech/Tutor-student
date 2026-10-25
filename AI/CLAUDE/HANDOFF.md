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

### 4. Sổ chấm bài nổi trên đầu gấu (Owner yêu cầu thêm, **CHƯA commit / push** — Owner xem bản local trước)
- Thay thanh dính dưới header bằng `GradeDock` (AssignmentTracking.jsx): bảng đen nhỏ `position: fixed` góc phải, đứng ngay trên gấu
  (cùng chất liệu bảng đen gấu giảng bài: nền xanh bảng, khung tím, tiêu đề phấn vàng Patrick Hand; giữ tối ở cả theme sáng).
- Nhỏ gọn (Owner chốt): rộng 200px (điện thoại 180px). Đầu sổ: "Sổ chấm bài" + "n chờ chấm" + nút thu gọn / mở
  (nhớ localStorage `grade-dock-open`; mặc định máy tính mở, điện thoại thu gọn).
- Danh sách dọc (cuộn trong sổ, tối đa 200px / 30vh), dòng thấp 32px: chấm màu (vòng rỗng = chưa nộp, vàng đặc = chờ chấm,
  xanh đặc = đã chấm) + tên + điểm nếu đã chấm; bạn đang chấm có vệt phấn vàng. Bấm tên là chuyển bài, **không** có nút ‹ › / số trang (Owner bỏ).
- Vị trí: có gấu → trên đầu gấu (desktop 104px, điện thoại 76px); gấu cất → trên nút tròn; tắt Linh vật → sát góc.
  z-index 7 (dưới gấu 8: bong bóng lời gấu đè lên sổ vài giây). `.page` chừa đáy 20rem (mở) / 10rem (thu gọn).
- Sổ render qua `createPortal` vào `<body>`: trong khung trang (có animation transform) `position: fixed` bị neo theo khung,
  phải cuộn xuống mới thấy (Owner báo). Nút "Ẩn" / "Hiện" dạng chữ ở đầu sổ.
- **Bấm gấu = ẩn / hiện sổ** (Owner chọn): store `lib/gradeDock.js` (`useGradingMode` gọi trong AssignmentTracking khi có học sinh,
  `useGrading`, `useGradeDockOpen`, `toggleGradeDock`; nhớ localStorage `grade-dock-open`, mặc định mở). Khi đang chấm, Mascot:
  bấm → toggle sổ (bỏ qua giảng / nhắc / chống bấm dồn dập), không đi dạo, bỏ lời từ trang khác (`mascotSay`), vào trang thì tắt bong bóng đang nói.
  Trang chấm bài không còn gọi `mascotSay` (đầu sổ đã ghi số bài chờ chấm). Có gấu + sổ ẩn → ẩn hẳn; gấu cất / tắt Linh vật → còn đầu sổ với nút "Hiện".
  Sổ nâng cao hơn đầu gấu (khe 1rem, điện thoại 0.8rem).
- Animation gấu khi ẩn / hiện sổ: hiện → class `dock-show` (nhảy 1 nhịp, vung đũa `gd-wand`, sao lấp lánh) + tiếng `cheer`,
  sổ mở thì gấu giữ tư thế giơ đũa chỉ lên sổ, mặt cười (`FrontPanda pose="teach" face="happy"`, không animation liên tục);
  ẩn → `dock-hide` (nhún người `gd-tuck`) + tiếng `hide`. CSS ở `grading.css`; tắt Animation của Panda thì đứng yên.
- `useStickyTop` trong AnswerProgress trở lại nội bộ.

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
