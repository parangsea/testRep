import { describe, expect, it } from 'vitest'
import { canAccess } from './menuAccess'

const admin = { role: 'admin' as const }
const member = { role: 'user' as const }

describe('canAccess', () => {
  it('public 은 누구나 접근 가능', () => {
    expect(canAccess('public', null)).toBe(true)
    expect(canAccess('public', member)).toBe(true)
    expect(canAccess('public', admin)).toBe(true)
  })

  it('auth 는 로그인한 사용자만', () => {
    expect(canAccess('auth', null)).toBe(false)
    expect(canAccess('auth', member)).toBe(true)
    expect(canAccess('auth', admin)).toBe(true)
  })

  it('admin 은 관리자만', () => {
    expect(canAccess('admin', null)).toBe(false)
    expect(canAccess('admin', member)).toBe(false)
    expect(canAccess('admin', admin)).toBe(true)
  })
})
