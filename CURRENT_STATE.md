# CURRENT STATE — Study with Duy Anh

> Nguồn sự thật chung, ngắn gọn cho Claude (Builder) và Codex (QA). Chỉ phản ánh trạng thái **hiện tại**, không phải changelog.
> Chi tiết bản đồ code và quy tắc: `CLAUDE.md`.

## Project
**Study with Duy Anh** — web app gia sư Vật lý: gia sư soạn / giao bài giảng + bài tập, học sinh học, làm bài, xem kết quả.
Phạm vi chỉ bài giảng + bài tập (không lịch học, điểm danh, học phí).

## Current stack
- React 19 + Vite 8 + react-router 7, SPA; Markdown + KaTeX cho nội dung.
- Supabase: Postgres + RLS + Storage (bucket riêng tư). Schema một file `supabase/schema.sql` (chạy lại được).
- PWA (manifest + service worker chỉ cache index.html và /assets).
- Không có test tự động, không có linter. Kiểm tra: `npm run build`.

## Production / deployment
- Deploy Vercel (SPA rewrite mọi đường dẫn về `index.html`), từ branch `main`.
- Làm việc trực tiếp trên `main`; commit gần nhất `3066328`.

## Main functional areas
- **Gia sư:** danh sách / chi tiết học sinh, thư viện dạng cây (Lớp › Môn › Chuyên đề › Chương), soạn bài tập,
  bài giảng, nhập JSON (`tutor-lesson/v1`), theo dõi & chấm bài, báo lỗi đề từ học sinh.
- **Học sinh:** trang chủ + thông báo bài mới, làm & nộp bài (5 loại câu: tự luận, trắc nghiệm, điền khuyết,
  đúng/sai 4 ý, trả lời ngắn; có đề THPT tính giờ), kết quả, ôn câu sai, thư viện, xem bài giảng.
- **Giao diện:** theme sáng/tối, nền vũ trụ động (hệ Mặt Trời 3D), linh vật "Giáo sư Gấu Trúc".
- **Cài đặt** (nút bánh răng ở header, bảng nổi): chế độ hiệu năng Đầy đủ / Tối ưu, bật/tắt nền động, linh vật, animation gấu,
  hiệu ứng ăn mừng, hiệu ứng âm thanh, nhạc nền + âm lượng nhạc; lưu trên máy (localStorage `app-settings`), có khôi phục mặc định.
- **Chế độ ngắm vũ trụ** (nút kính viễn vọng): xoay/phóng hệ Mặt Trời, gấu kể 25 kiến thức + mục lục, bấm hành tinh /
  Mặt Trăng xem giải thích + chân dung SVG, âm thanh + nhạc nền + âm lượng. Bị khóa khi học sinh đang làm bài.

## Important architecture / data notes
- Đáp án ở bảng `answer_keys`, học sinh chỉ đọc sau khi nộp (RLS). Chấm điểm ở SQL (`submit_assignment`), không ở trình duyệt.
- Học sinh không ghi trực tiếp `assignment_recipients` / `submission_answers`, chỉ qua RPC.
- Lưu nhiều bảng qua RPC `save_assignment` / `save_lesson` (1 transaction).
- Trang mới: thêm vào `src/pages/registry.js` + route trong `App.jsx`.
- CSS chia theo chủ đề trong `src/styles/`; không dùng `backdrop-filter` (hiệu năng nền động).

## Current known issues
- Nhạc nền ngắm vũ trụ: chưa có file `public/audio/space-music.mp3` → đang dùng YouTube ẩn (Interstellar). Trên iPhone
  vẫn phải bấm "Phát nhạc" và thanh âm lượng không tác dụng với YouTube. Phát YouTube ẩn trái điều khoản YouTube.
- Bấm hành tinh trên Android: đã sửa (commit `3066328`) nhưng chưa xác nhận trên máy thật.
- Nút "Quay lại học" khi đang xem hành tinh chỉ đóng chi tiết (bấm lần nữa mới thoát): hành vi mong muốn, không phải bug.

- Tắt "Linh vật Panda" thì lời gấu từ trang khác (vd. lời khen sau khi nộp bài) không hiện; nộp / chấm không ảnh hưởng.

## Current priorities
- QA phân trang bài giảng (nhập JSON mới, bài cũ hiển thị như trước).
- QA chức năng Cài đặt (desktop, Android, iPhone, persistence, chế độ Tối ưu) — xem `AI/CLAUDE/HANDOFF.md`.
- QA chế độ ngắm vũ trụ trên điện thoại thật (Android, iPhone).
- Owner quyết định file nhạc nền (bản quyền) để bỏ phụ thuộc YouTube.

## Last meaningful change
**Phân trang bài giảng** (22/10/2026, chưa commit): file JSON có `page` ở từng mục → dấu `<!-- trang -->` trong `content_md`,
học sinh xem từng trang (`?trang=n`); bài cũ không đổi dữ liệu, mặc định xem cả bài, có nút "Xem theo trang". Không đổi schema.

Thêm chức năng **Cài đặt** (22/10/2026, chưa commit): `lib/settings.js` + `components/SettingsPanel.jsx` + `styles/settings.css`;
âm thanh tách hiệu ứng / nhạc nền, âm lượng chỉ áp cho nhạc; key cũ `space-sound` / `space-volume` được đọc một lần để giữ lựa chọn người dùng cũ.
