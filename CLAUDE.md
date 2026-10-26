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
- `src/contexts/` — `AuthContext` (phiên + profile/role; profile lưu localStorage `profile-cache` để mở app không đợi mạng, tải lại ở nền), `NotificationsContext` (bài mới cho học sinh).
- Tốc độ tải: `vite.config.js` tách chunk `react` / `supabase` (cache lâu, không đổi khi sửa code app); `vercel.json` cache `/assets` 1 năm;
  font Google tải không chặn hiển thị; Mascot (Layout) + DialogScene (DialogHost) là `lazy`, không nằm trong gói khởi động.
  Truy vấn trong một trang: gom vào `Promise.all`, tránh `await` nối tiếp (mỗi lượt = 1 lần chờ mạng).
- `src/pages/tutor/` — `TutorStudents` (/tutor), `StudentDetail`, `Library` (cây Lớp›Môn›Chuyên đề›Chương),
  `TutorAssignments`, `AssignmentEditor` (soạn/sửa bài tập), `AssignmentTracking` (theo dõi/chấm: "Sổ chấm bài" `GradeDock` nổi
  góc phải ngay trên gấu, kiểu bảng đen nhỏ gọn, bấm tên là chuyển bài; bấm gấu = ẩn/hiện sổ, gấu im lặng khi chấm — `lib/gradeDock.js`; chỉ hiện thẻ chấm của 1 bạn, bảng đáp án ở cuối; CSS `styles/grading.css`),
  `TutorLessons`, `TutorLessonView`, `LessonEditor`, `ImportJson` (dán JSON), `TutorReports` (báo lỗi đề),
  `TutorFeedback` (/tutor/feedback: góp ý học sinh, số chưa xem trên menu qua `useLiveCount` trong Layout).
- Biểu đồ học tập: `components/ScoreChart.jsx` (SVG tự vẽ, đường điểm + TB 3 bài + mốc 5, lọc Đề thi/Bài tập + 1 tháng/3 tháng/Tất cả, chạm điểm → thẻ "Xem bài") + `lib/scoreChart.js` (điểm gia sư → điểm máy khi cả bài chấm máy `machine.allAuto` → bỏ qua; không tính làm lại) + CSS `styles/chart.css`. Gia sư (prop `chapterLink`) có thêm khối "Điểm theo chương" (TB < 6 = "cần ôn"). Gấu nhận xét khi mở (`chartComment`, voice student/tutor, kỷ lục mới → `celebrate`; mỗi phiên 1 lần/điểm mới qua sessionStorage; Kết quả đang lọc chương thì `quiet`), học sinh chạm bài cao nhất / dưới 5 → `pointComment`. Ở StudentResults (theo cây chương đang chọn) và StudentDetail. `machineSummary` trong `lib/studentReport.js`.
- Góp ý: `components/FeedbackButton.jsx` nút nổi góc trái dưới (chỉ học sinh, ẩn khi làm bài) → bảng gửi; `lib/feedback.js`; bảng `feedback`; CSS `styles/feedback.css`.
- Chương đang học: lưu `profiles.study_chapter_id` qua RPC `set_study_chapter`; `lib/studyNow.js` (`useStudyChapterId`, `setStudyChapter`).
  Gia sư xem ở đầu trang StudentDetail.   Tự đổi khi mở bài tập chưa nộp (AnswerView trong StudentAssignment), hoặc học sinh bấm `components/StudyNowButton.jsx`
  (Thư viện › chương, StudentLesson, đầu trang Bài cần làm / Bài giảng khi cây đang chọn một chương); không làm gì thì giữ nguyên. Hiện 📍 trên cây (`TreeLeaf`/`TreeGroup` prop `now`,
  `FilterTree` prop `nowId`) ở Thư viện + Bài giảng, dòng `components/StudyNow.jsx` ở Bài cần làm / Bài giảng / Thư viện.
- `src/pages/student/` — `StudentHome`, `StudentAssignment` (làm/nộp bài) + `SubmitPanel`, `StudentResults`,
  `StudentMistakes` (menu "Ôn tập": mục Câu sai = câu `is_correct=false`, mục ⭐ Câu khó = bảng `question_marks`; làm lại chấm trên máy qua `lib/practice.js`),
  `StudentLibrary`, `StudentLessons` (/student/lessons: cây lọc FilterTree + gom theo chương, mục "Mới giao", ô tìm), `StudentLesson`
  (vào từ Bài giảng → state `from: 'lessons'` để nút quay lại về Bài giảng). Bài giảng hiện icon 📘, bài tập ✏️ (cả gia sư).
- Làm bài (StudentAssignment): `components/AnswerProgress.jsx` thanh đã làm/chưa làm dính dưới header (thu gọn được, bấm câu chưa làm để nhảy);
  `components/MarkHard.jsx` + `lib/marks.js` nút "Câu khó" (bảng `question_marks`, chỉ mất khi học sinh bỏ đánh dấu;
  cột `note` = ghi chú riêng của học sinh, sửa ở Ôn tập › Câu khó qua `components/HardNote.jsx`; gia sư không có policy đọc).
  Làm lại bài đã nộp tối đa 3 lần: `lib/retries.js`, RPC `submit_retry` → bảng `assignment_retries` (không đụng điểm chính thức =
  lần nộp đầu; gia sư "Cho nộp lại" thì lần nộp sau mới thay); `RetryCard` trong ReviewView, điểm làm lại hiện nhạt ở StudentResults + AssignmentTracking.
  CSS `styles/attempts.css`. Gia sư xem bài làm có đáp án + phương pháp giải (nút Ẩn/Hiện đáp án trong `AnswerSheet`).
- Hộp thoại có gấu thay `window.confirm`: `lib/dialog.js` (`askConfirm` → Promise<boolean>, `notifyDone` tự tắt 2s,
  `confirmDelete(kind, name, msg)`, `notifyDeleted(kind)`) + `components/DialogHost.jsx` (trong Layout, portal, Esc / bấm ngoài = hủy, giữ Tab)
  + cảnh minh họa `components/DialogScene.jsx` (option `scene`: logout cửa EXIT · submit khay nộp bài · submitted bài có dấu tích ·
  delete thùng rác mở + cảnh báo, hộp viền đỏ · deleted thùng rác sạch; gấu `FrontPanda` prop `face` normal/sad/serious/happy)
  + CSS `styles/dialog.css`. Đang dùng: đăng xuất, xóa chương / chuyên đề (Library) / bài giảng / bài tập, nộp bài, bỏ đánh dấu câu khó có ghi chú.
- PWA: `public/manifest.webmanifest`, `public/sw.js` (chỉ cache index.html + /assets, không cache Supabase),
  đăng ký trong `main.jsx` (chỉ bản build), `components/InstallBanner.jsx` gợi ý cài app.
- Linh vật "Giáo sư Gấu Trúc" SVG nét mượt (mũ tốt nghiệp, kính, nơ, sách, đũa sao): logic `components/Mascot.jsx` (trong Layout, lazy; tắt linh vật thì không tải),
  hình vẽ `components/PandaArt.jsx` (FrontPanda pose sit/teach/cheer, BackPanda leo, BallPanda lăn, SleepingPanda, Bamboo),
  CSS `styles/mascot.css` (bảng đen font Patrick Hand). mood: idle / climb / walk / roll → dizzy / teach / talk / cheer / sleep / sulk (bị chọc ≥7 lần/4s: giả ngủ giận);
  mỗi ~10s chọn trò theo `ACTIVITIES` (leo 50%, đi 30%, lăn 20%), ngủ sau 30s; tự ẩn khi có `.exam-timer-float`.
  Trang khác gọi `celebrate(text)` / `mascotSay(text)` từ `lib/celebrate.js` (pháo giấy + bé nói).
  Tiếng gấu: `mascotSound('talk'|'teach'|'cheer'|'hide')` trong `lib/spaceSound.js` (theo "Hiệu ứng âm thanh"; im khi làm bài / tab ẩn / đang ngắm vũ trụ).
  Công thức trong lời gấu viết trong dấu `` `...` `` → `components/FormulaText.jsx` tô vàng `.formula` (mascot.css), dùng ở Mascot + SpaceExplorer.
- Hình SVG nhúng: `lib/svg.js` `themedSvg` — app tối: dùng khối @media dark nếu có, không thì tự đảo màu trung tính (`lightenInk`).
- `src/lib/` — `supabase` client · `useAsync` hook tải dữ liệu · `errors` lỗi→tiếng Việt · `format` ngày/nhãn ·
  `files` tên file, nén ảnh · `chapters` cây chương, sắp xếp, URL thư viện · `exam` đề THPT (điểm, phần, giờ) ·
  `importJson` đọc/kiểm tra JSON · `importTutorLesson` định dạng `tutor-lesson/v1` → bài giảng + bài tập (mục có `page` → dòng `<!-- trang -->` trong `content_md`;
  `components/LessonView.jsx` tách trang, `?xem=trang|ca-bai&trang=n`; bài không có dấu xem cả bài, nút "Xem theo trang" chia theo `##`) ·
  `outline` đọc mục lục dán vào · `studentReport` thống kê học sinh · `svg` đổi màu SVG theo theme, gói ảnh ·
  `theme` · `settings` Cài đặt (store `useSettings()`/`getSettings()`, localStorage `app-settings`: nền động, linh vật, animation gấu,
  ăn mừng, hiệu ứng âm thanh, nhạc nền, âm lượng nhạc; preset hiệu năng Đầy đủ/Tối ưu; cờ `data-static-bg`/`data-still-mascot` trên `<html>`
  → `styles/settings.css`; bảng `components/SettingsPanel.jsx` mở từ nút bánh răng ở header) ·
  `spaceSound` âm thanh ngắm vũ trụ (Web Audio tổng hợp, bật/tắt + âm lượng nhạc lấy từ `settings`; bus hiệu ứng tách bus nhạc;
  nhạc nền: mặc định chưa phát; lần đầu mở kính viễn vọng trong phiên SpaceExplorer hỏi `.explorer-ask` → lựa chọn `getMusicChoice()`
  ('on'|'off'|null, localStorage, đăng xuất thì xóa; 'on' → mở explorer là tự phát); 'on' thì `openExplorerSound()` phát ngay trong onClick nút kính viễn vọng (Layout)
  vì iPhone chặn tự phát; file `public/audio/space-music.mp3` (CHƯA có file) qua Web Audio; YouTube 4s chưa phát (iPhone) → tổng hợp; không có file → YouTube ẩn `components/SpaceMusic.jsx` → lỗi nữa thì tiếng vũ trụ tổng hợp;
  trạng thái nhạc THẬT `useMusicPlaying()` (gộp 3 nguồn, YouTube báo qua `registerExternalMusic`/`setExternalPlaying`) cho nút ▶/‖ `.music-toggle`
  trong SpaceExplorer; `pauseAllMusic()`; điện thoại ẩn tab → dừng nhạc + treo AudioContext, quay lại không tự phát (máy tính vẫn phát nền, `canPlayNow`); đóng explorer → `releaseAudio()`) ·
  `reports` đếm báo lỗi · `assignments`/`lessons`/`students`/`submissions` truy vấn.
- `src/components/` — `ExerciseBody` (hiển thị 1 câu theo loại), `ExamParts` (phần đề, phiếu trả lời, đồng hồ),
  `AnswerKey` (bảng đáp án gia sư), `TreePicker`/`ChapterSelect`/`LessonSelect` (ô chọn dạng cây),
  `TreeNav` (cây mục lục, nhớ nút mở), `FilterTree` (lọc theo cây qua URL `?lop=&mon=&cd=&ch=`),
  `ChapterForms`, `ChapterGroups`, `OutlineImport`, `ReportQuestion`, `NotificationBell`, `Layout`,
  `ProtectedRoute`, `Markdown`/`MarkdownField`, `Icon`, `ThemeToggle`,
  `QuickAssign` (nút "Giao (n)" + "Chọn nhiều để giao" ở TutorLessons/TutorAssignments/ChapterDetail; 1 bài = sửa danh sách nhận,
  nhiều bài = chỉ giao thêm; ghi qua `lib/recipients.js`, CSS `styles/assign.css`).
- Loại câu hỏi: tự luận, trắc nghiệm, điền khuyết, đúng/sai (4 ý), trả lời ngắn.

## CSS
`src/index.css` chỉ `@import` các file trong `src/styles/` (thứ tự = thứ tự cascade). Màu dùng biến trong `base.css`;
theme qua `<html data-theme="dark|light">`. Nền trang (màu, quầng sáng, 3 lớp sao, hệ Mặt Trời 3D, sao băng) KHÔNG ở body
mà ở `components/SpaceBackdrop.jsx` (render trong `main.jsx`) + `styles/space.css`; body trong suốt. Góc nhìn hệ Mặt Trời
= biến `--tilt`/`--turn` trên `.solar`, JS cập nhật theo vị trí cuộn (TILT_TOP/BOTTOM, TURN_TOP/BOTTOM).
Chế độ ngắm vũ trụ: `components/SpaceExplorer.jsx` + `styles/explorer.css` (lazy, mở từ nút kính viễn vọng ở header),
thêm class `space-exploring` vào `<html>` để ẩn `.app` và cho kéo / bấm hệ Mặt Trời; gấu góc trái dưới nói trong bong bóng `.explorer-bubble`:
bấm gấu kể lần lượt 25 câu `SPACE_FACTS` (có mục lục), bấm hành tinh thì giải thích theo `BODIES` (g, tag, stats, about) + chế độ soi: nền `.explorer-dim` (z 100),
Mặt Trăng (`.solar-moon`) bấm riêng được; Trái Đất ⇄ Mặt Trăng qua `related`. gấu + chân dung hành tinh `.explorer-focus` (z 101) vẽ ở `components/PlanetPortrait.jsx` (SVG từng hành tinh, `.pf-spin` = tự quay).
Khóa khi làm bài: `lib/studyLock.js` — `useStudyLock()` gọi trong AnswerView (StudentAssignment) → `useStudying()` true:
nút kính viễn vọng khóa (bấm thì gấu nhắc), gấu chỉ ngồi đọc sách (`shown = 'wait'`), không đi/leo/lăn/ngủ. Nộp xong tự mở.
Header: trong suốt ở đầu trang, `.topbar.is-scrolled` (Layout theo dõi scroll) mới hiện nền + mép mờ.
Hiệu năng: KHÔNG dùng `backdrop-filter` (nền chuyển động → làm nhòe lại mỗi khung hình); tránh filter nặng / animation liên tục bên trong SVG gấu.
- `base` biến màu, nền, chữ · `layout` khung trang, thanh trên, menu · `components` khối, nhãn, nút, skeleton, form,
  thông báo, loading, đăng nhập · `content` bài giảng, markdown, câu hỏi/đáp án, ảnh nộp, bảng, soạn thảo, video, điểm
- `mobile` media query điện thoại chung · `library` thư viện dạng cây · `notifications` chuông + toast · `icons`
- `exam` đề THPT + tính giờ · `student-detail` trang một học sinh · `tree-picker` nhập mục lục + ô chọn cây ·
  `reports` báo lỗi đề · `assign` giao bài nhanh · `chart` biểu đồ điểm
Thêm style mới: đặt vào file đúng chủ đề (hoặc tạo file mới + thêm `@import`), không dồn vào `index.css`.

## Supabase (`supabase/schema.sql`, ~1050 dòng, chạy lại được nhiều lần)
Tìm bằng `grep -n "<tên bảng hoặc hàm>"`. Các phần (số dòng xấp xỉ):
1. Bảng ~10–178: `profiles`, `lessons`, `lesson_recipients`, `assignments`, `exercises`, `answer_keys`,
   `assignment_recipients`, `submission_answers`, `chapters` + các khối "Nâng cấp" (`alter table ... add column if not exists`)
2–4. ~180–260: `is_tutor()`, trigger `handle_new_user`, trigger `guard_assignment_recipient_update`
5. RLS ~262–420: policy theo từng bảng (comment `-- ---------- <bảng> ----------`)
6. Hàm ~424–980: `save_lesson`, `save_assignment`, `ensure_chapter`, chấm điểm (`normalize_answer`, `short_match`,
   `tf_count`, `grade_answer`, `answer_points`), `submit_assignment`, `start_assignment`, `mark_notifications_seen`,
   bảng `feedback` (góp ý), `set_study_chapter` (chương đang học),
   bảng `question_reports` + `report_exercise`, bảng `question_marks` (câu khó), `assignment_retries` + `submit_retry` (làm lại)
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
