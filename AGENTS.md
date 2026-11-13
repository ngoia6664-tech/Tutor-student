# Luật làm việc cho agent (Codex, Antigravity)

Dự án: **Study with Duy Anh**. Tình trạng chung: `CURRENT_STATE.md`. Bản đồ code: `CLAUDE.md` + `AI/CLAUDE/FILE_MAP.md`.
Chủ dự án là **Anh**. Chỉ Anh quyết định merge vào `main`. `main` deploy thẳng lên Vercel cho học sinh.

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
- Được sửa: `src/components/`, `src/pages/`, `src/styles/`, `public/`, `AI/ANTIGRAVITY/`.
- Cấm: `supabase/`, `src/lib/`, `src/contexts/` (backend, truy vấn, đăng nhập). Cần đổi dữ liệu thì nhắn Claude code.
- Theo quy ước CSS trong `CLAUDE.md` (không `backdrop-filter`, màu dùng biến trong `base.css`, chữ hiển thị tiếng Việt).

## Văn phòng (bắt buộc)
Lệnh: `node "d:\Duy Anh office\office.mjs" <lệnh>`. Tên agent: `claude-code`, `codex-test`, `antigravity`, `gpt-lesson`, `claude-review`, `anh`.
1. **Đầu phiên:** `inbox <tên mình>` để nhận việc.
2. **Khi bắt đầu / đổi việc:** `status <tên mình> "đang làm gì"`. Kẹt thì thêm `--blocked`.
3. **Cuối phiên:** cập nhật HANDOFF của mình (`AI/CODEX/HANDOFF.md` hoặc `AI/ANTIGRAVITY/HANDOFF.md`), commit, rồi
   `send <tên mình> claude-code "xong gì, commit nào, cần gì"`.
