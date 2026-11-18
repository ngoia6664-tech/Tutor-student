# Luật làm việc cho agent (Codex, Antigravity)

Dự án: **Study with Duy Anh**. Tình trạng chung: `CURRENT_STATE.md`. Bản đồ code: `CLAUDE.md` + `AI/CLAUDE/FILE_MAP.md`.
Chủ dự án là **Anh**. Chỉ Anh quyết định merge vào `main`. `main` deploy thẳng lên Vercel cho học sinh.

## Bạn là ai (tự xác định đầu mỗi phiên, không cần Anh nhắc)
Chạy `git branch --show-current`:
- `agent/codex-test` → bạn là **GPT test**, tên văn phòng `codex-test`.
- `agent/antigravity` → bạn là **Antigravity**, tên văn phòng `antigravity`.
- Nhánh khác → dừng lại, hỏi Anh trước khi sửa gì.
Rồi chạy ngay `node "d:\Duy Anh office\office.mjs" inbox <tên>` và làm theo mục của mình bên dưới.

## Luật git (máy chặn bằng hook, đừng tìm cách lách)
- Chỉ **commit** trên nhánh của mình. **Không push, không merge, không rebase `main`, không dùng `--no-verify`.**
- Không sửa `.git/hooks`, `.env`, `.claude/`, file này, `GEMINI.md`, `CLAUDE.md`.
- Commit nhỏ, tin nhắn tiếng Việt nói rõ đã làm gì.

## GPT test (Codex) — thư mục `D:\wt\codex-test`, nhánh `agent/codex-test`
- Được sửa: `tests/`, `AI/CODEX/`.
- Chỉ đọc: `src/`, `supabase/`. **Không sửa `src/` để test qua.** Thấy lỗi thì báo Claude code.
- Kiểm tra: `npm test`, `npm run build`, `npm run typecheck`.
- Mức suy nghĩ: medium; test RLS, bảo mật, chấm điểm: high.

## Antigravity — thư mục `D:\wt\antigravity`, nhánh `agent/antigravity`
- Được sửa: **mọi file frontend** (HTML, CSS, component, trang, ảnh), gồm cả `home.html`, `index.html`, `src/home/`, `src/components/`, `src/pages/`, `src/styles/`, `public/`, `AI/ANTIGRAVITY/`.
- Cấm (backend, cấu hình, luật): `supabase/`, `src/lib/`, `src/contexts/`, `package.json`, `package-lock.json`, `vite.config.*`,
  `vercel.json`, `tsconfig.json`, `.env*`, `.claude/`, `.github/`, `AGENTS.md`, `GEMINI.md`, `CLAUDE.md`. Cần đổi những chỗ này thì nhắn Claude code.
- Sửa lớn (tách file, đổi cấu trúc) làm thành commit riêng, cuối cùng, để Anh bỏ riêng được nếu lỗi.
- Theo quy ước CSS trong `CLAUDE.md` (không `backdrop-filter`, màu dùng biến trong `base.css`, chữ hiển thị tiếng Việt).

## Văn phòng (bắt buộc)
Lệnh: `node "d:\Duy Anh office\office.mjs" <lệnh>`. Tên agent: `claude-code`, `codex-test`, `antigravity`, `gpt-lesson`, `claude-review`, `dau-nao` (đầu não, người điều phối), `anh`.
1. **Đầu phiên:** `inbox <tên mình>` để nhận việc.
2. **Khi bắt đầu / đổi việc:** `status <tên mình> "đang làm gì"`. Kẹt thì thêm `--blocked`.
3. **Cuối phiên:** cập nhật HANDOFF của mình (`AI/CODEX/HANDOFF.md` hoặc `AI/ANTIGRAVITY/HANDOFF.md`), commit, rồi viết báo cáo
   theo mẫu `d:Duy Anh officedataeportsTEMPLATE.md` và nộp: `report <tên mình> <mã-việc> --file <báo-cáo.md>`.
   `send <tên mình> dau-nao "..."` chỉ dùng cho câu hỏi gấp.
4. **Chưa có báo cáo được văn phòng nhận (`report` in OK) = chưa được coi là xong việc.**
5. Gặp việc cần Anh / đầu não quyết thì DỪNG, ghi vào mục `## CẦN ĐẦU NÃO QUYẾT` của báo cáo (TRẠNG THÁI: DỪNG), không tự đoán.
