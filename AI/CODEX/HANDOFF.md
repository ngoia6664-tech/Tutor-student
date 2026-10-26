# Codex QA Handoff — chức năng 2 và 3 của Claude

**Ngày:** 25/10/2026 (Asia/Saigon).
**Mã kiểm tra:** HEAD `df80868`, gồm `08c5c09` (Sổ chấm bài) và `e228df6` (chip câu). Workspace sạch trước QA.
**Vai trò:** đọc CURRENT_STATE.md, CLAUDE.md, AI/CLAUDE/HANDOFF.md, AI/CODEX/ROLE.md; review theo kỹ năng engineering:code-review. Không sửa source app, không chạy migration, không sửa database trực tiếp.

## Kết luận

- **Chức năng 2 — chấm bài:** luồng mở bài, chuyển học sinh, sổ nổi cố định, ẩn/hiện bằng gấu, tắt Linh vật, lưu trạng thái thu gọn và lưu lại điểm hiện có của tester hoạt động trong các ca đã chạy. Có **2 lỗi UI đã tái hiện** bên dưới (Medium + Low). Chưa đủ điều kiện kết luận toàn bộ luồng chấm đạt.
- **Chức năng 3 — chip câu chưa làm:** PASS trên bài THPT thật trong chế độ làm lại: nhãn ngắn, nhảy đúng câu, đầu câu không bị thanh tiến độ che sau khi cuộn hoàn tất; cập nhật khi nhập/xóa trả lời. Bài thường nhãn “1 / 2 / 3” PASS bằng render component thật với dữ liệu tổng hợp, chưa chạy bài thường trên UI vì tester hiện không có bài đó.
- **Review tĩnh:** thêm 1 rủi ro Medium ở “Cho nộp lại”, chưa tái hiện trên UI.
- `npm.cmd run build`: PASS. `node AI/CODEX/qa-answer-progress.mjs`: PASS 3/3.

## Môi trường và dữ liệu

- Localhost http://localhost:5173; Vite dev; Microsoft Edge Windows, backend Supabase đang cấu hình của project (không phải database QA riêng).
- Desktop mặc định: khoảng 1528 × 686 (lượt học sinh 1528 × 684); viewport giả lập 390 × 844 và 360 × 800, theme sáng/tối. Không phải điện thoại thật / Safari.
- Gia sư: Ngô Duy Anh, phiên Owner đăng nhập sẵn.
- Bài chấm 2 học sinh: `ce3c5bae-386a-4c21-b19d-523848f87887` — “Chủ đề 5 – Dạng 2 (Bài toán sử dụng đồ thị)”, 7 câu, haanh và tuantu đều đã chấm 10.
- Bài THPT: `be7825d2-e0ca-4896-830c-f76eae17682b` — “Chủ đề 1: Cấu trúc của chất – Sự chuyển thể – Mục II: Bài tập luyện tập (cấu trúc đề THPT)”, 28 câu (18 + 4 + 6); hoang 7,25, testuser 2,5.
- Owner chuyển sang tài khoản học sinh testuser theo yêu cầu. Hiện tài khoản này có 0 bài cần làm, 2 kết quả, Điểm TB 2,5.

**Lưu ý đối chiếu Claude:** handoff còn ghi sổ chưa commit và checklist dùng thanh sticky / gấu nói. Bản thực tế đã commit ở 08c5c09: sổ nổi góc phải, danh sách dọc, gấu im lặng và bấm để ẩn/hiện. QA theo hành vi mới này. Không coi việc gấu im lặng là lỗi. Store hiện mặc định mở ở cả mobile và desktop.

## Các ca chạy trên trình duyệt

| Ca | Kết quả / phạm vi |
| --- | --- |
| Mở bài đã chấm có 2 học sinh | PASS: mặc định haanh, chỉ 1 thẻ chấm; bài làm và đáp án mở sẵn; bảng đáp án tổng ở dưới phần chấm. |
| Chọn tuantu / haanh trong sổ | PASS đổi đúng tên, bài làm riêng, điểm 10 và dòng active; có cuộn về đầu thẻ. Vị trí đầu thẻ có lỗi QA23-01. |
| Sổ khi cuộn bài dài trên desktop | PASS: vị trí fixed; desktop rộng 200px, dock top 442,8 / bottom 556 ở viewport 1528 × 686, gấu top 572, có khe 16px. Sổ thấy ngay khi mở trang. |
| Sổ mobile 390 / 360px | Rộng 180px; không tăng scrollWidth toàn trang trong ca thử. Header sổ tràn nút, xem QA23-02. Chưa kiểm tra danh sách đông hơn 2 học sinh. |
| Bấm gấu ẩn / hiện | PASS: sổ ẩn hẳn khi có gấu, mở lại được; aria-label của gấu đổi đúng. Không phát sinh lời giảng phủ sổ trong ca này. Chưa xác minh âm thanh bằng tai. |
| Tắt Linh vật trong Cài đặt | PASS: gấu biến mất, sổ vẫn hoạt động; bấm Ẩn còn đầu sổ và nút Hiện. Sau reload vẫn thu gọn. Đã bật lại Linh vật. |
| Lưu điểm tester | PASS: chọn testuser bài THPT, giữ điểm 2.5 và nhận xét trống, bấm Cập nhật chấm; thấy Đã lưu, vẫn active testuser và 2.5 sau tải lại dữ liệu. Không thay điểm học sinh thật. |
| Làm lại THPT | Mở lần 1, đủ 28 chip I.1… I.18 / II.1… II.4 / III.1… III.6, không tiền tố “Câu” trên chip thanh tiến độ. |
| Nhảy I.3 desktop tối | PASS: thanh tiến độ bottom 242,10; đầu câu 254,14 — dưới thanh khoảng 12px. |
| Nhảy II.4, 390px sáng | PASS sau cuộn hoàn tất: thanh bottom 305,15; đầu câu 317,23; hit-test thuộc câu đích. Câu cao 740,40px. |
| Nhảy II.4, 360px tối | PASS sau cuộn hoàn tất: đầu câu 317,30; thanh bottom 305,15; câu cao 802,41px (hơn viewport), hit-test thuộc câu đích. |
| Nhảy III.6, 360px tối | PASS sau cuộn hoàn tất: đầu câu 316,66; thanh bottom 305,15; hit-test thuộc câu đích. |
| Kích thước chip / tràn trang | 390px: chip nhỏ nhất 35,2px (2,2rem). 390px clientWidth = scrollWidth = 375; 360px clientWidth = scrollWidth = 345. Thanh có vùng cuộn chip riêng. |
| Thu / mở thanh tiến độ | PASS: Ẩn bỏ danh sách chip, Hiện khôi phục chip. |
| Nhập / xóa câu trả lời ngắn III.6 | Nhập tạm 12345: Đã làm 1 / Chưa làm 27, chip III.6 biến mất. Xóa về trống: Đã làm 0 / Chưa làm 28, chip trở lại. Không nộp. |
| Thoát làm lại | PASS: bấm Thôi, không làm lại, vẫn còn 3/3 lượt; Kết quả / Điểm TB vẫn 2.5. |

Các phép đo nhảy câu được lấy sau khi cuộn mượt kết thúc; không dùng vị trí trung gian để kết luận lỗi.

## Lỗi đã tái hiện trên UI

### QA23-01 — Chuyển học sinh khiến header che tên ở đầu thẻ

**Mức độ: Medium.**
**Vị trí:** `src/pages/tutor/AssignmentTracking.jsx:64`; `src/styles/grading.css:172`.

Bước tái hiện:
1. Gia sư mở bài ce3c5bae có haanh và tuantu trên desktop, theme tối.
2. Từ vùng dưới bài, bấm tuantu trong sổ.
3. Chờ cuộn mượt hoàn tất, quan sát đầu thẻ.

Thực tế: thẻ top **76,01px**, nhưng header bottom **108,86px**. Link tên tuantu top **96,01px**, bottom **116,01px**. Hit-test tại điểm x = link.left + 10, y = link.top + 5 trả về **nav của header**, chứng minh tên bị che. Ở 390px cũng thấy thẻ top 75,61 trong khi header bottom 102,06.

Nguyên nhân đối chiếu code: scroll-margin dùng `--answer-offset` fallback 64px + 0,75rem; sau bỏ GradeSwitcher, trang chấm không còn hook đo header để đặt biến này. Header thực tế cao hơn 64px.

Mong đợi: tên / đầu thẻ được đặt dưới chiều cao header thực tế khi đổi học sinh.

Bằng chứng: [Ảnh desktop](evidence/2026-10-25/grade-name-under-header-desktop.png).

### QA23-02 — Nút Ẩn tràn khung sổ và bị cắt trên mobile

**Mức độ: Low** (còn cách dùng gấu để ẩn/hiện).
**Vị trí:** `src/styles/grading.css:66`, `:83`, `:88`, `:180`; nội dung đầu sổ ở `src/pages/tutor/AssignmentTracking.jsx:169`.

Bước tái hiện:
1. Mở bài ce3c5bae, hai học sinh đã chấm, sổ đang mở, hiển thị “hết bài chờ”.
2. Đặt viewport 390 × 844 (tối), rồi 360 × 800 (sáng).
3. Quan sát hàng tiêu đề và nút Ẩn.

Thực tế 390px: dock right **367,20**, nút right **382,86**, trong khi clientWidth **375**. Nút vượt mép dock **15,66px** và vượt vùng nội dung **7,86px**, bị cắt ở mép phải.
360px: dock right **336,80**, nút right **352,46**, clientWidth **345**, vẫn vượt/cắt tương tự.
Trang không tăng scrollWidth, nên không có cách cuộn ngang để xem phần nút ngoài mép.

Nguyên nhân đối chiếu code: đầu sổ là flex không wrap; title và count đều nowrap, nút flex:none, tổng kích thước vượt chiều rộng 180px.

Mong đợi: đầu sổ và nút nằm trọn trong khung ở 360–390px.

Bằng chứng: [390 tối](evidence/2026-10-25/grade-dock-390-dark.png), [360 sáng](evidence/2026-10-25/grade-dock-360-light.png).

## Review tĩnh — chưa xác minh trên UI

### QA23-S01 — Cho nộp lại thành công có thể giữ busy=true

**Rủi ro: Medium.** `src/pages/tutor/AssignmentTracking.jsx:326` (reopen), `:133` (onChanged), `src/lib/useAsync.js`.

- reopen đặt busy=true, khi thành công chỉ gọi onChanged; setBusy(false) chỉ ở catch.
- onChanged giữ current.student_id; GradeCard key vẫn là student_id.
- useAsync.reload giữ data cũ khi tải lại, không unmount GradeCard.
- Suy ra sau mở lại thành công, component vẫn giữ busy=true: nút lưu disabled, nhãn “Đang lưu...” có thể không hết; cần đổi học sinh hoặc reload trang để thoát.

Cần Builder thêm reset busy trong nhánh thành công / finally, rồi QA trên bài thử có thể mở lại.
**Đây là suy luận từ mã, không phải lỗi đã tái hiện UI trong ca này.**

Không phát hiện thay đổi schema/RPC liên quan riêng chip và sổ trong diff đã rà; chưa kiểm chứng RLS/API bằng lời gọi có đăng nhập hoặc kiểm thử đồng thời.

## Kiểm chứng component với dữ liệu tổng hợp

Chạy `node AI/CODEX/qa-answer-progress.mjs`, dùng Vite SSR + ReactDOMServer render component AnswerProgress thật và questionLabels thật:
- Bài thường: chip 1 / 2 / 3 — PASS.
- Đề thi: I.1 / I.2 / I.3 — PASS.
- Câu 2 có lựa chọn A: chip chỉ còn 1 / 3 — PASS.

Không thay thế test tương tác bài thường trên trình duyệt. Bằng chứng: [JSON component](evidence/2026-10-25/answer-progress-component.json).
Phép đo UI: [JSON browser](evidence/2026-10-25/answer-progress-browser.json).
Ảnh chip: [390 sáng II.4](evidence/2026-10-25/answer-progress-390-light-II4.png), [360 tối III.6](evidence/2026-10-25/answer-progress-360-dark-III6.png).

## Ảnh hưởng dữ liệu và trạng thái trả lại

- Chỉ bấm Cập nhật chấm cho testuser với đúng điểm cũ 2.5 và nhận xét trống. Không sửa điểm haanh, tuantu, hoang.
- Không bấm Cho nộp lại; không xóa dữ liệu / ảnh / bài, không tạo bài mới, không nộp bài hoặc lần làm lại.
- Đã xóa giá trị nháp tạm III.6 về trống (0/28 câu đã làm). App có thể giữ bản nháp làm lại trống trên localStorage và tự cập nhật Chương đang học theo bài vừa mở.
- Đã trả theme tối, bật Linh vật như ban đầu, thanh tiến độ mở, sổ chấm mở; đã reset viewport.
- Cuối ca: testuser ở /student/results, Điểm TB 2.5. [Ảnh trạng thái cuối](evidence/2026-10-25/tester-results-final.png).
- Console có các lỗi “Cannot find menu item with id save-page / translate-page” đã xuất hiện trước tương tác; chưa xác định nguồn, không gán thành bug app.

## Chưa xác minh / việc cần làm tiếp

1. Builder sửa QA23-01, QA23-02; xác nhận và xử lý QA23-S01; test lại cả desktop / 360 / 390.
2. Chưa chạy thay đổi trạng thái done → checked hoặc Cho nộp lại, sắp xếp lại danh sách sau đổi trạng thái, số “n chờ chấm”, bài chưa giao ai, danh sách đông cần cuộn, gấu cất bằng nút tròn, tắt riêng animation.
3. Chưa test luồng làm bài chính thức chưa nộp / đề tính giờ hoặc bài thường trên UI do testuser không có bài cần làm; chế độ làm lại dùng chung AnswerProgress đã kiểm tra.
4. Chưa test iPhone/Android thật, âm thanh/animation thực tế, API/RLS, schema, SVG (chức năng 1), các ưu tiên khác ngoài 2 và 3.
5. Không sửa source app, commit, push hay deploy trong phiên QA này.

