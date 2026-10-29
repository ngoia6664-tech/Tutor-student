# Chi tiết tính năng (tách từ CLAUDE.md — chỉ đọc đoạn liên quan, grep tên file/tính năng trước)

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
- `src/contexts/` — `AuthContext` (phiên + profile/role; profile lưu localStorage `profile-cache` để mở app không đợi mạng, tải lại ở nền), `NotificationsContext` (chuông + thông báo nổi + gấu nói: học sinh = bài mới được giao; gia sư = học sinh vừa nộp bài, link `/tutor/assignments/:id?hs=<học sinh>`).
- Tốc độ tải: `vite.config.js` tách chunk `react` / `supabase` (cache lâu, không đổi khi sửa code app); `vercel.json` cache `/assets` 1 năm;
  font Google tải không chặn hiển thị; Mascot (Layout) + DialogScene (DialogHost) là `lazy`, không nằm trong gói khởi động.
  Truy vấn trong một trang: gom vào `Promise.all`, tránh `await` nối tiếp (mỗi lượt = 1 lần chờ mạng).
- `src/pages/tutor/` — `TutorStudents` (/tutor), `StudentDetail`, `Library` (cây Lớp›Môn›Chuyên đề›Chương),
  `TutorAssignments`, `AssignmentEditor` (soạn/sửa bài tập), `AssignmentTracking` (theo dõi/chấm: "Sổ chấm bài" `GradeDock` nổi
  góc phải ngay trên gấu, kiểu bảng đen nhỏ gọn, bấm tên là chuyển bài; `?hs=<student_id>` mở thẳng bài của bạn đó + nút "← Về <tên>" (link từ StudentDetail / chuông); bấm gấu = ẩn/hiện sổ, gấu im lặng khi chấm — `lib/gradeDock.js`; chỉ hiện thẻ chấm của 1 bạn, bảng đáp án ở cuối; CSS `styles/grading.css`),
  `TutorLessons`, `TutorLessonView`, `LessonEditor`, `ImportJson` (dán JSON hoặc chọn/kéo thả nhiều file: mỗi file = 1 nguồn có chương + bài giảng liên kết riêng, file chỉ bài tập tự gắn bài giảng cùng chương trong lô; học sinh chung + "Giao riêng" từng phần; trùng tên bài có sẵn → bỏ tick), `TutorReports` (báo lỗi đề),
  `TutorFeedback` (/tutor/feedback: góp ý học sinh, số chưa xem trên menu qua `useLiveCount` trong Layout).
- Biểu đồ học tập: `components/ScoreChart.jsx` (SVG tự vẽ, đường điểm + TB 3 bài + mốc 5, lọc Đề thi/Bài tập + 1 tháng/3 tháng/Tất cả, chạm điểm → thẻ "Xem bài") + `lib/scoreChart.js` (điểm gia sư → điểm máy khi cả bài chấm máy `machine.allAuto` → bỏ qua; không tính làm lại) + CSS `styles/chart.css`. Gia sư có thêm cây "Điểm theo chương" (`chapterTree`: Lớp›Môn›Chuyên đề›Chương, bỏ cấp chỉ 1 nhánh, nhóm có chương TB < 6 "cần ôn" mở sẵn); bấm chương = lọc tại chỗ biểu đồ + danh sách bài (URL `?chuong=`, `none` = Bài khác), link "Mở chương trong Thư viện" gửi state `{ backTo, backLabel }` → Library hiện nút "← Về ...". Gấu nhận xét khi mở (`chartComment`, voice student/tutor, kỷ lục mới → `celebrate`; mỗi phiên 1 lần/điểm mới qua sessionStorage; Kết quả đang lọc chương thì `quiet`), học sinh chạm bài cao nhất / dưới 5 → `pointComment`. Ở StudentResults (theo cây chương đang chọn) và StudentDetail. `machineSummary` trong `lib/studentReport.js`.
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
  Lời phê từng câu "Giáo viên chấm:": bảng `answer_comments` + `lib/answerNotes.js`; gia sư gõ dưới từng câu trong `AnswerSheet`, ghi khi "Lưu chấm"/"Cho nộp lại";
  học sinh thấy ở ReviewView và khi được mở lại (AnswerView: có câu trả lời cũ mà status `todo` = `reopened`). "Cho nộp lại" dùng `askConfirm`, giữ nhận xét.
  Bài đã nộp: `components/ResultProgress.jsx` thanh dính đầu trang (đúng/sai/bỏ trống, chip câu sai / bỏ trống / có lời phê để nhảy) ở ReviewView + AnswerSheet gia sư (id `g-`).
- Mũi tên lên đầu / xuống cuối trang: `components/ScrollJump.jsx` (trong Layout, cạnh phải giữa màn hình, chỉ hiện khi đã cuộn > 300px), CSS cuối `styles/layout.css`.
- Hộp thoại có gấu thay `window.confirm`: `lib/dialog.js` (`askConfirm` → Promise<boolean>, `notifyDone` tự tắt 2s,
  `confirmDelete(kind, name, msg)`, `notifyDeleted(kind)`) + `components/DialogHost.jsx` (trong Layout, portal, Esc / bấm ngoài = hủy, giữ Tab)
  + cảnh minh họa `components/DialogScene.jsx` (option `scene`: logout cửa EXIT · submit khay nộp bài · submitted bài có dấu tích ·
  delete thùng rác mở + cảnh báo, hộp viền đỏ · deleted thùng rác sạch; gấu `FrontPanda` prop `face` normal/sad/serious/happy)
  + CSS `styles/dialog.css`. Thêm `notifyError` (thay `window.alert`), `confirmNoStudents`, `confirmDropSubmitted`.
  KHÔNG dùng `window.confirm`/`alert` (bị chặn trong app cài trên điện thoại) — mọi hỏi/báo đều qua `lib/dialog.js`.
- Hiệu năng ô nhập: `Markdown` là `memo` (KaTeX chỉ vẽ lại khi chữ đổi). Danh sách câu nặng tách thành component `memo` + callback `useCallback`
  (`SheetQuestion` ở AssignmentTracking, `ExerciseEditCard` ở AssignmentEditor, `LessonPreview`/`AssignmentPreview` ở ImportJson) để gõ một ô không vẽ lại cả trang.
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
Kính thiên văn nhiều địa điểm: danh sách + ngưỡng Sao + `ready` ở `lib/telescope.js` (PLACES, sửa ngưỡng chỉ ở đây), luật `placeAccess(place, usePandaShop())`
→ open | locked (thiếu Sao) | soon (ready=false: khóa với mọi người, kể cả gia sư, kể cả đủ Sao) | loading | unknown (lỗi / Sao hỏng = khóa) | missing.
Sao = tổng tích lũy (sổ cái chỉ cộng dương), không trừ khi mở; Xu không dùng. Gia sư (không ví) xem trước địa điểm ready (`TUTOR_PREVIEW`).
SpaceExplorer giữ `place` (mặc định Hệ Mặt Trời), nút "Địa điểm" mở `components/telescope/PlacePicker.jsx`; hệ khác hiển thị Y HỆT Hệ Mặt Trời: `AltSolar.jsx` dựng `.solar.solar-alt` (cùng class .solar-*) gắn vào `.space`,
`data-body` = khóa trong `lib/starSystems.js` (bodies như BODIES, facts = chuyện gấu kể, look → màu + chân dung chung `PlanetPortrait look`); kéo / phóng to / soi / gấu giải thích dùng chung code; chỉ dựng khi placeAccess = open (kiểm mỗi lần render); `html.telescope-away` ẩn `.solar` của nền.
Đổi địa điểm: `WarpTravel.jsx` + `styles/warp.css` (gấu chui vào tàu → vệt sao du hành, 1,8 s động cơ khởi động → bay 3 s, đổi place ở 2,925 s → tàu đáp, mở cửa; 4,8 s = TRAVEL_MS = --warp-dur). Tiếng `public/audio/sfx/ship-launch.mp3` (cùng mốc, `playShipLaunch` trong `lib/spaceSound.js`, tải sẵn lúc mở kính). Tắt: Cài đặt "Hiệu ứng du hành" (`travelAnimation`, có trong preset) hoặc máy giảm chuyển động.
Bay tự do: nút "Bay tự do" trong Hệ Mặt Trời (dữ liệu bay `SOLAR` trong lib/flight.js, khớp PLANETS của SpaceBackdrop, không có Xu) / Alpha Centauri / TRAPPIST-1 / Kepler-90 → nút nhạc nền ở thanh trên; `telescope/FreeFlight.jsx` (canvas, rAF) + `lib/flight.js` (vật lý thuần: a = GM/r², v thoát = √(2ΣGM/r), đơn vị mô phỏng; tỉ lệ khối lượng trong hệ là số thật, GM chỉnh để v thoát ở mép = `V_EDGE`). Điều khiển: núm kéo nổi = hướng, thanh tốc độ (vuốt; máy tính phím + −) = vận tốc mong muốn; động cơ chỉ đẩy dọc mũi tàu, có giới hạn `ENGINE`, không chống trọng lực (tàu luôn bị hút, giữ quán tính); động cơ CHỈ chạy khi giữ nút "Duy trì" (hoặc đang vuốt thanh; máy tính giữ Space) — nhả ra / tốc độ 0 = tắt máy, vận tốc giảm dần (`COAST`) và lực hút bẻ cong đường bay, tàu có thể rơi. Tối đa `V_MAX` = 400 đv/s. Ngoài mép hệ: lái nhẹ (`ENGINE_OUT`, kéo đâu đi đó). Viền vùng bay = `WALL` × mép: chạm thì bị chặn, quay về được. Phóng to/thu nhỏ (nút + lăn chuột): tàu to / nhỏ theo bản đồ (`SHIP_SCALE`, va chạm `SHIP_R` khớp cỡ hình). Kết thúc khi chạm vùng nóng của sao (1,6 × bán kính, quy ước trò chơi), va hành tinh, hoặc bấm "Về hệ sao" → gấu kể lại (mode `say`). Không giới hạn thời gian. Điện thoại: bấm Bay tự do → `lib/landscape.js` bật toàn màn hình + khoá ngang (Android Chrome); cầm dọc (iPhone không khoá được) → màn che "Xoay ngang", tàu tạm dừng; rời màn bay thì trả lại. Xu: mỗi hệ (ngưỡng Sao × 5) đồng, vị trí cố định (`coinSpots`), mỗi đồng 1 Xu thật, nhặt một lần trọn đời: RPC `get_flight_coins` / `collect_flight_coins` (schema.sql mục Kinh tế, reward_key `flight:<hs>:<hệ>:<số>`, source `flight_coin`, ngưỡng Sao chép trong `flight_place()` — đổi ngưỡng ở telescope.js thì đổi cả ở đó). Gia sư bay được nhưng không có Xu. Hố đen chưa làm (sau này: Cygnus X-1).
Nền riêng: SpaceExplorer gắn `html[data-place]` → `telescope.css` đổi gradient `.space` + `--star` (Alpha: dải Ngân Hà + ánh vàng; TRAPPIST-1: đỏ thẫm; Kepler-90: lam ngọc + thiên hà xa); màu vệt sao = `color` trong PLACES.
URL `?vu-tru=<id>` (Layout ↔ SpaceExplorer): tải lại mở đúng chỗ, id chưa mở / chưa làm → về Hệ Mặt Trời + bảng chọn kèm lời báo. Style `styles/telescope.css`.
Thêm địa điểm: dòng mới trong PLACES (ready:false) → hệ trong starSystems.js (center, orbits, bodies, facts, greeting) → ready:true.
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
   bảng `question_reports` + `report_exercise`, bảng `question_marks` (câu khó), `assignment_retries` + `submit_retry` (làm lại), bảng `answer_comments` (lời phê từng câu)
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

## Panda Fashion Shop (Xu / Sao)
- Gấu GIỮ SVG gốc (`PandaArt.jsx`). `FrontPanda` nhận prop `look` (hàm trả về các khe: defs, back, body (cắt theo thân), hat, neck, glasses,
  overFace, propR, propL, front) + `motion`. Không truyền `look` = Giáo sư Gấu Trúc như cũ (Mascot / DialogScene / SpaceExplorer không đổi).
- `lib/outfits.js`: 11 bộ, field `tier` (common/rare1/rare2/rare3/premium), `price`, `pose`, `face`, `effect`. Thêm bộ = 1 dòng + 1 hàm trong `components/panda/outfitLooks.jsx`.
- `components/panda/SkinEffect.jsx`: `EFFECTS[effect]` = { Back, Front, float? }, SVG viewBox -30..150 (toạ độ trùng khung gấu 120). SMIL chỉ transform/opacity;
  vật bay quỹ đạo dùng `ellipsePath` + `Depth` (mờ khi ở sau lưng). Hiếm ⭐ soft-sparkle; ⭐⭐ DJ dj-wave, Kiếm Sĩ star-blade; ⭐⭐⭐ star-orbit; Cực phẩm space-drift / galaxy-orbit.
- `OutfitPanda`: chỉ `showcase` (phòng thử đồ) mới gắn hiệu ứng; lưới thẻ tĩnh. Chuyển động theo Cài đặt "Animation gấu" + reduced-motion; khuất màn hình → pauseAnimations.
- Shop: `StudentShop` (header + `.shop-hud-anchor` Xu/Sao dính dưới topbar qua `useStickyTop`), `shop/PandaShowcase`, `shop/OutfitGrid` (tab Cửa hàng / Tủ đồ + lọc độ hiếm),
  `shop/OutfitCard`. CSS `styles/panda-shop.css` (biến độ hiếm `--t1/--t2/--tglow` trên `.tier-*`), sân khấu tối cả 2 theme (`--shop-stage` trong base.css).
  Số tiền hiển thị bằng **bảng đèn LED** `.led-panel` (panda-shop.css; nền `--shop-stage`, lưới chấm mờ, số phát sáng — Xu vàng, Sao `.is-star` xanh băng; giống nhau 2 theme; đã thử thẻ kraft nhưng lạc quẻ với app, đừng quay lại).
  Dùng cho Xu/Sao (`CoinStarBadge`), giá ở phòng thử đồ (`.showcase-price`), giá trên thẻ đồ (`.ocard-tag` góc ảnh). Tiêu đề shop chữ thường, không gradient.
- `PandaDock` (Layout): logo `ShopIcon` = tiệm quần áo nhỏ (biển móc treo áo vàng, mái sọc tím-hồng, tủ kính trưng váy) + gấu trúc đeo nơ trước cửa vẫy tay `.shop-wave` (vài nhịp rồi nghỉ; bấm vào `/shop`) + bảng LED Xu/Sao bên dưới (cũng là link vào shop), góc trái dưới, trên nút Góp ý; ẩn khi làm bài (`useStudying`) và khi đang trong shop. Một nút ‹ / › cạnh bảng LED thu gọn hoặc mở lại cả cụm (cài đặt `dock` trong `lib/settings.js`, lưu localStorage); thu gọn thì chỉ còn nút ›. CSS `styles/panda-dock.css`.
- Dữ liệu: `contexts/PandaShopContext` → `lib/pandaShop.js` → RPC `get_economy` / `buy_outfit` / `equip_outfit` / `buy_streak_shield` (xem mục Kinh tế bên dưới).
  Giá hiển thị = `account.prices` (máy chủ, `priceOf`), catalog chỉ dự phòng. Gia sư: không có ví (HUD hiện ∞), sở hữu + mặc thử mọi bộ. Không lưu Xu / sở hữu vào localStorage.
- Đồng bộ mọi tư thế: `BackPanda` / `BallPanda` / `SleepingPanda` cũng nhận `look`; mỗi bộ có `palette` { cloth, trim, cape?, helmet?, pack? }
  → áo cắt theo thân tư thế đó, áo choàng thành áo khoác sau lưng / chăn đắp khi ngủ, mũ của bộ dùng lại (ngủ: thu nhỏ + nghiêng).
- Bộ đang mặc: `useEquippedOutfit()` (PandaShopContext) → Mascot (mọi tư thế + nút gọi gấu), DialogScene, SpaceExplorer. Gia sư nhớ bộ đang mặc ở
  localStorage `panda-tutor-outfit` (tuỳ chọn hiển thị); học sinh lưu ở `economy_wallets.equipped_outfit`.
- Viền sáng (catalog `glow` [sát thân, quầng], từ Hiếm ⭐⭐): class `has-glow glow-<tier>` + biến `--glow-a/--glow-b`; `styles/panda-skin.css`
  (drop-shadow nhiều lớp trên cả hình gấu; linh vật đổi `--pd-rim/--pd-aura/--pd-spark` sẵn có).
- Hoạt cảnh tương tác (catalog `interaction`, từ Hiếm ⭐⭐): `components/panda/PandaAct.jsx` = registry `INTERACTIONS` { ms, line, sound (tên kịch bản trong `lib/pandaSfx.js`), Layer({ lite, part }) }
  + hook `usePandaAct(outfit)` (idle → playing → cooldown 0,9s → idle; đổi bộ = dừng) + `<PandaActLayer part="back|front">` (kẹp gấu ở giữa) + `actClass()`.
  Tiếng: `lib/pandaSfx.js` tổng hợp Web Audio (AudioContext riêng, compressor + vang), mỗi hoạt cảnh một kịch bản nhiều tiếng ngắn đặt đúng mốc giây của Layer
  (DJ: scratch → riser → drop · Kiếm Sĩ: combo 8 nhát → im → "cạch" 2.74 → BOOM 2.86 · Pháp Sư: nạp → bloom 1.45 → nén → nổ phép 3.95
  · Phi Hành Gia: triệu hồi tàu 0.75 → cửa → nạp → phóng 2.85 → warp 3.3 → điểm sáng xa → lao về 4.3 → đáp 5.1 → tan thành bụi sao · Ngân Hà: hút vào 1.3 → chòm sao → siêu tân tinh 3.8 → im 5.55 → Galaxy Burst 5.75).
  `usePandaAct` phát / dừng (đổi bộ, unmount); `useHold` gọi `unlockSfx()` lúc chạm. Theo Cài đặt "Hiệu ứng âm thanh"; ra nền thì im. Sửa hình nhớ dời mốc tiếng.
  Động tác gấu = keyframes `styles/panda-act.css` trên bộ phận FrontPanda: `.pd-front` cả người, `.pd-head`, `.pd-arm-l` (vai 40,80), `.pd-arm-r` (vai 80,80),
  `.pd-prop-l/-r` (đạo cụ), `.pd-blade-glow` (kiếm). Thời lượng keyframes = `ms`; vệt kiếm / đầu trượng tính từ góc xoay tay (sửa góc thì sửa cả 2 file).
  DJ `dj-set` 3s · Kiếm Sĩ `star-duel` 4,6s (combo 8 nhát → im lặng → tra kiếm → hành tinh nổ) · Pháp Sư `star-summon` 5s (niệm → triệu hồi → dẫn → ra lệnh → phá huỷ)
  · Phi Hành Gia `space-trip` 7s (không gian phản ứng theo tàu: méo/hologram khi triệu hồi, rung + hạt bị đẩy khi nạp, sóng chấn động + sao kéo vệt khi phóng, warp, điểm sáng xa → tàu lao về, vượt quá rồi chỉnh, lơ lửng → đáp; mốc ở `TR`) · Ngân Hà `galaxy-descent` 7,4s (tan thành bụi sao → vũ trụ + chòm sao gấu → giáng xuống quyền năng
    → ngân hà co thành một điểm → GALAXY BURST phủ gần cả sân → ngân hà mini trên tay).
  Sân diễn = catalog `stage` [rộng, cao] px desktop cho MỌI bộ (Học Sinh 220×240 … DJ 350×330 · Kiếm Sĩ 460×380 · Pháp Sư 430×420
    · Phi Hành Gia 480×430 · Ngân Hà 540×470). Gấu luôn `PANDA_PX` 180px ở cùng chỗ; `stageRect` (PandaAct) đổi sang đơn vị gấu,
    sân căn giữa theo gấu, đáy thấp hơn chân 30px; Layer nhận `box` để vụ nổ / chớp sáng lan tới mép sân.
    Phòng thử đồ: khung cố định 560×480 (`.showcase-canvas`, co đều `--k` theo bề rộng → điện thoại không tràn, đổi bộ không nhảy),
    `.showcase-arena` vẽ viền sân từng bộ (nở / thu mượt). Linh vật: `stageOverflow` → `--act-r/--act-b`, gấu bước ra khỏi góc
    (thuộc tính `translate`) để cả sân nằm trong màn hình. Thẻ lưới không có sân, không diễn.
  Mục tiêu / vụ nổ đặt bên trái hoặc phía trên (linh vật ở góc phải dưới). Chớp sáng = quầng tròn `StageFlash` (không dùng rect: thành ô vuông đè trang).
  Biểu cảm: `FrontPanda actFaces` gắn mặt phụ `.pd-xf-focus|calm|smirk|chant|gaze|fierce|power` (PandaArt ActFaces) chỉ khi đang diễn; CSS bật/tắt cùng `.pd-face`;
  `.pd-look` dịch ngang = quay mặt 3/4; tai nằm trong `.pd-head`. Toạ độ khi tay/thân xoay: `rotAround` / `bodyAt` (khớp số với keyframes).
  Kích hoạt = GIỮ chuột / ngón tay `HOLD_MS` 0,55s (hook `useHold`: gấu nhún "nạp" `.is-holding`, cú click lúc thả tay bị bỏ qua); bấm thường = hành vi cũ.
  Linh vật: giữ khi rảnh → mood 'act' (chặn trò khác, giữ / bấm lúc diễn bị bỏ qua).
  Phòng thử đồ: giữ vào gấu (bàn phím Enter) hoặc nút "✨ Xem hoạt cảnh"; lưới thẻ không diễn.
  Lớp cảnh ở linh vật phải `position: absolute` (mascot.css đặt mọi `.mascot-body svg` relative → lớp chiếm chỗ, đẩy gấu mất). Cài đặt "Tối ưu" (mascotAnimation tắt) = bản `lite` (giữ động tác, bớt hạt);
  máy bật giảm chuyển động = chỉ nói câu. Selector `:root .is-acting.act-<id>` để thắng luật tắt chuyển động của settings.css.
  Kiểm tra từng khung: trang tạm (vite) đóng băng ở mốc t — `getAnimations({subtree:true})` pause + currentTime cho CSS, `svg.pauseAnimations()` + `setCurrentTime(t)` cho SMIL
  SAU sự kiện load (gọi sớm hơn bị bỏ qua); chụp bằng Chrome headless `--screenshot --virtual-time-budget`.

## Kinh tế: Xu 🪙 · Sao ⭐ · Chuỗi 🔥 · Ôn tập mỗi ngày (schema.sql mục "Kinh tế", grep `econ_`)
- Nguồn sự thật: `economy_ledger` (resource coin|star|shield, `reward_key` UNIQUE → chống thưởng trùng / bấm nhiều lần / 2 yêu cầu cùng lúc); `economy_wallets` = số dư cộng dồn (check ≥ 0).
  Học sinh + gia sư chỉ SELECT; mọi ghi qua hàm security definer. Hàm nội bộ `econ_*` đã `revoke` khỏi anon/authenticated.
- Cấu hình một chỗ: `econ_cfg()` (mặc định) || `economy_settings.overrides` (Owner ghi đè khoá cấp 1, chạy lại schema không mất). Gồm: Xu khởi đầu 300, Ôn tập 10 Xu,
  `score_tiers` (≥8: 5 Xu, ≥9: 20 Xu + 1 Sao, 10: 30 Xu + 2 Sao — tổng theo lần nộp, lên mốc thì bù chênh), khiên (30 Xu, giữ tối đa 2, 1 lần / 7 ngày), mốc số bài, mốc chuỗi (+badge 365/730), `outfit_prices`.
- Lần nộp chính thức: `assignment_recipients.attempt_no` (trigger `econ_attempt_no`: todo → done/checked = +1; "Cho nộp lại" rồi nộp = lần mới, thưởng độc lập).
  Trigger `econ_on_recipient_change` → `econ_eval_official` (điểm = điểm gia sư khi checked, không thì điểm máy khi cả bài chấm máy, như `pointScore`). Làm lại (`submit_retry`) / Ôn tập câu sai: không thưởng.
- Ôn tập mỗi ngày: `get_daily_review` (bộ câu cố định theo học sinh + ngày VN trong `daily_reviews`/`daily_review_items`; pool = câu trắc nghiệm (cấu hình `daily_kinds`, mặc định `["mcq"]`) của bài đã nộp; ≤5 câu: tránh 3 lần gần nhất, ưu tiên câu sai → lâu chưa ra → ngẫu nhiên),
  `answer_daily_review` (máy chủ chấm; xong câu cuối → +10 Xu + `econ_complete_day`). UI: ngọn lửa chuỗi nổi góc trên bên phải `components/StreakFlame.jsx` (ẩn khi làm bài / trong cửa hàng) (màu lửa theo mốc 1/7/30/50/100/200/365/730; nút icon ngay dưới mở bảng nổi `components/DailyReview.jsx`), gấu nhắc khi mở app (PandaShopContext), CSS `styles/economy.css`.
- Chuỗi: `student_streaks`; `econ_settle_streak` xét từng ngày đã qua (lười, khi mở app / mua khiên): ngày trước khi có pool → bỏ qua; bỏ 1 ngày → tự dùng khiên nếu còn + hết hồi; bỏ 2 ngày liền → đứt.
  Mốc trọn đời ở `student_achievements` (đạt lại sau khi đứt không nhận lại). Mọi RPC gọi `econ_lock` (khoá ví) trước → các yêu cầu cùng học sinh chạy lần lượt.
- Báo thưởng: `get_economy.unseen` → PandaShopContext cho gấu nói (`rewardMessage`) rồi `mark_rewards_seen`. Sau nộp bài / xong Ôn tập gọi `economyChanged()` để HUD đọc lại.
- Dữ liệu cũ: chạy schema tự tạo ví (+300 Xu) và xét lại thưởng điểm + mốc số bài theo lần nộp hiện tại (idempotent). Không suy ra được chuỗi / Ôn tập quá khứ.
