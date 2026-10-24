# Codex QA Handoff — 4 tính năng làm bài / chấm bài

**Ngày:** 24/10/2026 (Asia/Saigon)
**Mã nền:** `eb813d8`; kiểm tra các thay đổi CHƯA COMMIT trong workspace theo `git status` và `git diff`.
**Vai trò:** QA theo `AI/CODEX/ROLE.md`; đã đọc `CURRENT_STATE.md`, `CLAUDE.md` và handoff Claude. Không sửa source app, không chạy migration, không sửa trực tiếp database.

## Kết luận

Đã chạy app và kiểm tra cả 4 nhóm tính năng. Các ca lưu câu khó, ôn quá 3 lần, nộp đủ 3 lần làm lại, xem từng lần, giữ điểm chính thức và điểm TB đã qua trong dữ liệu thử bên dưới.

Có **3 lỗi giao diện đã tái hiện trên trình duyệt cần Builder xử lý**: 2 lỗi Medium và 1 lỗi Low. Lỗi màu khi ẩn đáp án còn được kiểm chứng độc lập bằng render component thật. Không kết luận toàn bộ backend/RLS đã đạt: ca gọi RPC lần 4, đồng thời, giả mạo học sinh khác và chạy schema hai lần chưa thực hiện.

## Môi trường, dữ liệu và ảnh hưởng của ca test

- App local: http://localhost:5173, Vite dev, Microsoft Edge trên Windows; backend Supabase đang cấu hình của project. Đây KHÔNG phải database thử riêng.
- Gia sư ban đầu: Ngô Duy Anh, desktop viewport 1528 × 686, theme tối.
- Học sinh: testuser, ID `386dbebc-1ce4-47b0-9815-178a9ca855ef`; Owner trực tiếp đăng nhập giúp. Các hộp confirm nộp bài do Owner bấm OK vì công cụ trình duyệt bị kẹt khi mở confirm.
- Đã thử desktop và viewport giả lập 390 × 844, 360 × 800; theme sáng/tối. Đây là Edge thu nhỏ viewport, KHÔNG phải thiết bị iPhone/Android hoặc Safari thật.
- Bài thường đã chấm: `9547f5cb-bd4e-46ba-a9b8-ce0f447bb5f9` — “Bài tập dao động điều hòa”; 3 câu: tự luận, MCQ, điền khuyết. Trước QA: điểm chính thức 0, Điểm TB 0, chưa có lần làm lại.
- **Đã tạo 3 lần làm lại thật trên bài trên:** lần 1 = 2/2 câu đúng; lần 2 = 0/2; lần 3 = 1/2. Điểm chính thức và Điểm TB vẫn 0. Ba lượt đã dùng hết, chưa xóa/reset vì không can thiệp trực tiếp database.
- Bài chưa nộp: `65cf317b-ec4e-47ec-8316-cdcad3d77f03` — bài trên lớp về kiến trúc 8085; 30 câu (26 MCQ + 4 đúng/sai).
  Đã để lại **nháp local**: câu 1 chọn A; câu 27 chọn a Đúng / b Sai / c Đúng / d Sai. Bài vẫn chưa nộp.
- Đề THPT: `be7825d2-e0ca-4896-830c-f76eae17682b` — 28 câu (18 + 4 + 6), lần chính thức máy chấm 2,5/10, giới hạn 61 phút. Chỉ mở/hủy chế độ làm lại; không nộp lần làm lại nào trên đề này.
- Các đánh dấu Câu khó do QA tạo đã bỏ bằng UI; cuối ca mục Câu khó về 0.
- Khi mở bài/làm lại, app tự cập nhật “Chương đang học”; có thể đã đổi chương của testuser theo bài vừa mở.
- Đã trả theme về tối và reset viewport override về kích thước cửa sổ mặc định. Cuối ca để tab localhost ở trang gia sư chấm bài dao động điều hòa, mở bảng bài làm, điểm chính thức 0 và dòng đủ 3 lần làm lại.

## Lỗi đã tái hiện trên trình duyệt

### QA4-01 — Nhảy câu khiến nhãn câu bị thanh tiến độ che

**Mức độ: Medium.**
**Vị trí:** `src/components/AnswerProgress.jsx:54` (scrollIntoView block center), `src/styles/attempts.css:4` (thanh sticky).

**Bước tái hiện đã chạy:**

1. Đăng nhập testuser, mở bài 30 câu 8085 nêu trên.
2. Đặt viewport 390 × 844, theme sáng; mở danh sách câu chưa làm.
3. Bấm chip “Câu 28”, chờ cuộn mượt hoàn tất.
4. Quan sát nhãn câu và kiểm tra bounding rect / elementFromPoint từ DOM.

**Thực tế:** trang cuộn đúng vùng câu 28 nhưng phần nhãn bị thanh tiến độ phủ lên:
- header bottom = 104,46 px;
- thanh tiến độ top = 104 px, bottom = 305,15 px;
- câu 28 top = 255,74 px; nhãn top = 272,54 px, bottom = 346,94 px.
- Tại điểm cách góc trái nhãn 10 px và cạnh trên 5 px, `elementFromPoint` trả về chip **“Câu 30”** của thanh tiến độ, không phải nhãn câu 28.

Desktop cũng quan sát hiện tượng tương tự khi nhảy câu 27: thanh bottom 277,45 px, câu top 211,89 px. Nhãn câu/đầu câu có thể bị che, buộc cuộn chỉnh lại.

**Mong đợi:** sau khi nhảy, nhãn và đầu câu đích nằm dưới cả header lẫn thanh tiến độ.
**Gợi ý Builder:** tính offset bằng tổng chiều cao hai thanh hoặc dùng scroll-margin phù hợp; test câu cao hơn viewport và cả trạng thái mở/thu thanh.

### QA4-03 — Hướng dẫn chụp ảnh xuất hiện ở luồng không cho đính ảnh

**Mức độ: Low.**
**Vị trí:** `src/components/ExerciseBody.jsx:93`; được dùng ở `src/pages/student/StudentAssignment.jsx:297` (AnswerView) và `src/pages/student/StudentMistakes.jsx:248`.

**Bước đã chạy:** mở “Làm lại bài” của bài dao động điều hòa, xem placeholder ô tự luận; sau đó đánh dấu câu tự luận và mở nó ở Ôn tập › Câu khó.

**Thực tế:** cả hai chỗ ghi “Gõ bài làm (không bắt buộc – có thể chụp ảnh bài làm ở cuối trang)”. Luồng làm lại đã ẩn Chụp ảnh / Chọn ảnh; trang Ôn tập không có chức năng ảnh. Dòng hướng dẫn ở SubmitPanel còn nói rõ lần làm lại không đính ảnh, nên hai hướng dẫn mâu thuẫn.

**Mong đợi:** placeholder/hướng dẫn phù hợp khả năng của luồng đang mở.

## Lỗi bổ sung đã tái hiện trên trình duyệt và kiểm chứng component

### QA4-02 — Gia sư ẩn đáp án khiến phương án chọn đúng chuyển sang màu sai

**Mức độ: Medium.**
**Vị trí:** `src/pages/tutor/AssignmentTracking.jsx:153` và `src/components/ExerciseBody.jsx:25`.

- AnswerSheet ẩn đáp án bằng cách truyền `correct={null}` nhưng giữ `mode="review"`.
- ExerciseBody coi `isRight=false` khi correct=null, rồi gán `is-wrong` cho mọi phương án học sinh đã chọn.
- Vì vậy một lựa chọn đúng cũng bị tô đỏ khi gia sư bấm “Ẩn đáp án”. Hiện đáp án lại mới trả về xanh. Phần badge/điểm đúng ở đầu câu vẫn giữ nguyên, gây mâu thuẫn.

**Kiểm chứng đã chạy:** `node AI/CODEX/qa-answer-visibility.mjs`, render ExerciseBody thật bằng Vite SSR + ReactDOMServer; MCQ đáp án B, học sinh chọn B:
- correct='B': class `is-picked is-right`, không có `is-picked is-wrong`.
- correct=null (đúng props của AnswerSheet khi ẩn): class `is-picked is-wrong`.
- Kết quả: **BUG_REPRODUCED**. Bằng chứng: `AI/CODEX/evidence/qa-answer-visibility.json`.

**Tái hiện trên UI gia sư sau khi Owner đăng nhập lại:** mở bài THPT be7825d2, bấm Xem bài làm & đáp án (26/28 câu). Câu I.1 có học sinh chọn A đúng, badge 0,25/0,25 đ. Khi đang hiện đáp án: class `choice is-picked is-right`. Bấm Ẩn đáp án: class chuyển thành `choice is-picked is-wrong`, screenshot xác nhận lựa chọn đỏ trong khi badge vẫn xanh 0,25/0,25. Bấm Hiện đáp án: trở về `is-right`. Không thay đổi điểm hoặc bài nộp.

**Mong đợi:** ẩn đáp án không biến câu trả lời đúng thành biểu thị sai; có thể giữ đánh giá đúng/sai hoặc đưa lựa chọn về trạng thái trung tính một cách nhất quán.

## Review tĩnh backend — chưa chứng minh bằng test API có đăng nhập

- `question_marks`: policy insert kiểm tra đúng student_id và bài được giao; select/delete theo auth.uid.
- `assignment_retries`: học sinh chỉ select dữ liệu của mình; ghi qua RPC.
- `submit_retry` (`supabase/schema.sql:1126`): dùng auth.uid, kiểm tra giao bài, chặn status todo, khóa dòng assignment_recipients trước khi đếm lượt, giới hạn 3, chỉ chấm các exercise thuộc đúng bài, dùng grade_answer/answer_points.
- RPC mới không update assignment_recipients hoặc submission_answers, phù hợp yêu cầu giữ bài chính thức. Điều này cũng khớp kết quả UI trên bài thường đã thử.
- Policy answer_keys hiện tại chỉ cho học sinh đọc bài done/checked; trang làm bài không chủ động tải đáp án khi status todo. Trang Ôn tập có hỏi answer_keys cho tập câu sai/khó; cần kiểm tra network/RLS thật để xác minh đáp án của câu khó chưa nộp không được trả về.
- Không chạy lại schema và không đối chiếu toàn bộ định nghĩa/policy đang triển khai với file workspace.

## Kết quả chạy app theo tính năng

| Tính năng / ca | Kết quả và phạm vi |
| --- | --- |
| Gia sư xem bài + đáp án đề THPT | Trên đề 28 câu đã mở sẵn của testuser: 28 câu, 28 khối đáp án, 28 khối phương pháp; đủ MCQ, đúng/sai và trả lời ngắn. |
| Gia sư Ẩn/Hiện đáp án | Ẩn: 0 khối đáp án, 0 khối phương pháp, vẫn đủ 28 câu. Hiện lại: 28/28. Lượt bổ sung đã xác nhận lỗi màu QA4-02 trên UI thật và khôi phục lại trạng thái hiện đáp án. |
| Gia sư: bài thường / đủ 5 loại câu | Bài dao động điều hòa mở được với 0/3 câu trả lời chính thức: đủ 3 khối đáp án, 2 khối phương pháp, đáp án điền khuyết Hz; bấm ảnh báo Không có ảnh. Bài tự luận 8447f444 mở đủ 6 câu, 6 đáp án và 6 phương pháp. Cộng với đề THPT đã bao phủ hiển thị đủ 5 loại câu. |
| Gia sư: điểm làm lại | Trên bài dao động điều hòa: điểm hiện tại 0, máy chấm chính thức 0/2; dòng riêng lần 1 2/2, lần 2 0/2, lần 3 1/2 đúng với phía học sinh. |
| Đánh dấu khi bài chưa nộp | Câu 1 bài 8085 chuyển thành “Bỏ đánh dấu”; tải lại vẫn còn. Vào Ôn tập › Câu khó thấy câu tương ứng. |
| Khóa trước khi nộp | Dù chọn A trong trang Câu khó, nút Kiểm tra vẫn disabled; không có khối đáp án/phương pháp/nhãn key trong DOM. CHƯA kiểm tra response network. |
| Bỏ đánh dấu | Câu bị bỏ biến mất khỏi Câu khó; cuối ca về 0. |
| Đánh dấu khi xem bài đã nộp | Đánh dấu câu tự luận và MCQ bài dao động điều hòa; cả hai xuất hiện trong Câu khó. |
| Ôn Câu khó không giới hạn 3 lần | MCQ đáp án B được kiểm tra đúng và Làm lại liên tiếp 4 lần; bộ đếm Câu khó vẫn 2, câu không bị loại vì làm đúng. Sau tải lại vẫn có thể vào ôn hai câu. |
| Câu tự luận trong Câu khó | Sau gõ bài, “Xem đáp án” hiện đáp án T=0,5 s và phương pháp giải. |
| Đánh dấu từ Câu sai | Đánh dấu câu “lực tương tác phân tử” trong Câu sai; chuyển Câu khó thấy ngay, không cần reload. |
| Lần làm lại bắt đầu trống | Lần 1 trống; lần 2 cũng trống sau khi đã nộp lần 1. Không đổ câu trả lời chính thức vào lần làm lại. |
| Nháp làm lại | Gõ 3 câu, bấm Thôi không làm lại, vào lại: giữ đúng nội dung nháp. Nháp lần 1 không tràn sang lần 2 sau nộp. Chưa kiểm tra reload giữa lúc làm lại. |
| Chấm/lưu 3 lần | Lần 1: MCQ B + Hz => 2/2; lần 2: MCQ A + s => 0/2; lần 3: MCQ B + s => 1/2. Tự luận lưu riêng để tự so. |
| Giới hạn trên UI | Sau lần 3 không còn nút Làm lại bài, hiện thông báo đã đủ 3 lần; reload vẫn hết nút, đủ 3 chip. |
| Xem từng lần | Bấm chip lần 1 và lần 3 hiện đúng nội dung, lựa chọn, kết quả; lần 2 cũng hiện đúng bài đã gõ/chọn sai sau nộp. |
| Điểm chính thức / Điểm TB | Trước/sau 3 lần đều 0; trang Kết quả hiện dòng phụ 2/2, 0/2, 1/2, không thay điểm chính thức. |
| Làm lại đề THPT | Mở chế độ làm lại đề 61 phút: không có đồng hồ nổi hoặc cổng Bắt đầu; trả lời ban đầu 0/28; không có nút đính ảnh. Hủy làm lại không tiêu lượt. Chưa nộp retry đề THPT. |
| Nhãn tiến độ đề THPT | Danh sách đủ I.1–I.18, II.1–II.4, III.1–III.6. |
| Đếm tiến độ | MCQ đã chọn tăng 0→1; đúng/sai mới chọn 1 ý vẫn 1, chọn đủ 4 ý tăng 1→2; bài thường gõ/chọn đủ 3 câu hiện 3/3. |
| Lưu trạng thái tiến độ | Thu thanh, reload: vẫn thu; nháp chính thức 2/30 còn nguyên. Mở lại hoạt động. |
| Sticky và chuông | Mobile 390px: thanh dính sát dưới header, chuông Thông báo mở phía trên thanh (hit test trong dialog đúng phần bell-panel). |
| Responsive/theme | Câu khó, tiến độ và thẻ 3 lần làm lại thử trong theme sáng/tối. 390px và 360px không ghi nhận tràn ngang toàn trang trong các trạng thái đã thử; chip lần làm lại xuống dòng trong màn 390px. Lỗi nhảy câu: QA4-01. |

## Build, công cụ và bằng chứng

- `npm.cmd run build`: **PASS**. `npm` ban đầu bị PowerShell execution policy chặn file npm.ps1; dùng npm.cmd, không đổi policy.
- `node AI/CODEX/qa-answer-visibility.mjs`: **BUG_REPRODUCED** như QA4-02, đã ghi JSON bằng chứng.
- `node AI/CODEX/qa-features-readonly.mjs`: hai GET vô danh `select=*&limit=0` tới question_marks và assignment_retries đều HTTP 200 / []; xác nhận endpoint hai bảng có tồn tại. Vì limit=0, **không dùng kết quả này làm bằng chứng RLS chặn dữ liệu**.
- Script GET ban đầu bị sandbox chặn EACCES; đã xin phép và chạy lại ngoài sandbox. Không in khóa .env, không ghi database.
- Công cụ QA mới chỉ nằm trong `AI/CODEX/`; không sửa source app, schema, package/dependency hoặc file của Claude.
- Có xem screenshot trong phiên để kiểm tra giao diện; không xuất tệp screenshot bằng chứng.
- Có lỗi console của tiện ích trình duyệt “Cannot find menu item …” từ trước; không tính thành lỗi app. Không thực hiện kiểm tra console/network toàn diện.

## Chưa xác minh / việc cần làm tiếp

1. Builder sửa QA4-01, QA4-02 và QA4-03; Codex chạy lại các bước tái hiện.
2. Kiểm tra bài thực sự chỉ nộp ảnh và trường hợp chưa nhập đáp án. Nhánh 0 câu trả lời đã mở thành công trên bài thường, nhưng bài đó không có ảnh nên chưa chứng minh ca có ảnh thật.
3. Kiểm tra sâu hơn bài THPT dài ở giao diện gia sư trên điện thoại. Smoke bổ sung đã qua ở bài thường 3 câu, viewport 390 × 844, theme sáng: đủ 3 câu/đáp án và dòng 3 lần làm lại, không tràn ngang (scrollWidth 375 ≤ 390).
4. Trên dữ liệu test riêng: gọi RPC lần 4, gửi đồng thời ở sát giới hạn, bài chưa nộp, bài không được giao, giả mạo ID/ghi trực tiếp và đọc marks/retries của học sinh khác.
5. Xem network/RLS với câu khó thuộc bài chưa nộp; DOM bị khóa không đủ để kết luận không lộ dữ liệu.
6. Luồng gia sư “Cho nộp lại” → học sinh nộp lại chính thức → kiểm tra điểm chính thức và lịch sử retry vẫn giữ; chưa chạy.
7. Chấm/nộp retry đề thi, phân bố điểm đúng/sai từng ý và trả lời ngắn; chưa chạy API có đăng nhập cho phần này.
8. Kiểm tra đồng hồ trong lần làm chính thức, tự nộp hết giờ, PWA và iPhone/Android thật.
9. Owner hoặc Builder xác minh schema chạy hai lần không lỗi. Codex không tự chạy migration theo ROLE.md.
