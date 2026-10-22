# Codex — Kết quả QA

**Ngày:** 22/10/2026  
**Phạm vi:** Phân trang bài giảng, Cài đặt và luồng gia sư/học sinh theo bàn giao Claude. Không sửa source code.

## Kết quả

### Build

- `npm.cmd run build`: **PASS** trong lượt QA trước; source không đổi sau lần build đó.

### Phân trang bài giảng

Đã kiểm tra bài có sẵn (7 trang) và JSON QA được nhập/lưu qua giao diện gia sư:

- Bài có sẵn: chỉ hiện mục trang đang chọn; **Sau**, bộ chọn trang, URL `?xem=trang&trang=2` và reload giữ đúng trang 2.
- JSON QA: 2 mục ở trang 1/2 và Tóm tắt 1 phút thành trang 3. Preview trước khi lưu hiển thị vạch TRANG 1–3.
- Sau lưu: màn hình gia sư và học sinh đều hiển thị 3 trang. Trang soạn giữ dấu `<!-- trang -->`; Preview trang soạn hiển thị đúng các mốc trang.
- Tại tài khoản học sinh `testuser`: bài giảng xuất hiện trong thư viện, mặc định ở chế độ phân trang; chuyển trang 1 → 2 chỉ hiện nội dung trang 2, URL là `?trang=2`, reload vẫn giữ trang 2. **Xem cả bài** chuyển sang nội dung liền mạch với các vạch trang; **Xem theo trang** quay lại đúng chế độ phân trang.
- Bài giảng liên kết đúng với bài tập mẫu.

**PASS** cho luồng preview, lưu, mở, sửa và xem bài giảng từ phía học sinh.

### Dán JSON và chức năng gia sư

Đã dùng JSON tổng hợp riêng cho QA: bài giảng hai trang và một câu trắc nghiệm mẫu trên lớp. Preview chia thành **2 phần** (bài giảng + bài tập), nội dung câu hỏi/đáp án hợp lệ. Chương tự khớp với chương hiện có.

Danh sách người nhận hiển thị **testuser** (chưa có nhóm); đã chọn tài khoản này theo tài khoản test đang dùng. Lưu thành công cả hai phần:

- Bài giảng: `QA phân trang Codex 22-10-2026` — ID `e5edd03d-88e6-4d8e-ace6-74069bd1767d`.
- Bài tập trên lớp: `QA phân trang Codex 22-10-2026 – Bài tập trên lớp` — ID `9527d5cf-49b0-4cfb-8666-b5db75b1b487`.

Đã xác minh màn hình gia sư: bài giảng có 3 trang, người nhận là testuser, bài tập liên quan được liên kết; trang theo dõi hiện đáp án B và trạng thái **Chưa nộp**; form sửa giữ nguyên loại câu, lựa chọn đúng và người nhận. Hồ sơ testuser cập nhật bài tập/bài giảng QA.

Tại phía học sinh, bài tập xuất hiện trong thư viện và đường dẫn liên kết; trang bài tập hiển thị đúng câu trắc nghiệm, trạng thái **Chưa nộp**, và không hiện đáp án trước khi nộp. Không chọn đáp án, không bấm nộp, không chấm hoặc thay đổi bài cũ đang chờ chấm.

Dữ liệu QA vẫn được giữ lại để dễ nhận diện; nội dung ghi rõ là dữ liệu thử, không phải kiến thức học tập.

### Cài đặt

- Trên giao diện học sinh desktop: preset **Tối ưu** tắt đúng nền động, animation Panda, hiệu ứng ăn mừng.
- Tuỳ chỉnh từng mục hiện “Đang tùy chỉnh”; tắt Panda vô hiệu hóa công tắc animation. Trạng thái tùy chỉnh giữ sau reload.
- Tắt hiệu ứng âm thanh phản ánh đúng trạng thái; tắt nhạc làm khóa thanh âm lượng. Đã khôi phục giá trị mặc định.
- Theme sáng/tối đổi được.
- Trên giao diện gia sư, bảng Cài đặt mở được và phím Escape đóng được.

**PASS** cho các luồng cài đặt đã thử trên desktop.

## Giới hạn kiểm thử

- Chưa tìm thấy bài giảng cũ không có dấu trang để xác minh tương thích.
- Chưa thử điện thoại vật lý, Safari/iPhone hoặc viewport mobile thực.
- Chưa thử âm thanh phát thực tế, nút loa trong ngắm vũ trụ, hoặc luồng nộp/chấm bài thật.
- Tài khoản nhận hiển thị là `testuser`; nếu “test” là tài khoản khác, cần chọn tài khoản khác cho các lượt gửi tiếp theo.

## Bug

Không phát hiện bug trong các luồng đã thử. Kết quả QA **một phần**; các giới hạn trên vẫn cần kiểm tra để kết luận toàn diện.

