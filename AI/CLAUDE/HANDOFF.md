# Claude — Handoff ca gần nhất

> Ghi đè mỗi ca, không giữ lịch sử dài hạn (lịch sử xem `git log`).

## Last task
Ca 27/10/2026 (tiếp ca polish Panda Fashion Shop). Owner yêu cầu: hoạt ảnh HÀNH VI riêng khi bấm vào gấu cho 5 bộ từ Hiếm ⭐⭐
(DJ biểu diễn, Kiếm Sĩ múa kiếm + sao nổ loé, Pháp Sư triệu hồi hành tinh, Phi Hành Gia lên tàu bay đi rồi quay lại,
Ngân Hà "Ngân Hà Giáng Lâm"), không chồng / spam, luôn về idle, data-driven, chế độ Tối ưu vẫn giữ động tác chính.
Thay cho "chiêu đặc biệt nhấn giữ" của ca trước (đã gỡ `SkinSpecial.jsx`, keyframes `sp-*`).

## Status
DONE trong code, `npm run build` qua. **Chưa commit** (gồm toàn bộ Panda Shop từ ca 26/10). Không đổi SQL.
Đã kiểm bằng bảng phim tạm (đã xóa): mỗi hoạt cảnh 6 khung đóng băng (CSS animation-delay âm + `svg.setCurrentTime`),
bản đầy đủ + bản `lite`. CHƯA xem chạy liền mạch trên trình duyệt thật, CHƯA thử điện thoại, CHƯA thử trong app có đăng nhập.

## Đã làm
- Mới `components/panda/PandaAct.jsx`: `INTERACTIONS` (5 hoạt cảnh, mỗi cái 2 lớp sau/trước gấu), `usePandaAct`, `PandaActLayer`, `actClass`.
- Mới `styles/panda-act.css`: động tác gấu (thân, đầu, 2 tay, đạo cụ, kiếm sáng) theo từng hoạt cảnh.
- `PandaArt.jsx` FrontPanda: svg class `pd-front`; nhóm `pd-head` (đầu + mặt + mũ); nhóm `pd-prop pd-prop-l/-r` quanh đạo cụ.
- `outfitLooks.jsx`: lưỡi kiếm có class `pd-blade-glow`.
- `lib/outfits.js`: `special` → `interaction` (dj-set, star-duel, star-summon, space-trip, galaxy-descent).
- `Mascot.jsx`: bỏ nhấn giữ; bấm khi rảnh → mood `act` → diễn → về idle; bấm lúc diễn bị bỏ qua; bấm trong 12s sau khi diễn = nhắc bài / giảng như cũ;
  máy bật giảm chuyển động → chỉ nói câu của hoạt cảnh.
- `OutfitPanda.jsx` (prop `act`, `lite`; đang diễn thì ẩn hiệu ứng thường trực), `PandaShowcase.jsx` (bấm vào gấu / nút "✨ Xem hoạt cảnh").
- `PandaShopContext`: mặc bộ có hoạt cảnh → gấu nhắc "Bấm vào thầy để xem thầy diễn".

## Sửa sau phản hồi owner (cùng ca)
- Linh vật góc màn hình mất gấu khi diễn: `.mascot-body svg { position: relative }` đè `.act-layer` → thêm `position: absolute` ở panda-act.css.
- Đổi kích hoạt từ bấm sang GIỮ 0,55s (`useHold` trong PandaAct.jsx) ở linh vật + phòng thử đồ; bỏ `ACT_REST`, bấm thường luôn là nhắc bài / giảng.

## Polish hoạt cảnh (cùng ca, lần 2)
- Sân diễn theo bậc (`stage` trong INTERACTIONS), biểu cảm phụ khi diễn (ActFaces), quay mặt 3/4.
- Viết lại Kiếm Sĩ (4,6s), Pháp Sư (5s), Ngân Hà (6,4s); DJ và Phi Hành Gia giữ nguyên (Phi Hành Gia chỉ đổi sân 1,8 + chớp sáng tròn).
- Kiếm Sĩ thêm áo choàng lệch vai, chòm sao trên ngực, dấu tinh thể dưới mắt, hộ thủ cong + chuôi sao. Ngọc trượng Pháp Sư có class `pd-staff-orb`.
- Đã chụp từng khung bằng Chrome headless (cả bản lite); chưa xem chạy liên tục trên máy thật / điện thoại.

## Chuẩn hoá sân diễn (cùng ca, lần 3)
- Catalog `stage` [rộng, cao] cho cả 11 bộ theo bảng của owner; gấu cố định 180px; phòng thử đồ khung 560×480 co đều; bỏ "lùi máy quay".
- Ngân Hà 7,4s: thêm Galaxy Burst cuối (ngân hà co thành điểm → im lặng → nổ phủ gần cả sân) + ngân hà mini trên tay.
- Đã chụp: thang sân 11 bộ, hoạt cảnh từng bộ trong sân mới, linh vật góc màn hình (mô phỏng mép viewport). Chưa xem chạy liên tục trên máy thật.

## Lưu ý thiết kế
- Lớp cảnh không đi theo chuyển động thân gấu (chỉ thân / tay gấu chuyển động), nên các bước lao / nghiêng người giữ biên độ nhỏ.
- Học sinh vẫn luôn mặc bộ mặc định (chưa có backend) → muốn xem trên linh vật phải dùng tài khoản gia sư mặc bộ.

## Needs QA
- Gia sư mặc từng bộ ⭐⭐+ → GIỮ linh vật: gấu nhún nạp rồi diễn, gấu vẫn hiện suốt hoạt cảnh, xong về ngồi; bấm thường = giảng bài; điện thoại nhấn giữ không bật menu / bôi chọn chữ.
- Đang diễn: gấu không tự đi / leo / ngủ chen vào; đổi bộ ở shop giữa lúc diễn → dừng, gấu về bình thường.
- Phòng thử đồ: bấm gấu / nút → diễn; đổi bộ khác giữa chừng → dừng; hiệu ứng thường trực hiện lại sau khi diễn.
- Cài đặt "Tối ưu": vẫn diễn đủ động tác (ít hạt hơn). Máy bật giảm chuyển động: không diễn, gấu chỉ nói.
- Phi Hành Gia ở linh vật góc phải: tàu bay lên / đáp bên trái có bị khuất mép màn hình không; Ngân Hà / tàu có che menu không.
- Điện thoại yếu: hoạt cảnh Ngân Hà (dài nhất, nhiều lớp nhất) có giật không.
- Phần Needs QA các ca trước (shop, Xu/Sao, viền sáng, đồng bộ tư thế) vẫn còn hiệu lực.
