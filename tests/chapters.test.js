// Nhãn chuyên đề: bỏ tiền tố dữ liệu "L12_"; trong cây giữ nguyên chữ, ở tiêu đề / gáy sách mới viết hoa
import { describe, expect, it } from 'vitest'
import { buildTree, libraryCrumbs, libraryUrl, NO_SECTION, sectionLabel, sectionText, studentLibraryUrl } from '../src/lib/chapters.js'

describe('sectionText', () => {
  it('bỏ tiền tố "L12_" nhưng giữ nguyên chữ hoa / thường', () => {
    expect(sectionText('L12_Dãy số, cấp số')).toBe('Dãy số, cấp số')
    expect(sectionText('l11_Dao động')).toBe('Dao động')
  })
  it('tên không có tiền tố thì giữ nguyên', () => {
    expect(sectionText('Dao động cơ')).toBe('Dao động cơ')
  })
  it('chỉ bỏ tiền tố ở đầu, không đụng giữa chuỗi', () => {
    expect(sectionText('Bài L12_x')).toBe('Bài L12_x')
  })
  it('trống thì ra nhãn mặc định', () => {
    expect(sectionText(null)).toBe(NO_SECTION)
    expect(sectionText('')).toBe(NO_SECTION)
  })
})

describe('sectionLabel', () => {
  it('viết hoa và bỏ tiền tố', () => {
    expect(sectionLabel('L12_Dãy số')).toBe('DÃY SỐ')
  })
  it('trống thì ra nhãn mặc định, không viết hoa', () => {
    expect(sectionLabel(null)).toBe(NO_SECTION)
  })
})

// Đường dẫn Thư viện có menu chọn nhanh (Lớp ▾ › Môn ▾ › Chuyên đề ▾)
describe('libraryCrumbs', () => {
  const tree = buildTree([
    { id: 'a', title: 'C1', grade: 11, subject: 'Toán', section: 'L11_Dãy số', sort_order: 0 },
    { id: 'b', title: 'C2', grade: 11, subject: 'Vật lý', section: 'Dao động', sort_order: 0 },
    { id: 'c', title: 'C3', grade: 11, subject: 'Vật lý', section: 'Sóng', sort_order: 1 },
    { id: 'd', title: 'C4', grade: 12, subject: 'Vật lý', section: 'Điện', sort_order: 0 },
    { id: 'e', title: 'C5', grade: null, subject: null, section: null, sort_order: 0 },
  ])
  const keys = (seg) => seg.options.map((o) => o.key)

  it('chưa chọn lớp thì không có đoạn nào', () => {
    expect(libraryCrumbs(tree, {})).toEqual([])
  })

  it('lớp: lớp đã có chương + lớp 6–12 chưa có (để mở lớp mới), "Chưa rõ lớp" xếp cuối', () => {
    const [seg, ...rest] = libraryCrumbs(tree, { lop: '11' })
    expect(rest).toEqual([])
    expect(seg.name).toBe('lop')
    expect(seg.label).toBe('Lớp 11')
    expect(keys(seg)).toEqual(['6', '7', '8', '9', '10', '11', '12', '-'])
    expect(seg.options.filter((o) => o.empty).map((o) => o.key)).toEqual(['6', '7', '8', '9', '10'])
    expect(seg.options.filter((o) => o.current).map((o) => o.key)).toEqual(['11'])
    expect(seg.options.find((o) => o.key === '7').to).toBe(libraryUrl('7'))
    expect(seg.options.find((o) => o.key === '-').label).toBe('Chưa rõ lớp')
  })

  it('lớp trên URL ngoài 6–12 vẫn có trong danh sách', () => {
    const [seg] = libraryCrumbs(tree, { lop: '5' })
    expect(keys(seg)[0]).toBe('5')
    expect(seg.options[0]).toMatchObject({ current: true, empty: true })
  })

  it('môn: chỉ các môn của lớp đang xem, link giữ nguyên lớp', () => {
    const segs = libraryCrumbs(tree, { lop: '11', mon: 'Vật lý' })
    expect(segs.map((s) => s.name)).toEqual(['lop', 'mon'])
    const mon = segs[1]
    expect(mon.label).toBe('Vật lý')
    expect(mon.options.map((o) => o.label)).toEqual(['Toán', 'Vật lý'])
    expect(mon.options[0].to).toBe(libraryUrl('11', 'Toán'))
    expect(mon.options.filter((o) => o.current).map((o) => o.key)).toEqual(['Vật lý'])
  })

  it('chuyên đề: các chuyên đề cùng lớp + môn, nhãn bỏ tiền tố "L11_"', () => {
    const cd = libraryCrumbs(tree, { lop: '11', mon: 'Vật lý', cd: 'Sóng' })[2]
    expect(cd.name).toBe('cd')
    expect(cd.options.map((o) => o.label)).toEqual(['Dao động', 'Sóng'])
    expect(cd.options[0].to).toBe(libraryUrl('11', 'Vật lý', 'Dao động'))
    expect(cd.options[1].current).toBe(true)
    expect(libraryCrumbs(tree, { lop: '11', mon: 'Toán', cd: 'L11_Dãy số' })[2].label).toBe('Dãy số')
  })

  it('môn / chuyên đề không còn trên cây (vừa đổi tên) thì vẫn hiện nhãn, không đánh dấu mục nào', () => {
    const [, mon] = libraryCrumbs(tree, { lop: '11', mon: 'Hóa' })
    expect(mon.label).toBe('Hóa')
    expect(mon.options.some((o) => o.current)).toBe(false)
    const [, , cd] = libraryCrumbs(tree, { lop: '6', mon: '-', cd: '-' })
    expect(cd.label).toBe(NO_SECTION)
    expect(cd.options).toEqual([])
  })

  it('Thư viện học sinh: link không có lớp, trỏ về /student/library', () => {
    const [, mon, cd] = libraryCrumbs(tree, { lop: '11', mon: 'Vật lý', cd: 'Sóng' }, studentLibraryUrl)
    expect(mon.options[0].to).toBe('/student/library?mon=To%C3%A1n')
    expect(cd.options[0].to).toBe(studentLibraryUrl('11', 'Vật lý', 'Dao động'))
    expect(studentLibraryUrl('11', 'Vật lý', 'Dao động')).toBe('/student/library?mon=V%E1%BA%ADt+l%C3%BD&cd=Dao+%C4%91%E1%BB%99ng')
    expect(studentLibraryUrl()).toBe('/student/library')
  })
})
