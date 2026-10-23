# Codex QA Handoff — Feedback user và admin

**Ngày:** 23/10/2026 (Asia/Saigon)  
**Phạm vi:** Kiểm thử feedback trên localhost bằng tài khoản học sinh và gia sư. Không sửa source code.

## Kết luận và ưu tiên

Các luồng gửi và quản lý feedback đã thử hoạt động đúng. Phát hiện **1 lỗi Low về thao tác bàn phím**: focus thoát khỏi hộp góp ý đang mở.

**Nên sửa trong đợt cải thiện giao diện tiếp theo; không cần chặn phát hành vì lỗi này.** Chưa kết luận cho các môi trường và trường hợp chưa thử bên dưới.

## Môi trường và dữ liệu

- Microsoft Edge trên máy tính, tab ứng dụng tại http://localhost:5173, giao diện tối. Giữ kích thước cửa sổ mặc định, không đặt viewport cố định.
- User: testuser; admin/gia sư: Ngô Duy Anh.
- Lượt đầu có một góp ý Ý tưởng 4/5, gửi từ Thư viện. Owner trực tiếp xác nhận xóa; đã kiểm tra bản ghi mất và không trở lại sau tải lại trang.
- Lượt bổ sung tạo 4 góp ý có tiền tố [TEST FEEDBACK], gửi từ Bài cần làm: Ý tưởng 4/5, Báo lỗi 1/5, Lời khen 5/5, Khác không chọn mức hài lòng.
- Kết thúc kiểm thử: còn 4 bản ghi bổ sung, tất cả đã xem; localhost ở trang admin /tutor/feedback, mục Tất cả.

## Lỗi runtime đã tái hiện

### FB-01 — Focus thoát khỏi hộp góp ý khi dùng bàn phím

**Mức độ:** Low. **Trạng thái:** chưa sửa, có thể hoãn sang đợt cải thiện giao diện.

**Vị trí liên quan:** src/components/FeedbackButton.jsx:41–46 (focus ban đầu và Escape), dòng 66 (hộp thoại).

**Bước tái hiện:**

1. Đăng nhập học sinh, mở Góp ý.
2. Đưa focus tới nút Đóng ở đầu hộp thoại.
3. Nhấn Shift+Tab.

**Thực tế:** focus chuyển tới nút Gửi góp ý ở trang phía sau, trong khi hộp thoại vẫn mở. Kiểm tra DOM xác nhận phần tử focus có aria-label="Gửi góp ý" và không nằm trong phần tử có role="dialog".

Kiểm tra bổ sung: từ ô nội dung có chữ, nhấn Tab qua các nút cuối form cũng đưa focus ra ngoài hộp thoại.

**Mong đợi:** Tab/Shift+Tab luân chuyển trong hộp thoại cho đến khi đóng.

**Ảnh hưởng:** người dùng bàn phím hoặc trình đọc màn hình có thể mất vị trí thao tác và đi vào nội dung phía sau. Luồng gửi bằng chuột/cảm ứng chưa ghi nhận bị ảnh hưởng bởi lỗi này.

**Đề xuất cho Builder:** giữ focus trong hộp thoại, ngăn focus vào nền khi mở và trả focus về nút Góp ý khi đóng. Kiểm tra lại Escape và các cách đóng hiện có sau khi sửa.

## Kết quả chạy app — User

| Ca kiểm thử | Kết quả quan sát |
| --- | --- |
| Mở form | Hiện hộp góp ý và focus ban đầu vào ô nội dung; mặc định Ý tưởng, chưa chọn mức hài lòng. |
| Nội dung trống / chỉ khoảng trắng và xuống dòng | Nút Gửi góp ý bị vô hiệu hóa. |
| Giới hạn độ dài | Nhập hơn 2.000 ký tự chỉ nhận 2.000; gõ thêm khi đã đủ không tăng độ dài. |
| Mức hài lòng | Cả 5 mức đều chọn được; bấm lại mức đang chọn bỏ lựa chọn. Gửi được khi không chọn mức hài lòng. |
| Loại góp ý | Gửi thành công đủ 4 loại; Báo lỗi đổi placeholder thành hướng dẫn mô tả lỗi. |
| Gửi thêm | Xóa nội dung, bỏ mức hài lòng cũ, vô hiệu hóa nút Gửi; gửi tiếp thành công. Giữ loại góp ý đang chọn. |
| Đóng form | Escape, Để sau và nút Đóng đều đóng được. Mở lại sau khi đóng không còn bản nháp chưa gửi. |
| Nội dung đặc biệt | Tiếng Việt, emoji, xuống dòng lưu và hiển thị đúng bên admin. Chuỗi `<b>test</b>` hiện nguyên văn, không tạo thẻ b trong bản ghi. |
| Truy cập trang admin | User mở trực tiếp /tutor/feedback bị chuyển về /student. |

## Kết quả chạy app — Admin

| Ca kiểm thử | Kết quả quan sát |
| --- | --- |
| Nhận dữ liệu | Đủ 4 bản ghi, đúng người gửi, loại, mức hài lòng, nội dung, thời gian và trang Bài cần làm. Lượt đầu nhận đúng trang Thư viện. |
| Thứ tự | Các bản mới gửi hiển thị trước. |
| Bộ lọc loại | Mỗi loại trả đúng 1 bản ghi; loại không có dữ liệu ở lượt đầu hiển thị trạng thái rỗng. |
| Kết hợp tab và loại | Đánh dấu Ý tưởng đã xem: Chưa xem + Ý tưởng rỗng; Tất cả + Ý tưởng vẫn có bản đó và nút Đánh dấu chưa xem. |
| Đổi trạng thái từng bản ghi | Đã xem / Đánh dấu chưa xem cập nhật danh sách, nhãn Mới, bộ đếm tab và menu. Trạng thái đã xem giữ sau tải lại. |
| Đã xem hết | Thử với 1 bản ghi và cả 4 bản bổ sung; bộ đếm về 0. Sau tải lại vẫn có 4 bản trong Tất cả, cả 4 có nút Đánh dấu chưa xem. |
| Thống kê | Tổng 4, mỗi loại 1; (4 + 1 + 5) / 3 hiển thị 3,3/5, tooltip 3 lượt chấm. Bản không chấm điểm không bị tính thành 0. |
| Xóa | Hộp xác nhận xuất hiện; công cụ bị chặn bởi hộp thoại trình duyệt. Owner bấm Xóa. Sau đó tổng về 0, danh sách rỗng và tải lại không còn bản ghi ở lượt đầu. |

Không có log console mức error/warn chứa từ feedback trong lần kiểm tra log cuối phía user. Đây là kiểm tra có lọc, không phải kết luận toàn bộ console không có lỗi.

## Đối chiếu mã — tách biệt với kết quả chạy app

- FeedbackButton.jsx đặt focus ban đầu và lắng nghe Escape, chưa có xử lý giữ focus trong modal; phù hợp lỗi FB-01 đã quan sát.
- lib/feedback.js trim nội dung trước khi gửi; mức hài lòng không chọn được gửi là null.
- Trong supabase/schema.sql, feedback có ràng buộc loại, mức hài lòng 1–5, nội dung không rỗng và tối đa 2.000 ký tự. Policy học sinh chỉ cho INSERT dưới user_id của mình với seen=false và SELECT bản ghi của mình; policy gia sư cho quản lý toàn bộ.
- Đây là đối chiếu mã trong workspace, chưa xác minh RLS bằng yêu cầu API giả mạo hoặc đối chiếu toàn bộ policy đang triển khai với file SQL.

## Giới hạn

- Chưa thử viewport điện thoại, thiết bị thật, PWA, theme sáng hoặc trình đọc màn hình.
- Chưa gửi bản ghi dài đúng 2.000 ký tự lên server; chỉ xác minh giới hạn nhập liệu ở trình duyệt.
- Chưa mô phỏng mất mạng, lỗi máy chủ, bấm gửi liên tiếp hoặc cập nhật đồng thời từ nhiều phiên.
- Chưa thử nhánh Hủy của hộp xác nhận xóa: Owner đã chọn Xóa ở lần mở hộp thoại.
- Chưa thử API vượt quyền, truy cập feedback của học sinh khác hoặc tài khoản chưa đăng nhập.
- Không chạy build hoặc bộ test tự động, không sửa source code, không chạy migration trong đợt này.
- Báo cáo chốt phạm vi feedback. Tính năng đánh dấu chương đang học đã thay đổi trong lúc kiểm thử, cần QA riêng cho phiên bản hiện tại.
