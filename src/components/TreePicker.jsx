import { useEffect, useMemo, useRef, useState } from 'react'
import { buildTree, gradeLabel, groupByChapter, sectionLabel, subjectLabel } from '../lib/chapters.js'
import Icon from './Icon.jsx'

// ----- Dựng cây cho ô chọn -----
// Nút: { key, label, icon?, children: [...] } (nhóm) hoặc { key, value, label, hint? } (lá chọn được)

// Lớp › Môn › Chuyên đề › Chương (lá = chương)
export function chapterNodes(chapters) {
  return buildTree(chapters).map((g) => ({
    key: `g:${g.key}`,
    label: gradeLabel(g.grade),
    icon: 'grade',
    children: g.subjects.map((s) => ({
      key: `s:${g.key}:${s.key}`,
      label: subjectLabel(s.subject),
      icon: 'book',
      children: s.sections.map((x) => ({
        key: `c:${g.key}:${s.key}:${x.key}`,
        label: sectionLabel(x.section),
        icon: 'folder',
        children: x.chapters.map((c) => ({ key: c.id, value: c.id, label: c.title })),
      })),
    })),
  }))
}

// Lớp › Môn › Chuyên đề › Chương › Bài giảng (lá = bài giảng); bài chưa xếp chương để nhóm riêng
export function lessonNodes(lessons, chapters) {
  const groups = groupByChapter(lessons, chapters)
  const used = groups.filter((g) => g.chapter).map((g) => g.chapter)
  const byChapter = new Map(groups.filter((g) => g.chapter).map((g) => [g.chapter.id, g.items]))
  const tree = chapterNodes(used)
  const walk = (nodes) =>
    nodes.map((n) =>
      n.value
        ? { key: `ch:${n.value}`, label: n.label, icon: 'file', children: byChapter.get(n.value).map((l) => ({ key: l.id, value: l.id, label: l.title })) }
        : { ...n, children: walk(n.children) }
    )
  const out = walk(tree)
  const loose = groups.find((g) => !g.chapter)
  if (loose) out.push({ key: 'loose', label: 'Chưa xếp chương', icon: 'inbox', children: loose.items.map((l) => ({ key: l.id, value: l.id, label: l.title })) })
  return out
}

const norm = (s) =>
  String(s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')

// Đường dẫn tới lá có value: [nhóm…, lá]
function pathTo(nodes, value) {
  for (const n of nodes) {
    if (n.value !== undefined && n.value === value) return [n]
    if (n.children) {
      const p = pathTo(n.children, value)
      if (p) return [n, ...p]
    }
  }
  return null
}

// Lọc cây theo từ khoá (khớp tên lá hoặc tên nhóm)
function filterNodes(nodes, q) {
  if (!q) return nodes
  const out = []
  for (const n of nodes) {
    if (norm(n.label).includes(q)) out.push(n)
    else if (n.children) {
      const kids = filterNodes(n.children, q)
      if (kids.length) out.push({ ...n, children: kids })
    }
  }
  return out
}

const countLeaves = (nodes) => nodes.reduce((s, n) => s + (n.children ? countLeaves(n.children) : 1), 0)

/**
 * Ô chọn dạng cây (thay cho <select> dài): bấm mở bảng, có ô tìm, nhóm mở/đóng được.
 * - nodes: cây (xem chapterNodes / lessonNodes)
 * - top: lựa chọn đặc biệt hiện trên cùng, vd. [{ value:'', label:'— Chưa xếp chương —' }, { value:'new', label:'+ Tạo chương mới…' }]
 */
export default function TreePicker({ label, labelExtra, nodes, value, onChange, top = [], placeholder = 'Chọn…', disabled = false, hint, searchPlaceholder = 'Tìm theo tên…' }) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [expanded, setExpanded] = useState(() => new Set())
  const boxRef = useRef(null)
  const searchRef = useRef(null)

  const path = useMemo(() => (value ? pathTo(nodes, value) : null), [nodes, value])
  const special = top.find((t) => t.value === value)
  const current = special ? special.label : path ? path[path.length - 1].label : value ? '(không còn trong danh sách)' : placeholder
  const crumbs = !special && path ? path.slice(0, -1).map((n) => n.label) : []

  // Mở bảng: mở sẵn nhánh đang chọn
  function toggleOpen() {
    if (disabled) return
    if (!open) {
      setExpanded(new Set((path || []).slice(0, -1).map((n) => n.key)))
      setQuery('')
    }
    setOpen((v) => !v)
  }
  useEffect(() => {
    if (!open) return
    searchRef.current?.focus()
    const onDown = (e) => !boxRef.current?.contains(e.target) && setOpen(false)
    const onKey = (e) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('pointerdown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const q = norm(query.trim())
  const shown = filterNodes(nodes, q)
  const pick = (v) => {
    onChange(v)
    setOpen(false)
  }
  const toggle = (k) =>
    setExpanded((s) => {
      const n = new Set(s)
      if (n.has(k)) n.delete(k)
      else n.add(k)
      return n
    })

  const renderNodes = (list, depth) =>
    list.map((n) => {
      if (!n.children) {
        const active = n.value === value
        return (
          <li key={n.key} role="none">
            <button type="button" role="option" aria-selected={active} className={active ? 'tp-leaf active' : 'tp-leaf'} style={{ paddingLeft: `${0.6 + depth * 1.05}rem` }} onClick={() => pick(n.value)}>
              {active && <Icon name="check" size={15} />}
              <span>{n.label}</span>
              {n.hint && <span className="muted small">{n.hint}</span>}
            </button>
          </li>
        )
      }
      const isOpen = q !== '' || expanded.has(n.key)
      return (
        <li key={n.key} role="none">
          <button type="button" className="tp-group" aria-expanded={isOpen} style={{ paddingLeft: `${0.35 + depth * 1.05}rem` }} onClick={() => toggle(n.key)}>
            <span className={isOpen ? 'tp-caret open' : 'tp-caret'} aria-hidden="true">
              ›
            </span>
            {n.icon && <Icon name={n.icon} size={15} />}
            <span className="tp-group-label">{n.label}</span>
            <span className="tp-count">{countLeaves(n.children)}</span>
          </button>
          {isOpen && (
            <ul role="group" className="tp-list">
              {renderNodes(n.children, depth + 1)}
            </ul>
          )}
        </li>
      )
    })

  return (
    <div className="field tree-picker" ref={boxRef}>
      {label && (
        <span>
          {label} {labelExtra}
        </span>
      )}
      <div className="tp-anchor">
        <button type="button" className={open ? 'tp-trigger open' : 'tp-trigger'} onClick={toggleOpen} disabled={disabled} aria-haspopup="listbox" aria-expanded={open}>
          <span className="tp-value">
            {crumbs.length > 0 && <span className="tp-crumbs">{crumbs.join(' › ')}</span>}
            <span className={value || special ? 'tp-current' : 'tp-current muted'}>{current}</span>
          </span>
          <span className="tp-arrow" aria-hidden="true">
            ▾
          </span>
        </button>
        {open && (
          <div className="tp-panel" role="listbox" aria-label={label}>
            <input ref={searchRef} type="search" className="tp-search" placeholder={searchPlaceholder} value={query} onChange={(e) => setQuery(e.target.value)} />
            <ul className="tp-list tp-root">
              {top.map((t) => (
                <li key={`top-${t.value}`} role="none">
                  <button type="button" role="option" aria-selected={t.value === value} className={t.value === value ? 'tp-leaf tp-top active' : 'tp-leaf tp-top'} onClick={() => pick(t.value)}>
                    {t.value === value && <Icon name="check" size={15} />}
                    <span>{t.label}</span>
                  </button>
                </li>
              ))}
              {renderNodes(shown, 0)}
              {shown.length === 0 && <li className="muted small tp-empty">{q ? `Không có mục nào khớp "${query}".` : 'Chưa có mục nào.'}</li>}
            </ul>
          </div>
        )}
      </div>
      {hint && <span className="muted small">{hint}</span>}
    </div>
  )
}
