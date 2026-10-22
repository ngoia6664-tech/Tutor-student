# Claude — Handoff ca gần nhất

> Ghi đè mỗi ca, không giữ lịch sử dài hạn (lịch sử xem `git log`).

## Last task
Ca 22/10/2026 gồm 2 task, cả hai chưa QA:
1. **Phân trang bài giảng** (mục ngay dưới đây).
2. **Cài đặt (Settings)**: chế độ hiệu năng, hình ảnh, âm thanh, lưu trên máy (từ mục "Files changed" trở xuống).

## Status
DONE (chờ Codex QA)

---

# Task 1 — Phân trang bài giảng

## Files changed
- `src/components/LessonView.jsx`: `PAGE_BREAK = '<!-- trang -->'`; `splitLesson` trả thêm `pages`, `marked`; `LessonBody` có chế độ `paged`;
  thanh chuyển trang `Pager` (Trước / chọn trang / Sau, ở trên và dưới); `LessonView` đọc/ghi `?xem=trang|ca-bai&trang=n` (replace, không thêm lịch sử).
- `src/lib/importTutorLesson.js`: `buildLessonMd` gom mục theo `page` → mỗi trang mở đầu bằng `PAGE_BREAK`; "Tóm tắt 1 phút" và "Phương pháp giải"
  là trang riêng; `intro` của mục → `> **Đặt vấn đề:** ...`; `theory.plan` dạng mảng → khung "Nội dung bài học" đánh số (trước đây hiện "a,b,c").
- `src/pages/tutor/LessonEditor.jsx`: gợi ý dòng `<!-- trang -->` trong ô soạn.
- `src/styles/content.css`: `.lesson-meta`, `.lesson-pager`, `.lesson-pager-select`, `.lesson-page-divider`.

## What was implemented
- **Không đổi cơ sở dữ liệu / schema.** Dấu trang nằm trong `content_md`; bài cũ không bị sửa.
- Bài **có dấu trang** (nhập JSON có `page`): mặc định xem từng trang, nút "Xem cả bài" để xem liền.
- Bài **cũ** (không dấu): mặc định xem cả bài như trước; nút "Xem theo trang" → mỗi mục `##` là một trang. Bài chỉ 1 mục: không có nút.
- Phần mở đầu (dòng thông tin + kế hoạch) chỉ hiện ở trang 1. `?trang=` sai/quá lớn → kẹp về trang hợp lệ.
- Xem trước khi nhập JSON / khi soạn bài: hiện cả bài kèm vạch "TRANG n" để gia sư thấy cách chia.
- File JSON không có `page` ở mục nào → không chèn dấu (giữ nguyên cách cũ). Mục thiếu `page` đi theo trang của mục ngay trước.

## Tests performed
- `npm run build`: PASS.
- Chrome headless (trang tạm, đã xóa) với bản rút gọn file mẫu "Chủ đề 1 – Cấu trúc của chất" (6 mục page 1–6, plan mảng, intro, hình base64)
  + một bài cũ 3 mục: 7 dấu trang (6 + tóm tắt); trang 1 có khung kế hoạch, Sau/chọn trang/Trước đổi đúng, nút Sau khóa ở trang cuối,
  `?trang=99` → trang 7; "Xem cả bài" hiện đủ 7 mục + vạch trang; bài cũ mặc định cả bài, bật theo trang chạy đúng; không lộ chữ `<!--`;
  360px không cuộn ngang; không lỗi console.
- **Chưa test**: nhập thật qua trang Dán JSON + lưu Supabase, trang học sinh thật, file mẫu đầy đủ (ảnh lớn).

## Needs QA (task 1)
1. Dán file mẫu đầy đủ ở `/tutor/import` → xem trước có vạch trang → lưu → mở ở gia sư và học sinh: 7 trang, chuyển trang, tải lại giữ trang.
2. Bài giảng cũ (đã có trên Supabase): hiển thị **y như trước**; "Xem theo trang" / "Xem cả bài" đổi đúng; nút quay lại trình duyệt.
3. Sửa bài mới ở LessonEditor rồi lưu: dấu `<!-- trang -->` còn nguyên, hình nhúng không mất. Tự thêm dấu vào một bài cũ → thành bài phân trang.
4. Điện thoại (360/390, xoay ngang): thanh chuyển trang, ô chọn trang tên dài.
5. File JSON cũ không có `page`: nhập vẫn như trước (không phân trang).

---

# Task 2 — Cài đặt (Settings)

## Files changed
- **Mới** `src/lib/settings.js` — store cài đặt duy nhất (`useSyncExternalStore`, giống `studyLock`/`theme`), lưu localStorage
  `app-settings` (JSON), làm sạch dữ liệu hỏng, đọc giá trị cũ, preset hiệu năng, gắn cờ `data-static-bg` / `data-still-mascot` lên `<html>`.
- **Mới** `src/components/SettingsPanel.jsx` — bảng Cài đặt (lazy, portal), mở từ nút bánh răng ở header.
- **Mới** `src/styles/settings.css` — luật tắt animation theo cờ + giao diện bảng (đã `@import` trong `index.css`).
- `src/lib/spaceSound.js` — bỏ key riêng `space-sound` / `space-volume`, đọc từ store; tách bus **hiệu ứng** (mức cố định như cũ)
  và bus **nhạc nền** (theo âm lượng); `ctx.resume()` bắt lỗi khi bị chặn.
- `src/components/SpaceExplorer.jsx` — nút loa / thanh âm lượng đọc store (`useSettings`); thanh là "Âm lượng nhạc nền".
- `src/components/Mascot.jsx` — tắt linh vật → không render; tắt animation → không đi dạo / leo / lăn (dừng trò đang dở).
- `src/components/SpaceBackdrop.jsx` — nền tĩnh → không cập nhật góc nhìn theo cuộn.
- `src/lib/celebrate.js` — tắt ăn mừng → không pháo giấy, gấu nói (`talk`) thay vì nhảy (`cheer`).
- `src/components/Layout.jsx` — nút bánh răng + lazy `SettingsPanel`; tên app bọc `.brand-text`.
- `src/components/Icon.jsx` — icon `settings` (bánh răng).
- `src/styles/layout.css`, `src/styles/mobile.css` — header ≤ 420px: nút tròn 34px, cụm nút không co, tên app rút gọn "…".
- `CLAUDE.md`, `CURRENT_STATE.md` — cập nhật bản đồ / trạng thái.

## What was implemented
| Nhóm | Cài đặt | Mặc định | Tác dụng |
|---|---|---|---|
| Hiệu năng | Đầy đủ / Tối ưu | Đầy đủ | Preset: Tối ưu = tắt Background động + Animation Panda + Hiệu ứng ăn mừng. Không đụng âm thanh. Đổi lẻ một mục → hiện "Đang tùy chỉnh" (chế độ suy ra, không lưu riêng). |
| Hình ảnh | Background động | Bật | Tắt: sao / hành tinh / Mặt Trăng đứng yên, ẩn lấp lánh + sao băng + thị sai cuộn. Nền vẫn hiện (không trống). **Chế độ ngắm vũ trụ vẫn chuyển động** (`:not(.space-exploring)`). |
| | Linh vật Panda | Bật | Tắt: không render (không còn nút "gọi gấu"; padding cuối trang tự bỏ vì `body:has(.mascot)`). "Cất gấu" cũ vẫn giữ nguyên. |
| | Animation của Panda | Bật | Tắt: không đi dạo / leo / lăn, tắt mọi animation CSS của gấu. Mờ đi khi linh vật tắt. |
| | Hiệu ứng ăn mừng | Bật | Tắt: không pháo giấy, gấu chỉ nói. Nộp bài / chấm điểm không đổi. |
| Âm thanh | Hiệu ứng âm thanh | Bật | Tiếng gấu, "vút" kính viễn vọng, chuông hành tinh. |
| | Nhạc nền | Bật | Nhạc mp3 / YouTube / tiếng vũ trụ tổng hợp trong chế độ ngắm vũ trụ. Tắt khi đang phát → dừng ngay. |
| | Âm lượng nhạc nền | 60% | 0–100, chỉ áp cho nhạc (trước đây là âm lượng chung). |

- Nút loa trong chế độ ngắm vũ trụ: "có tiếng" khi bật ít nhất một loại; bấm thì tắt / bật **cả hai** (đồng bộ với Cài đặt).
- **Khôi phục mặc định**: bấm lần 1 đổi chữ "Bấm lần nữa để khôi phục" (3 giây), bấm lần 2 mới reset + lưu.
- **Người dùng cũ**: chưa có `app-settings` thì đọc `space-sound='off'` → tắt hiệu ứng + nhạc; `space-volume` → âm lượng nhạc. Key cũ không bị xóa.
- **Dữ liệu hỏng** (JSON lỗi, sai kiểu, âm lượng ngoài 0–100, localStorage ném lỗi) → mặc định cho từng mục, không crash.
- **prefers-reduced-motion**: không đổi cài đặt người dùng; nền đứng yên (đã có), không pháo giấy (đã có), gấu không đi dạo (đã có) +
  **mới**: tắt animation CSS của gấu; bảng Cài đặt hiện ghi chú "Thiết bị đang bật Giảm chuyển động".
- Autoplay: nhạc chỉ bắt đầu trong cú bấm nút kính viễn vọng / nút loa như cũ; bật "Nhạc nền" trong Cài đặt **không** tự phát.
- Bảng Cài đặt là bảng nổi (không đổi trang) → mở khi đang làm bài không mất bài. Desktop: hộp giữa màn hình; ≤ 520px: trượt từ đáy.
  Đóng: nút ×, bấm nền tối, phím Esc.

## Tests performed
- `npm run build`: PASS.
- Test logic Node (script tạm, không commit): store — mặc định, JSON hỏng, sai kiểu, âm lượng 999 → 100, `null`, người dùng cũ,
  preset lite / custom, lưu + nạp lại, reset, localStorage ném lỗi: PASS. Âm thanh (AudioContext giả) — tắt cả hai không tạo
  AudioContext; chỉ hiệu ứng thì nhạc không phát; `play()` bị chặn `NotAllowedError` + `resume()` bị từ chối → không throw,
  không unhandled rejection, trạng thái giữ `idle`; tắt nhạc khi đang phát không lỗi: PASS.
- Chrome headless (Layout thật, đăng nhập giả bằng alias Vite, file tạm đã xóa):
  - Desktop 1280×800 sáng / tối: mở bảng, Tối ưu → cờ `<html>` bật, `animation-name: none` cho sao / quỹ đạo / gấu;
    đổi lẻ → "Đang tùy chỉnh"; tắt Panda → không còn `.mascot`; tắt nhạc → thanh âm lượng khóa; **reload giữ nguyên**;
    reset 2 bước; Esc đóng; ăn mừng bật = pháo giấy + `is-cheer`, tắt = không pháo + `is-talk`; JSON hỏng → mặc định.
  - Nền tĩnh + mở kính viễn vọng: quỹ đạo quay lại trong explorer, đóng thì đứng yên lại; nút loa explorer cập nhật `app-settings`; thanh âm lượng lưu.
  - Giả lập `prefers-reduced-motion: reduce`: gấu không animation, không pháo giấy, có ghi chú.
  - Viewport 320 / 360 / 390 (mobile): không cuộn ngang; header vừa khít kể cả có nút chuông (giả lập); bảng trượt từ đáy, cuộn được tới nút khôi phục.
  - Không có lỗi / cảnh báo console.
- **Chưa test**: điện thoại thật, Safari / iPhone, luồng nộp bài thật với Supabase, nghe âm thanh thật.

## Known issues
- Tắt Linh vật Panda thì lời gấu từ trang khác (vd. "Nộp bài xong rồi! … bấm 🔭") không hiện (không có ai nói). Nộp / chấm vẫn bình thường.
- Harness `AI/CODEX/qa-logic.mjs` phần đầu sẽ FAIL vì kiểm tra key cũ `space-volume` / `space-sound` — cần cập nhật sang `app-settings`.
- Các vấn đề cũ: xem `CURRENT_STATE.md`.

## Needs QA
1. **Desktop** (Chrome, Edge, Firefox): mở / đóng bảng (×, nền, Esc), từng công tắc, preset Đầy đủ / Tối ưu / "Đang tùy chỉnh", khôi phục mặc định 2 bước, giao diện sáng + tối.
2. **Android / mobile viewport** (320, 360, 390, 414 + xoay ngang): header không tràn (gia sư có thêm cờ báo lỗi; học sinh có chuông),
   bảng trượt từ đáy, cuộn được, công tắc dễ bấm, thanh âm lượng kéo được.
3. **iPhone / Safari** nếu có thể: bảng (safe-area đáy), `dvh`; nhạc nền chỉ phát sau cú bấm kính viễn vọng; tắt "Nhạc nền" khi đang
   ngắm → dừng; âm lượng nhạc đổi được (mp3 qua Web Audio; YouTube vẫn không chỉnh được trên iPhone — vấn đề cũ).
4. **Persistence**: reload, đóng / mở lại tab, PWA đã cài; người dùng cũ có `space-sound=off` / `space-volume=35` → mở app lần đầu sau cập nhật
   phải ra Hiệu ứng tắt, Nhạc tắt, Âm lượng 35%. `app-settings` hỏng → mặc định, không crash.
5. **Performance mode "Tối ưu"**: nền đứng yên, gấu ngồi yên, không pháo giấy; đo cảm nhận cuộn / CPU trên máy yếu nếu có.
6. **Tương tác Panda / nền / âm thanh / kính viễn vọng**: nền tĩnh + mở kính viễn vọng (hành tinh phải quay, bấm hành tinh được, đóng thì đứng yên lại);
   Panda tắt + kính viễn vọng (gấu riêng của explorer vẫn có); khóa kính viễn vọng khi đang làm bài vẫn đúng (Panda tắt thì không có lời nhắc, nút vẫn khóa);
   nút loa explorer ⇄ công tắc trong Cài đặt đồng bộ; hiệu ứng tắt nhưng nhạc bật (và ngược lại).
7. **Regression học tập**: làm + nộp bài (thường và đề THPT tính giờ), xem kết quả, Ôn câu sai (ăn mừng bật / tắt), bài giảng, thư viện, gia sư soạn / chấm —
   ở cả chế độ Đầy đủ và Tối ưu. Mở Cài đặt khi đang làm bài không được mất câu trả lời.
8. Cập nhật `AI/CODEX/qa-logic.mjs` theo key `app-settings` rồi chạy lại (phần YouTube autoplay không đổi).

## Commit / branch
Branch `main`, chưa commit.

## Recommended next action
Codex QA theo mục Needs QA; Owner commit nếu PASS.
