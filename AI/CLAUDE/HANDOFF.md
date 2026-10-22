# Claude — Handoff ca gần nhất

> Ghi đè mỗi ca, không giữ lịch sử dài hạn (lịch sử xem `git log`).

## Last task
Ca 22/10/2026 (sau commit `e05cf05`): **tối ưu hiệu năng (mobile / máy yếu)** + **nút nhạc nền ▶ / ‖**. Không thêm chức năng khác,
không đổi schema / dữ liệu / bài giảng / bài tập / chấm điểm / timer bài thi.

## Status
DONE (chờ Codex QA). Chưa commit.

## Files changed
- `src/lib/spaceSound.js` — nguồn sự thật cho trạng thái nhạc nền (`useMusicPlaying`, `isMusicPlaying`), `pauseAllMusic(fade)`,
  `registerExternalMusic` / `setExternalPlaying` / `playExternalMusic` (YouTube), `releaseAudio()`, listener `visibilitychange` cấp module (1 cái duy nhất);
  `stopMusic(fade)` có hủy lệnh dừng cũ; `ctx.onstatechange` cập nhật trạng thái.
- `src/components/SpaceMusic.jsx` — bỏ prop `muted` + nút "▶ Phát nhạc" riêng; prop `enabled`; báo trạng thái PLAYING thật; đăng ký play/pause với spaceSound.
- `src/components/SpaceExplorer.jsx` — nút ▶ / ‖ (`.music-toggle`), `playMusic()` theo nguồn (file / YouTube / tổng hợp), thoát thì `pauseAllMusic()` + `releaseAudio()`.
- `src/components/Mascot.jsx` — tách `Mascot` (vỏ) / `MascotBody`; throttle sự kiện cuộn; trò rảnh bỏ lượt khi tab ẩn / đang ngắm vũ trụ, không chạy khi đã "Cất gấu";
  animation tắt → chữ bong bóng hiện ngay (không hẹn giờ 28ms).
- `src/lib/celebrate.js` — tab ẩn thì không tạo pháo giấy.
- `src/components/Icon.jsx` — icon `resume` (▶), `pause` (‖).
- `src/styles/explorer.css` — style `.music-toggle` (vùng chạm nới rộng); dừng animation CSS của `.app` khi bị explorer che; sửa comment phần nhạc YouTube.
- `CLAUDE.md`, `CURRENT_STATE.md` — cập nhật bản đồ / trạng thái.

## Phần 1 — Hiệu năng: đã áp dụng
Kết quả rà (không sửa vì đã đúng): nền vũ trụ là CSS thuần; tắt "Background động" → `animation: none` thật + gỡ listener cuộn/resize + rAF (đã có);
trình duyệt tự dừng animation CSS / rAF khi tab ẩn. Pháo giấy: 70 phần tử, tự xóa sau 3,2 s, tắt "Ăn mừng" thì không tạo (đã có).
Chế độ ngắm vũ trụ đã lazy-load: `SpaceExplorer` + `SpaceMusic` + `PlanetPortrait` + `explorer.css` là chunk riêng (~44 kB), chỉ tải khi bấm kính viễn vọng;
YouTube API chỉ tải khi dùng nguồn YouTube.

Đã sửa:
| Chỗ | Trước | Sau |
|---|---|---|
| Linh vật tắt | Component trả `null` nhưng hook vẫn chạy: `setInterval` 10 s (setState → render), 3 listener `pointerdown/keydown/scroll`, hẹn giờ ngủ 30 s, listener sự kiện `mascot` | Component con bị gỡ → mọi timer + listener được cleanup |
| Gấu đã "Cất gấu" | Interval trò rảnh vẫn chạy | Không chạy |
| Cuộn trang | Mỗi sự kiện `scroll` `clearTimeout` + `setTimeout` | Tối đa 1 lần/giây (gấu đang ngủ thì tỉnh ngay) |
| Tab ẩn / đang ngắm vũ trụ | Gấu vẫn đổi trò (render) | Bỏ lượt |
| Animation gấu tắt | Chữ bong bóng vẫn chạy interval 28 ms | Hiện ngay |
| Đang ngắm vũ trụ | Animation CSS của app bị che (gấu thở, chớp mắt, skeleton...) vẫn tính | `animation-play-state: paused` |
| Đóng kính viễn vọng | AudioContext (vòng vang có phản hồi) chạy mãi sau khi đóng | `releaseAudio()`: im lặng 1,2 s thì `ctx.suspend()`; mở lại tự `resume` trong cú bấm |
| Tab/app ra nền | Nhạc mp3 / YouTube / tiếng tổng hợp vẫn phát, AudioContext chạy | **Điện thoại / máy tính bảng** (`hover: none` + `pointer: coarse`): dừng ngay (giữ vị trí) + treo AudioContext. **Máy tính**: theo yêu cầu Owner, nhạc vẫn phát khi sang tab / app khác (Zalo...) |
| Bấm phát lại khi đang fade dừng | Hẹn giờ dừng cũ (850 ms) có thể pause nhầm bài vừa phát lại | Hủy hẹn giờ cũ |
| Tab ẩn khi `celebrate()` | Tạo 70 hạt | Không tạo |

Chế độ **Tối ưu** (preset không đổi): nền đứng yên (không animation, không listener cuộn), gấu ngồi yên (không interval trò, không animation CSS,
filter drop-shadow chỉ vẽ một lần), không pháo giấy, chữ bong bóng hiện ngay. **Đầy đủ**: hình ảnh y như trước.
`prefers-reduced-motion`: giữ như cũ (nền đứng, không pháo, gấu không đi dạo / không animation) + chữ bong bóng hiện ngay.

## Phần 2 — Nút nhạc ▶ / ‖
- **Vị trí**: thanh nút chế độ ngắm vũ trụ, bên trái nút loa (nhạc nền chỉ tồn tại trong chế độ này; đóng explorer là nhạc dừng như trước).
  Nút tròn 38px như các nút khác, vùng chạm ~50×46px (`::after`), không chữ / không tooltip (chỉ `aria-label` cho trình đọc màn hình).
- **Quản lý ở** `lib/spaceSound.js`: `playing` = `<audio>` mp3 chưa pause **hoặc** tiếng tổng hợp đang chạy (khi AudioContext `running`) **hoặc** YouTube báo `PLAYING`.
  Cập nhật từ sự kiện thật (`play/playing/pause/ended/error`, `ctx.onstatechange`, `onStateChange` của YouTube). YouTube `BUFFERING` giữ nguyên icon.
- **Bấm ‖**: `pauseAllMusic(0.15)` — mp3 giảm 0,15 s rồi `pause()` (giữ vị trí), YouTube `pauseVideo()` (giữ vị trí), tổng hợp dừng. Icon → ▶ ngay.
- **Bấm ▶**: phát trong chính cú bấm theo nguồn hiện tại: `startMusic()` / `playExternalMusic()` (YouTube `playVideo`) / `startAmbient()`.
- **Autoplay bị chặn**: không bypass; trạng thái không phải "đang phát" → hiện ▶. Nút "▶ Phát nhạc" riêng của YouTube đã bỏ (nút ▶ thay thế).
- **Ra nền**: máy tính → nhạc tiếp tục phát (YouTube hết bài vẫn tự lặp). Điện thoại → dừng nhạc + treo AudioContext; quay lại không tự phát, ▶ phát tiếp.
  Phân biệt bằng `pausesInBackground()` / `canPlayNow()` trong `spaceSound.js` (media query, laptop màn cảm ứng có chuột vẫn tính là máy tính).
- **Cài đặt "Nhạc nền" OFF**: nhạc dừng (cả YouTube), nút ▶ / ‖ ẩn. Bật lại: không tự phát (như cũ); nút loa trong explorer bật lại thì phát trong cú bấm.
- Nút ▶ / ‖ **không** đụng hiệu ứng âm thanh. Nút loa giữ hành vi cũ (bật / tắt cả hai).
- **Chống trùng**: một `<audio>` duy nhất (module-level), một listener `visibilitychange` cấp module, một trình phát YouTube gắn với component explorer
  (gỡ → `destroy()` + hủy đăng ký); đổi route không tạo player (explorer nằm trong Layout, nhạc chỉ sống khi explorer mở).

## Tests performed
- `npm run build`: PASS (SpaceExplorer chunk riêng 43,8 kB).
- Test logic Node (script tạm ở scratchpad, không commit; AudioContext + `<audio>` giả): mp3 phát → ‖; ‖ → ▶ ngay; phát lại trong lúc fade không bị pause nhầm;
  ẩn tab → dừng; quay lại không tự phát; ▶ sau khi quay lại phát được; Nhạc OFF → dừng + `startMusic` không phát; bật lại không tự phát;
  autoplay bị chặn (`NotAllowedError`) → ▶, không throw; YouTube PLAYING/pause/gỡ; tổng hợp phát/dừng; sau `releaseAudio` bấm ▶ resume được: **16/16 PASS**.
- **Chưa test**: trình duyệt thật, điện thoại thật, PWA đã cài, nghe tiếng thật, YouTube thật.

## Known issues / giới hạn trình duyệt
- iPhone: YouTube iframe có thể không nhận `playVideo()` gọi qua postMessage như một cú bấm → lần đầu có thể phải bấm ▶ 2 lần (hành vi YouTube, không hack).
  Âm lượng không tác dụng với YouTube trên iPhone (cũ).
- iOS có thể tự dừng `<audio>` / treo AudioContext khi có cuộc gọi / mở Control Center; trạng thái nút theo sự kiện thật nên sẽ về ▶.
- Một số trình duyệt không bắn `pause` của YouTube khi hệ điều hành tự dừng tiếng → icon có thể lệch tới lần bấm sau (bấm ‖ vẫn an toàn: thành ▶).
- Chưa có file `public/audio/space-music.mp3` → nguồn thực tế là YouTube (cũ).
- Tắt Linh vật thì lời gấu từ trang khác không hiện (cũ).

## Needs QA
1. **Đầy đủ vs Tối ưu**: Đầy đủ nhìn y như trước; Tối ưu nền đứng, gấu ngồi yên, chữ bong bóng hiện ngay, không pháo giấy. DevTools Performance: Tối ưu ít khung hình/scripting hơn rõ.
2. **Bật/tắt Background động**: animation dừng thật, cuộn không còn đổi góc hệ Mặt Trời; mở kính viễn vọng vẫn quay.
3. **Bật/tắt Panda và Animation Panda**: tắt Panda → không còn `.mascot`, DevTools không còn interval/listener của gấu; tắt animation → gấu ngồi yên, không đi/leo/lăn; "Cất gấu" rồi gọi lại.
4. **Celebration**: nộp bài / ôn đúng với Ăn mừng bật / tắt; hạt pháo giấy bị xóa khỏi DOM sau ~3 s; bấm liên tiếp không tồn đọng `.confetti`.
5. **Mở / đóng Stargazing nhiều lần** (5–10 lần): không nhạc chồng, không iframe YouTube thừa (`.explorer-music-frame iframe` ≤ 1), gấu app không đổi trò khi đang ngắm,
   sau khi đóng không còn tiếng; mở lại có nhạc.
6. **Chuyển tab / app rồi quay lại** (đang phát): **máy tính** — nhạc vẫn phát khi sang tab khác / Zalo / thu nhỏ cửa sổ, quay lại icon vẫn ‖, không có 2 nguồn;
   **điện thoại** — nhạc dừng khi ẩn, quay lại hiện ▶, bấm ▶ phát tiếp đúng vị trí (YouTube). iPad / laptop cảm ứng: ghi lại hành vi thực tế.
7. **▶ / ‖ desktop** (Chrome, Edge, Firefox): icon khớp tiếng thật, bấm nhanh liên tục không lệch, tab ẩn hiện lại không lệch.
8. **▶ / ‖ mobile** (Android Chrome, iPhone Safari): autoplay bị chặn → ▶, bấm là phát; khóa màn hình rồi mở lại; vùng chạm dễ bấm, không bấm nhầm nút loa; 320–414px không tràn.
9. **Settings Music ON/OFF**: OFF → nhạc dừng, nút ▶ / ‖ ẩn; ON → nút hiện, không tự phát; hiệu ứng âm thanh vẫn độc lập (▶ / ‖ không tắt tiếng gấu / chuông).
10. **Không duplicate music** ở mọi kịch bản trên, kể cả nút loa bật / tắt xen kẽ ▶ / ‖.
11. **Không chạy ngầm bất thường**: DevTools (Performance monitor) sau khi đóng explorer / khi Panda tắt / tab ẩn.
12. **Installed PWA** (Android, iPhone nếu có): ▶ / ‖, ra màn hình chính rồi mở lại.
13. **Regression**: làm + nộp bài (thường + đề THPT tính giờ), kết quả, ôn câu sai, bài giảng — ở cả Đầy đủ và Tối ưu.

## Commit / branch
Branch `main`, chưa commit.

## Recommended next action
Codex QA theo mục Needs QA; Owner commit nếu PASS.
