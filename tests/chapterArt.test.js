// Bìa chương: nhận môn Vật lý / Toán / Hóa từ tên, còn lại là môn khác
import { describe, expect, it } from 'vitest'
import { splitTitle, subjectKind } from '../src/lib/chapterArt.js'

describe('splitTitle', () => {
  it('tách "Chương n:" ra số + tên', () => {
    expect(splitTitle('Chương 3: Định luật Charles', 0)).toEqual({ num: '3', name: 'Định luật Charles' })
    expect(splitTitle('chương 12 - Sóng', 0)).toEqual({ num: '12', name: 'Sóng' })
  })
  it('tách cả tên chuyên đề, kể cả tiền tố "L11_" và chữ viết hoa', () => {
    expect(splitTitle('L11_Chuyên đề 1: Dao động', 0)).toEqual({ num: '1', name: 'Dao động' })
    expect(splitTitle('CHUYÊN ĐỀ 2: DÃY SỐ', 0)).toEqual({ num: '2', name: 'DÃY SỐ' })
  })
  it('tên không có số chương (hoặc chỉ có "Chương n") → số theo thứ tự, giữ nguyên tên', () => {
    expect(splitTitle('Dao động cơ', 4)).toEqual({ num: '5', name: 'Dao động cơ' })
    expect(splitTitle('Chương 2', 1)).toEqual({ num: '2', name: 'Chương 2' })
  })
})

describe('subjectKind', () => {
  it('nhận Vật lý / Toán kể cả khác dấu, hoa thường', () => {
    expect(subjectKind('Vật lý')).toBe('physics')
    expect(subjectKind('VẬT LÝ')).toBe('physics')
    expect(subjectKind('Vat ly')).toBe('physics')
    expect(subjectKind('Toán')).toBe('math')
    expect(subjectKind('Toán học')).toBe('math')
  })
  it('nhận Hóa: "Hóa", "Hoá" (dấu đặt khác chỗ), "Hóa học", hoa thường, không dấu', () => {
    expect(subjectKind('Hóa')).toBe('chem')
    expect(subjectKind('Hoá')).toBe('chem')
    expect(subjectKind('Hóa học')).toBe('chem')
    expect(subjectKind('HOÁ HỌC')).toBe('chem')
    expect(subjectKind('hoa hoc')).toBe('chem')
    expect(subjectKind('Hoá')).toBe('chem')
  })
  it('môn khác, trống hoặc thiếu → other', () => {
    expect(subjectKind('Sinh học')).toBe('other')
    expect(subjectKind('')).toBe('other')
    expect(subjectKind(null)).toBe('other')
    expect(subjectKind(undefined)).toBe('other')
  })
})
