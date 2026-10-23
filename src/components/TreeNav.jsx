import { useCallback, useEffect, useState } from 'react'
import { Link, NavLink } from 'react-router-dom'

// ----- Nhớ nút nào trên cây đang mở (lưu trong trình duyệt) -----
// Khóa của một nút = các phần nối bằng ký tự điều khiển \u0001 (tên chuyên đề có thể chứa mọi ký tự thường)
const SEP = '\u0001'
export const nodeKey = (...parts) => parts.join(SEP)

function load(storageKey) {
  try {
    return new Set(JSON.parse(localStorage.getItem(storageKey) || '[]'))
  } catch {
    return new Set()
  }
}

export function useOpenNodes(storageKey) {
  const [open, setOpen] = useState(() => load(storageKey))

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify([...open]))
    } catch {
      // không lưu được (chế độ riêng tư): bỏ qua
    }
  }, [open, storageKey])

  const toggle = useCallback(
    (k) =>
      setOpen((prev) => {
        const next = new Set(prev)
        next.has(k) ? next.delete(k) : next.add(k)
        return next
      }),
    []
  )

  // Mở sẵn các nút trên đường tới mục đang chọn
  const ensure = useCallback(
    (keys) =>
      setOpen((prev) => {
        if (keys.every((k) => prev.has(k))) return prev
        const next = new Set(prev)
        keys.forEach((k) => next.add(k))
        return next
      }),
    []
  )

  // Đổi tên nhóm: các nút đang mở bên trong nhóm cũ vẫn mở ở tên mới
  const remap = useCallback(
    (oldParts, newParts) =>
      setOpen((prev) => {
        const next = new Set()
        for (const k of prev) {
          const [type, ...parts] = k.split(SEP)
          const inside = parts.length >= oldParts.length && oldParts.every((p, i) => parts[i] === p)
          next.add(inside ? nodeKey(type, ...newParts, ...parts.slice(oldParts.length)) : k)
        }
        return next
      }),
    []
  )

  return { open, toggle, ensure, remap }
}

// Một nút nhóm trên cây: mũi tên mở/thu + tên (bấm để xem nhóm) + số đếm
// now: nhóm chứa chương đang học (hiện 📍)
export function TreeGroup({ label, to, count, open, onToggle, active, depth, now, children }) {
  return (
    <li role="treeitem" aria-expanded={open} className={`tree-node depth-${depth}`}>
      <div className={active ? 'tree-row active' : 'tree-row'}>
        <button type="button" className={open ? 'tree-caret open' : 'tree-caret'} onClick={onToggle} aria-label={open ? `Thu ${label}` : `Mở ${label}`}>
          <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
            <path d="M6 3.5 10.5 8 6 12.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        {to ? (
          <Link to={to} className="tree-label" onClick={() => !open && onToggle()} title={label}>
            {label}
          </Link>
        ) : (
          <button type="button" className="tree-label tree-label-btn" onClick={onToggle} title={label}>
            {label}
          </button>
        )}
        {now && (
          <span className="tree-now" title="Chuyên đề đang học">
            📍
          </span>
        )}
        {count !== undefined && <span className="tree-count">{count}</span>}
      </div>
      {open && (
        <ul role="group" className="tree-children">
          {children}
        </ul>
      )}
    </li>
  )
}

// Lá của cây: một chương (hoặc mục cuối). badge: số nhỏ bên phải (vd. số bài chưa làm), count: số đếm xám.
// active: truyền vào khi lá phân biệt bằng ?tham số (NavLink chỉ so đường dẫn)
// now: chương học sinh đang học (hiện nhãn 📍)
export function TreeLeaf({ to, label, badge, count, active, dim, now }) {
  const body = (
    <>
      <span className="tree-leaf-text">{label}</span>
      {now && (
        <span className="tree-now" title="Đang học">
          📍
        </span>
      )}
      {badge ? <span className="tree-leaf-badge">{badge}</span> : null}
      {count !== undefined && <span className="tree-count">{count}</span>}
    </>
  )
  const cls = (on) => ['tree-leaf', on && 'active', dim && 'dim', now && 'is-now'].filter(Boolean).join(' ')
  return (
    <li role="treeitem">
      {active === undefined ? (
        <NavLink to={to} end className={({ isActive }) => cls(isActive)} title={label}>
          {body}
        </NavLink>
      ) : (
        <Link to={to} className={cls(active)} title={label} aria-current={active ? 'page' : undefined}>
          {body}
        </Link>
      )}
    </li>
  )
}

// Khung cột trái: trên điện thoại gập thành nút "☰ Mục lục" ghi vị trí đang xem
export function TreeSide({ shown, onToggleShown, where, children }) {
  return (
    <aside className={shown ? 'library-side shown' : 'library-side'}>
      <button type="button" className="tree-toggle" onClick={onToggleShown} aria-expanded={shown}>
        <span>☰ Mục lục</span>
        <span className="tree-toggle-where">{where}</span>
        <span aria-hidden="true">{shown ? '▴' : '▾'}</span>
      </button>
      <div className="tree-box">{children}</div>
    </aside>
  )
}
