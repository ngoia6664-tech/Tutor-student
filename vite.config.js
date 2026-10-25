import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Thư viện ngoài tách thành chunk riêng, tên cố định theo nhóm: sửa code app thì trình duyệt
// vẫn giữ cache React / Supabase, chỉ tải lại phần code đã đổi.
const VENDORS = [
  ['react', /node_modules[\\/](react|react-dom|scheduler|react-router|react-router-dom|cookie|set-cookie-parser)[\\/]/],
  ['supabase', /node_modules[\\/](@supabase|tslib|iceberg-js)[\\/]/],
]

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          for (const [name, re] of VENDORS) if (re.test(id)) return name
        },
      },
    },
  },
})
