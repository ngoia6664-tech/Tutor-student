# Bản đồ file — công dụng từng file trong src/

> Đọc file này **trước** khi mở file nào trong dự án, để tìm đúng file theo yêu cầu. Mô tả lấy từ dòng chú thích đầu mỗi file; file không có chú thích ghi "—". Chi tiết tính năng: `AI/CLAUDE/FEATURES.md`. Thêm / xóa / đổi công dụng file → sửa dòng tương ứng ở đây.

## Gốc và cấu hình
- `CLAUDE.md` — bản đồ dự án + quy tắc cho Claude
- `CURRENT_STATE.md` — trạng thái hiện tại, việc đang làm, lỗi đã biết
- `AI/CLAUDE/` — FEATURES (chi tiết tính năng), HANDOFF (ghi chú ca), ROLE, SFX_PL
- `supabase/schema.sql` — toàn bộ CSDL: bảng, RLS, hàm RPC, kinh tế Xu/Sao/Chuỗi, Stor
- `tsconfig.json` — tsc chỉ kiểm tra kiểu (`npm run typecheck`, allowJs + checkJs, không strict); Vite vẫn tự build
- `src/` — mã ứng dụng (danh sách dưới)

## `src/pages/`
- `ConfigError.jsx` — Hiện khi thiếu biến môi trường Supabase (thay vì trang tr�
- `Login.jsx` — Đã đăng nhập: chuyển thẳng tới trang theo vai trò
- `NotFound.jsx` — Trang 404 (đường dẫn không tồn tại)
- `registry.js` — Mỗi trang là một file JS riêng, chỉ tải khi cần (mở app

## `src/pages/tutor/`
- `AssignmentEditor.jsx` — Dạng dữ liệu trong form (dễ sửa hơn dạng lưu trong CSDL)
- `AssignmentTracking.jsx` — Bảng theo dõi một bài tập: trạng thái từng học sinh, �
- `ChapterDetail.jsx` — Nội dung một chương (cột phải của Thư viện): các bài
- `ImportJson.jsx` — Chương liên kết lần dán trước (lưu trên máy này)
- `LessonEditor.jsx` — Soạn / sửa bài giảng. Dùng cho /tutor/lessons/new, /tutor/less
- `Library.jsx` — Trang Thư viện (gia sư): cây chương bên trái + danh sách bên phải
- `StudentDetail.jsx` — Trang một học sinh: tổng quan, điểm từng bài, bài giảng
- `TutorAssignments.jsx` — Trang Bài tập (gia sư): danh sách bài đã soạn, giao, theo dõi
- `TutorFeedback.jsx` — Trang Góp ý (gia sư): xem góp ý học sinh gửi, đánh dấu đã xem
- `TutorLessonView.jsx` — Xem bài giảng (gia sư), như học sinh sẽ thấy
- `TutorLessons.jsx` — Bài giảng (gia sư): cây Lớp › Môn › Chuyên đề › Chư
- `TutorReports.jsx` — Số thứ tự câu trong bài (đề thi đánh số theo phần: I.
- `TutorStudents.jsx` — Sửa tên, nhóm, lớp, môn của học sinh

## `src/pages/student/`
- `StudentAssignment.jsx` — Bản nháp câu trả lời lưu trên máy (lỡ tắt trình duyệ
- `StudentHome.jsx` — Bài chưa nộp, sắp theo hạn gần nhất; cây bên trái lọc
- `StudentLesson.jsx` — RLS chỉ trả về bài giảng được giao cho học sinh này
- `StudentLessons.jsx` — Bài giảng (học sinh): mọi bài giảng được giao, gom theo
- `StudentLibrary.jsx` — Bài tập học sinh: chưa làm lên trước, rồi bài đã nộp
- `StudentMistakes.jsx` — Ôn tập, 2 mục:
- `StudentResults.jsx` — Bài đã nộp: điểm và nhận xét (nếu gia sư đã chấm);
- `StudentShop.jsx` — Panda Fashion Shop (/student/shop, gia sư /tutor/shop): header gọn
- `SubmitPanel.jsx` — Ảnh bài làm (không bắt buộc) + nút Nộp bài

## `src/components/`
- `AnswerKey.jsx` — Bảng đáp án cho gia sư. Hai cách xem:
- `AnswerProgress.jsx` — Chiều cao header (thay đổi khi xoay máy / menu xuống dòng) đ
- `Badges.jsx` — Nhãn hạn bài (DueBadge) và loại bài (TypeBadge)
- `ChapterForms.jsx` — Thêm / sửa một chương. chapter = {} (thêm mới, có thể đi
- `ChapterGroups.jsx` — Danh sách gom theo chương: tiêu đề chương (bấm để mở c
- `ChapterSelect.jsx` — Ô chọn chương dạng cây Lớp › Môn › Chuyên đề › Ch
- `CoinStarBadge.jsx` — Xu (tiêu được: mua trang phục, thẻ bảo vệ chuỗi) + Sao
- `DailyReview.jsx` — Ôn tập mỗi ngày (bảng nổi mở từ nút dưới ngọn lử
- `DialogHost.jsx` — Cảnh gấu trong hộp thoại: không nằm trong gói khởi độ
- `DialogScene.jsx` — Cảnh minh họa trong hộp thoại (components/DialogHost.jsx): g�
- `ErrorBoundary.jsx` — Bắt lỗi khi render để không bao giờ hiện trang trắng
- `ErrorBox.jsx` — Khối báo lỗi, có nút thử lại (onRetry)
- `ExamParts.jsx` — Tiêu đề một phần của đề thi: "PHẦN I. Trắc nghiệm n
- `ExerciseBody.jsx` — Hiển thị một câu hỏi theo loại (tự luận / trắc nghi�
- `FeedbackButton.jsx` — Nút "Góp ý" nổi ở góc trái dưới (học sinh). Bấm mở b
- `FilterTree.jsx` — Lọc danh sách (bài tập / bài giảng) theo cây Lớp › Môn
- `FormulaText.jsx` — Chữ gấu nói (Mascot, SpaceExplorer): đoạn đặt trong `...` l
- `HardNote.jsx` — Ghi chú câu khó của học sinh (lưu qua RPC)
- `Icon.jsx` — Bộ icon nét mảnh (SVG, theo màu chữ hiện tại nên tự h�
- `ImageGallery.jsx` — Lưới ảnh bài nộp, bấm vào để xem ảnh gốc ở tab m�
- `InstallBanner.jsx` — Gợi ý cài app lên màn hình chính.
- `Layout.jsx` — Khung chung: thanh trên cùng, menu, linh vật, cụm nổi, hộp thoại, ngắm vũ trụ
- `ListLink.jsx` — Link "← Danh sách" về đúng URL lọc + vị trí cuộn lần trước của tab (RESTORE)
- `LessonSelect.jsx` — Ô chọn bài giảng dạng cây Lớp › Môn › Chuyên đề �
- `LessonView.jsx` — Dấu phân trang trong Markdown (một dòng riêng). Bài nhập JSO
- `Loading.jsx` — Trạng thái đang tải.
- `MarkHard.jsx` — Nút đánh dấu câu khó (học sinh)
- `Markdown.jsx` — Mặc định react-markdown chặn mọi link "data:". Cho phép riê
- `MarkdownField.jsx` — Ô soạn Markdown có nút xem trước công thức.
- `Mascot.jsx` — Giáo sư Gấu Trúc: linh vật góc dưới phải.
- `NotificationBell.jsx` — "5 phút trước", "3 giờ trước", "Hôm qua", hoặc ngày
- `OutlineImport.jsx` — Dán mục lục giáo trình → xem trước cây → tạo nhiều
- `PandaArt.jsx` — Hình vẽ Giáo sư Gấu Trúc (SVG nét mượt): mũ tốt nghiệ
- `PandaDock.jsx` — Logo cửa hàng: tiệm quần áo nhỏ — biển hiệu có móc t
- `PlanetPortrait.jsx` — Chân dung hành tinh khi gấu giải thích (SpaceExplorer, chế đ
- `ProtectedRoute.jsx` — Chặn trang theo vai trò: sai vai trò thì chuyển về trang củ
- `QuickAssign.jsx` — Giao bài nhanh + chế độ Sửa nhiều / Xóa nhiều (SelectModes, SelectBar, MoveDialog, deletePicked) cho Bài giảng, Bài tập, chương trong Thư viện
- `ReportQuestion.jsx` — Trạng thái báo lỗi học sinh thấy
- `ResultProgress.jsx` — Thanh tiến độ và chip câu đúng/sai ở trang kết quả
- `RootRedirect.jsx` — Trang gốc "/": chuyển theo vai trò
- `ScoreChart.jsx` — Khung SVG (viewBox), co giãn theo bề rộng thẻ
- `ScrollMemory.jsx` — Nhớ / khôi phục vị trí cuộn (Back/Forward, mở lại tab) theo mục neo, chờ hết khung tải
- `ScrollJump.jsx` — Hai mũi tên nổi cạnh phải giữa màn hình: lên đầu trang
- `SettingsPanel.jsx` — Bảng Cài đặt (tải lười từ Layout, mở bằng nút bánh
- `SpaceBackdrop.jsx` — Nền vũ trụ phía sau toàn app: 3 lớp sao ở 3 độ xa (trôi
- `SpaceExplorer.jsx` — Chế độ ngắm vũ trụ (tải lười từ Layout): dùng lại
- `SpaceMusic.jsx` — Nhạc nền chế độ ngắm vũ trụ: phát video YouTube qua IFr
- `StreakFlame.jsx` — Ôn tập mỗi ngày (có ExerciseBody + Markdown): chỉ tải khi m
- `StudentPicker.jsx` — Chọn học sinh nhận bài. Nhóm chỉ là nút chọn nhanh, bài
- `StudyNow.jsx` — Dòng nhắc "Bạn đang học đến chuyên đề X, chương Y" (h
- `StudyNowButton.jsx` — Nút "📍 Đánh dấu đang học" cho một chương (học sinh).
- `ThemeToggle.jsx` — Nút chuyển giao diện sáng / tối; lựa chọn được nhớ t
- `TreeNav.jsx` — Nhớ nút nào trên cây đang mở (lưu trong trình duyệt)
- `TreePicker.jsx` — Dựng cây cho ô chọn
- `VideoEmbed.jsx` — Lấy mã video YouTube từ các dạng link phổ biến

## `src/components/panda/`
- `OutfitPanda.jsx` — Gấu mặc một bộ trang phục (catalog lib/outfits.js). Dùng ch
- `PandaAct.jsx` — Hoạt cảnh tương tác của trang phục (từ Hiếm ⭐⭐): GI
- `SkinEffect.jsx` — Hiệu ứng riêng của từng trang phục (catalog `effect` → EF
- `outfitLooks.jsx` — Trang phục vẽ đè lên Giáo sư Gấu Trúc (FrontPanda prop `lo

## `src/components/telescope/`
- `PlacePicker.jsx` — Bảng chọn điểm đến của Kính thiên văn (thẻ + trạng thái từ placeAccess)
- `AltSolar.jsx` — Hệ sao khác dựng y hệt hệ Mặt Trời của nền (class .solar-*, gắn vào .space), chỉ khi đã mở khóa
- `WarpTravel.jsx` — Chuyển địa điểm: gấu lên tàu vũ trụ, du hành vệt sao, đáp xuống mở cửa (~4,8 s kèm tiếng ship-launch.mp3, tắt trong Cài đặt)
- `FreeFlight.jsx` — Bay tự do trong hệ sao đã mở: canvas, núm kéo nổi + thanh tốc độ, đồng hồ cung tròn, phóng to/thu nhỏ, nhặt Xu (RPC), gấu cảnh báo; vật lý ở lib/flight.js

## `src/components/shop/`
- `OutfitCard.jsx` — Thẻ trong lưới: gấu tĩnh (không hiệu ứng chạy), khung t
- `OutfitGrid.jsx` — Tab Cửa hàng / Tủ đồ + lọc độ hiếm (chỉ ở Cửa hà
- `PandaShowcase.jsx` — Khung trưng bày (px thiết kế): vừa sân lớn nhất (Ngân H�
- `StreakShield.jsx` — Chuỗi Ôn tập + mua khiên (học sinh). Máy chủ kiểm Xu / s�

## `src/contexts/`
- `AuthContext.jsx` — Lưu hồ sơ lần trước trên máy: mở app hiện giao diện n
- `NotificationsContext.jsx` — Thông báo bài giảng / bài tập mới cho học sinh; gia sư: h
- `PandaShopContext.jsx` — Một tài khoản dùng chung cho cụm nổi, cửa hàng và linh v

## `src/lib/`
- `bulk.js` — Sửa nhiều / Xóa nhiều (gia sư): chuyển chương (chỉ chapter_id), xóa nhiều bài giảng / bài tập (kết quả từng phần), xóa nhiều chương kèm / không kèm bài bên trong
- `answerNotes.js` — Lời phê từng câu của gia sư ("Giáo viên chấm:"), bảng a
- `assignments.js` — Xóa ảnh bài nộp trong một thư mục <student_id>/<assignment_
- `celebrate.js` — Ăn mừng: pháo giấy + bé Nguyên Tử (components/Mascot.jsx) nh
- `chapters.js` — Nhãn hiển thị cho từng cấp khi chưa điền
- `dailyReview.js` — Ôn tập mỗi ngày: máy chủ chọn bộ câu theo học sinh + n
- `dialog.js` — Hộp thoại có Gấu Trúc (components/DialogHost.jsx, đặt trong
- `errors.js` — Chuyển lỗi kỹ thuật thành câu tiếng Việt dễ hiểu
- `exam.js` — Đề thi chấm theo thang THPT (môn Vật lý):
- `feedback.js` — Góp ý của người dùng (bảng feedback). Học sinh gửi, gia
- `files.js` — Bỏ dấu tiếng Việt và ký tự lạ để làm key Storage an
- `format.js` — Parse 'YYYY-MM-DD' theo giờ địa phương (tránh lệch ngày do
- `gradeDock.js` — "Đang chấm bài": trang theo dõi / chấm một bài tập đang m
- `importJson.js` — Phân tích JSON bài giảng / bài tập soạn sẵn ở bên ngoà
- `importTutorLesson.js` — Chuyển file định dạng "tutor-lesson/v1" (lý thuyết + trắc
- `lessons.js` — Tải file đính kèm lên Storage, trả về đường dẫn
- `marks.js` — Câu khó học sinh tự đánh dấu (bảng question_marks): chỉ
- `navMemory.js` — Nhớ điều hướng trong phiên: URL lọc của từng tab, vị trí cuộn từng URL, useRemembered (bộ lọc ngoài URL)
- `outfitState.js` — Trạng thái một bộ với tài khoản hiện tại: chưa có /
- `outfits.js` — Danh mục trang phục Panda (một nơi duy nhất). Hình vẽ từ
- `outline.js` — Đọc mục lục dán vào (chép từ giáo trình / Word) thành d
- `pandaSfx.js` — Tiếng hoạt cảnh trang phục (components/panda/PandaAct.jsx), t�
- `pandaShop.js` — Xu / Sao / Chuỗi / trang phục: số thật ở Supabase (sổ cái
- `pressFx.js` — Hiệu ứng chạm nút: ghi điểm chạm vào --px/--py cho vệt sáng `.btn::before` (cài ở main.jsx)
- `practice.js` — Chấm ngay trên máy khi học sinh ôn lại câu sai (không lưu
- `recipients.js` — Giao nhanh bài giảng / bài tập cho học sinh ngay từ danh sá
- `reports.js` — Sự kiện báo thanh menu cập nhật số câu bị báo lỗi đa
- `retries.js` — Học sinh làm lại bài đã nộp tối đa 3 lần. Điểm chín
- `scoreChart.js` — Dữ liệu cho biểu đồ điểm (components/ScoreChart.jsx): quy
- `settings.js` — Cài đặt trải nghiệm (hiệu ứng, linh vật, âm thanh), lư
- `spaceSound.js` — Âm thanh chế độ ngắm vũ trụ, tổng hợp bằng Web Audio
- `starSystems.js` — Các hệ sao khác: quỹ đạo, thiên thể (như BODIES), chuyện gấu kể (Alpha Centauri, TRAPPIST-1, Kepler-90)
- `studentReport.js` — Trạng thái hiển thị của một bài: chưa nộp còn hạn /
- `students.js` — Danh sách học sinh (chỉ gia sư đọc được tất cả, nhờ
- `studyLock.js` — "Đang làm bài": trang làm bài chưa nộp đang mở. Khi đó kh
- `studyNow.js` — Chương "đang học" của học sinh: lưu trên máy chủ (profil
- `submissions.js` — Lấy danh sách ảnh bài nộp trong thư mục <student_id>/<assig
- `supabase.js` — Đọc key từ biến môi trường (file .env), không hardcode
- `flight.js` — Vật lý bay tự do (Kính thiên văn): khối lượng thiên thể, trọng lực, động cơ giới hạn, viền vùng bay, vị trí Xu, va chạm, dự đoán đường bay
- `landscape.js` — Điện thoại khi bay tự do: toàn màn hình + khoá xoay ngang (Android), hằng số media query màn dọc
- `telescope.js` — Danh sách địa điểm Kính thiên văn + ngưỡng Sao + ready; luật mở khóa placeAccess
- `svg.js` — Hình SVG nhúng (data URI) thường tự đổi màu theo chế đ�
- `theme.js` — Giao diện hiện tại ('dark' | 'light'), lấy từ <html data-the
- `useAsync.js` — Hook tải dữ liệu chung: luôn có loading / error / data / reloa

## `src/styles/`
- `assign.css` — Giao bài nhanh từ danh sách (components/QuickAssign.jsx). Bảng c
- `attempts.css` — Làm bài: thanh tiến độ, câu khó, làm lại
- `base.css` — Biến màu (sáng/tối), nền, kiểu chữ gốc
- `chart.css` — Biểu đồ học tập (components/ScoreChart.jsx): Kết quả củ
- `components.css` — Khối nội dung
- `content.css` — Bài giảng: dòng thông tin, tiêu đề, khung kế hoạch, mỗi
- `dialog.css` — Hộp thoại có Gấu Trúc (components/DialogHost.jsx)
- `economy.css` — Xu · Sao · Chuỗi 🔥: phần chuỗi trên bảng LED, ngọn l�
- `exam.css` — Đề thi THPT
- `explorer.css` — Chế độ ngắm vũ trụ (components/SpaceExplorer.jsx, chỉ tả
- `telescope.css` — Bảng chọn điểm đến + sao / vệ tinh của hệ khác (components/telescope/*)
- `flight.css` — Giao diện bay tự do (components/telescope/FreeFlight.jsx)
- `warp.css` — Hiệu ứng du hành giữa các địa điểm (components/telescope/WarpTravel.jsx)
- `feedback.css` — Góp ý (components/FeedbackButton.jsx, trang gia sư pages/tutor/Tuto
- `grading.css` — Chấm bài (pages/tutor/AssignmentTracking.jsx)
- `icons.css` — Icon
- `layout.css` — Khung trang
- `library.css` — Thư viện: mục lục dạng cây bên trái, nội dung bên phả
- `mascot.css` — Giáo sư Gấu Trúc (components/Mascot.jsx, hình vẽ ở PandaArt.
- `mobile.css` — Điện thoại
- `notifications.css` — Chuông thông báo (học sinh)
- `panda-act.css` — Hoạt cảnh tương tác của trang phục (components/panda/PandaA
- `panda-dock.css` — Cụm góc trái dưới (components/PandaDock.jsx)
- `panda-shop.css` — Panda Fashion Shop (pages/student/StudentShop.jsx + components/shop/*,
- `panda-skin.css` — Trang phục Panda: viền sáng theo độ hiếm (hoạt cảnh tư�
- `reports.css` — Báo lỗi đề (học sinh)
- `settings.css` — Cài đặt (components/SettingsPanel.jsx, lib/settings.js)
- `space.css` — Nền vũ trụ (components/SpaceBackdrop.jsx)
- `student-detail.css` — Trang một học sinh
- `tree-picker.css` — Nhập mục lục (Thư viện)


## `tests/`
- `*.test.js` — Test tự động (Vitest, `npm test`): chấm trên máy (practice), điểm đề thi (exam), nhập JSON (importJson), mở khóa địa điểm (telescope), điểm biểu đồ (scoreChart), vật lý bay (flight), Sửa nhiều / Xóa nhiều (bulk, Supabase giả lập), nhớ điều hướng (navMemory)
