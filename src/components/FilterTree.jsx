// @ts-nocheck — nợ kiểu: xóa dòng này rồi chạy npm run typecheck để sửa
import { useEffect, useState } from 'react'
import { Link, useLocation, useSearchParams } from 'react-router-dom'
import { buildTree, courseLabel, gradeFromKey, gradeLabel, keyOf, sectionLabel, sectionText, subjectLabel } from '../lib/chapters.js'
import { nodeKey, TreeGroup, TreeLeaf, TreeSide, useOpenNodes } from './TreeNav.jsx'
import Icon from './Icon.jsx'

// ----- Lọc danh sách (bài tập / bài giảng) theo cây Lớp › Môn › (Khóa) › Chương › Chủ đề -----
// Lựa chọn nằm trên URL: ?lop=11&mon=Vật lý&kh=<id khóa>&cd=Chương 2  hoặc  ?lop=11&ch=<chapter_id>  hoặc  ?ch=none
export const NONE = 'none'

export function useTreeSelection() {
  const [params] = useSearchParams()
  const ch = params.get('ch') ?? undefined
  const lop = params.get('lop') ?? undefined
  const mon = !ch && lop !== undefined ? params.get('mon') ?? undefined : undefined
  const kh = mon !== undefined ? params.get('kh') ?? undefined : undefined
  const cd = mon !== undefined ? params.get('cd') ?? undefined : undefined
  return { lop, mon, kh, cd, ch }
}

// Bài (có chapter_id) có thuộc mục đang chọn không. chapterById: chỉ gồm chủ đề hiện trên cây.
export function matchItem(item, chapterById, sel) {
  const c = item.chapter_id ? chapterById.get(item.chapter_id) : null
  if (sel.ch === NONE) return !c
  if (sel.ch) return item.chapter_id === sel.ch
  if (sel.lop === undefined) return true
  if (!c) return false
  return (
    keyOf(c.grade) === sel.lop &&
    (sel.mon === undefined || keyOf(c.subject) === sel.mon) &&
    (sel.kh === undefined || keyOf(c.course_id) === sel.kh) &&
    (sel.cd === undefined || keyOf(c.section) === sel.cd)
  )
}

// Mô tả ngắn mục đang chọn, vd. "Lớp 11 › Vật lý › Chủ đề 4"
export function selectionLabel(sel, chapterById, noneLabel) {
  if (sel.ch === NONE) return noneLabel
  if (sel.ch) {
    const c = chapterById.get(sel.ch)
    return c ? [gradeLabel(c.grade), subjectLabel(c.subject), c.title].join(' › ') : ''
  }
  return [
    sel.lop !== undefined && gradeLabel(gradeFromKey(sel.lop)),
    sel.mon !== undefined && subjectLabel(sel.mon === '-' ? null : sel.mon),
    sel.kh !== undefined && courseLabel([...chapterById.values()].find((c) => keyOf(c.course_id) === sel.kh)?.course),
    sel.cd !== undefined && sectionLabel(sel.cd === '-' ? null : sel.cd),
  ]
    .filter(Boolean)
    .join(' › ')
}

function makeUrl(pathname, { lop, mon, kh, cd, ch }) {
  const p = new URLSearchParams()
  if (lop !== undefined) p.set('lop', lop)
  if (mon !== undefined) p.set('mon', mon)
  if (kh !== undefined) p.set('kh', kh)
  if (cd !== undefined) p.set('cd', cd)
  if (ch !== undefined) p.set('ch', ch)
  const q = p.toString()
  return q ? `${pathname}?${q}` : pathname
}

/**
 * Cây lọc bên trái.
 * - chapters: các chủ đề hiện trên cây (đã lọc theo quyền / lớp)
 * - items: các bài có chapter_id; countIf: bài nào được đếm (mặc định: tất cả)
 * - gradeTabs: có tab chọn lớp (gia sư). Không có tab → cây bắt đầu từ Môn (học sinh, một lớp; có bài nhiều lớp thì tự bật tab)
 * - hideEmpty: ẩn chủ đề không có bài nào (học sinh)
 * - badgeIf: bài nào hiện thành số vàng cạnh chủ đề (vd. bài chưa làm, bài chờ chấm)
 * - showCount: hiện số bài (xám) cạnh mỗi chủ đề
 * - nowId: chủ đề học sinh đang học → 📍 trên lá + chương chứa nó, chưa chọn gì thì mở sẵn nhánh đó
 */
/** @param {{ chapters: any[], items: any[], countIf?: any, badgeIf?: any, showCount?: boolean, nowId?: any, icon?: any, gradeTabs?: boolean, hideEmpty?: boolean, title: string, noneLabel?: string, storageKey: string }} props */
export default function FilterTree({ chapters, items, countIf = () => true, badgeIf, showCount = true, nowId, icon, gradeTabs: tabsProp = false, hideEmpty = false, title, noneLabel = 'Chưa xếp chủ đề', storageKey }) {
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
  // Khóa lấy từ chủ đề (fetchStudentChapters kèm course); môn có khóa thì cây thêm cấp Khóa
  const courses = [...new Map(visible.filter((c) => c.course).map((c) => [c.course.id, c.course])).values()]
  const tree = buildTree(visible, courses)
  // Tab lớp lấy từ mọi chủ đề của học sinh (không chỉ chủ đề đang có bài) để Kết quả, Ôn tập... có cùng tab
  const tabs = [...new Set(chapters.map((c) => keyOf(c.grade)))].sort((x, y) => (gradeFromKey(x) ?? 99) - (gradeFromKey(y) ?? 99))
  // Học sinh được giao khóa của lớp khác → cây có nhiều lớp → hiện tab chọn lớp như gia sư
  const gradeTabs = tabsProp || tabs.length > 1
  // Lớp của chủ đề đang chọn quyết định tab đang mở
  const selChapter = sel.ch && sel.ch !== NONE ? chapterById.get(sel.ch) : null
  const tab = gradeTabs ? (selChapter ? keyOf(selChapter.grade) : sel.lop) : undefined
  const roots = gradeTabs && tab !== undefined ? tree.filter((g) => g.key === tab) : tree

  // Mở sẵn nhánh của mục đang chọn
  useEffect(() => {
    const [g, s, k, c] = selChapter
      ? [keyOf(selChapter.grade), keyOf(selChapter.subject), keyOf(selChapter.course_id), keyOf(selChapter.section)]
      : [sel.lop, sel.mon, sel.kh, sel.cd]
    const keys = []
    if (g !== undefined) keys.push(nodeKey('g', g))
    if (s !== undefined) keys.push(nodeKey('s', g, s))
    if (k !== undefined) keys.push(nodeKey('k', g, s, k))
    if (c !== undefined) keys.push(nodeKey('c', g, s, c), nodeKey('c', g, s, k, c))
    if (keys.length) ensure(keys)
  }, [selChapter, sel.lop, sel.mon, sel.kh, sel.cd, ensure])
  // Chưa chọn gì: mở sẵn nhánh chủ đề đang học
  const nowChapter = nowId ? chapterById.get(nowId) : null
  const nothingSelected = sel.lop === undefined && sel.ch === undefined
  useEffect(() => {
    if (!nowChapter || !nothingSelected) return
    const [g, s, k, c] = [keyOf(nowChapter.grade), keyOf(nowChapter.subject), keyOf(nowChapter.course_id), keyOf(nowChapter.section)]
    ensure([nodeKey('g', g), nodeKey('s', g, s), nodeKey('k', g, s, k), nodeKey('c', g, s, c), nodeKey('c', g, s, k, c)])
  }, [nowChapter, nothingSelected, ensure])
  // Chọn xong trên điện thoại thì gập mục lục
  useEffect(() => setShown(false), [sel.lop, sel.mon, sel.kh, sel.cd, sel.ch])

  const url = (s) => makeUrl(pathname, s)
  const isAll = !sel.ch && (sel.lop === undefined || (gradeTabs && sel.mon === undefined && tab === sel.lop))
  const where = selectionLabel(sel, chapterById, noneLabel) || 'Tất cả'

  // Cây có cấp Lớp (tab Tất cả của gia sư) thì môn lùi vào một bậc
  const base = gradeTabs && tab === undefined ? 1 : 0
  // Khóa node của chương: môn không chia khóa giữ key cũ (trạng thái mở đã lưu)
  const secKey = (g, s, kh, x) => (kh === undefined ? nodeKey('c', g.key, s.key, x.key) : nodeKey('c', g.key, s.key, kh, x.key))
  // Các chương của một môn (kh: khóa đang đứng trong, undefined = môn không chia khóa)
  const sectionNodes = (g, s, sections, kh, depth) => (
    <>
      {sections.map((x) => (
        <TreeGroup
          key={x.key}
          label={sectionText(x.section)}
          to={url({ lop: g.key, mon: s.key, kh, cd: x.key })}
          count={countIn((c) => c && keyOf(c.grade) === g.key && keyOf(c.subject) === s.key && (kh === undefined || keyOf(c.course_id) === kh) && keyOf(c.section) === x.key)}
          open={open.has(secKey(g, s, kh, x))}
          onToggle={() => toggle(secKey(g, s, kh, x))}
          active={!sel.ch && sel.lop === g.key && sel.mon === s.key && sel.kh === kh && sel.cd === x.key}
          depth={depth}
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
    </>
  )
  const subjectNodes = (g) =>
    g.subjects.map((s) => (
      <TreeGroup
        key={s.key}
        label={subjectLabel(s.subject)}
        className="tree-kind-subject"
        to={url({ lop: g.key, mon: s.key })}
        count={countIn((c) => c && keyOf(c.grade) === g.key && keyOf(c.subject) === s.key)}
        open={open.has(nodeKey('s', g.key, s.key))}
        onToggle={() => toggle(nodeKey('s', g.key, s.key))}
        active={!sel.ch && sel.lop === g.key && sel.mon === s.key && sel.cd === undefined}
        depth={base}
      >
        {s.courses.some((k) => k.course)
          ? s.courses.map((k) => (
              <TreeGroup
                key={k.key}
                label={courseLabel(k.course)}
                className={k.course ? 'tree-kind-course' : 'tree-kind-course tree-node-loose'}
                to={url({ lop: g.key, mon: s.key, kh: k.key })}
                count={countIn((c) => c && keyOf(c.grade) === g.key && keyOf(c.subject) === s.key && keyOf(c.course_id) === k.key)}
                open={open.has(nodeKey('k', g.key, s.key, k.key))}
                onToggle={() => toggle(nodeKey('k', g.key, s.key, k.key))}
                active={!sel.ch && sel.lop === g.key && sel.mon === s.key && sel.kh === k.key && sel.cd === undefined}
                depth={base + 1}
                now={k.sections.some((x) => x.chapters.some((c) => c.id === nowId))}
              >
                {sectionNodes(g, s, k.sections, k.key, base + 2)}
              </TreeGroup>
            ))
          : sectionNodes(g, s, s.sections, undefined, base + 1)}
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
              className="tree-kind-grade"
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
