import type { Role } from '../types'

/**
 * dev 전용 — 백엔드가 role 을 내려주기 전까지 admin 으로 취급할 username 목록(.env).
 * 기본값은 비어 있어, username 만으로는 누구도 권한이 상승하지 않는다(secure default).
 */
const ADMIN_USERNAMES = (import.meta.env.VITE_ADMIN_USERNAMES ?? '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean)

/**
 * 사용자 role 을 결정한다. 서버가 내려준 명시적 role 이 항상 최우선이다.
 *
 * 실제 백엔드(testBoot)가 아직 role 을 포함하지 않는 하이브리드 단계에서만,
 * 명시적 role 이 없을 때 VITE_ADMIN_USERNAMES 에 등록된 username 을 admin 으로 본다.
 * 등록되지 않은(=대부분의) 사용자는 안전하게 'user' 로 강등된다.
 * 백엔드가 role 을 내려주기 시작하면 이 추정은 자연히 무시된다.
 */
export function resolveRole(username?: string | null, role?: Role | null): Role {
  if (role === 'admin' || role === 'user') return role
  return username && ADMIN_USERNAMES.includes(username) ? 'admin' : 'user'
}
