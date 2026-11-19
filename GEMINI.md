# Luật cho Antigravity

Đọc và làm theo **`AGENTS.md`**, mục "Antigravity" và "Văn phòng". Tóm tắt:
- Đầu phiên: `inbox antigravity` rồi `nhiemvu antigravity`, làm đúng nhiệm vụ đó; không có file nhiệm vụ thì hỏi lại Anh, đừng tự đoán phạm vi.
- Xong việc phải nộp báo cáo bằng lệnh `report` (luật báo cáo: `AGENTS.md`, mục "Văn phòng", bước 3–5). Chưa có báo cáo = chưa xong.
- Thư mục `D:\wt\antigravity`, nhánh `agent/antigravity`. Chỉ commit, không push, không merge.
- Được sửa mọi file frontend, gồm cả `home.html`, `index.html`, `src/home/`.
- Cấm backend, cấu hình, luật: `supabase/`, `src/lib/`, `src/contexts/`, `package*.json`, `vite.config.*`, `vercel.json`,
  `tsconfig.json`, `.env*`, `.claude/`, `.github/`, `AGENTS.md`, `GEMINI.md`, `CLAUDE.md`. Hook `pre-commit` từ chối commit chạm các file này.
