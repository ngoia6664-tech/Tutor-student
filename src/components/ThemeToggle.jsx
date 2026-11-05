import { flushSync } from 'react-dom'
import { prefersReducedMotion } from '../lib/settings.js'
import { useTheme } from '../lib/theme.js'

const THEME_COLOR = { dark: '#0c0a1d', light: '#efe5d5' }

/**
 * Nút chuyển giao diện sáng (Lớp học cổ điển) / tối (Vũ trụ học); lựa chọn được nhớ trên máy này.
 * Theo dõi <html data-theme> (useTheme) nên nhiều nút cùng lúc (thanh trên + ngăn kéo menu) luôn khớp nhau.
 * `withLabel`: dạng hàng có chữ trong thanh bên / ngăn kéo (className do nơi dùng đặt).
 * @param {{ className?: string, withLabel?: boolean }} props
 */
export default function ThemeToggle({ className = '', withLabel = false }) {
  const theme = useTheme()
  const next = theme === 'dark' ? 'light' : 'dark'
  const label = next === 'light' ? 'Giao diện sáng (Lớp học)' : 'Giao diện tối (Vũ trụ)'

  // Trình duyệt hỗ trợ View Transitions: cả trang mờ chéo sang màu mới (layout.css), không thì đổi ngay
  function toggle() {
    if (document.startViewTransition && !prefersReducedMotion()) document.startViewTransition(() => flushSync(apply))
    else apply()
  }

  function apply() {
    document.documentElement.dataset.theme = next
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', THEME_COLOR[next])
    try {
      localStorage.setItem('theme', next)
    } catch {
      // Không lưu được (chế độ ẩn danh...): vẫn đổi màu cho lần xem này
    }
  }

  const glyph = theme === 'dark' ? '☀' : '☾'
  return (
    <button
      type="button"
      className={withLabel ? className : `btn btn-ghost theme-toggle ${className}`}
      onClick={toggle}
      aria-label={next === 'light' ? 'Chuyển sang giao diện sáng (Lớp học cổ điển)' : 'Chuyển sang giao diện tối (Vũ trụ học)'}
      title={label}
    >
      {withLabel ? (
        <>
          <span className="side-ico" aria-hidden="true">{glyph}</span>
          <span className="side-label">{label}</span>
        </>
      ) : (
        glyph
      )}
    </button>
  )
}
