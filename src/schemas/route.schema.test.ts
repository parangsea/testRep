import { describe, expect, it } from 'vitest'
import { parsePageParam, parsePostId } from './route.schema'

describe('parsePostId', () => {
  it('양의 정수 문자열은 그대로 통과', () => {
    expect(parsePostId('9')).toBe('9')
    expect(parsePostId('123')).toBe('123')
  })
  it('0·음수·소수·문자·지수·공백·leading zero·빈값·undefined 는 null', () => {
    for (const v of ['0', '-1', '1.2', 'abc', '1e3', ' 1 ', '01', '']) {
      expect(parsePostId(v)).toBeNull()
    }
    expect(parsePostId(undefined)).toBeNull()
  })
})

describe('parsePageParam', () => {
  it('양의 정수면 숫자로', () => {
    expect(parsePageParam('3')).toBe(3)
  })
  it('형식이 잘못되면 fallback', () => {
    expect(parsePageParam('abc')).toBe(1)
    expect(parsePageParam(null)).toBe(1)
    expect(parsePageParam('0')).toBe(1)
    expect(parsePageParam('-5', 2)).toBe(2)
    expect(parsePageParam('1.5', 7)).toBe(7)
  })
})
