// Bộ nhớ điều hướng: tab nào nhớ URL nào, khóa URL, giới hạn số vị trí cuộn, quên chương đã xóa
import { beforeEach, describe, expect, it } from 'vitest'
import { forgetUrlsWith, listUrl, readScroll, rememberList, resetNav, saveScroll, tabOf, urlKey } from '../src/lib/navMemory.js'

beforeEach(() => resetNav())

describe('urlKey', () => {
  it('bỏ tham số Kính thiên văn, giữ bộ lọc', () => {
    expect(urlKey('/tutor/lessons', '?lop=11&ch=abc&vu-tru=sirius')).toBe('/tutor/lessons?lop=11&ch=abc')
    expect(urlKey('/tutor/lessons', '?vu-tru=x')).toBe('/tutor/lessons')
    expect(urlKey('/tutor/lessons', '')).toBe('/tutor/lessons')
  })
})

describe('tabOf', () => {
  it('chỉ trang danh sách mới thuộc tab; trang chi tiết / soạn bài thì không', () => {
    expect(tabOf('/tutor/lessons')).toBe('/tutor/lessons')
    expect(tabOf('/tutor/lessons/123')).toBe(null)
    expect(tabOf('/tutor/lessons/123/edit')).toBe(null)
    expect(tabOf('/tutor/assignments/new')).toBe(null)
    expect(tabOf('/tutor/library/abc')).toBe('/tutor/library')
    expect(tabOf('/tutor')).toBe('/tutor')
    expect(tabOf('/tutor/students/1')).toBe(null)
    expect(tabOf('/student')).toBe('/student')
    expect(tabOf('/student/assignments/9')).toBe(null)
  })
})

describe('listUrl', () => {
  it('mỗi tab nhớ riêng chương của nó', () => {
    rememberList('/tutor/lessons', '?lop=11&ch=c3')
    rememberList('/tutor/assignments', '?lop=10&ch=c2')
    rememberList('/tutor/lessons/xyz', '') // trang chi tiết: không ghi đè
    expect(listUrl('/tutor/lessons')).toBe('/tutor/lessons?lop=11&ch=c3')
    expect(listUrl('/tutor/assignments')).toBe('/tutor/assignments?lop=10&ch=c2')
    expect(listUrl('/tutor/reports')).toBe('/tutor/reports')
  })

  it('xóa chương thì tab trỏ vào chương đó về URL gốc', () => {
    rememberList('/tutor/lessons', '?lop=11&ch=c3')
    rememberList('/tutor/library/c3', '')
    rememberList('/tutor/assignments', '?ch=c9')
    saveScroll('/tutor/lessons?lop=11&ch=c3', { y: 500 })
    forgetUrlsWith(['c3'])
    expect(listUrl('/tutor/lessons')).toBe('/tutor/lessons')
    expect(listUrl('/tutor/library')).toBe('/tutor/library')
    expect(listUrl('/tutor/assignments')).toBe('/tutor/assignments?ch=c9')
    expect(readScroll('/tutor/lessons?lop=11&ch=c3')).toBe(null)
  })
})

describe('saveScroll', () => {
  it('ghi gộp, giữ mục vừa mở', () => {
    saveScroll('/a', { y: 10, href: '/x', opened: '/x' })
    saveScroll('/a', { y: 20, href: '/y' })
    expect(readScroll('/a')).toEqual({ y: 20, href: '/y', opened: '/x' })
  })

  it('chỉ nhớ 60 URL mới nhất', () => {
    for (let i = 0; i < 70; i++) saveScroll(`/p${i}`, { y: i })
    expect(readScroll('/p0')).toBe(null)
    expect(readScroll('/p9')).toBe(null)
    expect(readScroll('/p10')).toEqual({ y: 10 })
    expect(readScroll('/p69')).toEqual({ y: 69 })
  })
})
