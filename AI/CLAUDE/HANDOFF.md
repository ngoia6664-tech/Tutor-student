# Claude — Handoff ca gần nhất

> Ghi đè mỗi ca, không giữ lịch sử dài hạn (lịch sử xem `git log`).

## Last task
Ca 22/10/2026 (sau commit `3785ff7`): **sửa nhạc nền ngắm vũ trụ trên điện thoại**. Owner báo: nút ▶ trên điện thoại lỗi; lần đầu bấm
kính viễn vọng nút hiện "đang phát" nhưng không có tiếng (điện thoại chặn tự phát). Không đổi schema / dữ liệu / bài tập / chấm điểm.

## Status
DONE, đã push (commit `461a1f3`). Chờ Codex QA trên điện thoại thật.

## Nguyên nhân
Chưa có file `public/audio/space-music.mp3` → mọi lần đều rơi xuống YouTube ẩn. iPhone chỉ cho YouTube phát khi chạm thẳng vào khung
video; lệnh `playVideo()` từ trang bị chặn → nút ▶ không có tiếng.

## Đã làm
- **File nhạc** `public/audio/space-music.mp3` (1,82 MB, mp3 128 kbps, ~2 phút, fade vào 0,5 s / ra 0,8 s cho vòng lặp mượt).
  Tách bằng ffmpeg từ video Owner cung cấp (`Downloads/Nhạc nền.mp4`); Owner chịu trách nhiệm về quyền dùng nhạc.
  Nguồn ưu tiên giờ là file → phát qua Web Audio ngay trong cú bấm, chạy được cả iPhone; YouTube chỉ còn là dự phòng.
- **Mặc định chưa phát + hỏi lần đầu**: `lib/spaceSound.js` thêm lựa chọn phiên `getMusicChoice()` / `setMusicChoice()`
  ('on' | 'off' | null, localStorage `space-music-choice` — nhớ suốt phiên đăng nhập kể cả đóng tab / mở lại app; đăng xuất thì xóa trong `AuthContext.signOut`).
  Owner sửa lại (commit sau `461a1f3`): đã chọn bật thì mỗi lần mở kính viễn vọng **tự phát**; `SpaceExplorer` lúc mount gọi lại `playMusic()`
  nếu choice 'on' mà chưa phát (StrictMode lúc dev chạy cleanup → `pauseAllMusic` làm nhạc vừa phát bị dừng).
  Lần đầu mở kính viễn vọng (choice = null, Cài đặt "Nhạc nền" bật) → `SpaceExplorer` hiện hộp `.explorer-ask`
  "Bạn có muốn bật nhạc nền không?" [Bật nhạc] [Không]. Trả lời xong không hỏi lại trong phiên.
  Bấm ▶ → choice 'on'; bấm ‖ → choice 'off' (lần mở sau không tự phát).
- **Nút kính viễn vọng** (`Layout.jsx`) gọi `openExplorerSound()`: luôn mở khóa AudioContext trong cú bấm (sửa rủi ro Codex báo:
  tiếng "vút" có thể bị iPhone chặn khi chưa chọn nhạc); choice 'on' thì phát nhạc luôn.
- **Dự phòng YouTube trên iPhone**: đang nguồn YouTube, choice 'on' mà 4 s vẫn chưa phát → chuyển sang tiếng vũ trụ tổng hợp
  (AudioContext đã mở khóa nên phát được). `SpaceMusic` chỉ tự phát khi choice 'on'. Tổng hợp dự phòng cũng chỉ phát khi choice 'on'.
- `CLAUDE.md`, `CURRENT_STATE.md` cập nhật.

## Files changed
`src/lib/spaceSound.js`, `src/components/SpaceExplorer.jsx`, `src/components/SpaceMusic.jsx`, `src/components/Layout.jsx`,
`src/contexts/AuthContext.jsx`, `src/styles/explorer.css`, `public/audio/space-music.mp3` (mới), `CLAUDE.md`, `CURRENT_STATE.md`.

## Kiểm tra đã làm
- `npm run build` qua; file mp3 được copy vào `dist/audio/`.
- `vercel.json` rewrite mọi đường dẫn về `index.html`, nhưng Vercel trả file tĩnh có sẵn trước → `/audio/space-music.mp3` tải được.
  Service worker không cache file nhạc (chỉ index.html + /assets).
- Chưa thử trên điện thoại thật.

## Needs QA (Codex)
1. Lần đầu sau đăng nhập: bấm kính viễn vọng → hiện hộp hỏi; nút ▶ ở trạng thái chưa phát.
2. Chọn "Bật nhạc" → có tiếng ngay (iPhone Safari, Chrome Android, desktop); nút chuyển ‖.
3. Đóng rồi mở lại kính viễn vọng → không hỏi lại, nhạc tự phát ngay (đặc biệt iPhone).
4. Chọn "Không" → không có nhạc; mở lại không hỏi, không phát; bấm ▶ thì phát.
5. Bấm ‖ rồi đóng, mở lại → không tự phát.
6. Tiếng "vút" khi mở kính viễn vọng nghe được trên iPhone cả khi chưa chọn nhạc (rủi ro Codex báo).
7. Đăng xuất → đăng nhập lại → hỏi lại.
8. Cài đặt tắt "Nhạc nền" → không hiện hộp hỏi, không nút ▶.
9. Thanh âm lượng có tác dụng với nhạc file (kể cả iPhone).
10. Chặn mạng tới `/audio/space-music.mp3` (giả lập lỗi file) → rơi xuống YouTube; trên iPhone sau 4 s chuyển tiếng tổng hợp.

## Ca tiếp theo: tiếng gấu + tô công thức (chờ QA)
- `lib/spaceSound.js` `mascotSound(kind)`: talk / teach / cheer / hide. Chưa có cú bấm trên trang thì bỏ qua (không tạo AudioContext);
  kêu xong thì `releaseAudio()` nếu không đang ngắm vũ trụ.
- `components/Mascot.jsx`: `say()` phát tiếng theo mood; `hide()` phát "hide". Im khi `useStudying()`, tab ẩn, đang ngắm vũ trụ.
- `components/FormulaText.jsx` (mới): đoạn trong `` `...` `` → `<mark class="formula">`; `Typed` gõ dần vẫn đúng (không tính dấu `).
  Đã đánh dấu công thức trong TIPS (Mascot), BODIES.about + SPACE_FACTS (SpaceExplorer). CSS `.formula` trong `styles/mascot.css`
  (sáng: nền vàng nhạt; tối: chữ vàng; bảng đen: phấn vàng).
- Needs QA: nghe tiếng khi bấm gấu / nộp bài (ăn mừng) / cất gấu; không kêu khi đang làm bài; tắt "Hiệu ứng âm thanh" thì im;
  công thức tô vàng hiển thị đẹp ở theme sáng + tối, bảng đen, bong bóng ngắm vũ trụ, mục lục; chữ gõ dần không lộ dấu `.

## Known limits
- Ra nền trên điện thoại thì nhạc dừng có chủ đích; quay lại phải bấm ▶ (không đổi).
- Lựa chọn nhạc lưu theo trình duyệt (localStorage): máy / trình duyệt khác thì hỏi lại.
