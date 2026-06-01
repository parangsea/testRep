import { describe, expect, it } from 'vitest'
import { formatDate } from './format'

describe('formatDate', () => {
  it('ISO 문자열을 YYYY-MM-DD HH:mm 형식으로 변환한다', () => {
    expect(formatDate('2026-06-01T09:30:00.000Z')).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/)
  })

  it('잘못된 입력에도 예외 없이 문자열을 반환한다', () => {
    expect(typeof formatDate('not-a-date')).toBe('string')
  })
})
