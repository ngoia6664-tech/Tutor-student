import { useState } from 'react'

const THEME_COLOR = { dark: '#0c0a1d', light: '#f5f3ff' }

function currentTheme() {
  return document.documentElement.dataset.theme === 'light' ? 'light' : 'dark'
}

// Nút chuyển giao diện sáng / tối; lựa chọn được nhớ trên máy này
export default function ThemeToggle({ className = '' }) {
  const [theme, setTheme] = useState(currentTheme)
  const next = theme === 'dark' ? 'light' : 'dark'

  function toggle() {
    document.documentElement.dataset.theme = next
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', THEME_COLOR[next])
    try {
      localStorage.setItem('theme', next)
    } catch {
      // Không lưu được (chế độ ẩn danh...): vẫn đổi màu cho lần xem này
    }
    setTheme(next)
  }

  return (
    <button
      type="button"
      className={`btn btn-ghost theme-toggle ${className}`}
      onClick={toggle}
      aria-label={next === 'light' ? 'Chuyển sang giao diện sáng' : 'Chuyển sang giao diện tối'}
      title={next === 'light' ? 'Giao diện sáng' : 'Giao diện tối'}
    >
      {theme === 'dark' ? '☀' : '☾'}
    </button>
  )
}
