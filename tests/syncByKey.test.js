import { describe, expect, it } from 'vitest'
import { planSync } from '../src/lib/syncByKey.js'

const mcq = (key, correct = 'B', labels = ['A', 'B']) => ({ source_key: key, kind: 'mcq', options: labels.map((label) => ({ label, text: 'x' })), correct })
const old = (id, key, correct = 'B', labels = ['A', 'B']) => ({ id, source_key: key, kind: 'mcq', options: labels.map((label) => ({ label })), correct })

describe('planSync', () => {
  it('cùng mã, chỉ đổi chữ → gắn id cũ, không xung đột', () => {
    const r = planSync({ exercises: [{ ...mcq('q1'), question_md: 'mới' }] }, [old('e1', 'q1')])
    expect(r.exercises[0].id).toBe('e1')
    expect(r.conflicts).toEqual([])
  })
  it('đổi đáp án đúng → báo xung đột nhưng vẫn giữ id', () => {
    const r = planSync({ exercises: [mcq('q1', 'A')] }, [old('e1', 'q1', 'B')])
    expect(r.exercises[0].id).toBe('e1')
    expect(r.conflicts).toEqual(['Câu 1: đổi đáp án đúng'])
  })
  it('đổi số phương án → báo xung đột', () => {
    expect(planSync({ exercises: [mcq('q1', 'B', ['A', 'B', 'C'])] }, [old('e1', 'q1')]).conflicts).toHaveLength(1)
  })
  it('câu mới không có id; câu cũ không còn → báo sẽ xóa', () => {
    const r = planSync({ exercises: [mcq('q2')] }, [old('e1', 'q1')])
    expect(r.exercises[0].id).toBeUndefined()
    expect(r.conflicts[0]).toMatch(/sẽ xóa/)
  })
  it('bài cũ chưa có mã: ghép theo thứ tự khi số câu bằng nhau', () => {
    const r = planSync({ exercises: [mcq('q1')] }, [old('e1', null)])
    expect(r.exercises[0].id).toBe('e1')
  })
  it('bài cũ chưa có mã và khác số câu: không ghép, báo xóa', () => {
    const r = planSync({ exercises: [mcq('q1')] }, [old('e1', null), old('e2', null)])
    expect(r.exercises[0].id).toBeUndefined()
    expect(r.conflicts).toHaveLength(2)
  })
})
