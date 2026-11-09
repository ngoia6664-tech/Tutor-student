import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { supabase, unwrap } from '../../lib/supabase.js'
import { useAsync } from '../../lib/useAsync.js'
import { scrollToY } from '../../lib/scroller.js'
import { forgetUrlsWith } from '../../lib/navMemory.js'
import { errMsg } from '../../lib/errors.js'
import {
  buildTree,
  chapterUrl,
  courseLabel,
  fromKey,
  gradeFromKey,
  gradeLabel,
  keyOf,
  libraryCrumbs,
  libraryUrl,
  sectionLabel,
  sectionText,
  sortChapters,
  subjectLabel,
  UNSORTED,
} from '../../lib/chapters.js'
import Loading from '../../components/Loading.jsx'
import ErrorBox from '../../components/ErrorBox.jsx'
import { ChapterForm, CourseForm, GroupForm } from '../../components/ChapterForms.jsx'
import { nodeKey, TreeGroup, TreeLeaf, TreeSide, useOpenNodes } from '../../components/TreeNav.jsx'
import ChapterDetail from './ChapterDetail.jsx'
import Icon from '../../components/Icon.jsx'
import CustomSelect from '../../components/CustomSelect.jsx'
import OutlineImport from '../../components/OutlineImport.jsx'
import ChapterCarousel from '../../components/ChapterCarousel.jsx'
import GradeShelf from '../../components/GradeShelf.jsx'
import LibraryCrumbs from '../../components/LibraryCrumbs.jsx'
import { recentIds } from '../../lib/recentChapters.js'
import { askConfirm, confirmDelete, confirmDeleteMany, notifyDeleted, notifyDone, notifyError } from '../../lib/dialog.js'
import { AssignDialog, SelectBar, SelectCheck, useAssignSelection } from '../../components/QuickAssign.jsx'
import MoreMenu from '../../components/MoreMenu.jsx'
import { chapterContent, deleteChapters, deleteWarning, itemsLabel } from '../../lib/bulk.js'

// Lấy số đếm từ dạng PostgREST "lessons(count)" → [{ count: n }] hoặc "lessons(hidden)" → [{ hidden: bool }, ...]
const countOf = (v) => (Array.isArray(v) ? (v[0] && 'count' in v[0] ? v[0]?.count ?? 0 : v.length) : 0)
const hiddenOf = (v) => (Array.isArray(v) ? v.filter((x) => x && typeof x === 'object' && x.hidden).length : 0)
const hiddenInChapter = (c) => hiddenOf(c.lessons) + hiddenOf(c.assignments)
const sum = (list, field) => list.reduce((n, c) => n + countOf(c[field]), 0)
const sumHidden = (list) => list.reduce((n, c) => n + hiddenInChapter(c), 0)

// Lớp xem lần trước (nhớ trong trình duyệt): cây bên trái hiện lớp này khi chưa chọn lớp
const GRADE_STORE = 'library-grade'
const loadGrade = () => {
  try {
    return localStorage.getItem(GRADE_STORE) ?? undefined
  } catch {
    return undefined
  }
}

// Thư viện (gia sư): cây Môn › Khóa › Chương của một lớp bên trái (chủ đề nằm ở băng chuyền giữa trang);
// đổi lớp / môn / chương nhanh bằng menu trên đường dẫn (LibraryCrumbs); nội dung mục đang chọn bên phải
export default function Library() {
  const { id } = useParams()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  // Mở từ trang khác (vd. điểm theo chủ đề ở trang học sinh): state { backTo, backLabel } → nút quay về
  const locState = useLocation().state
  const back = locState?.backTo ? locState : null
  const lop = id ? undefined : params.get('lop') ?? undefined
  const mon = lop !== undefined ? params.get('mon') ?? undefined : undefined
  // kh: khóa ('-' = chưa xếp khóa); link cũ không có kh thì chương lấy theo cả môn
  const kh = mon !== undefined ? params.get('kh') ?? undefined : undefined
  const cd = mon !== undefined ? params.get('cd') ?? undefined : undefined

  const { open, toggle, ensure, remap } = useOpenNodes('library-open')
  const [storedGrade, setStoredGrade] = useState(loadGrade)
  const [treeShown, setTreeShown] = useState(!id && lop === undefined) // điện thoại: mục lục mở khi chưa chọn gì
  const [treeQuery, setTreeQuery] = useState('') // lọc nhanh chương / chủ đề trên cây mục lục
  const [editing, setEditing] = useState(null) // null | {} (thêm mới) | chủ đề đang sửa
  const [editingGroup, setEditingGroup] = useState(null)
  const [editingCourse, setEditingCourse] = useState(null) // null | khóa đang thêm / sửa
  const [assigningCourse, setAssigningCourse] = useState(null) // [{ kind: 'course', ... }] đang giao khóa
  const [actionError, setActionError] = useState(null)
  const [detailKey, setDetailKey] = useState(0)
  const [importing, setImporting] = useState(false) // khung "Nhập mục lục"
  const [notice, setNotice] = useState(null)
  const pickCh = useAssignSelection() // Xóa nhiều chủ đề trong nhóm đang xem
  const [withContent, setWithContent] = useState(false)
  const [destCourse, setDestCourse] = useState('') // khóa đích khi "Chuyển vào khóa"
  useEffect(() => {
    if (!notice) return
    const t = setTimeout(() => setNotice(null), 6000)
    return () => clearTimeout(t)
  }, [notice])

  const { data, loading, error, reload } = useAsync(async () => {
    // Số bài chưa xếp chủ đề (chapter_id trống) cho mục "Chưa xếp chủ đề" cuối cây
    const loose = (table) => supabase.from(table).select('id', { count: 'exact', head: true }).is('chapter_id', null)
    const [rows, courses, l, a] = await Promise.all([
      supabase.from('chapters').select('id, title, section, grade, subject, sort_order, course_id, lessons(hidden), assignments(hidden)').then(unwrap),
      supabase.from('courses').select('id, title, grade, subject, sort_order, course_recipients(count)').then(unwrap),
      loose('lessons'),
      loose('assignments'),
    ])
    if (l.error || a.error) throw l.error || a.error
    return { chapters: sortChapters(rows), courses, unsorted: (l.count || 0) + (a.count || 0) }
  }, [])
  const chapters = useMemo(() => data?.chapters || [], [data])
  const courses = useMemo(() => data?.courses || [], [data])
  const current = id ? chapters.find((c) => c.id === id) : null
  const fullTree = useMemo(() => buildTree(chapters, courses), [chapters, courses])

  // Lớp của cây: lớp của chủ đề đang xem → lớp trên URL → lớp xem lần trước → lớp đầu tiên
  const gradeKeys = fullTree.map((x) => x.key)
  const activeGrade = current ? keyOf(current.grade) : lop ?? (gradeKeys.includes(storedGrade) ? storedGrade : gradeKeys[0])
  useEffect(() => {
    if (activeGrade === undefined) return
    setStoredGrade(activeGrade)
    try {
      localStorage.setItem(GRADE_STORE, activeGrade)
    } catch {
      // bỏ qua
    }
  }, [activeGrade])

  // Cây của lớp đang chọn
  const gradeChapters = chapters.filter((c) => keyOf(c.grade) === activeGrade)
  const subjectsTree = fullTree.find((x) => x.key === activeGrade)?.subjects || []

  // Vị trí đang xem (lớp / môn / khóa / chương): của chủ đề đang mở, hoặc trên URL
  const path = current
    ? { lop: keyOf(current.grade), mon: keyOf(current.subject), kh: keyOf(current.course_id), cd: keyOf(current.section) }
    : { lop, mon, kh, cd }
  const crumbs = useMemo(
    () => libraryCrumbs(fullTree, { lop: path.lop, mon: path.mon, kh: path.kh, cd: path.cd }),
    [fullTree, path.lop, path.mon, path.kh, path.cd],
  )

  // Chủ đề vừa nhập (nhãn "Mới"): đọc lại mỗi khi danh sách hoặc mục đang xem đổi
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const recent = useMemo(() => recentIds(), [chapters, id])

  // "Chưa xếp chủ đề" không thuộc chương nào: chỉ "Thư viện › Lớp ▾ › Chưa xếp chủ đề"
  const unsortedCrumbs = useMemo(
    () => [...libraryCrumbs(fullTree, { lop: activeGrade }), { name: /** @type {'cd'} */ ('cd'), label: 'Chưa xếp chủ đề', options: [] }], // chỉ làm khóa + chữ, options rỗng nên không có menu
    [fullTree, activeGrade],
  )

  // Mở sẵn môn + khóa chứa mục đang chọn (chủ đề là lá của cây, không cần mở)
  useEffect(() => {
    if (path.mon !== undefined) ensure([nodeKey('s', path.lop, path.mon), ...(path.kh !== undefined ? [nodeKey('k', path.lop, path.mon, path.kh)] : [])])
  }, [path.lop, path.mon, path.kh, ensure])

  // Chọn mục khác: đóng form đang mở, thoát Xóa nhiều, trên điện thoại thu mục lục lại
  useEffect(() => {
    pickCh.stop()
    setWithContent(false)
    setEditing(null)
    setEditingGroup(null)
    setEditingCourse(null)
    setActionError(null)
    if (id || lop !== undefined) setTreeShown(false)
  }, [id, lop, mon, kh, cd])

  const isOpen = (k) => open.has(k)

  const subjects = [...new Set(['Vật lý', ...chapters.map((c) => c.subject).filter(Boolean)])]
  const sections = [...new Set(chapters.map((c) => c.section).filter(Boolean))]

  // Nhóm đang chọn (lớp / môn / khóa / chương) và các chủ đề bên trong
  const level = id ? 5 : cd !== undefined ? 4 : kh !== undefined ? 3 : mon !== undefined ? 2 : lop !== undefined ? 1 : 0
  const inGroup = chapters.filter(
    (c) =>
      (lop === undefined || keyOf(c.grade) === lop) &&
      (mon === undefined || keyOf(c.subject) === mon) &&
      (kh === undefined || keyOf(c.course_id) === kh) &&
      (cd === undefined || keyOf(c.section) === cd)
  )
  // Khóa đang xem (null: "Chương ngoài khóa" hoặc không ở trang khóa)
  const course = kh !== undefined ? courses.find((k) => k.id === kh) || null : null
  // Khóa cùng lớp + môn đang xem (đích của "Chuyển vào khóa")
  const subjectCourses = courses.filter(
    (k) => mon !== undefined && keyOf(k.grade) === lop && (k.subject || '').toLowerCase() === (fromKey(mon) || '').toLowerCase()
  )
  const groupTitle =
    level === 1
      ? gradeLabel(gradeFromKey(lop))
      : level === 2
        ? subjectLabel(fromKey(mon))
        : level === 3
          ? courseLabel(course)
          : level === 4
            ? sectionLabel(fromKey(cd))
            : ''

  function openChapterForm(c) {
    setEditingGroup(null)
    setEditingCourse(null)
    setImporting(false)
    setEditing(c)
  }
  function openCourseForm(k) {
    setEditing(null)
    setEditingGroup(null)
    setImporting(false)
    setEditingCourse(k)
  }
  function openImport() {
    setEditing(null)
    setEditingGroup(null)
    setNotice(null)
    setImporting(true)
    scrollToY(0, 'smooth')
  }
  function openGroupForm() {
    setImporting(false)
    setEditing(null)
    setEditingCourse(null)
    setEditingGroup({
      level: level === 4 ? 3 : level, // GroupForm: 1 lớp | 2 môn | 3 chương
      title: `Sửa ${level === 1 ? '' : level === 2 ? 'môn ' : 'chương '}${groupTitle}`,
      chapters: inGroup,
      values: {
        grade: lop !== undefined ? gradeFromKey(lop) : null,
        subject: fromKey(mon),
        course_id: course?.id ?? null,
        section: fromKey(cd),
      },
    })
  }
  function closeForms() {
    setEditing(null)
    setEditingGroup(null)
    setEditingCourse(null)
  }

  // Xóa khóa: chủ đề bên trong về "Chương ngoài khóa"; học sinh có khóa mất các bài chưa làm (bài đã làm giữ lại)
  async function handleDeleteCourse() {
    if (!course) return
    const n = course.course_recipients?.[0]?.count || 0
    const msg =
      `${inGroup.length} chủ đề trong khóa KHÔNG bị xóa, chỉ chuyển sang "Chương ngoài khóa".` +
      (n ? ` ${n} học sinh đang có khóa sẽ không còn thấy các bài chưa làm (bài đã làm, đã nộp vẫn giữ).` : '')
    if (!(await confirmDelete('khóa', course.title, msg))) return
    setActionError(null)
    try {
      unwrap(await supabase.from('courses').delete().eq('id', course.id))
      navigate(libraryUrl(lop, mon), { replace: true })
      reload()
      notifyDeleted('khóa')
    } catch (e) {
      setActionError(errMsg(e))
    }
  }

  async function handleDelete(c, n) {
    const msg = n ? `${n} bài giảng / bài tập trong chủ đề sẽ KHÔNG bị xóa, chỉ chuyển sang "Chưa xếp chủ đề".` : undefined
    if (!(await confirmDelete('chủ đề', c.title, msg))) return
    setActionError(null)
    try {
      unwrap(await supabase.from('chapters').delete().eq('id', c.id))
      forgetUrlsWith([c.id])
      if (id === c.id) navigate(libraryUrl(keyOf(c.grade), keyOf(c.subject), keyOf(c.course_id), keyOf(c.section)))
      reload()
      notifyDeleted('chủ đề')
    } catch (e) {
      setActionError(errMsg(e))
    }
  }

  // Xóa chương = xóa mọi chủ đề trong chương; bài giảng / bài tập giữ lại, chuyển sang "Chưa xếp chủ đề"
  async function handleDeleteSection() {
    const n = sum(inGroup, 'lessons') + sum(inGroup, 'assignments')
    const msg =
      `${inGroup.length} chủ đề trong chương sẽ bị xóa.` +
      (n ? ` ${n} bài giảng / bài tập KHÔNG bị xóa, chỉ chuyển sang "Chưa xếp chủ đề".` : '')
    if (!(await confirmDelete('chương', groupTitle, msg))) return
    setActionError(null)
    try {
      unwrap(await supabase.from('chapters').delete().in('id', inGroup.map((c) => c.id)))
      forgetUrlsWith(inGroup.map((c) => c.id))
      navigate(libraryUrl(lop, mon, kh))
      reload()
      notifyDeleted('chương')
    } catch (e) {
      setActionError(errMsg(e))
    }
  }

  // Xóa nhiều chủ đề. Mặc định bài bên trong giữ lại (về "Chưa xếp chủ đề") như xóa một chủ đề;
  // tick "Xóa luôn bài bên trong" thì xóa cả bài giảng, bài tập (bài nộp, điểm cũng mất) — chủ đề còn bài xóa lỗi thì giữ.
  // Chuyển nhiều chủ đề vào một khóa ('-' = bỏ khỏi khóa). Học sinh có khóa cũ mất bài chưa làm, khóa mới tự có bài (trigger)
  async function moveToCourse(chosen) {
    const target = destCourse === '-' ? null : destCourse
    setActionError(null)
    try {
      unwrap(await supabase.from('chapters').update({ course_id: target }).in('id', chosen.map((c) => c.id)))
      const name = target ? subjectCourses.find((k) => k.id === target)?.title : 'Chương ngoài khóa'
      pickCh.stop()
      setDestCourse('')
      reload()
      notifyDone({ title: `Đã chuyển ${chosen.length} chủ đề vào "${name}"`, say: 'Xếp vào khóa xong rồi nha 🎓' })
    } catch (e) {
      const dup = /duplicate|unique/i.test(e?.message || '')
      notifyError('Không chuyển được', dup ? 'Khóa đích đã có chủ đề trùng tên với một chủ đề đang chọn. Đổi tên chủ đề đó rồi thử lại.' : errMsg(e))
    }
  }

  // Khóa đầu tiên của một môn đã có chủ đề: hỏi chuyển hết vào khóa này, khỏi sinh nhóm "Chương ngoài khóa"
  async function offerMoveIntoFirstCourse(row) {
    const sameSubject = (x) => keyOf(x.grade) === keyOf(row.grade) && (x.subject || '').toLowerCase() === (row.subject || '').toLowerCase()
    const loose = chapters.filter((c) => sameSubject(c) && !c.course_id)
    if (!loose.length || courses.some((k) => k.id !== row.id && sameSubject(k))) return
    const ok = await askConfirm({
      title: `Chuyển ${loose.length} chủ đề đang có vào khóa này?`,
      message: `Môn ${subjectLabel(row.subject)} đã có ${loose.length} chủ đề. Chọn "Chuyển hết" để mọi chủ đề vào khóa mới; chọn "Để ngoài" thì chúng nằm ở mục "Chương ngoài khóa", chuyển sau cũng được.`,
      confirmText: 'Chuyển hết',
      cancelText: 'Để ngoài',
      pose: 'teach',
    })
    if (!ok) return
    try {
      unwrap(await supabase.from('chapters').update({ course_id: row.id }).in('id', loose.map((c) => c.id)))
    } catch (e) {
      notifyError('Không chuyển được', errMsg(e))
    }
  }

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
    const what = content?.length ? `${ids.length} chủ đề kèm ${itemsLabel(content)}` : `${ids.length} chủ đề`
    const msg = content?.length
      ? `Xóa ${ids.length} chủ đề và mọi bài bên trong. ${deleteWarning(content)}`
      : inside
        ? `${inside} bài giảng / bài tập bên trong KHÔNG bị xóa, chỉ chuyển sang "Chưa xếp chủ đề".`
        : 'Các chủ đề này chưa có bài nào.'
    if (!(await confirmDeleteMany(what, msg))) return
    const r = await deleteChapters(ids, content)
    forgetUrlsWith(ids)
    pickCh.stop()
    setWithContent(false)
    reload()
    setDetailKey((k) => k + 1)
    if (!r.failed.length && !r.chapterError) {
      notifyDone({ title: `Đã xóa ${what}`, say: 'Xong rồi! Các chủ đề đã chọn đã được dọn sạch ✨', scene: 'deleted' })
      if (level === 4 && r.chapters === inGroup.length) navigate(libraryUrl(lop, mon, kh))
      return
    }
    const lines = []
    if (r.failed.length)
      lines.push(`Không xóa được ${r.failed.length} bài: ${r.failed.map((f) => `"${f.item.title}" (${errMsg(f.error)})`).join('; ')}. Chủ đề chứa các bài này được giữ lại.`)
    if (r.chapterError) lines.push(`Lỗi khi xóa chủ đề: ${errMsg(r.chapterError)}`)
    notifyError(`Đã xóa ${r.chapters}/${ids.length} chủ đề, ${r.done} bài`, lines.join(' '))
  }

  // Thêm chủ đề mới: điền sẵn lớp / môn / khóa / chương đang xem
  const preset = current
    ? { grade: current.grade, subject: current.subject, course_id: current.course_id, section: current.section }
    : {
        grade: gradeFromKey(lop ?? activeGrade),
        subject: mon !== undefined ? fromKey(mon) : 'Vật lý',
        course_id: course?.id ?? null,
        section: cd !== undefined ? fromKey(cd) : null,
      }

  const addChapter = () => openChapterForm({ ...preset })
  // Menu "⋯": thao tác ít dùng. Trang chủ đề (kể cả Chưa xếp chủ đề): cả Thêm chủ đề; trang nhóm: thêm sửa / xóa nhiều / xóa chương
  const moreBase = [
    { key: 'add', icon: 'plus', label: 'Thêm chủ đề', onSelect: addChapter },
    { key: 'import', icon: 'import', label: 'Nhập mục lục', onSelect: openImport },
  ]
  // Trang môn: thêm khóa mới (lớp + môn đang xem)
  // Trang lớp: chưa biết môn → form có ô chọn môn
  const addCourse = () => openCourseForm({ grade: gradeFromKey(lop), subject: mon !== undefined ? fromKey(mon) : undefined })
  const assignCourse = () => course && setAssigningCourse([{ kind: 'course', id: course.id, title: course.title, grade: course.grade }])
  // Các thao tác chính (Sửa khóa, Xóa khóa, Sửa chương, Xóa chương, Thêm khóa) đã đặt trực tiếp trên thanh đầu trang theo đúng cấp;
  // menu "⋯" chỉ chứa các thao tác phụ / hàng loạt để tránh trùng lặp.
  const moreGroup = [
    moreBase[1],
    level <= 2 && inGroup.length > 0 && { key: 'edit', icon: 'edit', label: `Sửa ${level === 1 ? 'lớp' : 'môn'}`, onSelect: openGroupForm },
    level >= 2 && inGroup.length > 0 && !pickCh.on && subjectCourses.length > 0 && { key: 'to-course', icon: 'folder', label: 'Chuyển vào khóa', onSelect: () => pickCh.start('course') },
    inGroup.length > 0 &&
      (pickCh.on
        ? { key: 'pick', icon: 'close', label: pickCh.mode === 'course' ? 'Thôi chuyển khóa' : 'Thôi xóa nhiều', onSelect: pickCh.stop }
        : { key: 'pick', icon: 'trash', label: 'Xóa nhiều chủ đề', onSelect: () => pickCh.start('delete') }),
    level === 3 && course && { key: 'delete-course', icon: 'trash', label: 'Xóa khóa này', danger: true, onSelect: handleDeleteCourse },
    level === 4 && inGroup.length > 0 && { key: 'delete-section', icon: 'trash', label: 'Xóa chương này', danger: true, onSelect: handleDeleteSection },
  ]

  const where = current
    ? [gradeLabel(current.grade), subjectLabel(current.subject), current.title]
    : id === UNSORTED
    ? ['Chưa xếp chủ đề']
    : [
        lop !== undefined && gradeLabel(gradeFromKey(lop)),
        mon !== undefined && subjectLabel(fromKey(mon)),
        kh !== undefined && courseLabel(course),
        cd !== undefined && sectionLabel(fromKey(cd)),
      ].filter(Boolean)

  const g = activeGrade
  const q = treeQuery.trim().toLowerCase()
  const matchesQuery = (text) => Boolean(text && text.toLowerCase().includes(q))
  return (
    <div className="library">
      <TreeSide shown={treeShown} onToggleShown={() => setTreeShown((v) => !v)} where={where.length ? where.join(' › ') : 'Chọn lớp, môn, chủ đề'}>
        <div className="tree-head">
          <Link to={libraryUrl()} className="tree-title" title="Về tổng quan Thư viện">
            <span className="title-icon">
              <Icon name="library" size={15} />
            </span>
            Mục lục thư viện
          </Link>
          {gradeKeys.length > 0 && (
            <CustomSelect
              value={activeGrade ?? ''}
              onChange={(selectedGrade) => navigate(libraryUrl(selectedGrade))}
              options={fullTree.map((gx) => ({
                value: gx.key,
                label: gradeLabel(gx.grade),
                icon: 'grade',
              }))}
              prefixLabel="Khối: "
              icon="grade"
              className="tree-grade-select"
              style={{ width: '100%' }}
              ariaLabel="Chọn nhanh theo lớp"
            />
          )}
          {gradeChapters.length > 0 && (
            <div className="tree-search">
              <Icon name="search" size={14} className="tree-search-icon" />
              <input
                type="search"
                value={treeQuery}
                onChange={(e) => setTreeQuery(e.target.value)}
                placeholder="Tìm chương, chủ đề…"
                aria-label="Tìm nhanh chương hoặc chủ đề trong mục lục"
              />
              {treeQuery && (
                <button type="button" className="tree-search-clear" onClick={() => setTreeQuery('')} aria-label="Xóa từ khóa tìm kiếm">
                  ✕
                </button>
              )}
            </div>
          )}
        </div>

        {loading && <Loading text="Đang tải…" />}
        {!loading && !error && g !== undefined && gradeChapters.length === 0 && (
          <p className="muted small tree-empty">{gradeLabel(gradeFromKey(g))} chưa có chủ đề nào. Bấm "+ Thêm chủ đề" để tạo, hoặc nhập file JSON có "grade" là lớp này.</p>
        )}
        {!loading && !error && chapters.length === 0 && g === undefined && <p className="muted small">Chưa có chủ đề nào.</p>}

        <ul className="tree" role="tree">
          {subjectsTree.map((s) => {
            // Môn chưa có khóa nào: giữ cây cũ Môn › Chương (không chen nút "Chương ngoài khóa")
            const flat = s.courses.length === 1 && !s.courses[0].course
            const filterSections = (sections) =>
              !q
                ? sections
                : sections.filter(
                    (x) => matchesQuery(sectionText(x.section)) || x.chapters.some((c) => matchesQuery(c.title))
                  )
            const sectionLeaves = (sections, k) =>
              filterSections(sections).map((x) => {
                const active = level >= 4 && path.lop === g && path.mon === s.key && path.cd === x.key && (k === undefined || path.kh === k)
                const matchedChapters = q ? x.chapters.filter((c) => matchesQuery(c.title)) : []
                return (
                  <div key={x.key} className="tree-section-group">
                    <TreeLeaf
                      to={libraryUrl(g, s.key, k, x.key)}
                      label={sectionText(x.section)}
                      count={x.chapters.length}
                      active={active}
                      badge={x.chapters.some((c) => recent.has(c.id)) ? 'Mới' : undefined}
                    />
                    {matchedChapters.length > 0 && (
                      <ul className="tree-search-hits">
                        {matchedChapters.map((c) => (
                          <TreeLeaf
                            key={c.id}
                            className="tree-topic-hit"
                            to={chapterUrl(c.id)}
                            label={c.title}
                            active={id === c.id}
                          />
                        ))}
                      </ul>
                    )}
                  </div>
                )
              })
            const visibleCourses = flat
              ? []
              : s.courses.filter((k) => !q || matchesQuery(courseLabel(k.course)) || filterSections(k.sections).length > 0)
            if (q && flat && filterSections(s.sections).length === 0 && !matchesQuery(subjectLabel(s.subject))) return null
            if (q && !flat && visibleCourses.length === 0 && !matchesQuery(subjectLabel(s.subject))) return null
            return (
              <TreeGroup
                key={s.key}
                label={subjectLabel(s.subject)}
                to={libraryUrl(g, s.key)}
                count={s.sections.reduce((m, x) => m + x.chapters.length, 0)}
                open={Boolean(q) || isOpen(nodeKey('s', g, s.key))}
                onToggle={() => toggle(nodeKey('s', g, s.key))}
                active={level === 2 && lop === g && mon === s.key}
                depth={0}
              >
                {flat
                  ? sectionLeaves(s.sections, undefined)
                  : visibleCourses.map((k) => (
                      <TreeGroup
                        key={k.key}
                        label={courseLabel(k.course)}
                        className={k.course ? undefined : 'tree-node-loose'}
                        to={libraryUrl(g, s.key, k.key)}
                        count={k.sections.reduce((m, x) => m + x.chapters.length, 0)}
                        open={Boolean(q) || isOpen(nodeKey('k', g, s.key, k.key))}
                        onToggle={() => toggle(nodeKey('k', g, s.key, k.key))}
                        active={level === 3 && lop === g && mon === s.key && kh === k.key}
                        depth={1}
                      >
                        {sectionLeaves(k.sections, k.key)}
                      </TreeGroup>
                    ))}
              </TreeGroup>
            )
          })}
          {data?.unsorted > 0 && (!q || matchesQuery('chưa xếp chủ đề')) && (
            <TreeLeaf className="tree-unsorted" to={chapterUrl(UNSORTED)} label="Chưa xếp chủ đề" count={data.unsorted} active={id === UNSORTED} />
          )}
        </ul>
      </TreeSide>

      <section className="library-main library-panel">
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
              setNotice(`Đã tạo ${n} chủ đề.`)
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
            courses={courses}
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
            courses={courses}
            onCancel={closeForms}
            onSaved={(row) => {
              closeForms()
              reload()
              // Nhóm đổi tên → chuyển tới vị trí mới của nhóm, giữ các nhánh đang mở
              const nextKh = row.course_id !== undefined ? (row.course_id ? keyOf(row.course_id) : kh ? '-' : undefined) : kh
              const next = [keyOf(row.grade), level >= 2 ? keyOf(row.subject) : undefined, nextKh, level >= 4 ? keyOf(row.section) : undefined]
              if (level <= 2) remap([lop, mon].slice(0, level), next.slice(0, level))
              navigate(libraryUrl(...(level >= 4 ? next : next.slice(0, level))), { replace: true })
            }}
          />
        )}
        {editingCourse && (
          <CourseForm
            key={editingCourse.id || 'new'}
            course={editingCourse}
            subjects={subjects}
            onCancel={closeForms}
            onSaved={async (row) => {
              const wasNew = !editingCourse.id
              closeForms()
              if (wasNew) await offerMoveIntoFirstCourse(row)
              reload()
              if (wasNew) navigate(libraryUrl(keyOf(row.grade), keyOf(row.subject), row.id))
            }}
          />
        )}
        {assigningCourse && <AssignDialog items={assigningCourse} onClose={() => setAssigningCourse(null)} onSaved={reload} />}

        {back && (
          <Link to={back.backTo} className="btn btn-small back-to">
            ← Về {back.backLabel || 'trang trước'}
          </Link>
        )}
        {id && (
          <div className="lib-bar">
            {current ? <LibraryCrumbs segments={crumbs} /> : id === UNSORTED ? <LibraryCrumbs segments={unsortedCrumbs} /> : <span />}
            <MoreMenu items={moreBase} />
          </div>
        )}
        {id && <ChapterDetail id={id} reloadKey={detailKey} onEdit={openChapterForm} onDelete={handleDelete} onChanged={reload} />}

        {!id && level === 0 && !loading && <Overview tree={fullTree} onImport={openImport} onAdd={addChapter} more={moreBase.slice(1)} />}

        {!id && level > 0 && !loading && (
          <div>
            <LibraryCrumbs segments={crumbs} />
            <div className="page-head">
              <h1>{groupTitle}</h1>
              <div className="page-head-actions">
                {level <= 2 && (
                  <button
                    type="button"
                    className="btn btn-small btn-primary"
                    onClick={addCourse}
                    title={level === 1 ? 'Tạo khóa mới trong lớp này' : 'Tạo khóa mới trong môn này'}
                  >
                    <Icon name="plus" />
                    Thêm khóa
                  </button>
                )}
                {level === 3 && course && (
                  <>
                    <button type="button" className="btn btn-small btn-primary" onClick={assignCourse} title="Chọn học sinh được học cả khóa">
                      <Icon name="users" />
                      Giao khóa
                      <span className="count-pill">{course.course_recipients?.[0]?.count || 0}</span>
                    </button>
                    <button type="button" className="btn btn-small" onClick={() => openCourseForm(course)} title="Đổi tên khóa">
                      <Icon name="edit" />
                      Sửa khóa
                    </button>
                    <Link className="btn btn-small" to={`/tutor/courses/${course.id}/preview`} title="Xem khóa như học sinh thấy">
                      <Icon name="eye" />
                      Xem như học sinh
                    </Link>
                  </>
                )}
                {level === 3 && !course && inGroup.length > 0 && !pickCh.on && subjectCourses.length > 0 && (
                  <button type="button" className="btn btn-small" onClick={() => pickCh.start('course')} title="Chọn chủ đề rồi chuyển vào một khóa">
                    <Icon name="folder" />
                    Chuyển vào khóa…
                  </button>
                )}
                {level === 4 && inGroup.length > 0 && (
                  <button type="button" className="btn btn-small" onClick={openGroupForm} title="Đổi tên hoặc chuyển chương">
                    <Icon name="edit" />
                    Sửa chương
                  </button>
                )}
                <AddChapterButton onClick={addChapter} primary={level === 0} />
                <MoreMenu items={moreGroup} />
              </div>
            </div>
            {level === 3 && !course && inGroup.length > 0 && (
              <p className="muted small">
                Đây không phải một khóa: chỉ là chỗ chứa các chủ đề chưa thuộc khóa nào, học sinh không được giao theo nhóm này. Bấm <b>Chuyển vào khóa…</b> để
                xếp chúng vào khóa; chuyển hết thì mục này tự mất.
              </p>
            )}
            {level === 3 && course && (
              <p className="muted small">
                Học sinh được giao khóa tự thấy mọi bài đang mở trong khóa (kể cả bài thêm sau), làm tự do, không hạn nộp. Bài nào chưa muốn cho xem thì
                bấm <b>Ẩn</b> ở bài đó trong chủ đề.
              </p>
            )}
            {inGroup.length === 0 ? (
              <div className="empty">
                {level === 1 ? (
                  <>
                    {groupTitle} chưa có chủ đề nào. Bấm <b>+ Thêm chủ đề</b> để tạo chủ đề đầu tiên, hoặc nhập file JSON có <code>"grade"</code> là lớp này.
                  </>
                ) : level === 3 && course ? (
                  <>
                    Khóa chưa có chủ đề nào. Bấm <b>+ Thêm chủ đề</b> để tạo chủ đề trong khóa, hoặc mở một chủ đề có sẵn → <b>Sửa chủ đề</b> → chọn khóa này.
                  </>
                ) : (
                  <>
                    Không còn chủ đề nào ở mục này (có thể vừa đổi tên hoặc chuyển đi). <Link to={libraryUrl()}>Về Thư viện</Link>
                  </>
                )}
              </div>
            ) : (
              <>
                <div className="row small" style={{ marginBottom: '0.9rem' }}>
                  {level === 4 && course && (
                    <Link to={libraryUrl(lop, mon, kh)} className="badge badge-course" title="Về khóa học chứa chương này">
                      <Icon name="folder" size={13} />
                      {course.title}
                    </Link>
                  )}
                  <span className="badge">{inGroup.length} chủ đề</span>
                  <span className="badge">{sum(inGroup, 'lessons')} bài giảng</span>
                  <span className="badge">{sum(inGroup, 'assignments')} bài tập</span>
                  {sumHidden(inGroup) > 0 && (
                    <span className="badge badge-hidden" title="Số bài đang ẩn với học sinh trong khóa">
                      <Icon name="lock" size={12} />
                      {sumHidden(inGroup)} bài đang ẩn
                    </span>
                  )}
                </div>
                {/* Lớp / môn / khóa: kệ sách hoặc lưới thẻ chương; một chương: băng chuyền; đang Xóa nhiều (cần ô chọn): danh sách */}
                {level >= 1 && level <= 3 && !pickCh.on ? (
                  <GradeShelf chapters={inGroup} count={countOf} courses={courses} singleCourse={level === 3} />
                ) : level === 4 && !pickCh.on ? (
                  <ChapterCarousel
                    key={`${lop}|${mon}|${kh}|${cd}`}
                    memoKey={`${lop}|${mon}|${kh}|${cd}`}
                    chapters={inGroup}
                    count={countOf}
                    onEdit={openChapterForm}
                    onDelete={(c) => handleDelete(c, countOf(c.lessons) + countOf(c.assignments))}
                  />
                ) : (
                  <GroupChapters
                    pick={pickCh}
                    chapters={inGroup}
                    showSection={level < 4}
                    onEdit={openChapterForm}
                    onDelete={(c) => handleDelete(c, countOf(c.lessons) + countOf(c.assignments))}
                  />
                )}
                <SelectBar
                  sel={pickCh}
                  visible={inGroup.map(chapterItem)}
                  onDelete={deleteChosenChapters}
                  extra={
                    pickCh.mode === 'course' ? (
                      <span className="assign-bar-extra">
                        <CustomSelect
                          value={destCourse}
                          onChange={setDestCourse}
                          placeholder="Chọn khóa đích…"
                          placement="top"
                          ariaLabel="Khóa đích"
                          options={[...subjectCourses.map((k) => ({ value: k.id, label: k.title })), { value: '-', label: 'Chương ngoài khóa (bỏ khỏi khóa)' }]}
                        />
                        <button
                          type="button"
                          className="btn btn-small btn-primary"
                          disabled={!pickCh.items.length || !destCourse}
                          onClick={() => moveToCourse(pickCh.items)}
                        >
                          Chuyển
                        </button>
                      </span>
                    ) : (
                      <label className="assign-bar-extra">
                        <input type="checkbox" checked={withContent} onChange={(e) => setWithContent(e.target.checked)} />
                        Xóa luôn bài giảng, bài tập bên trong
                      </label>
                    )
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

// Các chủ đề trong nhóm đang chọn (nhóm theo chương nếu đang xem cả lớp / môn)
// Chủ đề dưới dạng mục chọn nhiều; n = số bài giảng + bài tập bên trong
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
                {hiddenInChapter(c) > 0 && (
                  <span className="badge badge-hidden" title="Số bài đang ẩn với học sinh trong khóa">
                    <Icon name="lock" size={12} />
                    {hiddenInChapter(c)} đang ẩn
                  </span>
                )}
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

// Nút thêm chủ đề: ở trang Tổng quan là nút chính (primary), ở trang Khóa/Môn là nút phụ (secondary)
function AddChapterButton({ onClick, primary = false }) {
  return (
    <button type="button" className={`btn btn-small${primary ? ' btn-primary' : ''}`} onClick={onClick}>
      <Icon name="plus" />
      Thêm chủ đề
    </button>
  )
}

// Chưa chọn gì: tổng quan từng lớp
function Overview({ tree, onImport, onAdd, more }) {
  const all = tree.flatMap((g) => g.subjects.flatMap((s) => s.sections.flatMap((x) => x.chapters)))
  return (
    <div>
      <div className="page-head">
        <h1>
          <span className="title-icon"><Icon name="library" /></span>Thư viện
        </h1>
        <div className="page-head-actions">
          <AddChapterButton onClick={onAdd} primary />
          <MoreMenu items={more} />
        </div>
      </div>
      <p className="muted">
        Mỗi lớp có một cây <b>Môn › Khóa › Chương › Chủ đề</b> riêng (môn chưa có khóa thì bỏ cấp Khóa; thêm khóa ở menu <b>⋯</b> của trang môn): bấm một lớp bên dưới, rồi đổi lớp / môn / chương nhanh bằng nút <b>▾</b> trên đường dẫn
        (lớp chưa có chủ đề cũng chọn được ở đó để mở lớp mới). Học sinh chỉ thấy cây của lớp mình (theo "Lớp" trong hồ sơ học sinh). Khi nhập file JSON, chủ đề được tự xếp theo lớp, môn, chương ghi trong file.
      </p>
      {all.length === 0 ? (
        <div className="empty">
          <p>Chưa có chủ đề nào. Dán cả mục lục giáo trình để tạo nhiều chủ đề một lần, bấm "+ Thêm chủ đề" để tạo từng chủ đề, hoặc nhập một file JSON.</p>
          <button type="button" className="btn btn-small" onClick={onImport}>
            <Icon name="import" />
            Nhập mục lục
          </button>
        </div>
      ) : (
        <div className="overview-grid">
          {tree.map((g) => {
            const list = g.subjects.flatMap((s) => s.sections.flatMap((x) => x.chapters))
            return (
              <Link key={g.key} to={libraryUrl(g.key)} className="list-item overview-card">
                <div className="list-item-title">{gradeLabel(g.grade)}</div>
                <div className="muted small">{g.subjects.map((s) => subjectLabel(s.subject)).join(' · ')}</div>
                <div className="row small" style={{ marginTop: '0.5rem' }}>
                  <span className="badge">{list.length} chủ đề</span>
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
