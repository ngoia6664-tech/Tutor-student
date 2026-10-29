// Kiểm tra handler và cây giao diện ImportJson thật; giả lập React hooks và RPC,
// không kết nối hay ghi vào Supabase. Chạy: node AI/CODEX/qa-import-json.mjs
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import { execFileSync } from 'node:child_process'
import { transformWithOxc } from 'vite'
import { parseImport, SAMPLE_LESSON, SAMPLE_ASSIGNMENT } from '../../src/lib/importJson.js'
import { SAMPLE_TUTOR_LESSON } from '../../src/lib/importTutorLesson.js'

const file = 'src/pages/tutor/ImportJson.jsx'
const revision = process.argv[2]
const source = revision ? execFileSync('git', ['show', `${revision}:${file}`], { encoding: 'utf8' }) : await fs.readFile(file, 'utf8')
const { code } = await transformWithOxc(source.replace(/^import .*\r?\n/gm, '').replace('export default function', 'function'), file, { jsx: { runtime: 'classic' } })
const names = [...source.matchAll(/^import (\w+) from/gm)].map((m) => m[1])
const chapter = { id: 'chapter-1', title: 'Chương QA', section: 'Chuyên đề QA', grade: 12, subject: 'Vật lý' }

function harness(existingTitles = [], failOnce = false) {
  let state = [], index = 0, tree
  const calls = []
  const env = Object.fromEntries(names.map((n) => [n, n]))
  Object.assign(env, {
    Link: 'Link', LessonBody: 'LessonBody', LessonHead: 'LessonHead', ExamTimer: 'ExamTimer',
    React: { createElement: (type, props, ...children) => ({ type, props: props || {}, children }), Fragment: 'Fragment' },
    memo: (f) => f,
    useState: (initial) => { const i = index++; if (!(i in state)) state[i] = initial; return [state[i], (v) => { state[i] = typeof v === 'function' ? v(state[i]) : v }] },
    useRef: (v) => { const i = index++; return state[i] ||= { current: v } },
    useNavigate: () => () => {},
    useAsync: () => ({ data: { chapters: [chapter], lessons: existingTitles.map((title) => ({ title })), assignments: [] } }),
    localStorage: { getItem: () => null, setItem: () => {} },
    parseImport, SAMPLE_LESSON, SAMPLE_ASSIGNMENT, SAMPLE_TUTOR_LESSON,
    findChapter: () => null,
    chapterGroupLabel: () => 'Khác', formatDate: (v) => v,
    EXAM_MINUTES: 50, TYPE_LABEL: {}, KIND_LABEL: {},
    toExercisePayload: (e) => e, errMsg: (e) => e.message, askConfirm: async () => true,
    unwrap: (r) => { if (r.error) throw r.error; return r.data },
    supabase: { rpc: async (name, args) => {
      calls.push({ name, args })
      if (name === 'save_assignment' && failOnce) { failOnce = false; return { error: new Error('Lỗi QA') } }
      return { data: `${name}-${calls.length}` }
    } },
  })
  const Component = new Function(...Object.keys(env), `${code}\nreturn ImportJson`)(...Object.values(env))
  function render() { index = 0; tree = Component(); return tree }
  function nodes(n = tree) { return Array.isArray(n) ? n.flatMap((x) => nodes(x ?? null)) : n && typeof n === 'object' ? [n, ...nodes(n.children ?? null)] : [] }
  function text(n = tree) { return Array.isArray(n) ? n.map((x) => text(x ?? null)).join('') : n && typeof n === 'object' ? text(n.children ?? null) : n == null || typeof n === 'boolean' ? '' : String(n) }
  function button(label) { return nodes().find((n) => n.type === 'button' && text(n).includes(label)) }
  function preview(raw) {
    render(); nodes().find((n) => n.type === 'textarea').props.onChange({ target: { value: raw } })
    render(); button('Kiểm tra & xem trước').props.onClick(); render()
  }
  function configure() {
    nodes().find((n) => n.type === 'StudentPicker').props.onChange(['student-1'])
    nodes().find((n) => n.type === 'ChapterSelect').props.onChange(chapter.id)
    render()
  }
  async function previewFiles(raws) {
    render()
    nodes().find((n) => n.type === 'input' && n.props.type === 'file').props.onChange({ target: {
      value: '', files: raws.map((raw, i) => ({ name: `bai-${i}.json`, text: async () => raw })),
    } })
    await new Promise(setImmediate)
    render()
  }
  return { render, nodes, text, button, preview, previewFiles, configure, calls }
}

for (const [label, raw] of [['bài giảng', SAMPLE_LESSON], ['bài tập', SAMPLE_ASSIGNMENT], ['đầy đủ', SAMPLE_TUTOR_LESSON]]) {
  const h = harness()
  h.preview(raw)
  assert.equal(h.calls.length, 0, `${label}: xem trước không ghi SQL`)
  assert.ok(h.nodes().some((n) => n.type === 'StudentPicker'))
  h.configure()
  await h.button('phần đã chọn').props.onClick(); h.render()
  assert.ok(h.text().includes('Đã lưu xong'))
  for (const c of h.calls.filter((c) => c.name.startsWith('save_'))) {
    assert.deepEqual(c.args.p.student_ids, ['student-1'])
    assert.equal(c.args.p.chapter_id, chapter.id)
  }
  console.log(`PASS ${label}: xem trước → chọn học sinh/chương → lưu`)
}

const duplicate = harness(['Dao động điều hòa'])
duplicate.preview(SAMPLE_LESSON)
assert.equal(duplicate.calls.length, 0)
assert.ok(!duplicate.text().includes('Đã lưu xong'), 'Trùng tên không được báo đã lưu')
assert.ok(duplicate.nodes().some((n) => n.type === 'StudentPicker'), 'Trùng tên vẫn chọn được học sinh')
duplicate.configure()
duplicate.nodes().find((n) => n.type === 'input' && n.props.type === 'checkbox' && n.props.checked === false).props.onChange({ target: { checked: true } })
duplicate.render()
await duplicate.button('phần đã chọn').props.onClick(); duplicate.render()
assert.equal(duplicate.calls.filter((c) => c.name === 'save_lesson').length, 1)
assert.ok(duplicate.text().includes('Đã lưu xong'))
console.log('PASS trùng tên: chưa lưu, vẫn chọn học sinh/chương và chủ động tick để lưu')

const empty = harness()
empty.preview(SAMPLE_LESSON)
empty.nodes().find((n) => n.type === 'input' && n.props.type === 'checkbox' && n.props.checked === true && n.props.disabled === false).props.onChange({ target: { checked: false } })
empty.render()
assert.ok(!empty.text().includes('Đã lưu xong'), 'Bỏ chọn hết không được báo đã lưu')
console.log('PASS bỏ chọn hết: không báo lưu thành công')

const batch = harness(['Dao động điều hòa', 'Bài tập dao động điều hòa'])
await batch.previewFiles([SAMPLE_LESSON, SAMPLE_ASSIGNMENT])
assert.equal(batch.calls.length, 0)
assert.ok(!batch.text().includes('Đã lưu xong'))
assert.equal(batch.nodes().filter((n) => n.type === 'ChapterSelect').length, 3, 'Cả hai file trùng tên vẫn hiện chọn chương riêng và chung')
assert.ok(batch.nodes().some((n) => n.type === 'StudentPicker'))
assert.equal(batch.button('phần đã chọn').props.disabled, true)
console.log('PASS nhiều file trùng tên: giữ chọn học sinh và cài đặt chương từng file')

const retry = harness([], true)
retry.preview(SAMPLE_TUTOR_LESSON); retry.configure()
await retry.button('phần đã chọn').props.onClick(); retry.render()
assert.ok(!retry.text().includes('Đã lưu xong'))
assert.ok(retry.nodes().some((n) => n.type === 'ErrorBox' && n.props.message?.includes('Lỗi QA')))
await retry.button('phần đã chọn').props.onClick(); retry.render()
assert.ok(retry.text().includes('Đã lưu xong'))
assert.equal(retry.calls.filter((c) => c.name === 'save_lesson').length, 1, 'Thử lại không lưu trùng bài giảng')
console.log('PASS lỗi một phần: thử lại chỉ lưu phần thiếu')
