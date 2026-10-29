---
name: prompt-triage
description: Dùng cho MỌI yêu cầu thay đổi code / nội dung / CSDL trong dự án Study with Duy Anh. Phân loại việc nhỏ hay phức tạp, chọn build hay build + test, và đọc đúng file theo bản đồ để tiết kiệm token.
---

# Phân loại yêu cầu thay đổi

Làm theo đúng thứ tự. Trả lời người dùng bằng tiếng Việt, ngắn, đủ ý.

## 1. Đọc bản đồ trước (không đọc cả dự án)

- Mở `AI/CLAUDE/FILE_MAP.md` một lần, dùng nó để tìm file liên quan đến yêu cầu.
- Cần chi tiết tính năng: grep đúng mục trong `AI/CLAUDE/FEATURES.md`, không đọc hết.
- Tìm hàm / bảng trong `supabase/schema.sql` bằng grep tên, rồi Read đúng đoạn (`offset` + `limit`).
- Không đọc nguyên file trên 15 KB. Không đọc `package-lock.json`, `dist/`, `README.md`.
- Chỉ mở file đã nằm trong bản đồ hoặc được grep trả về. Không quét thư mục để "tìm cho chắc".

## 2. Phân loại: nhỏ hay phức tạp

**Nhỏ** (chỉ build):
- sửa chữ, màu, khoảng cách, một đoạn CSS, một nhãn hiển thị;
- đổi một file JS/JSX, không đổi hành vi dữ liệu;
- thêm/sửa một dòng cấu hình đã có sẵn.

**Phức tạp** (build + test):
- đổi `supabase/schema.sql` (bảng, RLS, hàm RPC, trigger);
- đổi logic chấm điểm, thưởng Xu/Sao/chuỗi, làm lại bài, quyền đọc đáp án;
- sửa nhiều file cùng một luồng (ví dụ: giao diện + RPC + trạng thái);
- thay đổi hành vi mà người dùng đã dùng (dữ liệu cũ có thể bị ảnh hưởng).

**Chưa rõ**: hỏi lại đúng một câu ngắn, có đề xuất mặc định. Ví dụ: "Bạn muốn sửa nhãn hiển thị hay cả logic chấm điểm? Mình mặc định chỉ sửa nhãn." Không hỏi nhiều câu cùng lúc.

## 3. Chọn kiểm tra

- Việc nhỏ: `npm run build`. Không chạy lại build nhiều lần nếu không sửa thêm.
- Việc phức tạp:
  - luôn chạy `npm run build`;
  - nếu đụng `supabase/schema.sql`: chạy bộ test SQL trong thư mục tạm của phiên (`pgtest/`) nếu còn tồn tại; nếu không còn thì nói rõ là chưa test SQL và vì sao;
  - nếu đụng chấm điểm / thưởng: thêm test cho trường hợp biên đã nêu.
- Có test tự động `npm test` (Vitest, `tests/`) cho logic thuần trong `src/lib`: đổi file lib có test thì chạy `npm test`, logic mới quan trọng thì thêm test. Không có test cho giao diện / SQL — đừng tuyên bố "đã test" phần đó.

## 4. Tiết kiệm token khi làm

- Gom các sửa đổi nhỏ trong cùng một file thành một lần Edit.
- Chạy các lệnh độc lập song song.
- Khi build/test lỗi: đọc 20 dòng cuối của log, không in toàn bộ.
- Không chụp ảnh màn hình trừ khi người dùng yêu cầu; nếu cần, chỉ một lần khi xong.
- Không lặp lại nội dung đã nói; không kể lại từng bước đã làm.

## 5. Định dạng đầu ra (ngắn, đủ ý)

```
Loại: nhỏ | phức tạp  ·  Kiểm tra: build | build + test
Đã sửa:
- đường/dẫn/file.jsx — việc đã làm (một dòng)
Kết quả: build OK / lỗi (trích 1–2 dòng lỗi)
Còn lại / cần làm: (nếu có: chạy schema.sql, QA trên máy thật…)
```

Không commit hay push nếu người dùng chưa yêu cầu.
