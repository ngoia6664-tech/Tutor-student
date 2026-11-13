# Luật cho Antigravity

Đọc và làm theo **`AGENTS.md`**, mục "Antigravity" và "Văn phòng". Tóm tắt:
- Thư mục `D:\wt\antigravity`, nhánh `agent/antigravity`. Chỉ commit, không push, không merge.
- Được sửa mọi file frontend, gồm cả `home.html`, `index.html`, `src/home/`.
- Cấm backend, cấu hình, luật: `supabase/`, `src/lib/`, `src/contexts/`, `package*.json`, `vite.config.*`, `vercel.json`,
  `tsconfig.json`, `.env*`, `.claude/`, `.github/`, `AGENTS.md`, `GEMINI.md`, `CLAUDE.md`. Hook `pre-commit` từ chối commit chạm các file này.
