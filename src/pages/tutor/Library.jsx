// @ts-nocheck — nợ kiểu: xóa dòng này rồi chạy npm run typecheck để sửa
import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { supabase, unwrap } from '../../lib/supabase.js'
import { useAsync } from '../../lib/useAsync.js'
import { forgetUrlsWith, useRemembered } from '../../lib/navMemory.js'
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
import { nodeKey, TreeGroup, TreeLeaf, TreeSide, useOpenNodes } from '../../components/TreeNav.jsx'
import ChapterDetail from './ChapterDetail.jsx'
import Icon from '../../components/Icon.jsx'
import OutlineImport from '../../components/OutlineImport.jsx'
import { confirmDelete, confirmDeleteMany, notifyDeleted, notifyDone, notifyError } from '../../lib/dialog.js'
import { SelectBar, SelectCheck, SelectModes, useAssignSelection } from '../../components/QuickAssign.jsx'
import { chapterContent, deleteChapters, deleteWarning, itemsLabel } from '../../lib/bulk.js'

// Lấy số đếm từ dạng PostgREST "lessons(count)" → [{ count: n }]
const countOf = (v) => (Array.isArray(v) ? v[0]?.count ?? 0 : 0)
const sum = (list, field) => list.reduce((n, c) => n + countOf(c[field]), 0)
const norm = (v) => (v || '').toLowerCase()

// Lớp đang chọn ở tab (nhớ trong trình duyệt)
const GRADE_STORE = 'library-grade'
const loadGrade = () => {
  try {
    return localStorage.getItem(GRADE_STORE) ?? undefined
  } catch {
    return undefined
  }
}
const ALL_GRADES = [6, 7, 8, 9, 10, 11, 12]

// Thư viện (gia sư): mỗi lớp một cây Môn › Chuyên đề › Chương bên trái, chọn lớp bằng tab;
// nội dung mục đang chọn bên phải
export default function Library() {
  const { id } = useParams()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  // Mở từ trang khác (vd. điểm theo chương ở trang học sinh): state { backTo, backLabel } → nút quay về
  const locState = useLocation().state
  const back = locState?.backTo ? locState : null
  const lop = id ? undefined : params.get('lop') ?? undefined
  const mon = lop !== undefined ? params.get('mon') ?? undefined : undefined
  const cd = mon !== undefined ? params.get('cd') ?? undefined : undefined

  const { open, toggle, ensure, remap } = useOpenNodes('library-open')
  const [storedGrade, setStoredGrade] = useState(loadGrade)
  const [query, setQuery] = useRemembered('library-query', '', (v) => typeof v === 'string')
  const [treeShown, setTreeShown] = useState(!id && lop === undefined) // điện thoại: mục lục mở khi chưa chọn gì
  const [editing, setEditing] = useState(null) // null | {} (thêm mới) | chương đang sửa
  const [editingGroup, setEditingGroup] = useState(null)
  const [actionError, setActionError] = useState(null)
  const [detailKey, setDetailKey] = useState(0)
  const [importing, setImporting] = useState(false) // khung "Nhập mục lục"
  const [notice, setNotice] = useState(null)
  const pickCh = useAssignSelection() // Xóa nhiều chương trong nhóm đang xem
  const [withContent, setWithContent] = useState(false)
  useEffect(() => {
    if (!notice) return
    const t = setTimeout(() => setNotice(null), 6000)
    return () => clearTimeout(t)
  }, [notice])

  const { data, loading, error, reload } = useAsync(
    async () =>
      sortChapters(
        unwrap(await supabase.from('chapters').select('id, title, section, grade, subject, sort_order, lessons(count), assignments(count)'))
      ),
    []
  )
  const chapters = useMemo(() => data || [], [data])
  const current = id ? chapters.find((c) => c.id === id) : null
  const fullTree = buildTree(chapters)

  // Tab lớp: lớp của chương đang xem → lớp trên URL → lớp chọn lần trước → lớp đầu tiên
  const tabs = [...new Set([...fullTree.map((g) => g.key), ...(lop !== undefined ? [lop] : [])])].sort(
    (a, b) => (gradeFromKey(a) ?? 99) - (gradeFromKey(b) ?? 99)
  )
  const activeGrade = current ? keyOf(current.grade) : lop ?? (tabs.includes(storedGrade) ? storedGrade : tabs[0])
  useEffect(() => {
    if (activeGrade === undefined) return
    setStoredGrade(activeGrade)
    try {
      localStorage.setItem(GRADE_STORE, activeGrade)
    } catch {
      // bỏ qua
    }
  }, [activeGrade])

  // Cây của lớp đang chọn (lọc theo ô tìm nếu có)
  const q = norm(query.trim())
  const gradeChapters = chapters.filter((c) => keyOf(c.grade) === activeGrade)
  const shown = q ? gradeChapters.filter((c) => norm(c.title).includes(q) || norm(c.section).includes(q)) : gradeChapters
  const subjectsTree = buildTree(shown)[0]?.subjects || []

  // Mở sẵn đường dẫn tới mục đang chọn
  useEffect(() => {
    const [g, s, c] = current ? [keyOf(current.grade), keyOf(current.subject), keyOf(current.section)] : [lop, mon, cd]
    const keys = []
    if (s !== undefined) keys.push(nodeKey('s', g, s))
    if (c !== undefined) keys.push(nodeKey('c', g, s, c))
    if (keys.length) ensure(keys)
  }, [current, lop, mon, cd, ensure])

  // Chọn mục khác: đóng form đang mở, thoát Xóa nhiều, trên điện thoại thu mục lục lại
  useEffect(() => {
    pickCh.stop()
    setWithContent(false)
    setEditing(null)
    setEditingGroup(null)
    setActionError(null)
    if (id || lop !== undefined) setTreeShown(false)
  }, [id, lop, mon, cd])

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
    setImporting(false)
    setEditing(c)
  }
  function openImport() {
    setEditing(null)
    setEditingGroup(null)
    setNotice(null)
    setImporting(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
  function openGroupForm() {
    setImporting(false)
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
    const msg = n ? `${n} bài giảng / bài tập trong chương sẽ KHÔNG bị xóa, chỉ chuyển sang "Chưa xếp chương".` : undefined
    if (!(await confirmDelete('chương', c.title, msg))) return
    setActionError(null)
    try {
      unwrap(await supabase.from('chapters').delete().eq('id', c.id))
      forgetUrlsWith([c.id])
      if (id === c.id) navigate(libraryUrl(keyOf(c.grade), keyOf(c.subject), keyOf(c.section)))
      reload()
      notifyDeleted('chương')
    } catch (e) {
      setActionError(errMsg(e))
    }
  }

  // Xóa chuyên đề = xóa mọi chương trong chuyên đề; bài giảng / bài tập giữ lại, chuyển sang "Chưa xếp chương"
  async function handleDeleteSection() {
    const n = sum(inGroup, 'lessons') + sum(inGroup, 'assignments')
    const msg =
      `${inGroup.length} chương trong chuyên đề sẽ bị xóa.` +
      (n ? ` ${n} bài giảng / bài tập KHÔNG bị xóa, chỉ chuyển sang "Chưa xếp chương".` : '')
    if (!(await confirmDelete('chuyên đề', groupTitle, msg))) return
    setActionError(null)
    try {
      unwrap(await supabase.from('chapters').delete().in('id', inGroup.map((c) => c.id)))
      forgetUrlsWith(inGroup.map((c) => c.id))
      navigate(libraryUrl(lop, mon))
      reload()
      notifyDeleted('chuyên đề')
    } catch (e) {
      setActionError(errMsg(e))
    }
  }

  // Xóa nhiều chương. Mặc định bài bên trong giữ lại (về "Chưa xếp chương") như xóa một chương;
  // tick "Xóa luôn bài bên trong" thì xóa cả bài giảng, bài tập (bài nộp, điểm cũng mất) — chương còn bài xóa lỗi thì giữ.
  async function deleteChosenChapters(chosen) {
    const ids = chosen.map((c) => c.id)
    const inside = chosen.reduce((n, c) => n + c.n, 0)
    setActionError(null)
    let content = null
    try {
      if (withContent && inside) content = await chapterContent(ids)
    } catch (e) {
      setActionError(errMsg(e))
      return
    }
    const what = content?.length ? `${ids.length} chương kèm ${itemsLabel(content)}` : `${ids.length} chương`
    const msg = content?.length
      ? `Xóa ${ids.length} chương và mọi bài bên trong. ${deleteWarning(content)}`
      : inside
        ? `${inside} bài giảng / bài tập bên trong KHÔNG bị xóa, chỉ chuyển sang "Chưa xếp chương".`
        : 'Các chương này chưa có bài nào.'
    if (!(await confirmDeleteMany(what, msg))) return
    const r = await deleteChapters(ids, content)
    forgetUrlsWith(ids)
    pickCh.stop()
    setWithContent(false)
    reload()
    setDetailKey((k) => k + 1)
    if (!r.failed.length && !r.chapterError) {
      notifyDone({ title: `Đã xóa ${what}`, say: 'Xong rồi! Các chương đã chọn đã được dọn sạch ✨', scene: 'deleted' })
      if (level === 3 && r.chapters === inGroup.length) navigate(libraryUrl(lop, mon))
      return
    }
    const lines = []
    if (r.failed.length)
      lines.push(`Không xóa được ${r.failed.length} bài: ${r.failed.map((f) => `"${f.item.title}" (${errMsg(f.error)})`).join('; ')}. Chương chứa các bài này được giữ lại.`)
    if (r.chapterError) lines.push(`Lỗi khi xóa chương: ${errMsg(r.chapterError)}`)
    notifyError(`Đã xóa ${r.chapters}/${ids.length} chương, ${r.done} bài`, lines.join(' '))
  }

  // Thêm chương mới: điền sẵn lớp / môn / chuyên đề đang xem
  const preset = current
    ? { grade: current.grade, subject: current.subject, section: current.section }
    : {
        grade: gradeFromKey(lop ?? activeGrade),
        subject: mon !== undefined ? fromKey(mon) : 'Vật lý',
        section: cd !== undefined ? fromKey(cd) : null,
      }

  const where = current
    ? [gradeLabel(current.grade), subjectLabel(current.subject), current.title]
    : [lop !== undefined && gradeLabel(gradeFromKey(lop)), mon !== undefined && subjectLabel(fromKey(mon)), cd !== undefined && sectionLabel(fromKey(cd))].filter(Boolean)

  const g = activeGrade
  return (
    <div className="library">
      <TreeSide shown={treeShown} onToggleShown={() => setTreeShown((v) => !v)} where={where.length ? where.join(' › ') : 'Chọn lớp, môn, chương'}>
        <div className="tree-head">
          <Link to={libraryUrl()} className="tree-title">
            Thư viện
          </Link>
          <div className="row" style={{ gap: '0.35rem', flexWrap: 'nowrap' }}>
            <button type="button" className="btn btn-small" onClick={openImport} title="Dán mục lục để tạo nhiều chương một lần">
              <Icon name="import" />
              Nhập
            </button>
            <button type="button" className="btn btn-small btn-primary" onClick={() => openChapterForm({ ...preset })}>
              <Icon name="plus" />
              Chương
            </button>
          </div>
        </div>

        {/* Mỗi lớp một cây: chọn lớp bằng tab, "+ Lớp" để mở cây cho lớp mới */}
        <div className="grade-tabs" role="tablist" aria-label="Chọn lớp">
          {tabs.map((k) => (
            <Link key={k} role="tab" aria-selected={k === g} to={libraryUrl(k)} className={k === g ? 'grade-tab active' : 'grade-tab'}>
              {k === '-' ? 'Chưa rõ' : `Lớp ${k}`}
            </Link>
          ))}
          <select
            className="grade-add"
            value=""
            onChange={(e) => e.target.value && navigate(libraryUrl(e.target.value))}
            aria-label="Thêm lớp"
          >
            <option value="">+ Lớp</option>
            {ALL_GRADES.filter((n) => !tabs.includes(String(n))).map((n) => (
              <option key={n} value={n}>
                Lớp {n}
              </option>
            ))}
          </select>
        </div>

        <input type="search" className="tree-search" placeholder="Tìm chương…" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Tìm chương" />
        {loading && <Loading text="Đang tải…" />}
        {!loading && !error && g !== undefined && gradeChapters.length === 0 && (
          <p className="muted small tree-empty">{gradeLabel(gradeFromKey(g))} chưa có chương nào. Bấm "+ Chương" để tạo, hoặc nhập file JSON có "grade" là lớp này.</p>
        )}
        {!loading && !error && chapters.length === 0 && g === undefined && <p className="muted small">Chưa có chương nào.</p>}
        {!loading && q && gradeChapters.length > 0 && shown.length === 0 && <p className="muted small">Không có chương nào khớp "{query}".</p>}

        <ul className="tree" role="tree">
          {subjectsTree.map((s) => (
            <TreeGroup
              key={s.key}
              label={subjectLabel(s.subject)}
              to={libraryUrl(g, s.key)}
              count={s.sections.reduce((m, x) => m + x.chapters.length, 0)}
              open={isOpen(nodeKey('s', g, s.key))}
              onToggle={() => toggle(nodeKey('s', g, s.key))}
              active={level === 2 && lop === g && mon === s.key}
              depth={0}
            >
              {s.sections.map((x) => (
                <TreeGroup
                  key={x.key}
                  label={sectionLabel(x.section)}
                  to={libraryUrl(g, s.key, x.key)}
                  count={x.chapters.length}
                  open={isOpen(nodeKey('c', g, s.key, x.key))}
                  onToggle={() => toggle(nodeKey('c', g, s.key, x.key))}
                  active={level === 3 && lop === g && mon === s.key && cd === x.key}
                  depth={1}
                >
                  {x.chapters.map((c) => (
                    <TreeLeaf key={c.id} to={chapterUrl(c.id)} label={c.title} />
                  ))}
                </TreeGroup>
              ))}
            </TreeGroup>
          ))}
        </ul>
      </TreeSide>

      <section className="library-main">
        <ErrorBox message={error} onRetry={reload} />
        <ErrorBox message={actionError} />
        {notice && <div className="alert alert-ok">{notice}</div>}

        {importing && (
          <OutlineImport
            chapters={chapters}
            defaults={{ grade: preset.grade, subject: preset.subject || 'Vật lý' }}
            onCancel={() => setImporting(false)}
            onDone={(n, first, partial) => {
              reload()
              if (partial) return
              setImporting(false)
              setNotice(`Đã tạo ${n} chương.`)
              if (first) navigate(libraryUrl(keyOf(first.grade), keyOf(first.subject)))
            }}
          />
        )}

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
              // Nhóm đổi tên → chuyển tới vị trí mới của nhóm, giữ các nhánh đang mở
              const next = [keyOf(row.grade), level >= 2 ? keyOf(row.subject) : undefined, level >= 3 ? keyOf(row.section) : undefined]
              remap([lop, mon, cd].slice(0, level), next.slice(0, level))
              navigate(libraryUrl(...next), { replace: true })
            }}
          />
        )}

        {back && (
          <Link to={back.backTo} className="btn btn-small back-to">
            ← Về {back.backLabel || 'trang trước'}
          </Link>
        )}
        {id && <ChapterDetail id={id} reloadKey={detailKey} onEdit={openChapterForm} onDelete={handleDelete} onChanged={reload} />}

        {!id && level === 0 && !loading && <Overview tree={fullTree} onImport={openImport} />}

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
                    <Icon name="edit" />
                    Sửa {level === 1 ? 'lớp' : level === 2 ? 'môn' : 'chuyên đề'}
                  </button>
                )}
                {inGroup.length > 0 && <SelectModes sel={pickCh} modes={['delete']} />}
                {level === 3 && inGroup.length > 0 && (
                  <button type="button" className="btn btn-small btn-danger" onClick={handleDeleteSection}>
                    <Icon name="trash" />
                    Xóa chuyên đề
                  </button>
                )}
                <button type="button" className="btn btn-small" onClick={openImport}>
                  <Icon name="import" />
                  Nhập mục lục
                </button>
                <button type="button" className="btn btn-small btn-primary" onClick={() => openChapterForm({ ...preset })}>
                  <Icon name="plus" />
                  Thêm chương
                </button>
              </div>
            </div>
            {inGroup.length === 0 ? (
              <div className="empty">
                {level === 1 ? (
                  <>
                    {groupTitle} chưa có chương nào. Bấm <b>+ Thêm chương</b> để tạo chương đầu tiên, hoặc nhập file JSON có <code>"grade"</code> là lớp này.
                  </>
                ) : (
                  <>
                    Không còn chương nào ở mục này (có thể vừa đổi tên hoặc chuyển đi). <Link to={libraryUrl()}>Về Thư viện</Link>
                  </>
                )}
              </div>
            ) : (
              <>
                <div className="row small" style={{ marginBottom: '0.9rem' }}>
                  <span className="badge">{inGroup.length} chương</span>
                  <span className="badge">{sum(inGroup, 'lessons')} bài giảng</span>
                  <span className="badge">{sum(inGroup, 'assignments')} bài tập</span>
                </div>
                <GroupChapters
                  pick={pickCh}
                  chapters={inGroup}
                  showSection={level < 3}
                  onEdit={openChapterForm}
                  onDelete={(c) => handleDelete(c, countOf(c.lessons) + countOf(c.assignments))}
                />
                <SelectBar
                  sel={pickCh}
                  visible={inGroup.map(chapterItem)}
                  onDelete={deleteChosenChapters}
                  extra={
                    <label className="assign-bar-extra">
                      <input type="checkbox" checked={withContent} onChange={(e) => setWithContent(e.target.checked)} />
                      Xóa luôn bài giảng, bài tập bên trong
                    </label>
                  }
                />
              </>
            )}
          </div>
        )}
      </section>
    </div>
  )
}

// Các chương trong nhóm đang chọn (nhóm theo chuyên đề nếu đang xem cả lớp / môn)
// Chương dưới dạng mục chọn nhiều; n = số bài giảng + bài tập bên trong
const chapterItem = (c) => ({ kind: 'chapter', id: c.id, title: c.title, n: countOf(c.lessons) + countOf(c.assignments) })

function GroupChapters({ pick, chapters, showSection, onEdit, onDelete }) {
  const groups = []
  for (const c of chapters) {
    const k = showSection ? `${keyOf(c.grade)}|${keyOf(c.subject)}|${keyOf(c.section)}` : 'all'
    let g = groups.find((x) => x.k === k)
    if (!g) groups.push((g = { k, title: showSection ? sectionLabel(c.section) : null, items: [] }))
    g.items.push(c)
  }
  return groups.map((g) => (
    <div key={g.k} style={{ marginBottom: '1.1rem' }}>
      {g.title && <h2 className="section-title">{g.title}</h2>}
      <div className="list">
        {g.items.map((c) => (
          <div key={c.id} className={pick.has('chapter', c.id) ? 'list-item list-item-row is-picked' : 'list-item list-item-row'}>
            <div style={{ minWidth: 0 }}>
              <div className="list-item-title assign-title">
                <SelectCheck sel={pick} item={chapterItem(c)} />
                <Link to={chapterUrl(c.id)} style={{ color: 'inherit' }}>
                  {c.title}
                </Link>
              </div>
              <div className="row small">
                <span className="badge">{countOf(c.lessons)} bài giảng</span>
                <span className="badge">{countOf(c.assignments)} bài tập</span>
              </div>
            </div>
            <div className="row">
              <Link className="btn btn-small btn-primary" to={chapterUrl(c.id)}>
                <Icon name="open" />
                Mở
              </Link>
              <button type="button" className="btn btn-small" onClick={() => onEdit(c)}>
                <Icon name="edit" />
                Sửa
              </button>
              <button type="button" className="btn btn-small btn-danger" onClick={() => onDelete(c)}>
                <Icon name="trash" />
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
function Overview({ tree, onImport }) {
  const all = tree.flatMap((g) => g.subjects.flatMap((s) => s.sections.flatMap((x) => x.chapters)))
  return (
    <div>
      <div className="page-head">
        <h1>
          <span className="title-icon"><Icon name="library" /></span>Thư viện
        </h1>
        <button type="button" className="btn btn-small" onClick={onImport}>
          <Icon name="import" />
          Nhập mục lục
        </button>
      </div>
      <p className="muted">
        Mỗi lớp có một cây <b>Môn › Chuyên đề › Chương</b> riêng, chọn lớp bằng tab ở đầu mục lục. Học sinh chỉ thấy cây của lớp mình (theo "Lớp" trong hồ sơ
        học sinh). Khi nhập file JSON, chương được tự xếp theo lớp, môn, chuyên đề ghi trong file.
      </p>
      {all.length === 0 ? (
        <div className="empty">Chưa có chương nào. Bấm "Nhập mục lục" để dán cả mục lục giáo trình, "+ Chương" để tạo từng chương, hoặc nhập một file JSON.</div>
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
