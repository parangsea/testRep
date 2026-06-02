import type { MenuAccess, Role } from '../types'

/**
 * 메뉴 접근 권한 판정 (순수 함수 — 서버 핸들러·Navbar·라우트 가드가 공통 사용).
 * 단일 출처로 두어 "메뉴를 누가 볼/들어갈 수 있는가"의 정의가 한 곳에만 존재하게 한다.
 *  - public: 누구나
 *  - auth: 로그인한 사용자
 *  - admin: 관리자
 */
export function canAccess(access: MenuAccess, user: { role: Role } | null | undefined): boolean {
  if (access === 'public') return true
  if (!user) return false
  if (access === 'admin') return user.role === 'admin'
  return true // 'auth'
}
