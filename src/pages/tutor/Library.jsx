import { useEffect, useMemo, useState } from 'react'
import { Link, NavLink, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { supabase, unwrap } from '../../lib/supabase.js'
import { useAsync } from '../../lib/useAsync.js'
import { errMsg } from '../../lib/errors.js'
import {
  buildTree,
  chapterUrl,
  fromKey,
  gradeFromKey,
  gradeLabel,
  keyOf,
  libraryUrl,
  sectionLabel,
  sortChapters,
  subjectLabel,
} from '../../lib/chapters.js'
import Loading from '../../components/Loading.jsx'
import ErrorBox from '../../components/ErrorBox.jsx'
import { ChapterForm, GroupForm } from '../../components/ChapterForms.jsx'
import ChapterDetail from './ChapterDetail.jsx'

// Lấy số đếm từ dạng PostgREST "lessons(count)" → [{ count: n }]
const countOf = (v) => (Array.isArray(v) ? v[0]?.count ?? 0 : 0)
const sum = (list, field) => list.reduce((n, c) => n + countOf(c[field]), 0)

// Khóa của từng nút trên cây (để nhớ nút nào đang mở)
// Dấu ngăn là ký tự điều khiển \u0001, vì tên chuyên đề có thể chứa mọi ký tự thường.
const SEP = '\u0001'
const gKey = (g) => ['g', g].join(SEP)
const sKey = (g, s) => ['s', g, s].join(SEP)
const cKey = (g, s, c) => ['c', g, s, c].join(SEP)

// Đổi tên nhóm: các nút đang mở bên trong nhóm cũ vẫn mở ở tên mới
function remapOpen(open, oldParts, newParts) {
  const next = new Set()
  for (const k of open) {
    const [type, ...parts] = k.split(SEP)
    const inside = parts.length >= oldParts.length && oldParts.every((p, i) => parts[i] === p)
    next.add(inside ? [type, ...newParts, ...parts.slice(oldParts.length)].join(SEP) : k)
  }
  return next
}

const OPEN_STORE = 'library-open'
function loadOpen() {
  try {
    return new Set(JSON.parse(localStorage.getItem(OPEN_STORE) || '[]'))
  } catch {
    return new Set()
  }
}

const norm = (v) => (v || '').toLowerCase()

// Thư viện: cây Lớp › Môn › Chuyên đề › Chương bên trái, nội dung mục đang chọn bên phải
export default function Library() {
  const { id } = useParams()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const lop = id ? undefined : params.get('lop') ?? undefined
  const mon = lop !== undefined ? params.get('mon') ?? undefined : undefined
  const cd = mon !== undefined ? params.get('cd') ?? undefined : undefined

  const [open, setOpen] = useState(loadOpen)
  const [query, setQuery] = useState('')
  const [treeShown, setTreeShown] = useState(!id && lop === undefined) // điện thoại: mục lục mở khi chưa chọn gì
  const [editing, setEditing] = useState(null) // null | {} (thêm mới) | chương đang sửa
  const [editingGroup, setEditingGroup] = useState(null)
  const [actionError, setActionError] = useState(null)
  const [detailKey, setDetailKey] = useState(0)

  const { data, loading, error, reload } = useAsync(
    async () =>
      sortChapters(
        unwrap(await supabase.from('chapters').select('id, title, section, grade, subject, sort_order, lessons(count), assignments(count)'))
      ),
    []
  )
  const chapters = useMemo(() => data || [], [data])
  const current = id ? chapters.find((c) => c.id === id) : null

  // Lọc theo tên chương / chuyên đề
  const q = norm(query.trim())
  const shown = q ? chapters.filter((c) => norm(c.title).includes(q) || norm(c.section).includes(q)) : chapters
  const tree = buildTree(shown)

  // Mở sẵn đường dẫn tới mục đang chọn
  useEffect(() => {
    const path = current
      ? [keyOf(current.grade), keyOf(current.subject), keyOf(current.section)]
      : [lop, mon, cd].filter((k) => k !== undefined)
    if (!path.length) return
    setOpen((prev) => {
      const next = new Set(prev)
      if (path[0] !== undefined) next.add(gKey(path[0]))
      if (path[1] !== undefined) next.add(sKey(path[0], path[1]))
      if (path[2] !== undefined) next.add(cKey(path[0], path[1], path[2]))
      return next.size === prev.size ? prev : next
    })
  }, [current, lop, mon, cd])

  useEffect(() => {
    try {
      localStorage.setItem(OPEN_STORE, JSON.stringify([...open]))
    } catch {
      // không lưu được (chế độ riêng tư): bỏ qua
    }
  }, [open])

  // Chọn mục khác: đóng form đang mở, trên điện thoại thu mục lục lại
  useEffect(() => {
    setEditing(null)
    setEditingGroup(null)
    setActionError(null)
    if (id || lop !== undefined) setTreeShown(false)
  }, [id, lop, mon, cd])

  const toggle = (k) =>
    setOpen((prev) => {
      const next = new Set(prev)
      next.has(k) ? next.delete(k) : next.add(k)
      return next
    })
  const isOpen = (k) => q !== '' || open.has(k) // đang lọc thì mở hết

  const subjects = [...new Set(['Vật lý', ...chapters.map((c) => c.subject).filter(Boolean)])]
  const sections = [...new Set(chapters.map((c) => c.section).filter(Boolean))]

  // Nhóm đang chọn (lớp / môn / chuyên đề) và các chương bên trong
  const level = id ? 4 : cd !== undefined ? 3 : mon !== undefined ? 2 : lop !== undefined ? 1 : 0
  const inGroup = chapters.filter(
    (c) =>
      (lop === undefined || keyOf(c.grade) === lop) &&
      (mon === undefined || keyOf(c.subject) === mon) &&
      (cd === undefined || keyOf(c.section) === cd)
  )
  const groupTitle =
    level === 1 ? gradeLabel(gradeFromKey(lop)) : level === 2 ? subjectLabel(fromKey(mon)) : level === 3 ? sectionLabel(fromKey(cd)) : ''

  function openChapterForm(c) {
    setEditingGroup(null)
    setEditing(c)
  }
  function openGroupForm() {
    setEditing(null)
    setEditingGroup({
      level,
      title: `Sửa ${level === 1 ? '' : level === 2 ? 'môn ' : 'chuyên đề '}${groupTitle}`,
      chapters: inGroup,
      values: { grade: lop !== undefined ? gradeFromKey(lop) : null, subject: fromKey(mon), section: fromKey(cd) },
    })
  }
  function closeForms() {
    setEditing(null)
    setEditingGroup(null)
  }

  async function handleDelete(c, n) {
    const msg = n
      ? `Xóa chương "${c.title}"? ${n} bài giảng / bài tập trong chương sẽ KHÔNG bị xóa, chỉ chuyển sang "Chưa xếp chương".`
      : `Xóa chương "${c.title}"?`
    if (!window.confirm(msg)) return
    setActionError(null)
    try {
      unwrap(await supabase.from('chapters').delete().eq('id', c.id))
      if (id === c.id) navigate(libraryUrl(keyOf(c.grade), keyOf(c.subject), keyOf(c.section)))
      reload()
    } catch (e) {
      setActionError(errMsg(e))
    }
  }

  // Thêm chương mới: điền sẵn lớp / môn / chuyên đề đang xem
  const preset = current
    ? { grade: current.grade, subject: current.subject, section: current.section }
    : {
        grade: lop !== undefined ? gradeFromKey(lop) : null,
        subject: mon !== undefined ? fromKey(mon) : 'Vật lý',
        section: cd !== undefined ? fromKey(cd) : null,
      }

  const location = current
    ? [gradeLabel(current.grade), subjectLabel(current.subject), current.title]
    : [lop !== undefined && gradeLabel(gradeFromKey(lop)), mon !== undefined && subjectLabel(fromKey(mon)), cd !== undefined && sectionLabel(fromKey(cd))].filter(Boolean)

  return (
    <div className="library">
      <aside className={treeShown ? 'library-side shown' : 'library-side'}>
        <button type="button" className="tree-toggle" onClick={() => setTreeShown((v) => !v)} aria-expanded={treeShown}>
          <span>☰ Mục lục</span>
          <span className="tree-toggle-where">{location.length ? location.join(' › ') : 'Chọn lớp, môn, chương'}</span>
          <span aria-hidden="true">{treeShown ? '▴' : '▾'}</span>
        </button>
        <div className="tree-box">
          <div className="tree-head">
            <Link to={libraryUrl()} className="tree-title">
              Thư viện
            </Link>
            <button type="button" className="btn btn-small btn-primary" onClick={() => openChapterForm({ ...preset })}>
              + Chương
            </button>
          </div>
          <input
            type="search"
            className="tree-search"
            placeholder="Tìm chương…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Tìm chương"
          />
          {loading && <Loading text="Đang tải…" />}
          {!loading && !error && chapters.length === 0 && <p className="muted small">Chưa có chương nào.</p>}
          {!loading && q && shown.length === 0 && <p className="muted small">Không có chương nào khớp "{query}".</p>}
          <ul className="tree" role="tree">
            {tree.map((g) => (
              <TreeGroup
                key={g.key}
                label={gradeLabel(g.grade)}
                to={libraryUrl(g.key)}
                count={g.subjects.reduce((n, s) => n + s.sections.reduce((m, x) => m + x.chapters.length, 0), 0)}
                open={isOpen(gKey(g.key))}
                onToggle={() => toggle(gKey(g.key))}
                active={level === 1 && lop === g.key}
                depth={0}
              >
                {g.subjects.map((s) => (
                  <TreeGroup
                    key={s.key}
                    label={subjectLabel(s.subject)}
                    to={libraryUrl(g.key, s.key)}
                    count={s.sections.reduce((m, x) => m + x.chapters.length, 0)}
                    open={isOpen(sKey(g.key, s.key))}
                    onToggle={() => toggle(sKey(g.key, s.key))}
                    active={level === 2 && lop === g.key && mon === s.key}
                    depth={1}
                  >
                    {s.sections.map((x) => (
                      <TreeGroup
                        key={x.key}
                        label={sectionLabel(x.section)}
                        to={libraryUrl(g.key, s.key, x.key)}
                        count={x.chapters.length}
                        open={isOpen(cKey(g.key, s.key, x.key))}
                        onToggle={() => toggle(cKey(g.key, s.key, x.key))}
                        active={level === 3 && lop === g.key && mon === s.key && cd === x.key}
                        depth={2}
                      >
                        {x.chapters.map((c) => (
                          <li key={c.id} role="treeitem">
                            <NavLink to={chapterUrl(c.id)} className={({ isActive }) => (isActive ? 'tree-leaf active' : 'tree-leaf')} title={c.title}>
                              {c.title}
                            </NavLink>
                          </li>
                        ))}
                      </TreeGroup>
                    ))}
                  </TreeGroup>
                ))}
              </TreeGroup>
            ))}
          </ul>
        </div>
      </aside>

      <section className="library-main">
        <ErrorBox message={error} onRetry={reload} />
        <ErrorBox message={actionError} />

        {editing && (
          <ChapterForm
            key={editing.id || 'new'}
            chapter={editing}
            subjects={subjects}
            sections={sections}
            nextOrder={chapters.length}
            onCancel={closeForms}
            onSaved={(newId) => {
              const wasNew = !editing.id
              closeForms()
              reload()
              setDetailKey((k) => k + 1)
              if (wasNew && newId) navigate(chapterUrl(newId))
            }}
          />
        )}
        {editingGroup && (
          <GroupForm
            group={editingGroup}
            subjects={subjects}
            sections={sections}
            onCancel={closeForms}
            onSaved={(row) => {
              closeForms()
              reload()
              // Nhóm đổi tên → chuyển tới vị trí mới của nhóm
              const g = keyOf(row.grade)
              const s = level >= 2 ? keyOf(row.subject) : undefined
              const c = level >= 3 ? keyOf(row.section) : undefined
              const oldParts = [lop, mon, cd].slice(0, level)
              setOpen((prev) => remapOpen(prev, oldParts, [g, s, c].slice(0, level)))
              navigate(libraryUrl(g, s, c), { replace: true })
            }}
          />
        )}

        {id && <ChapterDetail id={id} reloadKey={detailKey} onEdit={openChapterForm} onDelete={handleDelete} />}

        {!id && level === 0 && !loading && (
          <Overview tree={buildTree(chapters)} />
        )}

        {!id && level > 0 && !loading && (
          <div>
            <nav className="crumbs" aria-label="Vị trí">
              <Link to={libraryUrl()}>Thư viện</Link>
              {level >= 2 && (
                <>
                  <span>›</span>
                  <Link to={libraryUrl(lop)}>{gradeLabel(gradeFromKey(lop))}</Link>
                </>
              )}
              {level >= 3 && (
                <>
                  <span>›</span>
                  <Link to={libraryUrl(lop, mon)}>{subjectLabel(fromKey(mon))}</Link>
                </>
              )}
            </nav>
            <div className="page-head">
              <h1>{groupTitle}</h1>
              <div className="row">
                {inGroup.length > 0 && (
                  <button type="button" className="btn btn-small" onClick={openGroupForm}>
                    Sửa {level === 1 ? 'lớp' : level === 2 ? 'môn' : 'chuyên đề'}
                  </button>
                )}
                <button type="button" className="btn btn-small btn-primary" onClick={() => openChapterForm({ ...preset })}>
                  + Thêm chương
                </button>
              </div>
            </div>
            {inGroup.length === 0 ? (
              <div className="empty">
                Không còn chương nào ở mục này (có thể vừa đổi tên hoặc chuyển đi). <Link to={libraryUrl()}>Về Thư viện</Link>
              </div>
            ) : (
              <>
                <div className="row small" style={{ marginBottom: '0.9rem' }}>
                  <span className="badge">{inGroup.length} chương</span>
                  <span className="badge">{sum(inGroup, 'lessons')} bài giảng</span>
                  <span className="badge">{sum(inGroup, 'assignments')} bài tập</span>
                </div>
                <GroupChapters chapters={inGroup} showSection={level < 3} onEdit={openChapterForm} onDelete={(c) => handleDelete(c, countOf(c.lessons) + countOf(c.assignments))} />
              </>
            )}
          </div>
        )}
      </section>
    </div>
  )
}

// Một nút nhóm trên cây: mũi tên mở/thu + tên (bấm để xem nhóm ở cột phải) + số chương
function TreeGroup({ label, to, count, open, onToggle, active, depth, children }) {
  return (
    <li role="treeitem" aria-expanded={open} className={`tree-node depth-${depth}`}>
      <div className={active ? 'tree-row active' : 'tree-row'}>
        <button type="button" className={open ? 'tree-caret open' : 'tree-caret'} onClick={onToggle} aria-label={open ? `Thu ${label}` : `Mở ${label}`}>
          <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
            <path d="M6 3.5 10.5 8 6 12.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <Link to={to} className="tree-label" onClick={() => !open && onToggle()} title={label}>
          {label}
        </Link>
        <span className="tree-count">{count}</span>
      </div>
      {open && (
        <ul role="group" className="tree-children">
          {children}
        </ul>
      )}
    </li>
  )
}

// Các chương trong nhóm đang chọn (nhóm theo chuyên đề nếu đang xem cả lớp / môn)
function GroupChapters({ chapters, showSection, onEdit, onDelete }) {
  const groups = []
  for (const c of chapters) {
    const k = showSection ? `${keyOf(c.grade)}|${keyOf(c.subject)}|${keyOf(c.section)}` : 'all'
    let g = groups.find((x) => x.k === k)
    if (!g) groups.push((g = { k, title: showSection ? `${sectionLabel(c.section)}` : null, sub: showSection ? `${gradeLabel(c.grade)} · ${subjectLabel(c.subject)}` : null, items: [] }))
    g.items.push(c)
  }
  return groups.map((g) => (
    <div key={g.k} style={{ marginBottom: '1.1rem' }}>
      {g.title && <h2 className="section-title">{g.title}</h2>}
      <div className="list">
        {g.items.map((c) => (
          <div key={c.id} className="list-item list-item-row">
            <div style={{ minWidth: 0 }}>
              <Link to={chapterUrl(c.id)} className="list-item-title" style={{ display: 'block', color: 'inherit' }}>
                {c.title}
              </Link>
              <div className="row small">
                <span className="badge">{countOf(c.lessons)} bài giảng</span>
                <span className="badge">{countOf(c.assignments)} bài tập</span>
              </div>
            </div>
            <div className="row">
              <Link className="btn btn-small btn-primary" to={chapterUrl(c.id)}>
                Mở
              </Link>
              <button type="button" className="btn btn-small" onClick={() => onEdit(c)}>
                Sửa
              </button>
              <button type="button" className="btn btn-small btn-danger" onClick={() => onDelete(c)}>
                Xóa
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  ))
}

// Chưa chọn gì: tổng quan từng lớp
function Overview({ tree }) {
  const all = tree.flatMap((g) => g.subjects.flatMap((s) => s.sections.flatMap((x) => x.chapters)))
  return (
    <div>
      <div className="page-head">
        <h1>Thư viện</h1>
      </div>
      <p className="muted">
        Bài giảng và bài tập được xếp theo <b>Lớp › Môn › Chuyên đề › Chương</b>. Chọn một mục ở mục lục để xem. Khi nhập file JSON, chương được tự xếp theo
        lớp, môn, chuyên đề ghi trong file.
      </p>
      {all.length === 0 ? (
        <div className="empty">Chưa có chương nào. Bấm "+ Chương" hoặc nhập một file JSON để tự tạo.</div>
      ) : (
        <div className="overview-grid">
          {tree.map((g) => {
            const list = g.subjects.flatMap((s) => s.sections.flatMap((x) => x.chapters))
            return (
              <Link key={g.key} to={libraryUrl(g.key)} className="list-item overview-card">
                <div className="list-item-title">{gradeLabel(g.grade)}</div>
                <div className="muted small">{g.subjects.map((s) => subjectLabel(s.subject)).join(' · ')}</div>
                <div className="row small" style={{ marginTop: '0.5rem' }}>
                  <span className="badge">{list.length} chương</span>
                  <span className="badge">{sum(list, 'lessons')} bài giảng</span>
                  <span className="badge">{sum(list, 'assignments')} bài tập</span>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
