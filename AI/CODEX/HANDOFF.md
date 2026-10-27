# Codex — Handoff QA Panda Shop — 27/10/2026

Kiểm thử trực tiếp Edge trên `http://localhost:5173/tutor/shop`, phiên gia sư đã đăng nhập của Owner. Không sửa mã ứng dụng, không sửa dữ liệu học sinh hoặc cấp Xu. Đã khôi phục bộ Phi Hành Gia, theme tối, chế độ Đầy đủ và bỏ viewport override sau kiểm thử.

## Kết luận

Chưa nên coi tính năng đã qua QA hoàn toàn. Luồng mặc đồ gia sư hoạt động; hình SVG co đều trong các mẫu đã đo. Có lỗi responsive rõ ràng ở tablet hẹp và một vấn đề trải nghiệm xem hoạt cảnh trên màn hình thấp. Mua đồ học sinh hiện chưa được triển khai backend, không chỉ là thiếu Xu.

## F01 — P2: Cột thông tin quá hẹp, tràn ngang ngay trên breakpoint 720px

- Tái hiện: mở shop, chọn Ngân Hà, đặt viewport 722×900 (điểm yêu cầu 721 cũng được trình duyệt làm tròn thành 722 trong lần đo).
- Kết quả: sân khấu vẫn rộng 560px; phần thông tin chỉ khoảng 95px. Tên và mô tả xuống dòng quá nhiều; nút Mặc rộng 152px vượt cột; xuất hiện thanh cuộn ngang. `clientWidth=706`, `scrollWidth=748`.
- 768×1024 không tràn ngang toàn trang trong mẫu đo, nhưng cột thông tin vẫn chỉ khoảng 141px, khó đọc.
- Mong đợi: thông tin và nút đủ rộng; không tràn ngang; hình giữ tỉ lệ.
- Nguyên nhân đối chiếu: `src/styles/panda-shop.css:142` ưu tiên cột đầu 560px; chỉ đổi một cột ở `:478` (max-width 720px).
- Đề xuất: chuyển một cột sớm hơn theo bề rộng tối thiểu cần cho hai cột, hoặc cho sân khấu co và bảo đảm cột thông tin đủ rộng. Kiểm lại các mốc 720/721/722/768/820/900 sau sửa.
- Bằng chứng: [tablet-overflow.jpg](qa-panda-2026-10-27/tablet-overflow.jpg).

## F02 — P3: Bấm nút xem hoạt cảnh có thể làm mất sân khấu khỏi tầm nhìn

- Tái hiện trên 390×844: chọn một bộ có hoạt cảnh từ lưới, rồi bấm nút Xem hoạt cảnh nằm dưới mô tả/giá/nút Mặc.
- Kết quả quan sát: khi trình duyệt đưa nút vào vùng nhìn thấy, phần lớn sân khấu có thể đã khuất phía trên. Hoạt cảnh chạy nhưng người dùng khó theo dõi; rõ hơn khi chiều cao thấp.
- Giữ trực tiếp lên gấu hoặc dùng bàn phím kích hoạt ở vùng gấu cho trải nghiệm xem dễ hơn.
- Đối chiếu: `PandaShowcase.jsx` gọi `perform` từ nút nhưng không đưa sân khấu vào vùng nhìn thấy. `StudentShop.jsx:36` có cuộn khi chọn đồ, chưa giải quyết bố cục sân khấu/nút tách xa nhau trên màn hình thấp.
- Đề xuất: đặt điều khiển xem trong/gần sân khấu hoặc đưa sân khấu vào tầm nhìn trước khi bắt đầu.

## Giới hạn chức năng đã xác minh từ mã nguồn

`src/lib/pandaShop.js:23–28` trả 0 Xu, 0 Sao, `purchasesEnabled: false`, học sinh chỉ sở hữu mặc định và không được thay đồ. `purchaseOutfit` tại dòng 33 luôn ném lỗi “Mua trang phục sắp mở.” Chưa có giao dịch mua/trừ Xu, ledger hay lưu sở hữu học sinh để kiểm thử end-to-end. Gia sư lưu bộ đang mặc trên máy qua localStorage.

Đây là phạm vi chưa triển khai, không kết luận là lỗi giao dịch. Không thể dùng kết quả gia sư để chứng minh quyền sở hữu hoặc bảo mật giao dịch học sinh.

## Các trường hợp đã kiểm trực tiếp

| Trường hợp | Kết quả và giới hạn |
| --- | --- |
| Gia sư 0 Xu, đủ 11 bộ | Đạt; không cần Xu để mặc |
| Chọn rồi mặc lần lượt đủ 11 bộ | Đạt; mỗi bộ hiện đúng tiêu đề, nút Đang mặc sau thao tác |
| Tải lại trang sau mặc Ngân Hà | Đạt; vẫn đang mặc Ngân Hà |
| Xem thử bộ khác với bộ đang mặc | Đạt; xem thử không tự thay bộ đang mặc |
| Bộ lọc | Thường 4 (gồm mặc định), Hiếm 1 sao 2, Hiếm 2 sao 1, Hiếm 3 sao 2, Cực phẩm 2, Tất cả 11 |
| Cửa hàng/Tủ đồ gia sư | Đạt; cả hai đủ 11 bộ |
| Bàn phím đổi tab | Mũi tên chuyển focus; Enter chọn tab |
| Kích hoạt hoạt cảnh | Đã chạy DJ, Kiếm Sĩ, Pháp Sư, Phi Hành Gia, Ngân Hà qua nút/giữ/phím; chưa kiểm mọi tổ hợp từng bộ × từng tư thế × mọi viewport |
| Nhấn ngắn/giữ trong phòng thử | Kiếm Sĩ: 250ms không diễn; 700ms diễn |
| Giữ lặp khi Kiếm Sĩ đang diễn | Vẫn 1 actor, 2 lớp SVG; không nhân thêm lớp |
| Linh vật góc màn hình | Đã kích hoạt bằng giữ chuột DJ, Ngân Hà, Phi Hành Gia; quan sát được hoạt cảnh |
| Sân Ngân Hà ở góc, viewport 320×568 | Hai lớp cảnh đo được x≈69–297, y≈355–556, nằm trong viewport tại mẫu đo |
| Kết thúc hoạt cảnh | Mẫu kiểm sau Kiếm Sĩ: 0 actor, 2 lớp hiệu ứng thường trực, nút trở lại Xem hoạt cảnh |
| Đổi bộ có hoạt cảnh | Đã quan sát bộ mới không còn actor cũ, hiệu ứng thường trực hiện lại; chưa khẳng định mọi thời điểm giữa từng hoạt cảnh |
| Chế độ Tối ưu | Ngân Hà vẫn chạy, có class act-lite; sau test đã trả Đầy đủ |
| Theme sáng/tối | Đã xem shop cả hai; sân khấu tối và thông tin đọc được ở desktop; sau test trả tối |
| Console | Các lỗi thấy được liên quan menu `translate-page`/`save-page`; chưa có bằng chứng quy về tính năng Panda. Không dùng chúng để kết luận app lỗi |
| Build | `npm.cmd run build` thành công, 380 modules; có thông báo thời gian plugin, không lỗi build |

## Width/height thực tế

Đây là thay viewport trình duyệt desktop, không phải kiểm thiết bị cảm ứng thật. Tỉ lệ khung sân khấu cố định 560:480; hình chính đo được vuông trong các mẫu co. Không thấy ảnh raster bị vỡ; đây chủ yếu là SVG. Không khẳng định toàn bộ hiệu ứng ở mọi thời điểm đều không cắt mép.

| Viewport CSS | Kết quả |
| --- | --- |
| 320×568 | Một cột; không tràn ngang, stage ≈281×241, figure ≈135×135 |
| 390×844 | Một cột; không tràn ngang, stage ≈351×301, figure ≈169×169 |
| 568×320 | Không tràn ngang; stage ≈529×453 cao hơn viewport nên phải cuộn, không co theo chiều cao |
| 720×900 | Một cột; stage 560×480, gấu chính 180×180 |
| 722×900 | Lỗi F01; stage 560×480, thông tin ≈95px, trang tràn ngang |
| 768×1024 | Hai cột; stage 560×480, thông tin ≈141px, trải nghiệm chật |
| 1024×600 | Không tràn ngang; gấu chính 180×180; cần cuộn để xem toàn trang |
| 1024×768 | Đã xem theme sáng và chế độ Tối ưu |
| 1440×900 và viewport ban đầu ≈1528×732 | Không tràn ngang trong mẫu đo; gấu chính 180×180 |

## Chưa kiểm và cần vòng tiếp theo

- Phiên học sinh thật: đã kiểm bổ sung sau khi Owner đăng nhập tester, xem phần bên dưới. Chưa kiểm đổi qua lại nhiều học sinh hoặc đồng thời nhiều hồ sơ trình duyệt.
- Sau khi có backend mua: thiếu/đủ Xu, mua trùng và bấm nhanh, mạng lỗi, số dư/ledger, không trừ Sao, reload/phiên khác, kiểm quyền phía server.
- Touch thật trên Android/iPhone: nhấn giữ không context menu, vuốt hủy giữ, đổi hướng, trình duyệt/PWA.
- Reduced motion của hệ điều hành: chỉ đọc nhánh xử lý, chưa bật/chạy thử.
- FPS/CPU/memory trên điện thoại yếu, giảm tốc CPU, chạy liên tục lâu, âm thanh và chuyển tab nền, các trạng thái làm bài/chấm bài/ngủ/đi dạo chen hoạt cảnh.
- Hủy giữ khi con trỏ rời vùng, giữ rồi đổi đồ trước ngưỡng, resize đúng giữa hoạt cảnh; cần kiểm riêng.

Không thay source hoặc tạo bản sửa trong lượt QA này. Các ảnh trong thư mục là bằng chứng thử nghiệm; `desktop-restored.jpg` ghi trạng thái sau khôi phục.

## Bổ sung: phiên học sinh testuser — cùng ngày 27/10/2026

Owner đã đăng nhập học sinh trong tab localhost. Đã kiểm trực tiếp phiên thật, sau đó mở thêm một tab kiểm thử dùng cùng phiên do kết nối điều khiển tab gốc bị lỗi. Tab kiểm thử tạm đã đóng; phiên học sinh của Owner vẫn giữ nguyên. Không cấp Xu, không sửa sở hữu hay dữ liệu học tập. Viewport đã reset.

| Trường hợp | Kết quả |
| --- | --- |
| StudentHome → nút shop nổi | Vào đúng `/student/shop` |
| Đổi từ phiên gia sư trước đó sang học sinh | 0 Xu, 0 Sao, 1 bộ sở hữu; bộ mặc định, không kế thừa Phi Hành Gia đang mặc của gia sư |
| Cửa hàng/Tủ đồ | Cửa hàng 11; Tủ đồ 1, chỉ Panda Học Sinh |
| Chọn 10 bộ chưa sở hữu | Nút Thiếu Xu vô hiệu hóa; số thiếu theo giá: 150/200/250/400/450/650/800/1.000/1.500/2.000. Chỉ xem trước, không có nút Mặc khả dụng |
| Xem hoạt cảnh đồ chưa mua | Ngân Hà chạy trong phòng thử (1 actor), nút Thiếu 2.000 Xu vẫn disabled; linh vật thật không có class hoạt cảnh và vẫn là bộ mặc định |
| Reload sau xem thử | Về Panda Học Sinh, vẫn Tủ đồ 1, số dư 0/0 |
| 390×844 | Tủ đồ một thẻ; `clientWidth=scrollWidth=375`, không tràn ngang |
| 722×900 | Tái hiện F01 trên học sinh: cột thông tin ≈95px, `clientWidth=707`, `scrollWidth=748`; không chỉ ảnh hưởng gia sư |
| Truy cập trực tiếp `/tutor/shop` | Chuyển về `/student`; không nhận giao diện/quyền thử đồ gia sư. Đây là kiểm route/UI, chưa phải kiểm bảo mật server của backend mua chưa tồn tại |
| Nút Quay lại học tập | Về `/student`, trang bài cần làm hiển thị bình thường |

Ảnh bổ sung: [Tủ đồ mobile](qa-panda-2026-10-27/student-wardrobe-mobile.jpg), [Tủ đồ desktop](qa-panda-2026-10-27/student-wardrobe-desktop.jpg), [lỗi tablet học sinh](qa-panda-2026-10-27/student-tablet-overflow.jpg).

Quan sát trải nghiệm: học sinh có thể ngắm và xem hoạt cảnh trước khi mua, phù hợp luồng xem thử; nên làm rõ nút “Thiếu Xu” đồng thời cửa hàng còn “sắp mở bán” để tránh hiểu rằng kiếm đủ Xu là mua được ngay trong bản hiện tại. Không ghi nhận thêm lỗi chức năng chắc chắn ngoài F01/F02. Các giới hạn touch thật, thiết bị yếu, reduced-motion và backend trong danh sách trên vẫn còn.
