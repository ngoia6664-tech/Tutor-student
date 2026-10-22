# Codex — QA retest gần nhất

> Ngày 22/10/2026 (Asia/Saigon). Retest theo Claude handoff và yêu cầu Owner.

## Tested version / commit
- Base: `main @ 306632838132d8b2492de47c73f67bac52db19bf`.
- Claude thay đổi chưa commit ở `src/styles/explorer.css` và `src/components/SpaceMusic.jsx`.
- Đã đọc `CURRENT_STATE.md`, `AI/CODEX/ROLE.md`, `AI/CLAUDE/HANDOFF.md`; Git diff chỉ ra hai file trên là source đã sửa.
- BUG-1 (“Quay lại học” cần hai lần khi đang xem hành tinh) được Owner xác nhận là hành vi mong muốn; đóng phát hiện này, không retest như bug.

## Test scope
- Retest lỗi bong bóng chi tiết ở landscape `640×360` và màn thấp/hẹp `568×320`.
- Regression ở portrait `360×800`, `390×844`.
- Kiểm tra build và thay đổi YouTube mute bằng harness logic.
- Không bắt đầu/nộp bài, không sửa dữ liệu; cuối ca đăng xuất tài khoản test. Không lưu thông tin đăng nhập vào báo cáo.

## Environment
- Windows, Edge desktop, Vite local `http://127.0.0.1:5173`, app role học sinh.
- Viewport thay bằng công cụ trình duyệt, không phải thiết bị thật; browser zoom làm CSS viewport khác kích thước chỉ định. Số đo dưới đây là `innerWidth × innerHeight` thực tế.
- YouTube IFrame API/iframe không tải trong phiên này nên không thể xác nhận âm thanh thực sự qua loa.

## Result
**PASS cho BUG-2 tại các viewport đã kiểm tra.** Build PASS. UI/harness mute có trạng thái đúng; phát âm thanh thật còn chưa xác minh do YouTube không tải.

| Kiểm tra | Kết quả |
| --- | --- |
| `npm.cmd run build` | PASS, 340 modules transformed. |
| BUG-2, `640×360` CSS | PASS: bong bóng rộng 360px, cao 218.4px; vùng nội dung cuộn `170/550px`; footer cao 47px nằm trong khung; chân dung rộng 108px ở bên phải, không chồng bong bóng. |
| BUG-2, `567×320` CSS (mục tiêu 568×320) | PASS: bong bóng 360×178.4px; vùng nội dung cuộn `130/550px`; footer nằm trong khung; chân dung ở bên phải, không chồng bong bóng. Không tràn ngang (`scrollWidth=567`). |
| Portrait `360×800` CSS | PASS: bong bóng cao 505px, vùng nội dung cuộn `452/741px`, chân dung nằm phía trên; không tràn ngang. |
| Portrait `390×844` CSS | PASS: bong bóng cao 537px, chân dung nằm phía trên, không tràn ngang (`scrollWidth=390`). |
| Harness YouTube ở trạng thái muted | PASS: cập nhật script QA để kỳ vọng `autoplay=0`, `pauseVideo` một lần và không gọi `playVideo`. Kết quả `AI/CODEX/qa-logic-results.txt`. Đây là mock; không chứng minh tiếng phát thực tế. |
| YouTube trong trình duyệt | CHƯA XÁC MINH: iframe không xuất hiện trong tối đa 10 giây; không thể kiểm tra trạng thái player hoặc nghe audio trong lần chạy này. UI vẫn giữ trạng thái tắt tiếng và slider disabled sau reload. |

## Findings
- **BUG-2 đã sửa đạt retest** tại 640×360 và 567×320; portrait được kiểm tra lại và không thấy regression.
- **BUG-1 đóng theo xác nhận Owner:** hành vi thiết kế, không phải bug.
- **QA-CANDIDATE-1:** nhánh logic đã sửa PASS bằng mock; không kết luận autoplay/âm thanh thực tế do YouTube iframe/API không tải.
- Không thực hiện kiểm thử Android/iPhone thật, pinch cảm ứng, hay luồng end-to-end nộp/chấm.

## Regression / hygiene
- Build thành công trên source hiện tại.
- Trả sound về bật/60, reset viewport và đăng xuất tài khoản thử nghiệm.
- Không chỉnh source app, tạo/nộp bài hoặc ghi trực tiếp database.

## Recommended next action
Có thể đóng BUG-2 cho các viewport đã thử. Để xác nhận QA-CANDIDATE-1, retest trên mạng/trình duyệt cho phép YouTube IFrame API; sau đó thử bật tiếng và xác nhận phát thực tế. Thiết bị Android/iPhone thật vẫn cần chạy riêng.
