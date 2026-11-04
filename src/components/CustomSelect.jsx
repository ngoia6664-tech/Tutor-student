import { useEffect, useId, useMemo, useRef, useState, useDeferredValue } from 'react'
import Icon from './Icon.jsx'
import { matchTitle } from '../lib/format.js'

/**
 * @typedef {{
 *   value: string | number
 *   label: string
 *   count?: number
 *   icon?: import('./Icon.jsx').IconName
 *   badge?: string
 *   description?: string
 * }} SelectOption
 */

/**
 * CustomSelect: Component chọn tùy biến cao cấp thay thế thẻ <select> và <option> mặc định.
 * - Giải quyết triệt để vấn đề 50 - 100 nhóm với ô tìm kiếm nhanh (searchable).
 * - Tối ưu gõ phím với React 18 useDeferredValue.
 * - Giao diện Cosmic Dark bo góc, glow tím sang trọng, hỗ trợ badge số lượng và icon.
 * @param {{
 *   value: string | number
 *   onChange: (val: any) => void
 *   options: SelectOption[]
 *   placeholder?: string
 *   prefixLabel?: string
 *   icon?: import('./Icon.jsx').IconName
 *   searchable?: boolean
 *   searchPlaceholder?: string
 *   className?: string
 *   style?: import('react').CSSProperties
 *   ariaLabel?: string
 * }} props
 */
export default function CustomSelect({
  value,
  onChange,
  options = [],
  placeholder = 'Chọn...',
  prefixLabel = '',
  icon,
  searchable = false,
  searchPlaceholder = 'Tìm nhanh...',
  className = '',
  style,
  ariaLabel,
}) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const deferredSearch = useDeferredValue(search)
  const boxRef = useRef(/** @type {HTMLDivElement | null} */ (null))
  const searchInputRef = useRef(/** @type {HTMLInputElement | null} */ (null))
  const id = useId()

  const currentOption = options.find((o) => o.value === value)

  // Đóng khi click ngoài
  useEffect(() => {
    if (!open) return
    const onDown = (e) => {
      if (boxRef.current && !boxRef.current.contains(/** @type {Node} */ (e.target))) {
        setOpen(false)
      }
    }
    document.addEventListener('pointerdown', onDown)
    return () => document.removeEventListener('pointerdown', onDown)
  }, [open])

  // Reset từ khóa và focus vào ô search khi mở
  useEffect(() => {
    if (open) {
      setSearch('')
      if (searchable) {
        setTimeout(() => searchInputRef.current?.focus(), 60)
      }
    }
  }, [open, searchable])

  // Lọc options theo từ khóa
  const filteredOptions = useMemo(() => {
    if (!searchable || !deferredSearch.trim()) return options
    const q = deferredSearch.trim()
    return options.filter(
      (o) =>
        matchTitle(o.label, q) ||
        (o.badge && matchTitle(o.badge, q)) ||
        (o.description && matchTitle(o.description, q))
    )
  }, [options, deferredSearch, searchable])

  function handleSelect(val) {
    onChange(val)
    setOpen(false)
  }

  function handleKeyDown(e) {
    if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  return (
    <div
      ref={boxRef}
      className={`custom-select-wrap ${className}`}
      style={{ position: 'relative', display: 'inline-block', ...style }}
      onKeyDown={handleKeyDown}
    >
      <button
        type="button"
        className={`custom-select-btn ${open ? 'is-open' : ''}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel || `${prefixLabel}${currentOption?.label || placeholder}`}
        onClick={() => setOpen((prev) => !prev)}
      >
        {icon && <Icon name={icon} size={15} className="custom-select-icon" />}
        <span className="custom-select-text">
          {prefixLabel && <span className="custom-select-prefix">{prefixLabel}</span>}
          {currentOption ? currentOption.label : placeholder}
        </span>
        {currentOption?.count !== undefined && (
          <span className="badge badge-subtle custom-select-badge">{currentOption.count}</span>
        )}
        <span className={`custom-select-arrow ${open ? 'is-open' : ''}`}>
          <Icon name="down" size={13} />
        </span>
      </button>

      {open && (
        <div className="custom-select-popover" role="listbox" id={id}>
          {searchable && (
            <div className="custom-select-search-box">
              <span className="custom-select-search-icon">
                <Icon name="search" size={14} />
              </span>
              <input
                ref={searchInputRef}
                type="search"
                className="custom-select-search-input"
                placeholder={searchPlaceholder}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onClick={(e) => e.stopPropagation()}
              />
              {search && (
                <button
                  type="button"
                  className="custom-select-clear-btn"
                  onClick={() => setSearch('')}
                  title="Xóa tìm kiếm"
                >
                  <Icon name="close" size={12} />
                </button>
              )}
            </div>
          )}

          <ul className="custom-select-list">
            {filteredOptions.length === 0 ? (
              <li className="custom-select-empty">Không tìm thấy mục phù hợp</li>
            ) : (
              filteredOptions.map((opt) => {
                const isSelected = opt.value === value
                return (
                  <li key={String(opt.value)} role="option" aria-selected={isSelected}>
                    <button
                      type="button"
                      className={`custom-select-item ${isSelected ? 'is-selected' : ''}`}
                      onClick={() => handleSelect(opt.value)}
                    >
                      {opt.icon && <Icon name={opt.icon} size={15} className="custom-select-item-icon" />}
                      <span className="custom-select-item-label" title={opt.label}>
                        {opt.label}
                      </span>
                      {opt.count !== undefined && (
                        <span className="badge badge-subtle custom-select-item-badge">{opt.count}</span>
                      )}
                      {isSelected && (
                        <span className="custom-select-check">
                          <Icon name="check" size={14} />
                        </span>
                      )}
                    </button>
                  </li>
                )
              })
            )}
          </ul>
        </div>
      )}
    </div>
  )
}

