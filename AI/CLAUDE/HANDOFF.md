# Claude — Handoff ca gần nhất

> Ghi đè mỗi ca, không giữ lịch sử dài hạn (lịch sử xem `git log`).

## Last task
Sửa bug theo báo cáo QA của Codex (`AI/CODEX/HANDOFF.md`, 22/10/2026, test trên `main @ 3066328`).

## Status
DONE (chờ QA retest)

## Files changed
- `src/styles/explorer.css` — thêm khối `@media (orientation: landscape) and (max-height: 500px)` sau khối `max-width: 640px`.
- `src/components/SpaceMusic.jsx` — `playerVars.autoplay` và `onReady`.

## What was implemented
- **BUG-1 (nút "Quay lại học" khi đang xem hành tinh): KHÔNG sửa** — Owner xác nhận đây là hành vi mong muốn
  (bấm lần đầu đóng chi tiết, lần hai thoát explorer). Không báo lại bug này.
- **BUG-2 (chi tiết hành tinh không đọc được ở landscape 640×360):** đã sửa. Màn ngang thấp (cao ≤ 500px):
  - `--pf` nhỏ lại `clamp(90px, 30vh, 150px)`, chân dung sát mép trên, tên hành tinh 1.2rem.
  - Bong bóng gấu không trừ `--pf` nữa (hành tinh ở phải, bong bóng ở trái, không chồng nhau):
    `max-height: calc(100dvh - 0.6rem - 68px - 4rem)` (~218px ở cao 360), rộng `min(360px, 100vw - --pf - 3rem)`.
- **QA-CANDIDATE-1 (YouTube có thể tự phát khi đang tắt tiếng):** sửa phòng ngừa —
  `autoplay` = 0 nếu đang tắt tiếng lúc tạo player; `onReady` khi tắt tiếng gọi `pauseVideo()`.

## Tests performed
- `npm run build`: PASS.
- Chưa chạy app / chưa kiểm tra trực quan.

## Known issues
Xem `CURRENT_STATE.md` → Current known issues.

## Needs QA
1. BUG-2: explorer → bấm Mặt Trời / hành tinh ở landscape `640×360`, landscape hẹp hơn (vd `568×320`), và kiểm tra
   portrait 360/390 không bị ảnh hưởng. Bong bóng đọc + cuộn được, không đè chân dung, footer không tràn.
2. QA-CANDIDATE-1: tắt tiếng → reload → mở explorer, đợi YouTube ready: không được có tiếng. Bật tiếng lại: phát bình thường.
   Chạy lại `node AI/CODEX/qa-logic.mjs` (harness có thể cần cập nhật: nay mong đợi `autoplay: 0`, `pauseCalls ≥ 1`).
3. Vẫn còn từ ca trước: điện thoại thật (Android/iPhone), luồng nộp/chấm end-to-end.

## Commit / branch
Branch `main`, chưa commit.

## Recommended next action
Codex retest mục Needs QA; Owner commit nếu PASS.
