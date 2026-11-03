import { Fragment, memo } from 'react'
import { Link } from 'react-router-dom'
import { libraryUrl } from '../lib/chapters.js'
import Icon from './Icon.jsx'
import { useDropMenu } from './MoreMenu.jsx'

// Đường dẫn Thư viện gia sư: "Thư viện › Lớp 11 ▾ › Toán ▾ › Chương ▾". Chữ của mỗi đoạn là link về trang cấp đó (1 lần bấm);
// mũi tên ▾ riêng mở danh sách cùng cấp để chuyển nhanh (mục đang xem có dấu ✓; lớp chưa có chủ đề: chọn để mở lớp mới).
// Dữ liệu từ libraryCrumbs (lib/chapters.js); menu dùng chung useDropMenu (MoreMenu.jsx); CSS ở library.css.

/** @typedef {ReturnType<typeof import('../lib/chapters.js').libraryCrumbs>[number]} Segment */

const WHAT = { lop: 'lớp', mon: 'môn', cd: 'chương' }

/** @param {{ segments: Segment[], root?: string }} props root: link "Thư viện" (học sinh: /student/library) */
function LibraryCrumbs({ segments, root = libraryUrl() }) {
  return (
    <nav className="crumbs" aria-label="Vị trí">
      <Link to={root}>Thư viện</Link>
      {segments.map((s) => (
        <Fragment key={s.name}>
          <span aria-hidden="true">›</span>
          {s.options.length ? <CrumbMenu seg={s} /> : <span>{s.label}</span>}
        </Fragment>
      ))}
    </nav>
  )
}
export default memo(LibraryCrumbs)

/** @param {{ seg: Segment }} props */
function CrumbMenu({ seg }) {
  const { open, setOpen, box, btn, menu, id, onKeyDown } = useDropMenu('[aria-current]')
  const to = seg.options.find((o) => o.current)?.to

  return (
    <span className="crumb-seg" ref={box} onKeyDown={onKeyDown}>
      {to ? (
        <Link to={to} className="crumb-link">
          {seg.label}
        </Link>
      ) : (
        <span className="crumb-link">{seg.label}</span>
      )}
      <button
        ref={btn}
        type="button"
        className="crumb-btn"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? id : undefined}
        aria-label={`Chọn ${WHAT[seg.name]} khác (đang ở ${seg.label})`}
        title={`Chọn ${WHAT[seg.name]} khác`}
        onClick={() => setOpen((v) => !v)}
      >
        <svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true" className="crumb-caret">
          <path d="M3.5 6 8 10.5 12.5 6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open && (
        <ul ref={menu} id={id} role="menu" aria-label={`Chọn ${WHAT[seg.name]}`} className="crumb-menu">
          {seg.options.map((o) => (
            <li key={o.key} role="none">
              <Link
                role="menuitem"
                tabIndex={-1}
                to={o.to}
                aria-current={o.current ? 'true' : undefined}
                className={o.current ? 'crumb-item is-current' : 'crumb-item'}
                onClick={() => setOpen(false)}
              >
                <span className="crumb-item-text">{o.label}</span>
                {o.empty && <span className="crumb-item-note">chưa có chủ đề</span>}
                {o.current && <Icon name="check" size={16} />}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </span>
  )
}
