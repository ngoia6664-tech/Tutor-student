# Bản đồ file — công dụng từng file trong src/

> Đọc file này **trước** khi mở file nào trong dự án, để tìm đúng file theo yêu cầu. Mô tả lấy từ dòng chú thích đầu mỗi file; file không có chú thích ghi "—". Chi tiết tính năng: `AI/CLAUDE/FEATURES.md`. Thêm / xóa / đổi công dụng file → sửa dòng tương ứng ở đây.

## Gốc và cấu hình
- `CLAUDE.md` — bản đồ dự án + quy tắc cho Claude
- `CURRENT_STATE.md` — trạng thái hiện tại, việc đang làm, lỗi đã biết
- `AI/CLAUDE/` — FEATURES (chi tiết tính năng), HANDOFF (ghi chú ca), ROLE, SFX_PL
- `supabase/schema.sql` — toàn bộ CSDL: bảng, RLS, hàm RPC, kinh tế Xu/Sao/Chuỗi, Stor
- `tsconfig.json` — tsc chỉ kiểm tra kiểu (`npm run typecheck`, allowJs + checkJs, không strict); Vite vẫn tự build
- `home.html` + `public/home/` — trang chủ giới thiệu tĩnh (entry Vite thứ hai; "/" chưa đăng nhập chuyển tới). Chỉ ô Phòng thử đồ là React: `src/home/main.jsx` (gấu thật OutfitPanda + giữ để diễn + tiếng) + `src/home/home-panda.css`. `src/home/homeAuth.js`: bấm nút có gấu ló tới /login thì gấu nhảy, trang mờ rồi mới chuyển; về từ Login thì gấu nút đầu trang vẫy chào
- `src/` — mã ứng dụng (danh sách dưới)

## `src/pages/`
- `Help.jsx` — Trang Hỏi đáp (/student/help, /tutor/help; nút trong thanh bên / ngăn kéo): ô tìm + nhóm câu hỏi gập mở, theo vai trò; CSS `styles/help.css`
- `ConfigError.jsx` — Hiện khi thiếu biến môi trường Supabase (thay vì trang tr�
- `Login.jsx` — Đã đăng nhập: chuyển thẳng tới trang theo vai trò. Sai mật khẩu lắc thẻ, đúng thì đinh sáng + thẻ trượt đi rồi mới vào app; cảnh báo Caps Lock, "Quên mật khẩu?" (nhắn gia sư), nhớ email lần trước (localStorage `login-email`). Khung nẹp đồng + 4 đinh tán, ô nhập có icon + nút mắt; từ Trang chủ sang thì thẻ trượt vào, đinh đóng, gấu nút ló chào (`phase`), nút "← Trang chủ" diễn ngược rồi mới chuyển
- `NotFound.jsx` — Trang 404 (đường dẫn không tồn tại)
- `registry.js` — Mỗi trang là một file JS riêng, chỉ tải khi cần (mở app

## `src/pages/tutor/`
- `AssignmentEditor.jsx` — Dạng dữ liệu trong form (dễ sửa hơn dạng lưu trong CSDL)
- `AssignmentTracking.jsx` — Bảng theo dõi một bài tập: trạng thái từng học sinh, �
- `ChapterDetail.jsx` — Nội dung một chủ đề (cột phải của Thư viện): các bài; id `UNSORTED` = mục "Chưa xếp chủ đề" (bài có chapter_id trống); thư mục trong chủ đề (tạo / đổi tên / xóa, Sửa nhiều → "Vào thư mục…"); chủ đề thuộc khóa: nút Ẩn / Mở / Báo học sinh từng bài (`CourseControls`)
- `ImportJson.jsx` — Chủ đề liên kết lần dán trước (lưu trên máy này) · có "course" thì chủ đề vào khóa (ensure_chapter p_course) · nút "Tải file mẫu" = `public/mau-nhap-json.json`
- `LessonEditor.jsx` — Soạn / sửa bài giảng. Dùng cho /tutor/lessons/new, /tutor/less
- `Library.jsx` — Trang Thư viện (gia sư): cây Môn › Khóa › Chương của một lớp bên trái (URL `lop/mon/kh/cd`; môn chưa có khóa bỏ cấp Khóa; nút hiện: trang lớp/môn Thêm khóa, trang môn Sửa môn, trang khóa Giao khóa / Sửa khóa / Xóa khóa; ⋯ chỉ còn thao tác hàng loạt; trang Chương ngoài khóa: Chuyển vào khóa…) (đang tìm thì hiện chủ đề khớp), đường dẫn có menu chọn nhanh (LibraryCrumbs), đầu trang chỉ "+ Thêm chủ đề" + menu "⋯" (Nhập mục lục, Sửa lớp/môn/chương, Xóa nhiều chủ đề, Xóa chương; trang chủ đề: Thêm chủ đề, Nhập mục lục), cuối cây mục "Chưa xếp chủ đề" (kèm số bài), giữa: kệ sách / băng chuyền chủ đề / nội dung chủ đề
- `StudentDetail.jsx` — Trang một học sinh: tổng quan, điểm từng bài, bài giảng
- `TutorAssignments.jsx` — Chấm bài (gia sư, /tutor/assignments): danh sách phẳng mọi bài tập, lọc "Có bài chờ chấm", tìm theo tên; nút chính "+ Soạn bài tập", Sửa nhiều / Xóa nhiều / Dán JSON gom vào menu "⋯"; chip trạng thái chỉ hiện số > 0; cột phải = GradeQueuePanel
- `TutorFeedback.jsx` — Trang Góp ý (gia sư): xem góp ý học sinh gửi, đánh dấu đã xem
- `TutorLessonView.jsx` — Xem bài giảng (gia sư), như học sinh sẽ thấy
- `TutorReports.jsx` — Số thứ tự câu trong bài (đề thi đánh số theo phần: I.
- `TutorStudents.jsx` — Trang Học sinh: 2 nút chế độ xem, số khớp bộ lọc / tìm kiếm: **Nhóm (số nhóm)** = lưới khối nhóm (icon, tên 2 dòng, "N em", ghi chú, dòng tóm tắt TB + chờ chấm + quá hạn, 3 em đầu rồi "+N em nữa"; bấm khối → xem riêng nhóm), **Học sinh (số em)** = mọi em chia khung viền mỏng theo nhóm, mỗi em một dòng gọn `StudentRow` (cả dòng bấm mở hồ sơ, chỉ hiện chip chờ chấm / quá hạn khi > 0); tạo / đổi tên nhóm; form sửa tên, nhóm (chọn hoặc gõ mới), lớp, môn

## `src/pages/student/`
- `StudentAssignment.jsx` — Bản nháp câu trả lời lưu trên máy (lỡ tắt trình duyệ
- `StudentHome.jsx` — Bài chưa nộp, sắp theo hạn gần nhất; cây bên trái lọc
- `StudentLesson.jsx` — RLS chỉ trả về bài giảng được giao cho học sinh này
- `StudentLibrary.jsx` — Thư viện học sinh: ô Khối khi có bài nhiều lớp, cây Môn › Khóa › Chương (trang đầu: thẻ khóa + kệ chương ngoài khóa), đường dẫn Thư viện › Môn ▾ › Chương ▾ (LibraryCrumbs), trang đầu / một môn: kệ sách (GradeShelf), một chương (`?mon=&cd=`): băng chuyền chủ đề (ChapterCarousel, nút Mở + Đánh dấu đang học), một chủ đề: bài chưa làm lên trước, gom theo thư mục (thư mục rỗng ẩn, bài ngoài thư mục ở "Các bài khác"); `/student/library/khac` "Các bài khác" = bài chưa thuộc chủ đề nào của lớp mình
- `StudentMistakes.jsx` — Ôn tập, 2 mục:
- `StudentResults.jsx` — Bài đã nộp: điểm và nhận xét (nếu gia sư đã chấm);
- `StudentShop.jsx` — Panda Fashion Shop (/student/shop, gia sư /tutor/shop): header gọn
- `SubmitPanel.jsx` — Ảnh bài làm (không bắt buộc) + nút Nộp bài

## `src/components/`
- `AnswerKey.jsx` — Bảng đáp án cho gia sư. Hai cách xem:
- `AnswerProgress.jsx` — Chiều cao header (thay đổi khi xoay máy / menu xuống dòng) đ
- `Badges.jsx` — Nhãn hạn bài (DueBadge) và loại bài (TypeBadge)
- `ChapterForms.jsx` — Thêm / sửa một chủ đề (có ô Khóa), `CourseForm` thêm / đổi tên khóa, chapter = {} (thêm mới, có thể đi
- `ChapterArt.jsx` — Đầu thẻ chủ đề (ChapterCarousel): chip tên môn + số chủ đề nhỏ ở góc; màu ở library.css
- `ChapterCarousel.jsx` — Chủ đề của một chương (Thư viện gia sư + học sinh) dạng băng chuyền: thẻ giữa to + nghiêng 3D theo chuột + ánh kim loại, hai bên mờ; mũi tên, phím ←→, lưới "Tất cả chủ đề"; nhớ vị trí theo chương; học sinh truyền `toUrl` (link chủ đề) + `actions` (thay nút Sửa / Xóa)
- `GradeShelf.jsx` — Trang một lớp / một môn (Thư viện gia sư) dạng kệ sách: mỗi môn một kệ, mỗi chương một cuốn (gáy dọc, cao bằng nhau); tên gáy giữ chữ như gõ (`sectionText`); máy có chuột: tiêu đề kệ nằm sát đầu sách trong khoảng trống dành cho bìa, kệ dài vừa số cuốn (`--n`), rê chuột / Tab tới thì cuốn đó nhô lên, bìa hiện ở khoảng trống trên kệ, tiêu đề mờ đi (thuần CSS, không che / không xê dịch cuốn nào); máy cảm ứng / màn ≤ 520px: ẩn gáy, mỗi chương là một thẻ ngang (chính `.shelf-cover`); bấm → vào chương. Props `{ chapters, count, url? }`, link qua `libraryUrl` (học sinh: `url={studentLibraryUrl}`)
- `ChapterSelect.jsx` — Ô chọn chủ đề dạng cây Lớp › Môn › Chương › Ch
- `ContextPanel.jsx` — Khối của trang trong cột phải Layout (`#ctx-panel`, portal; `replace` = ẩn khối mặc định; `className` = lớp thêm) + `CtxCard` (thẻ dùng chung); ≥ 1360px cột đứng yên bên phải, hẹp hơn ngăn kéo mở bằng hàng "Bảng bên" trong menu ☰
- `TutorOnboarding.jsx` — Danh sách "Bắt đầu" cho giáo viên mới ở đầu trang Học sinh: 4 bước tự tick (có học sinh / chủ đề / bài / đã giao bài, đếm `count head`), xong hết thì tự ẩn, nút "Ẩn hướng dẫn" nhớ trong localStorage; CSS cuối `styles/assign.css`
- `TutorTodoPanel.jsx` — Khối mặc định cột phải của gia sư (Layout): dải số một dòng (viên thuốc `ctx-strip`) "Việc cần xử lý": chờ chấm / báo lỗi / góp ý, luôn ở đầu cột (`ctx-top`)
- `TutorRecentPanel.jsx` — Khối mặc định cột phải của gia sư: "Vừa giao" (3 bài tập / bài giảng giao gần nhất, gom theo bài, kèm số học sinh; không có thì ẩn)
- `StudentTodayPanel.jsx` — Khối mặc định cột phải của học sinh (Layout): chuỗi / Xu / Sao một hàng gọn (PandaShopContext) + nút mở Ôn tập mỗi ngày luôn hiện (DailyDialog của StreakFlame); trang Kết quả đẩy khối này xuống sau biểu đồ (`ctx-first`)
- `GradeQueuePanel.jsx` — Cột phải trang Chấm bài (`replace`): hàng đợi bài nộp chưa chấm (status 'done'), nộp sớm nhất lên trước, bấm mở bài của bạn đó (?hs=)
- `ResultsTrendPanel.jsx` — Cột phải trang Kết quả (học sinh): đường xu hướng 10 bài gần nhất (thang 10, TB + so với 3 bài trước) + 3 bài nộp gần đây có nút Xem; theo mục đang chọn trên cây
- `MistakesPanel.jsx` — Cột phải trang Ôn tập (học sinh): 3 chủ đề còn nhiều câu sai chưa thuộc nhất (?ch=), lối sang mục Câu khó, số khiên giữ chuỗi
- `LibraryNewPanel.jsx` — Cột phải Thư viện học sinh: chủ đề đang học + 4 bài giảng / bài tập mới được giao gần đây (assigned_at)
- `QuestionGrid.jsx` — Khối trang làm bài (`replace`): ô số mọi câu (đã làm tô tím), bấm nhảy tới câu; màn rộng thay thanh tiến độ dính trên
- `CoinStarBadge.jsx` — Xu (tiêu được: mua trang phục, thẻ bảo vệ chuỗi) + Sao
- `DailyReview.jsx` — Ôn tập mỗi ngày (bảng nổi mở từ nút dưới ngọn lử
- `DialogHost.jsx` — Cảnh gấu trong hộp thoại: không nằm trong gói khởi độ
- `DialogScene.jsx` — Cảnh minh họa trong hộp thoại (components/DialogHost.jsx): g�
- `ErrorBoundary.jsx` — Bắt lỗi khi render để không bao giờ hiện trang trắng
- `ErrorBox.jsx` — Khối báo lỗi, có nút thử lại (onRetry)
- `ExamParts.jsx` — Tiêu đề một phần của đề thi: "PHẦN I. Trắc nghiệm n
- `ExerciseBody.jsx` — Hiển thị một câu hỏi theo loại (tự luận / trắc nghi�
- `FeedbackButton.jsx` — Nút "Góp ý" (học sinh): hàng trong thanh bên / ngăn kéo menu (mọi cỡ màn; đã bỏ biến thể nút nổi `fab`). Bấm mở b
- `FolderBox.jsx` — Một thư mục trong chủ đề (khối gập / mở, bài giảng + bài tập chung một danh sách), dùng ở ChapterDetail + StudentLibrary
- `FilterTree.jsx` — Lọc danh sách của học sinh (Bài cần làm, Kết quả, Ôn tập) theo cây Lớp › Môn
- `FormulaText.jsx` — Chữ gấu nói (Mascot, SpaceExplorer): đoạn đặt trong `...` l
- `HardNote.jsx` — Ghi chú câu khó của học sinh (lưu qua RPC)
- `Icon.jsx` — Bộ icon nét mảnh (SVG, theo màu chữ hiện tại nên tự h�
- `ImageGallery.jsx` — Lưới ảnh bài nộp, bấm vào để xem ảnh gốc ở tab m�
- `InstallBanner.jsx` — Gợi ý cài app lên màn hình chính.
- `Layout.jsx` — Khung chung: thanh trên cùng (màn < 1024px chỉ còn ☰ + lửa chuỗi + chuông; ngắm vũ trụ + Bảng bên nằm trong ngăn kéo; màn ≥ 1024px không còn thanh trên: ☰ + chuông + ngắm vũ trụ + bảng bên + chuỗi 🔥 học sinh nằm trong thanh bên), thanh bên chung gia sư + học sinh (ghim / dải icon / ngăn kéo; menu gia sư chia nhóm có tiêu đề nhỏ "Dạy học" / "Công cụ" qua `group` trong `NAV`, thu gọn thì chỉ còn đường kẻ), ngăn kéo nút phụ (học sinh: có cả Cửa hàng gấu + Góp ý) + thanh tab dưới của học sinh (điện thoại), linh vật, cụm nổi, hộp thoại, ngắm vũ trụ; gắn `<html data-tabbar / data-side>`
- `LibraryCrumbs.jsx` — Đường dẫn Thư viện gia sư "Thư viện › Lớp ▾ › Môn ▾ › Chương ▾": chữ mỗi đoạn là link về cấp đó, nút ▾ riêng mở menu cùng cấp (useDropMenu); lớp chưa có chủ đề chọn được để mở lớp mới; prop `root` (link "Thư viện"); học sinh: bỏ đoạn Lớp, link `/student/library`
- `MoreMenu.jsx` — Nút "⋯ Thao tác khác" gom thao tác ít dùng (Thư viện gia sư) + hook `useDropMenu` dùng chung cho menu thả xuống (bàn phím ↑↓ Home End Esc Tab, bấm ra ngoài đóng, tự dịch vào trong khi tràn mép)
- `ListLink.jsx` — Link "← Danh sách" về đúng URL lọc + vị trí cuộn lần trước của tab (RESTORE)
- `LessonSelect.jsx` — Ô chọn bài giảng dạng cây Lớp › Môn › Chương �
- `LessonView.jsx` — Dấu phân trang trong Markdown (một dòng riêng). Bài nhập JSO
- `Loading.jsx` — Trạng thái đang tải.
- `MarkHard.jsx` — Nút đánh dấu câu khó (học sinh)
- `Markdown.jsx` — Hiển thị Markdown + KaTeX (`$...$`, `$$...$$`) cho mọi bài giảng / đề / lời giải; ảnh nhúng base64 (react-markdown mặc định chặn link `data:`, cho riêng ảnh), link mở tab mới, hình SVG đổi màu theo giao diện. Gắn plugin `remarkAutoMath` (lib/autoMath.js): công thức viết bằng chữ thường trong bài cũ tự thành LaTeX lúc hiển thị.
- `MarkdownField.jsx` — Ô soạn Markdown có nút xem trước công thức.
- `Mascot.jsx` — Giáo sư Gấu Trúc: linh vật góc dưới phải.
- `NotificationBell.jsx` — "5 phút trước", "3 giờ trước", "Hôm qua", hoặc ngày
- `OutlineImport.jsx` — Dán mục lục giáo trình → xem trước cây → tạo nhiều
- `PandaArt.jsx` — Hình vẽ Giáo sư Gấu Trúc (SVG nét mượt): mũ tốt nghiệ
- `PandaDock.jsx` — (chỉ còn gia sư màn hẹp; học sinh dùng thanh bên) Logo cửa hàng: tiệm quần áo nhỏ — biển hiệu có móc t
- `PlanetPortrait.jsx` — Chân dung hành tinh khi gấu giải thích (SpaceExplorer, chế đ
- `ProtectedRoute.jsx` — Chặn trang theo vai trò: sai vai trò thì chuyển về trang củ
- `QuickAssign.jsx` — Giao bài nhanh / giao khóa (`AssignDialog` kind `course`, có khối <details> giải thích Giao khóa / Báo / Giao) + chế độ Sửa nhiều / Xóa nhiều (SelectModes, SelectBar, MoveDialog, deletePicked) cho Chấm bài, chủ đề trong Thư viện
- `ReportQuestion.jsx` — Trạng thái báo lỗi học sinh thấy
- `ResultProgress.jsx` — Thanh tiến độ và chip câu đúng/sai ở trang kết quả
- `RootRedirect.jsx` — Trang gốc "/": luôn chuyển tới trang chủ /home.html
- `ScoreChart.jsx` — Khung SVG (viewBox), co giãn theo bề rộng thẻ
- `ScrollMemory.jsx` — Nhớ / khôi phục vị trí cuộn (Back/Forward, mở lại tab) theo mục neo, chờ hết khung tải
- `ScrollJump.jsx` — Hai mũi tên nổi góc phải dưới, ngay trên đầu gấu: lên đầu trang
- `SettingsPanel.jsx` — Bảng Cài đặt (tải lười từ Layout, mở bằng nút bánh
- `SpaceBackdrop.jsx` — Nền vũ trụ phía sau toàn app: 3 lớp sao ở 3 độ xa (trôi
- `SpaceExplorer.jsx` — Chế độ ngắm vũ trụ (tải lười từ Layout): dùng lại
- `SpaceMusic.jsx` — Nhạc nền chế độ ngắm vũ trụ: phát video YouTube qua IFr
- `StreakFlame.jsx` — Lửa chuỗi trên thanh trên cùng, cạnh chuông (chỉ học sinh; Layout.jsx). Ôn tập mỗi ngày (có ExerciseBody + Markdown): chỉ tải khi m
- `StudentPicker.jsx` — Chọn học sinh nhận bài. Nhóm chỉ là nút chọn nhanh, bài
- `StudyNow.jsx` — Dòng nhắc "Bạn đang học đến chương X, chủ đề Y" (h
- `StudyNowButton.jsx` — Nút "📍 Đánh dấu đang học" cho một chủ đề (học sinh).
- `ThemeToggle.jsx` — Nút chuyển giao diện sáng / tối (mờ chéo bằng View Transitions; `withLabel` = hàng có chữ trong thanh bên); lựa chọn được nhớ t
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

## `src/components/science-lab/`
- `ScienceLab.jsx` — Phòng Khoa học 3D (tải lười từ Layout): trạng thái door/room/moving/focus/scope/travel, nhãn đồng, lời gấu, nút Du hành; không có WebGL thì nhãn thành danh sách
- `labScene.js` — Cảnh Three.js: phòng + đồ vật + ánh sáng, các cú máy (`playDoor`, `focus`, `home`, `enterScope`, `leaveScope`), `LAB_SPOTS` (nhãn + vị trí camera), kéo nhìn quanh, bấm thẳng vào đồ vật
- `labPanda.js` — Giáo sư Gấu Trúc 3D (áo choàng, gi-lê, nơ, mũ vuông, kính đồng), chớp mắt, quay đầu, vẫy que
- `labSolar.js` — Hệ Mặt Trời 3D nhìn qua thị kính (cảnh riêng, chưa rời phòng)
- `labClock.js` — Đồng hồ quả lắc 3D (vỏ gỗ, mặt số, tủ kính có thước đo); con lắc điều khiển kim, kim chạy giờ thật khi không thí nghiệm
- `labShelf.js` — Giá sách: hàng sách, thang, đồng hồ cát; 3 cuốn nổi bật rút ra và mở được
- `labBoard.js` — Bảng đen: khung, máng phấn; hình trên bảng vẽ lại theo số kéo trên mảnh giấy
- `labBench.js` — Bàn thí nghiệm: thử màu ngọn lửa (đèn cồn, đĩa muối, lăng kính, màn phổ) + sổ tay
- `labOrrery.js` — Tủ 8 ngăn kéo (ngăn trên mở được) + mô hình Hệ Mặt Trời bánh răng đồng theo chu kì thật
- `labKit.js` — Đồ nghề dựng cảnh: `paintTexture`, `grainTexture`, `kit` (thêm khối), `mergeStatic` (gộp khối tĩnh)
- `LabModals.jsx` — Mảnh giấy cạnh đồ vật: bảng tương tác của từng món, sổ tay đánh dấu việc đã làm
- `labSound.js` — Tiếng cọt kẹt cửa (`primeDoorCreak` gọi trong cú bấm cho iPhone), các điểm nối file âm thanh khác
- `scienceLab.css` — Giao diện phòng (tải cùng ScienceLab)

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
- `scroller.js` — Khung cuộn của nội dung: cuộn cả trang (window) hoặc `.page-body` khi `<html data-shell>` (màn ≥ 1024px, cả gia sư lẫn học sinh); `scrollY` / `maxScroll` / `scrollToY` / `viewTop` / `onScroll` — ScrollMemory, ScrollJump, nền vũ trụ, Library dùng thay window.scrollY / scrollTo
- `drafts.js` — Bản nháp câu trả lời học sinh trên máy (`draftKey` / `readDraft` / `writeDraft` / `draftCount`, giờ ghi `readDraftTime`) + bản sao trên máy chủ, bảng `assignment_drafts` (`fetchServerDraft` / `fetchServerDraftCounts` / `pushServerDraft` / `deleteServerDraft`): trang làm bài + cột phải "Đang làm dở" ở Bài cần làm (có test)
- `useDraftSync.js` — Hook trang làm bài: mở bài lấy bản nháp máy chủ (mới hơn thì thay), sửa xong 2 giây đẩy lên, rời trang đẩy nốt; trả hàm xóa bản nháp máy chủ khi nộp
- `focusPage.js` — `isFocusPage`: trang làm một bài / đọc một bài giảng của học sinh → Layout ẩn thanh tab dưới (có test)
- `autoMath.js` — Tự nhận công thức viết bằng chữ thường (`λD/a`, `x_s`, `λ_min`, `N₁ + N₂`, `Δd = kλ`, `0,5 μm`, `abs(x)`, `(1)/(2)`, `cosα`) và đổi sang LaTeX cho KaTeX: `convertText(text)` / `findMathSpans(text)` (thuần, có test) + plugin remark `remarkAutoMath` (duyệt nút chữ của cây Markdown, nên code / link / ảnh / `$...$` có sẵn không bị đụng). Chỉ đổi lúc hiển thị, dữ liệu đã lưu giữ nguyên; thà bỏ sót còn hơn đổi nhầm (đoạn phải có dấu =, ≤, phân số, chỉ số, chữ Hy Lạp, căn...). Muốn giữ nguyên một đoạn: bọc trong `` `...` ``
- `useFocusTrap.js` — Hook cho hộp thoại nổi: focus vào hộp khi mở, Esc đóng, Tab / Shift+Tab xoay vòng trong hộp, đóng thì trả focus về nút đã mở (SettingsPanel, QuickAssign, StreakFlame, FeedbackButton)
- `bulk.js` — Sửa nhiều / Xóa nhiều (gia sư): chuyển chủ đề (chỉ chapter_id), chuyển thư mục (chỉ folder_id), xóa nhiều bài giảng / bài tập (kết quả từng phần), xóa nhiều chủ đề kèm / không kèm bài bên trong
- `answerNotes.js` — Lời phê từng câu của gia sư ("Giáo viên chấm:"), bảng a
- `assignments.js` — Xóa ảnh bài nộp trong một thư mục <student_id>/<assignment_
- `celebrate.js` — Ăn mừng: pháo giấy + bé Nguyên Tử (components/Mascot.jsx) nh
- `chapterArt.js` — Đoán loại môn (Vật lý / Toán / Hóa / khác) từ tên môn cho bìa chủ đề + `splitTitle` tách "Chủ đề n:" thành số + tên (có test)
- `chapters.js` — Nhãn hiển thị cho từng cấp khi chưa điền; `UNSORTED` (mục Chưa xếp chủ đề); `sectionText` (tên chương bỏ tiền tố "L12_", dùng trong cây) / `sectionLabel` (viết hoa, tiêu đề; gáy + bìa kệ sách dùng `sectionText`); `libraryCrumbs` (lựa chọn cho menu đường dẫn Thư viện, tham số `url` cho học sinh); `studentLibraryUrl` (`/student/library?mon=&cd=`, không có lớp) (có test)
- `dailyReview.js` — Ôn tập mỗi ngày: máy chủ chọn bộ câu theo học sinh + n
- `dialog.js` — Hộp thoại có Gấu Trúc (components/DialogHost.jsx, đặt trong
- `folders.js` — `groupByFolder`: gom bài của một chủ đề theo thư mục (bảng `chapter_folders`), bài chưa xếp để cuối (có test)
- `errors.js` — Chuyển lỗi kỹ thuật thành câu tiếng Việt dễ hiểu
- `exam.js` — Đề thi chấm theo thang THPT (môn Vật lý):
- `feedback.js` — Góp ý của người dùng (bảng feedback). Học sinh gửi, gia
- `files.js` — Bỏ dấu tiếng Việt và ký tự lạ để làm key Storage an
- `help/student.js`, `help/tutor.js` — Nội dung Hỏi đáp từng vai trò (Markdown); luồng trong app đổi thì sửa theo. `help/filter.js` — `filterHelp` lọc theo từ khóa (có test)
- `format.js` — `matchTitle` (ô tìm theo tên, không dấu) + Parse 'YYYY-MM-DD' theo giờ địa phương (tránh lệch ngày do
- `importJson.js` — Phân tích JSON bài giảng / bài tập soạn sẵn ở bên ngoà
- `importTutorLesson.js` — Chuyển file định dạng "tutor-lesson/v1" (lý thuyết + trắc
- `lessons.js` — Tải file đính kèm lên Storage, trả về đường dẫn
- `marks.js` — Câu khó học sinh tự đánh dấu (bảng question_marks): chỉ
- `recentChapters.js` — Nhãn "Mới" cho chủ đề vừa nhập (ImportJson `markRecent`, hiện ở cây + thẻ chủ đề Thư viện, ChapterDetail `clearRecent` khi mở; localStorage, hết sau 7 ngày) (có test)
- `navMemory.js` — Nhớ điều hướng trong phiên: URL lọc của từng tab, vị trí cuộn từng URL, useRemembered (bộ lọc ngoài URL)
- `outfitState.js` — Trạng thái một bộ với tài khoản hiện tại: chưa có /
- `outfits.js` — Danh mục trang phục Panda (một nơi duy nhất). Hình vẽ từ
- `outline.js` — Đọc mục lục dán vào (chép từ giáo trình / Word) thành d
- `labPhysics.js` — Số liệu + công thức thí nghiệm Phòng Khoa học: Kepler, hấp dẫn, bước sóng, E = mc², vạch phổ muối và Mặt Trời (có test)
- `pendulum.js` — Con lắc đồng hồ (Phòng Khoa học): chu kì, tốc độ đồng hồ theo con lắc, góc 3 kim (có test)
- `pandaSfx.js` — Tiếng hoạt cảnh trang phục (components/panda/PandaAct.jsx), t�
- `pandaShop.js` — Xu / Sao / Chuỗi / trang phục: số thật ở Supabase (sổ cái
- `pressFx.js` — Hiệu ứng theo con trỏ (cài ở main.jsx): vầng sáng theo chuột phủ trên mọi lớp (`.cursor-glow`, z-index 1000) + sóng lan khi bấm `.btn` (--px/--py, class is-rip); CSS ở components.css
- `practice.js` — Chấm ngay trên máy khi học sinh ôn lại câu sai (không lưu
- `recipients.js` — Giao nhanh bài giảng / bài tập cho học sinh ngay từ danh sá
- `reports.js` — `loadMyReports` (báo lỗi của học sinh theo câu: trang làm bài + DailyReview); Sự kiện báo thanh menu cập nhật số câu bị báo lỗi đa
- `retries.js` — Học sinh làm lại bài đã nộp tối đa 3 lần. Điểm chín
- `scoreChart.js` — Dữ liệu cho biểu đồ điểm (components/ScoreChart.jsx): quy
- `authTransition.js` — Cờ chuyển cảnh Trang chủ ↔ Đăng nhập qua sessionStorage (`markTransition`/`takeTransition`), `canAnimateClick` (bỏ qua Ctrl/Cmd/giảm chuyển động)
- `settings.js` — Cài đặt trải nghiệm (hiệu ứng, linh vật, âm thanh), lư
- `spaceSound.js` — Âm thanh chế độ ngắm vũ trụ, tổng hợp bằng Web Audio
- `starSystems.js` — Các hệ sao khác: quỹ đạo, thiên thể (như BODIES), chuyện gấu kể (Alpha Centauri, TRAPPIST-1, Kepler-90)
- `studentReport.js` — Trạng thái hiển thị của một bài: chưa nộp còn hạn /
- `students.js` — Danh sách học sinh (chỉ gia sư đọc được tất cả, nhờ
- `studyLock.js` — "Đang làm bài": trang làm bài chưa nộp đang mở. Khi đó kh
- `studyNow.js` — Chủ đề "đang học" của học sinh: lưu trên máy chủ (profil
- `submissions.js` — Lấy danh sách ảnh bài nộp trong thư mục <student_id>/<assig
- `studentGroups.js` — Nhóm học sinh (thuần): `groupLabel` ("A" → "Nhóm A"), `buildGroups` (gom + sắp theo student_groups); API nhóm ở `students.js` (có test)
- `streakBackup.js` — TẠM THỜI: gia sư sao lưu (tải JSON) / khôi phục / sửa chuỗi 🔥 học sinh qua RPC `tutor_set_streak`; dùng ở StudentDetail (Sửa chuỗi) + TutorStudents (Sao lưu / Khôi phục chuỗi); có test
- `supabase.js` — Đọc key từ biến môi trường (file .env), không hardcode
- `flight.js` — Vật lý bay tự do (Kính thiên văn): khối lượng thiên thể, trọng lực, động cơ giới hạn, viền vùng bay, vị trí Xu, va chạm, dự đoán đường bay
- `landscape.js` — Điện thoại khi bay tự do: toàn màn hình + khoá xoay ngang (Android), hằng số media query màn dọc
- `telescope.js` — Danh sách địa điểm Kính thiên văn + ngưỡng Sao + ready; luật mở khóa placeAccess
- `svg.js` — Hình SVG nhúng (data URI) thường tự đổi màu theo chế đ�
- `theme.js` — Giao diện hiện tại ('dark' | 'light'), lấy từ <html data-the
- `useAsync.js` — Hook tải dữ liệu chung: luôn có loading / error / data / reloa

## `src/styles/`
- `auth.css` — Khung + ô nhập trang Đăng nhập và mọi keyframe chuyển cảnh Trang chủ ↔ Đăng nhập (`auth-*`); trang chủ cũng import
- `assign.css` — Giao bài nhanh từ danh sách (components/QuickAssign.jsx). Bảng c
- `attempts.css` — Làm bài: thanh tiến độ, câu khó, làm lại
- `base.css` — Biến màu (sáng/tối), nền, kiểu chữ gốc, thanh cuộn tùy chỉnh (`--scroll-thumb`)
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
- `help.css` — Hỏi đáp (pages/Help.jsx)
- `grading.css` — Chấm bài (pages/tutor/AssignmentTracking.jsx)
- `icons.css` — Icon
- `layout.css` — Khung trang
- `shell.css` — Khung điều hướng: thanh bên chung (≥ 1024px ghim, ☰ thu gọn thành dải icon; hẹp hơn: ngăn kéo), học sinh điện thoại (≤ 640px): viên thuốc nổi `.tabbar` / `.dock-tab` (mục chọn mở rộng hiện chữ), nút nổi né thanh tab / thanh bên bằng `translate`; cột phải ContextPanel (lưới 2 cột khi ≥ 1360px, ngăn kéo phải khi hẹp) + kiểu TutorTodoPanel / QuestionGrid; khung cố định (`data-shell`: trang không cuộn, nội dung + cột phải + từng cột Thư viện tự cuộn)
- `library.css` — Thư viện: mục lục dạng cây bên trái, nội dung bên phả
- `mascot.css` — Giáo sư Gấu Trúc (components/Mascot.jsx, hình vẽ ở PandaArt.
- `mobile.css` — Điện thoại
- `notifications.css` — Chuông thông báo (học sinh)
- `panda-act.css` — (tải lười: import trong PandaArt.jsx, không qua index.css) Hoạt cảnh tương tác của trang phục (components/panda/PandaA
- `panda-dock.css` — Cụm góc trái dưới (components/PandaDock.jsx) + chừa chỗ cho cụm (đáy .page, đáy cây Thư viện, nâng trên thanh Lưu .sticky-actions, ẩn khi đang chọn nhiều trên màn hẹp)
- `panda-shop.css` — Panda Fashion Shop (pages/student/StudentShop.jsx + components/shop/*,
- `panda-skin.css` — (tải lười: import trong PandaArt.jsx) Trang phục Panda: viền sáng theo độ hiếm (hoạt cảnh tư�
- `reports.css` — Báo lỗi đề (học sinh)
- `settings.css` — Cài đặt (components/SettingsPanel.jsx, lib/settings.js)
- `space.css` — Nền vũ trụ (components/SpaceBackdrop.jsx)
- `student-detail.css` — Trang một học sinh
- `tree-picker.css` — Nhập mục lục (Thư viện)


## `tests/`
- `*.test.js` — Test tự động (Vitest, `npm test`): chấm trên máy (practice), điểm đề thi (exam), nhập JSON (importJson), mở khóa địa điểm (telescope), điểm biểu đồ (scoreChart), vật lý bay (flight), Sửa nhiều / Xóa nhiều (bulk, Supabase giả lập), nhớ điều hướng (navMemory), nhãn chương + menu đường dẫn Thư viện (chapters), ô tìm theo tên (format), tự đổi công thức chữ thường sang LaTeX (autoMath: bảng chuỗi lấy từ bài thật + chuỗi phải giữ nguyên + vẽ thử bằng KaTeX / react-markdown)
