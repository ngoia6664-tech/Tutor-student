import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import Icon from './Icon.jsx'

/**
 * Khối của trang trong cột phải (#ctx-panel ở Layout, kiểu dáng ở styles/shell.css).
 * Cột phải luôn có khối mặc định theo vai trò (ContextDefault); khối của trang xếp ngay dưới.
 * `replace`: ẩn khối mặc định khi trang này mở (vd. trang làm bài chỉ cần ô số câu).
 * Màn ≥ 1360px: cột dính bên phải nội dung; hẹp hơn: ngăn kéo bên phải mở bằng nút "Bảng bên".
 * `className`: lớp thêm vào thẻ (vd. để CSS đổi thứ tự khối trong cột).
 * `icon`: tên icon (Icon.jsx) đặt trước tiêu đề.
 * @param {{ title: string, icon?: import('./Icon.jsx').IconName, replace?: boolean, className?: string, children: import('react').ReactNode }} props
 */
export default function ContextPanel({ title, icon, replace = false, className = '', children }) {
  // #ctx-panel nằm trong Layout: chỉ có trong DOM sau lần vẽ đầu tiên
  const [host, setHost] = useState(/** @type {HTMLElement | null} */ (null))
  useEffect(() => setHost(document.getElementById('ctx-panel')), [])
  if (!host) return null
  return createPortal(<CtxCard title={title} icon={icon} replace={replace} className={className}>{children}</CtxCard>, host)
}

/**
 * Một thẻ trong cột phải (dùng cho cả khối mặc định lẫn khối của trang)
 * @param {{ title: string, icon?: import('./Icon.jsx').IconName, replace?: boolean, className?: string, children: import('react').ReactNode }} props
 */
export function CtxCard({ title, icon, replace = false, className = '', children }) {
  return (
    <section className={`ctx-card ${className}`} aria-label={title} data-replace={replace || undefined}>
      <h2 className="ctx-title">
        {icon && <Icon name={icon} className="ctx-title-icon" />}
        {title}
      </h2>
      {children}
    </section>
  )
}
