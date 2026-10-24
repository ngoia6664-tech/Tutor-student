// QA chỉ đọc: không đăng nhập, không thay đổi database, không in khóa cấu hình.
import fs from 'node:fs/promises'

const env = Object.fromEntries((await fs.readFile('.env', 'utf8')).split(/\r?\n/)
  .filter((line) => line.includes('=') && !line.trim().startsWith('#'))
  .map((line) => { const i = line.indexOf('='); return [line.slice(0, i).trim(), line.slice(i + 1).trim().replace(/^['"]|['"]$/g, '')] }))
for (const table of ['question_marks', 'assignment_retries']) {
  const response = await fetch(`${env.VITE_SUPABASE_URL}/rest/v1/${table}?select=*&limit=0`, {
    headers: { apikey: env.VITE_SUPABASE_ANON_KEY, Authorization: `Bearer ${env.VITE_SUPABASE_ANON_KEY}` },
  })
  console.log(JSON.stringify({ table, status: response.status, body: await response.text() }))
}
