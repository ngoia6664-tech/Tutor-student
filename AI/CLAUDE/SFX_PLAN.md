# Kế hoạch âm thanh hoạt cảnh trang phục (Panda Shop) — 27/10/2026

## Quyết định của Owner
- Tiếng tự tổng hợp bằng Web Audio (`src/lib/pandaSfx.js`, bản thử 27/10) **không đạt** → bỏ, không tự thiết kế tiếng nữa.
- Chuyển sang **phát file âm thanh có sẵn**. Owner sẽ tự gửi file sau.
- Chỉ kêu ở **vài khoảnh khắc chính** (chém kiếm, tra kiếm, nổ...), không kêu suốt hoạt cảnh.

## Cách làm
- Bỏ các kịch bản tổng hợp. Mỗi hoạt cảnh chỉ còn danh sách mốc "giây thứ X phát file Y":

  ```js
  'star-duel': [
    { at: 0.6,  file: 'sword-slash.mp3' },   // mở đầu combo
    { at: 2.74, file: 'sword-sheath.mp3' },  // tra kiếm
    { at: 2.86, file: 'explosion-big.mp3' }, // nổ
  ]
  ```
- File đặt ở `public/audio/sfx/`.
- Chỉ tải file khi người dùng chọn bộ có hoạt cảnh (không tải lúc mở app), tải một lần rồi giữ lại để lần sau phát ngay, đúng mốc.
- Giữ nguyên:
  - mở khoá tiếng lúc chạm (`useHold` → `unlockSfx()`)
  - tắt theo Cài đặt "Hiệu ứng âm thanh"
  - dừng khi đổi bộ / rời trang / chuyển app
  - không chồng tiếng khi bấm liên tục
- Thiếu file thì im lặng, không báo lỗi → dựng khung trước, có file tới đâu có tiếng tới đó.
- Chỗ nối sẵn có: `INTERACTIONS[id].sound` trong `src/components/panda/PandaAct.jsx`, `usePandaAct` gọi phát / dừng.

## Các khoảnh khắc nên có tiếng (mốc khớp hình trong PandaAct.jsx)

| Bộ (interaction) | Mốc | Tiếng cần |
|---|---|---|
| DJ (`dj-set`, 3s) | 0.79s, 2.13s | scratch, bass drop |
| Kiếm Sĩ Tinh Hệ (`star-duel`, 4.6s) | 0.6s, 2.74s, 2.86s | chém (combo), tra kiếm, nổ lớn |
| Pháp Sư Sao (`star-summon`, 5s) | 1.45s, 3.95s | triệu hồi, nổ phép |
| Phi Hành Gia (`space-trip`, 7s) | 2.85s, 5.1s | phóng tàu, đáp |
| Ngân Hà (`galaxy-descent`, 7.4s) | 1.3s, 3.8s, 5.75s | hút vào cổng, xuất hiện, Galaxy Burst |

Mốc chi tiết khác (nếu cần thêm tiếng): combo kiếm 8 nhát ở 0.6 / 0.71 / 0.82 / 0.93 / 1.04 / 1.15 / 1.26 / 1.37s;
DJ scratch 0.79 / 0.94 / 1.09 / 1.51 / 1.66 / 1.87s; Phi Hành Gia tàu hiện 0.75s, warp 3.3s, tàu loé biến 3.4s, quay về 4.3s, tan biến 5.85s; Ngân Hà đáp đất 4.5s.
Sửa thời lượng hoạt cảnh thì phải dời mốc tiếng theo.

Combo chém có hai cách, chọn theo file Owner gửi:
- một file chứa cả chuỗi nhát (gọn, khớp nhịp dễ hơn)
- một file một nhát, phát 8 lần, lệch cao độ nhẹ để đỡ nghe lặp

## Yêu cầu file
- Định dạng **.mp3** (iPhone, Android, máy tính đều phát được).
- Mỗi file **ngắn, cắt sạch khoảng lặng ở đầu** để tiếng khớp đúng khoảnh khắc trên hình.
- Mono, khoảng 96–128 kbps, mỗi file nên dưới khoảng 50 KB.
- Các file âm lượng tương đương nhau (vẫn chỉnh to / nhỏ được cho từng mốc trong code).
- Nguồn miễn phí bản quyền: Pixabay Sound Effects, Freesound (loại CC0), Kenney.nl.

## Trạng thái hiện tại (27/10/2026)
- Bản tổng hợp `src/lib/pandaSfx.js` + phần nối trong `PandaAct.jsx` / `Mascot.jsx` **chưa commit**; Owner chưa duyệt việc gỡ và dựng khung phát file.
- Tiếng "kèn ăn mừng" cũ (`sound('cheer')`) lúc gấu góc màn hình bắt đầu diễn đã được bỏ trong bản thử này.
- Việc tiếp theo sau phần tiếng: làm lại giao diện cụm góc trái dưới (icon shop, Xu/Sao, nút bật/tắt) và trang Shop bằng `/frontend-design`.
