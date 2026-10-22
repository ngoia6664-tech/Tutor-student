# Codex QA Handoff — Âm thanh khi mở kính viễn vọng

**Ngày:** 22/10/2026  
**Phạm vi:** Kiểm tra thao tác bấm kính viễn vọng, hiệu ứng mở màn hình và trạng thái nhạc nền trên mobile viewport. Không sửa source code.

## Rà soát tĩnh

- `src/components/Layout.jsx:88` gọi `openExplorerSound()` ngay trong thao tác bấm. Hàm chỉ mở khóa AudioContext và khởi chạy nhạc tại đây nếu phiên đã chọn bật nhạc nền (`choice === 'on'`).
- `src/components/SpaceExplorer.jsx:206` gọi `playWhoosh()` trong `useEffect` sau khi màn hình ngắm được mount. Hàm này kiểm tra cài đặt hiệu ứng âm thanh rồi dùng Web Audio.
- **Rủi ro cần xác minh trên iPhone:** Khi lựa chọn nhạc nền chưa có hoặc đang tắt, `openExplorerSound()` không mở khóa AudioContext trong cú bấm. Tiếng “vút” chỉ được yêu cầu sau đó trong effect của màn hình tải lười. Safari iOS có thể chặn tiếng hiệu ứng trong tình huống này. Đây là nhận định từ luồng mã, chưa được xác nhận trên thiết bị thật.

## Kết quả chạy app

- Mở app gia sư tại `http://localhost:5173/tutor`. Bấm kính viễn vọng mở được màn hình ngắm ở viewport **393×852** và **412×915**.
- Công tắc hiệu ứng âm thanh hiển thị đang bật. Luồng gọi `playWhoosh()` được kích hoạt khi màn hình ngắm mở.
- Sau khi mở lại, nút nhạc nền ở trạng thái “Phát nhạc”. Bấm phát làm nút chuyển sang “Tạm dừng nhạc”, tức ứng dụng báo nguồn nhạc đang chạy.
- File `public/audio/space-music.mp3` có trong workspace (1.913.460 byte). Điều này trái với ghi chú trong `CURRENT_STATE.md` rằng file chưa có; mục trạng thái đó đã cũ.
- Console không có lỗi ứng dụng liên quan tới âm thanh. Có một lỗi `translate-page` không liên quan.

## Giới hạn

- Đây là Edge trên máy tính với viewport được đặt theo kích thước điện thoại; truy vấn `(pointer: coarse)` vẫn trả về `false`. Không có iPhone, Android hoặc emulator khả dụng, nên chưa kiểm tra Safari iOS hay Chrome Android thật.
- Có thể xác nhận ứng dụng gọi hiệu ứng và báo trạng thái player, nhưng không có công cụ thu âm đầu ra để xác nhận tiếng “vút” phát ra loa.
- Phiên trình duyệt đã có lựa chọn nhạc nền trước lượt thử, nên chưa kiểm tra hộp thoại hỏi bật nhạc lần đầu.
- Không chạy build hoặc bộ QA tự động trong lượt này.

## Kết luận

Luồng mở kính và trạng thái player hoạt động trong Edge ở hai viewport điện thoại. Chưa đủ bằng chứng để kết luận tiếng “vút” nghe được trên iPhone/Android thật. Rủi ro iOS nêu trên cần được kiểm tra trên thiết bị thật. Không xác nhận được bug runtime trong môi trường hiện có.
