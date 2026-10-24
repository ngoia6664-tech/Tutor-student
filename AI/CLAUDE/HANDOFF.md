# Claude — Handoff ca gần nhất

> Ghi đè mỗi ca, không giữ lịch sử dài hạn (lịch sử xem `git log`).

## Last task
Ca 24/10/2026 (sau commit `b0470a2`). Owner yêu cầu:
1. **Gấu chống bấm dồn dập**: bấm liên tục thì gấu trêu → nhắc làm bài → giận, nằm giả ngủ vài giây.
2. **Ghi chú cho câu khó**: mỗi học sinh ghi kiến thức riêng cho từng câu đã đánh dấu (Owner chọn: chỉ học sinh xem).
3. **Hộp thoại có gấu** thay `window.confirm` cho: đăng xuất, xóa chương / chuyên đề / bài giảng / bài tập, học sinh nộp bài;
   gấu ngồi ở góc hộp nói câu hợp hành động; xóa / nộp xong hiện hộp "thành công" tự tắt sau 2 s (có ×, bấm ngoài cũng tắt).
   Owner chọn **thêm nút "Xóa chuyên đề"** (trước đây chưa có).

## Status
DONE trong code, `npm run build` qua, đã commit + push. Chưa thử trên trình duyệt / điện thoại.
**Owner phải chạy lại `supabase/schema.sql`** (thêm cột `question_marks.note`, policy update, bỏ policy gia sư của `question_marks`).

## Đã làm
### 1. Gấu bị chọc (`components/Mascot.jsx`, `styles/mascot.css`)
- `reactToSpam()` đếm lần bấm trong 4 s: 1–2 phản hồi bình thường; 3–4 "Bạn thích bấm tôi lắm à? 👀" (ngẫu nhiên 3 câu);
  5–6 "Bài tập vẫn còn kia kìa…"; ≥ 7 → mood mới `sulk`: vẽ `SleepingPanda` + 😤 + zz, bong bóng "Hừm, giận rồi!" 2,5 s,
  bấm trong 6 s bị lờ đi, hết giờ gấu nói "hết giận rồi". Chạy cả khi đang làm bài (trước câu khóa).
### 2. Ghi chú câu khó
- Schema: `question_marks.note text default ''` (≤ 4000 ký tự), policy `question_marks_own_update`; **bỏ** `question_marks_tutor_all`
  (gia sư không đọc được câu khó / ghi chú — đúng lựa chọn của Owner).
- `lib/marks.js`: `loadMarks` trả `Map id → note`, thêm `saveMarkNote`, `NOTE_MAX`.
- `components/HardNote.jsx`: "Thêm ghi chú" → ô Markdown (có KaTeX) → Lưu / Hủy; hiện ghi chú khung vàng đứt nét, nút Sửa.
  Chỉ hiện ở Ôn tập › ⭐ Câu khó, ngay dưới nhãn câu.
- `MarkHard`: prop `hasNote` → bỏ đánh dấu câu có ghi chú thì hỏi lại (vì xóa dòng = mất ghi chú).
### 3. Hộp thoại (`lib/dialog.js`, `components/DialogHost.jsx`, `styles/dialog.css`)
- `askConfirm(opts)` → Promise<boolean>; `notifyDone(opts)` (mặc định gấu cheer, tự tắt 2000 ms, vạch đếm ngược, `confetti` theo Cài đặt);
  helper `confirmDelete(kind, name, message)` / `notifyDeleted(kind)`. Chưa có host (trang đăng nhập) → rơi về `window.confirm`.
- `DialogHost` đặt trong `Layout`, portal vào body, z-index 300: nền tối, Esc / bấm ngoài = Hủy, Tab vòng trong hộp, khóa cuộn trang,
  trả focus về nút cũ; xóa → focus sẵn nút Hủy. Hộp hỏi đang mở thì hộp mới xếp hàng. Tắt "Linh vật Panda" thì hộp vẫn có, không vẽ gấu.
  Có tiếng gấu (`mascotSound`) theo "Hiệu ứng âm thanh".
- Áp dụng: đăng xuất (`Layout`, 3 câu "tôi sẽ nhớ bạn lắm"), xóa chương + **xóa chuyên đề mới** (`Library`, nút đỏ ở trang chuyên đề:
  xóa mọi chương trong chuyên đề, bài giảng / bài tập chuyển "Chưa xếp chương"), xóa bài giảng (`TutorLessons`),
  xóa bài tập (`TutorAssignments`, `AssignmentTracking`), nộp bài + nộp lần làm lại (`SubmitPanel`; liệt kê câu chưa làm trong lời gấu).
  Nộp xong: `notifyDone` + pháo giấy thay cho `celebrate` (gấu góc trang không nói trùng nữa).
- **Cảnh minh họa theo hành động** (Owner yêu cầu thêm trong ca): `components/DialogScene.jsx`, option `scene` của askConfirm / notifyDone:
  `logout` gấu buồn (lông mày chùng, nước mắt rơi) nghiêng về **cánh cửa EXIT** hé mở có ánh sáng; `submit` tờ bài làm bay vào **khay "NỘP BÀI"**;
  `submitted` gấu cười híp nhảy + tờ bài có **dấu tích tự vẽ** + sao lấp lánh; `delete` gấu **nghiêm mặt** (nhíu mày, miệng thẳng, mồ hôi),
  **thùng rác mở nắp + biển cảnh báo đỏ** nhấp nháy, hộp viền đỏ dày + tiêu đề đỏ; `deleted` gấu vui + thùng rác sạch lấp lánh.
  `PandaArt` `FrontPanda` thêm prop `face` ('normal' | 'sad' | 'serious' | 'happy'), gấu góc trang không đổi.
  Giảm chuyển động / tắt "Animation của Panda" thì cảnh đứng yên. Đã tự chụp ảnh 5 cảnh (SSR + Edge headless) theme sáng/tối: hiển thị đúng.
- Các `window.confirm` khác (chấm khi chưa nộp, cho nộp lại, bỏ chọn học sinh, lưu khi chưa chọn học sinh, xóa góp ý) **giữ nguyên** — ngoài phạm vi Owner nêu.

## Files changed
Mới: `src/lib/dialog.js`, `src/components/DialogHost.jsx`, `src/components/DialogScene.jsx`, (sửa thêm `src/components/PandaArt.jsx`), `src/components/HardNote.jsx`, `src/styles/dialog.css`.
Sửa: `supabase/schema.sql`, `src/components/{Layout,Mascot,MarkHard}.jsx`, `src/lib/{celebrate,marks}.js` (`burstConfetti` mới),
`src/pages/student/{StudentAssignment,StudentMistakes,SubmitPanel}.jsx`, `src/pages/tutor/{Library,TutorLessons,TutorAssignments,AssignmentTracking}.jsx`,
`src/styles/{attempts,mascot}.css`, `src/index.css`, `CLAUDE.md`, `CURRENT_STATE.md`.

## Kiểm tra đã làm
- `npm run build` qua. Chưa chạy SQL, chưa thử trên trình duyệt / điện thoại.

## Needs QA (Codex)
1. Gấu: bấm 1–2 lần bình thường; 3–4 lần nhanh trêu; 5–6 nhắc bài; ≥ 7 nằm giả ngủ 😤 ~6 s, bấm lúc đó không phản ứng, rồi tự hết giận.
   Đang làm bài vẫn đúng; tắt "Animation của Panda" vẫn ổn.
2. Hộp thoại: đăng xuất (Ở lại / Đăng xuất), xóa chương, xóa chuyên đề, xóa bài giảng, xóa bài tập (danh sách + trang theo dõi), nộp bài
   (đủ câu / thiếu câu / làm lại), hết giờ tự nộp không hỏi. Esc, bấm ngoài, Tab, focus trả về; hộp thành công tự tắt 2 s, ×, bấm ngoài.
   Điện thoại 360–390 px: gấu không tràn khỏi màn hình, nút đủ to; theme sáng/tối; tắt Linh vật thì hộp không có gấu.
3. Xóa chuyên đề: mọi chương mất, bài giảng / bài tập còn ở "Chưa xếp chương", trang chuyển về môn.
4. Ghi chú: thêm / sửa / lưu, công thức `$...$` hiển thị; tải lại vẫn còn; tài khoản học sinh khác và gia sư **không** đọc được
   (`question_marks` qua REST); bỏ đánh dấu câu có ghi chú → hỏi lại → mất ghi chú; ở trang làm bài cũng hỏi lại.
5. Chạy lại `schema.sql` 2 lần không lỗi.
6. Còn tồn từ ca trước (commit `b0470a2`): QA lại QA4-01 (nhảy câu không bị thanh tiến độ che), QA4-02 (gia sư ẩn đáp án không tô đỏ
   lựa chọn đúng), QA4-03 (không gợi ý chụp ảnh ở lần làm lại / Ôn tập) + các mục chưa xác minh trong `AI/CODEX/HANDOFF.md`.

## Known limits
- Ghi chú chỉ sửa ở Ôn tập › Câu khó (trang làm bài chỉ có nút đánh dấu).
- Bỏ policy gia sư của `question_marks`: gia sư không còn xem được thống kê câu khó (trước đó UI cũng chưa dùng).
