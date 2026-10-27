# Handoff Panda UI — 26/10/2026

Phiên này Codex làm **Engineer theo yêu cầu của Owner**, chỉ cho hai task: cửa hàng trang phục Panda và hiển thị Xu + Sao.

## Đã làm

- Thẻ “Tủ đồ Panda” trong StudentHome, route học sinh `/student/shop` lazy-load qua registry và App; không thêm tab điều hướng.
- Hai tab Cửa hàng / Tủ đồ, hỗ trợ bàn phím trái/phải/Home/End; danh mục tập trung đủ 11 bộ với giá và tier theo yêu cầu.
- 10 component lớp SVG trang phục trên FrontPanda nguyên bản; không sửa PandaArt/Mascot hoặc animation. Không có overlay hoặc tên chưa đăng ký thì chỉ vẽ Panda gốc.
- Viền/glow tĩnh tăng theo độ hiếm; dùng biến màu base.css, theme qua data-theme. Mobile một cột, gutter cửa hàng 16px.
- CoinStarBadge dùng lại ở StudentHome và cửa hàng. Cửa hàng truyền cùng snapshot tài khoản để số dư cập nhật cùng danh sách sau thao tác khi nối backend.
- Không lưu Xu, Sao, sở hữu hay bộ đang mặc vào localStorage. Tắt linh vật thì không render hoặc khởi tạo import hình xem trước; registry chỉ tải mã trang, không tải SVG trang phục.

## File đã đổi

- `src/App.jsx`
- `src/pages/registry.js`
- `src/pages/student/StudentHome.jsx`
- `src/pages/student/StudentShop.jsx` (mới)
- `src/components/CoinStarBadge.jsx` (mới)
- `src/components/PandaOutfitPreview.jsx` (mới)
- `src/lib/outfits.js` (mới)
- `src/lib/pandaShop.js` (mới)
- `src/styles/base.css`
- `src/styles/panda-shop.css` (mới)
- `src/index.css`
- `AI/CODEX/HANDOFF.md` (ghi đè)

## Adapter / placeholder cần Claude nối

`src/lib/pandaShop.js` có TODO tiếng Việt và ba interface:

- `fetchPandaAccount(studentId)` trả `{ coins, stars, ownedOutfitIds, equippedOutfitId, purchasesEnabled, equipmentEnabled }`. Hiện cố định 0 Xu, 0 Sao, chỉ `student` sở hữu sẵn và đang mặc; hai cờ đều false. Không có dữ liệu giả về tiền hoặc quyền sở hữu.
- `purchaseOutfit(studentId, outfitId)` hiện từ chối bằng lỗi “Mua trang phục sắp mở.” Claude cần nối giao dịch mua nguyên tử, kiểm giá và quyền sở hữu ở máy chủ, trừ Xu qua ledger Xu. Chỉ bật purchasesEnabled sau khi backend thực sự sẵn sàng.
- `equipOutfit(studentId, outfitId)` hiện từ chối bằng lỗi “Mặc trang phục sắp mở.” Claude cần nối lưu bộ đang mặc, kiểm quyền sở hữu ở máy chủ. Không xóa quyền sở hữu bộ mặc định. Chỉ bật equipmentEnabled khi backend sẵn sàng.
- Ledger Sao phải trả tiến trình tích lũy thật, không tiêu Sao khi mua. Mở vùng kính viễn vọng bằng Sao vẫn là việc backend tương lai; phiên này chỉ giải thích ý nghĩa Sao, không đổi SpaceExplorer hay khóa kính.
- Thao tác thành công đã gọi reload tài khoản. Chưa áp bộ đang mặc lên linh vật hoạt động ở Layout/Mascot: cần nối trạng thái từ backend vào renderer tương ứng sau này, giữ nguyên animation và xử lý đúng từng pose; phiên này chỉ hiển thị lớp đồ trong cửa hàng.
- Thêm trang phục: thêm component lớp SVG tọa độ 120×120 trong PandaOutfitPreview, đăng ký OVERLAYS và tên overlay trong catalog. SVG V1 là hình vẽ giản lược, không phải ảnh concept.

## Đã kiểm và môi trường

- Windows, PowerShell, Node/npm hiện có của dự án; Vite 8.3.4, Edge qua kết nối trình duyệt; máy ngày 26/10/2026 (Asia/Saigon).
- `npm.cmd run build` qua. `npm run build` trực tiếp bị ExecutionPolicy chặn npm.ps1; dùng npm.cmd chạy cùng script build.
- `git diff --check` và xem git diff các file sửa; rà file mới. Không commit, không push.
- Route thật `/student/shop` khi chưa đăng nhập chuyển về `/login`.
- Kiểm trực quan bằng bản xem thử cục bộ tạm thời dùng chính StudentShop/catalog/adapter/SVG/CSS; chỉ thay nguồn profile trong bản sao để không cần đăng nhập. Không gọi backend mua/mặc. Bản thử được xóa sau kiểm và không thuộc đầu ra.
- Desktop: override 1280×900, trình duyệt thực báo bề ngang CSS khoảng 1164px do mức zoom đang có; đã xem cả sáng và tối.
- Mobile: override 390×844, bề ngang CSS thực khoảng 355px; đã xem cả sáng và tối, gutter đo 16px, scrollWidth 341px không vượt viewport; một cột.
- Đã kiểm 11 thẻ ở Cửa hàng, chỉ một bộ mặc định trong Tủ đồ, mọi nút mua vô hiệu hóa, số dư 0/0, nhãn thiếu Xu và Sắp mở, chuyển tab bằng click và phím trái, tắt linh vật gỡ toàn bộ preview (0 phần tử). Bật lại linh vật sau khi thử.
- StudentHome chỉ kiểm tĩnh phần tích hợp; chưa có phiên học sinh đăng nhập để kiểm toàn luồng. Chưa kiểm thiết bị Android/iPhone/PWA thật.

## Needs QA

- Đăng nhập học sinh thật: StudentHome → thẻ Tủ đồ Panda → hai tab → quay lại; kiểm không ảnh hưởng bài cần làm, bộ lọc, StudyNow hoặc topbar.
- Kiểm desktop/mobile cả hai theme trong Layout đầy đủ, đặc biệt topbar, linh vật nổi, nút góp ý và vùng cuối trang; mức zoom 100%, màn 320px, tablet, Android/iPhone/PWA thật.
- Lần tải mới với linh vật tắt: kiểm Network không tải PandaOutfitPreview/PandaArt do cửa hàng; bật lại để kiểm fallback tải hình. Đã kiểm tĩnh lazy boundary và kiểm DOM khi tắt, chưa kiểm Network tải mới.
- Rà hình của mọi bộ ở các tier, độ rõ và glow trên màn hình thật; overlay chưa biết phải trở về Panda gốc. Rà focus, phím Home/End và trình đọc màn hình.
- Khi Claude nối backend: đủ Xu → Mua, thiếu Xu → Thiếu N Xu, đã sở hữu → Mặc, đang mặc → Đang mặc; lỗi/retry, tải lại, đổi tài khoản, mua liên tiếp, cập nhật số dư, quyền sở hữu và bộ đang mặc qua phiên mới. Không dùng dữ liệu thử trong production.
- Kiểm backend đảm bảo bộ mặc định luôn sở hữu, không tiêu Sao, không mua hai lần/trừ hai lần; đây là QA sau khi có backend, ngoài phạm vi phiên này.

Không sửa database/schema/migration/RLS/RPC/ledger, Daily Review/streak/thưởng, navigation, CURRENT_STATE.md hoặc AI/CLAUDE/HANDOFF.md. Skill System Design đã đọc để đối chiếu nhưng không tạo tài liệu ngoài hai task UI mà Owner giới hạn.
