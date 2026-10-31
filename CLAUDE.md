# Gia sư Vật lý — bản đồ dự án cho Claude

React 19 + Vite 8 + react-router 7, backend Supabase (Postgres + RLS + Storage), deploy Vercel (SPA).
Markdown + KaTeX cho nội dung. Không có linter. Kiểm tra: `npm run build` + `npm test` (Vitest, `tests/*.test.js`: logic thuần trong `src/lib`) + `npm run typecheck` (tsc, `checkJs`: kiểm tra kiểu cả file .js/.jsx).
TypeScript: file mới có thể viết `.ts/.tsx`; kiểu props/tham số trong .js dùng JSDoc (`/** @param {{...}} props */`). File có dòng đầu `// @ts-nocheck` là nợ kiểu: sửa file nào thì xóa dòng đó và sửa cho `typecheck` sạch.
Mọi chữ hiển thị và comment viết **tiếng Việt**. Ưu tiên giao diện điện thoại.

## ⚠️ BẮT ĐẦU MỖI PHIÊN / MỖI YÊU CẦU: đọc `AI/CLAUDE/FILE_MAP.md` trước (bắt buộc)
- Đọc **`AI/CLAUDE/FILE_MAP.md`** (công dụng từng file) TRƯỚC khi mở bất kỳ file nào trong `src/`, kể cả khi yêu cầu chỉ là câu hỏi.
- Rồi làm theo skill `prompt-triage` (phân loại nhỏ/phức tạp, chọn build hay build + test).
- Thêm / xóa / đổi công dụng file → sửa dòng tương ứng trong FILE_MAP.md ngay trong cùng lần sửa.

## Tiết kiệm ngữ cảnh (bắt buộc)
- Không đọc nguyên file `README.md`, `supabase/schema.sql`, `package-lock.json`, `dist/`, file > 15KB
  (AssignmentEditor, ImportJson, Library, StudentAssignment, importTutorLesson, AssignmentTracking): grep rồi Read với `offset`/`limit`.
- Chi tiết từng tính năng (gấu, vũ trụ, nhạc, chấm bài, biểu đồ, ôn tập, làm lại...): **`AI/CLAUDE/FEATURES.md`** — grep đúng mục, không đọc hết.
- Đã biết file cần sửa thì mở thẳng. Bản đồ sai/thiếu thì sửa file này (ngắn) hoặc FEATURES.md (chi tiết).

## Bản đồ code
- `src/main.jsx` điểm vào · `src/App.jsx` route · `src/pages/registry.js` lazy-load trang. Trang mới: thêm vào cả hai.
- `src/contexts/` — `AuthContext` (phiên + profile, cache localStorage), `NotificationsContext` (chuông: học sinh = bài mới giao, gia sư = học sinh nộp bài; kèm gấu nói).
- `src/pages/tutor/` — `TutorStudents`, `StudentDetail`, `Library`, `TutorAssignments`, `AssignmentEditor`,
  `AssignmentTracking` (chấm bài; `?hs=<student_id>` mở bài của bạn đó), `TutorLessons`, `TutorLessonView`, `LessonEditor`,
  `ImportJson`, `TutorReports`, `TutorFeedback`.
- `src/pages/student/` — `StudentHome`, `StudentAssignment` (+ `SubmitPanel`), `StudentResults`, `StudentMistakes` (Ôn tập),
  `StudentLibrary`, `StudentLessons`, `StudentLesson`.
- `src/lib/` — truy vấn (`assignments`, `lessons`, `students`, `submissions`, `recipients`), `supabase`, `useAsync`, `errors`,
  `format`, `chapters`, `exam`, `importJson`, `importTutorLesson`, `dialog`, `celebrate` (`mascotSay`/`celebrate`), `settings`, `theme`, `svg`...
- `src/components/` — `Layout`, `Mascot`/`PandaArt`, `DialogHost`, `ExerciseBody`, `ExamParts`, `AnswerKey`, `Markdown`, `FilterTree`, `TreePicker`, `ScoreChart`, `NotificationBell`, `QuickAssign`...
- Panda Fashion Shop (`/student/shop`, `/tutor/shop`): `StudentShop` + `components/shop/*`; danh mục `lib/outfits.js`; trang phục SVG
  `components/panda/outfitLooks.jsx` (FrontPanda prop `look`), hiệu ứng `panda/SkinEffect.jsx`, hoạt cảnh khi giữ vào gấu `panda/PandaAct.jsx` + `styles/panda-act.css`, gấu mặc đồ `panda/OutfitPanda.jsx`;
  Xu/Sao/🔥 `CoinStarBadge`, nút góc `PandaDock`; dữ liệu qua adapter `lib/pandaShop.js` → RPC Supabase (mục "Kinh tế" trong schema.sql). Chi tiết: FEATURES.md.
- Kinh tế Xu/Sao/Chuỗi + Ôn tập mỗi ngày (`components/StreakFlame.jsx` nổi góc trên bên phải → bảng nổi `DailyReview.jsx`, `lib/dailyReview.js`): sổ cái `economy_ledger` (reward_key duy nhất), cấu hình `econ_cfg()`. Chi tiết: FEATURES.md mục "Kinh tế".
  Âm thanh hoạt cảnh: kế hoạch chuyển sang file mp3 ở **`AI/CLAUDE/SFX_PLAN.md`**.
- Kính thiên văn nhiều địa điểm: cấu hình + luật mở khóa `lib/telescope.js` (ngưỡng Sao, `ready`), nội dung `lib/starSystems.js`, UI `components/telescope/*` trong `SpaceExplorer`. Chi tiết: FEATURES.md.
- Nhớ điều hướng (URL lọc của từng tab, vị trí cuộn khi Back / mở lại tab): `lib/navMemory.js` + `components/ScrollMemory.jsx` (trong Layout) + `ListLink`.
  Trang danh sách mới: thêm vào `LIST_ROUTES`; link về danh sách dùng `ListLink`. Chi tiết: FEATURES.md.
- Loại câu hỏi: tự luận, trắc nghiệm, điền khuyết, đúng/sai (4 ý), trả lời ngắn.

## Quy ước
- KHÔNG dùng `window.confirm`/`alert` — dùng `lib/dialog.js` (`askConfirm`, `notifyDone`, `notifyError`, `confirmDelete`...).
- Truy vấn trong một trang: gom `Promise.all`, tránh `await` nối tiếp.
- Danh sách nặng: tách component `memo` + `useCallback`; `Markdown` đã `memo`.
- CSS: `src/index.css` chỉ `@import` file trong `src/styles/` (theo chủ đề); màu dùng biến trong `base.css`, theme `<html data-theme>`.
  Thêm style vào file đúng chủ đề, không dồn vào `index.css`. KHÔNG dùng `backdrop-filter`, tránh filter/animation nặng trong SVG gấu.

## Supabase (`supabase/schema.sql`, chạy lại được nhiều lần)
Tìm bằng grep tên bảng/hàm. Thứ tự: bảng → `is_tutor()` + trigger → RLS (`-- ---------- <bảng> ----------`) → hàm RPC → Storage.
Đổi schema: khối idempotent (`if not exists`, `create or replace`).

## Phạm vi
Chỉ bài giảng + bài tập. Không thêm lịch học, điểm danh, học phí.

## Bất biến quan trọng
- Đáp án ở `answer_keys`, học sinh chỉ đọc sau khi nộp (RLS). Không gửi đáp án xuống học sinh trước khi nộp; chấm ở SQL (`submit_assignment`).
- Học sinh không UPDATE `assignment_recipients` / không ghi `submission_answers` trực tiếp, chỉ qua RPC.
- Lưu nhiều bảng dùng RPC `save_assignment` / `save_lesson` (1 transaction).
