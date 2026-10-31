// @ts-nocheck — nợ kiểu: xóa dòng này rồi chạy npm run typecheck để sửa
import { useEffect, useState } from 'react'
import { Link, useLocation, useSearchParams } from 'react-router-dom'
import { buildTree, gradeFromKey, gradeLabel, keyOf, sectionLabel, subjectLabel } from '../lib/chapters.js'
import { nodeKey, TreeGroup, TreeLeaf, TreeSide, useOpenNodes } from './TreeNav.jsx'
import Icon from './Icon.jsx'

// ----- Lọc danh sách (bài tập / bài giảng) theo cây Lớp › Môn › Chuyên đề › Chương -----
// Lựa chọn nằm trên URL: ?lop=11&mon=Vật lý&cd=Chuyên đề 2  hoặc  ?lop=11&ch=<chapter_id>  hoặc  ?ch=none
export const NONE = 'none'

export function useTreeSelection() {
  const [params] = useSearchParams()
  const ch = params.get('ch') ?? undefined
  const lop = params.get('lop') ?? undefined
  const mon = !ch && lop !== undefined ? params.get('mon') ?? undefined : undefined
  const cd = mon !== undefined ? params.get('cd') ?? undefined : undefined
  return { lop, mon, cd, ch }
}

// Bài (có chapter_id) có thuộc mục đang chọn không. chapterById: chỉ gồm chương hiện trên cây.
export function matchItem(item, chapterById, sel) {
  const c = item.chapter_id ? chapterById.get(item.chapter_id) : null
  if (sel.ch === NONE) return !c
  if (sel.ch) return item.chapter_id === sel.ch
  if (sel.lop === undefined) return true
  if (!c) return false
  return (
    keyOf(c.grade) === sel.lop &&
    (sel.mon === undefined || keyOf(c.subject) === sel.mon) &&
    (sel.cd === undefined || keyOf(c.section) === sel.cd)
  )
}

// Mô tả ngắn mục đang chọn, vd. "Lớp 11 › Vật lý › Chương 4"
export function selectionLabel(sel, chapterById, noneLabel) {
  if (sel.ch === NONE) return noneLabel
  if (sel.ch) {
    const c = chapterById.get(sel.ch)
    return c ? [gradeLabel(c.grade), subjectLabel(c.subject), c.title].join(' › ') : ''
  }
  return [
    sel.lop !== undefined && gradeLabel(gradeFromKey(sel.lop)),
    sel.mon !== undefined && subjectLabel(sel.mon === '-' ? null : sel.mon),
    sel.cd !== undefined && sectionLabel(sel.cd === '-' ? null : sel.cd),
  ]
    .filter(Boolean)
    .join(' › ')
}

function makeUrl(pathname, { lop, mon, cd, ch }) {
  const p = new URLSearchParams()
  if (lop !== undefined) p.set('lop', lop)
  if (mon !== undefined) p.set('mon', mon)
  if (cd !== undefined) p.set('cd', cd)
  if (ch !== undefined) p.set('ch', ch)
  const q = p.toString()
  return q ? `${pathname}?${q}` : pathname
}

/**
 * Cây lọc bên trái.
 * - chapters: các chương hiện trên cây (đã lọc theo quyền / lớp)
 * - items: các bài có chapter_id; countIf: bài nào được đếm (mặc định: tất cả)
 * - gradeTabs: có tab chọn lớp (gia sư). Không có tab → cây bắt đầu từ Môn (học sinh, một lớp)
 * - hideEmpty: ẩn chương không có bài nào (học sinh)
 * - badgeIf: bài nào hiện thành số vàng cạnh chương (vd. bài chưa làm, bài chờ chấm)
 * - showCount: hiện số bài (xám) cạnh mỗi chương
 * - nowId: chương học sinh đang học → 📍 trên lá + chuyên đề chứa nó, chưa chọn gì thì mở sẵn nhánh đó
 */
export default function FilterTree({ chapters, items, countIf = () => true, badgeIf, showCount = true, nowId, icon, gradeTabs = false, hideEmpty = false, title, noneLabel = 'Chưa xếp chương', storageKey }) {
  const { pathname } = useLocation()
  const sel = useTreeSelection()
  const { open, toggle, ensure } = useOpenNodes(storageKey)
  const [shown, setShown] = useState(false)

  const chapterById = new Map(chapters.map((c) => [c.id, c]))
  const counted = items.filter(countIf)
  const countIn = (pred) => counted.filter((it) => pred(chapterById.get(it.chapter_id))).length
  const perChapter = new Map()
  counted.forEach((it) => chapterById.has(it.chapter_id) && perChapter.set(it.chapter_id, (perChapter.get(it.chapter_id) || 0) + 1))
  const badges = new Map()
  if (badgeIf) items.filter(badgeIf).forEach((it) => badges.set(it.chapter_id, (badges.get(it.chapter_id) || 0) + 1))
  const noneCount = counted.filter((it) => !chapterById.has(it.chapter_id)).length
  const noneBadge = badgeIf ? items.filter((it) => badgeIf(it) && !chapterById.has(it.chapter_id)).length : 0

  const visible = hideEmpty ? chapters.filter((c) => perChapter.get(c.id) || badges.get(c.id)) : chapters
  const tree = buildTree(visible)
  const tabs = tree.map((g) => g.key)
  // Lớp của chương đang chọn quyết định tab đang mở
  const selChapter = sel.ch && sel.ch !== NONE ? chapterById.get(sel.ch) : null
  const tab = gradeTabs ? (selChapter ? keyOf(selChapter.grade) : sel.lop) : undefined
  const roots = gradeTabs && tab !== undefined ? tree.filter((g) => g.key === tab) : tree

  // Mở sẵn nhánh của mục đang chọn
  useEffect(() => {
    const [g, s, c] = selChapter ? [keyOf(selChapter.grade), keyOf(selChapter.subject), keyOf(selChapter.section)] : [sel.lop, sel.mon, sel.cd]
    const keys = []
    if (g !== undefined) keys.push(nodeKey('g', g))
    if (s !== undefined) keys.push(nodeKey('s', g, s))
    if (c !== undefined) keys.push(nodeKey('c', g, s, c))
    if (keys.length) ensure(keys)
  }, [selChapter, sel.lop, sel.mon, sel.cd, ensure])
  // Chưa chọn gì: mở sẵn nhánh chương đang học
  const nowChapter = nowId ? chapterById.get(nowId) : null
  const nothingSelected = sel.lop === undefined && sel.ch === undefined
  useEffect(() => {
    if (!nowChapter || !nothingSelected) return
    const [g, s, c] = [keyOf(nowChapter.grade), keyOf(nowChapter.subject), keyOf(nowChapter.section)]
    ensure([nodeKey('g', g), nodeKey('s', g, s), nodeKey('c', g, s, c)])
  }, [nowChapter, nothingSelected, ensure])
  // Chọn xong trên điện thoại thì gập mục lục
  useEffect(() => setShown(false), [sel.lop, sel.mon, sel.cd, sel.ch])

  const url = (s) => makeUrl(pathname, s)
  const isAll = !sel.ch && (sel.lop === undefined || (gradeTabs && sel.mon === undefined && tab === sel.lop))
  const where = selectionLabel(sel, chapterById, noneLabel) || 'Tất cả'

  // Cây có cấp Lớp (tab Tất cả của gia sư) thì môn lùi vào một bậc
  const base = gradeTabs && tab === undefined ? 1 : 0
  const subjectNodes = (g) =>
    g.subjects.map((s) => (
      <TreeGroup
        key={s.key}
        label={subjectLabel(s.subject)}
        to={url({ lop: g.key, mon: s.key })}
        count={countIn((c) => c && keyOf(c.grade) === g.key && keyOf(c.subject) === s.key)}
        open={open.has(nodeKey('s', g.key, s.key))}
        onToggle={() => toggle(nodeKey('s', g.key, s.key))}
        active={!sel.ch && sel.lop === g.key && sel.mon === s.key && sel.cd === undefined}
        depth={base}
      >
        {s.sections.map((x) => (
          <TreeGroup
            key={x.key}
            label={sectionLabel(x.section)}
            to={url({ lop: g.key, mon: s.key, cd: x.key })}
            count={countIn((c) => c && keyOf(c.grade) === g.key && keyOf(c.subject) === s.key && keyOf(c.section) === x.key)}
            open={open.has(nodeKey('c', g.key, s.key, x.key))}
            onToggle={() => toggle(nodeKey('c', g.key, s.key, x.key))}
            active={!sel.ch && sel.lop === g.key && sel.mon === s.key && sel.cd === x.key}
            depth={base + 1}
            now={x.chapters.some((c) => c.id === nowId)}
          >
            {x.chapters.map((c) => (
              <TreeLeaf
                key={c.id}
                to={url({ lop: g.key, ch: c.id })}
                label={c.title}
                count={showCount ? perChapter.get(c.id) || 0 : undefined}
                badge={badges.get(c.id) || null}
                active={sel.ch === c.id}
                dim={!perChapter.get(c.id) && !badges.get(c.id)}
                now={c.id === nowId}
              />
            ))}
          </TreeGroup>
        ))}
      </TreeGroup>
    ))

  return (
    <TreeSide shown={shown} onToggleShown={() => setShown((v) => !v)} where={where}>
      <div className="tree-head">
        <span className="tree-title">
          {icon && (
            <span className="title-icon">
              <Icon name={icon} size={16} />
            </span>
          )}
          {title}
        </span>
      </div>
      {gradeTabs && tabs.length > 0 && (
        <div className="grade-tabs" role="tablist" aria-label="Chọn lớp">
          <Link role="tab" aria-selected={tab === undefined} to={url({})} className={tab === undefined ? 'grade-tab active' : 'grade-tab'}>
            Tất cả
          </Link>
          {tabs.map((k) => (
            <Link key={k} role="tab" aria-selected={k === tab} to={url({ lop: k })} className={k === tab ? 'grade-tab active' : 'grade-tab'}>
              {k === '-' ? 'Chưa rõ lớp' : `Lớp ${k}`}
            </Link>
          ))}
        </div>
      )}
      <ul className="tree" role="tree">
        <TreeLeaf
          to={url(gradeTabs && tab !== undefined ? { lop: tab } : {})}
          label={gradeTabs && tab !== undefined ? `Tất cả ${gradeLabel(gradeFromKey(tab))}` : 'Tất cả'}
          count={gradeTabs && tab !== undefined ? countIn((c) => c && keyOf(c.grade) === tab) : counted.length}
          active={isAll}
        />
        {roots.map((g) =>
          gradeTabs && tab !== undefined ? (
            subjectNodes(g)
          ) : gradeTabs ? (
            <TreeGroup
              key={g.key}
              label={gradeLabel(g.grade)}
              to={url({ lop: g.key })}
              count={countIn((c) => c && keyOf(c.grade) === g.key)}
              open={open.has(nodeKey('g', g.key))}
              onToggle={() => toggle(nodeKey('g', g.key))}
              active={false}
              depth={0}
            >
              {subjectNodes(g)}
            </TreeGroup>
          ) : (
            subjectNodes(g)
          )
        )}
        {(noneCount > 0 || noneBadge > 0) && (
          <TreeLeaf
            to={url({ ch: NONE })}
            label={noneLabel}
            count={showCount ? noneCount : undefined}
            badge={noneBadge || null}
            active={sel.ch === NONE}
          />
        )}
      </ul>
    </TreeSide>
  )
}
