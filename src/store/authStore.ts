import { create } from 'zustand'
import { jwtDecode } from 'jwt-decode'
import { resolveRole } from '../utils/role'
import type { Role, User } from '../types'

const TOKEN_KEY = 'auth_token'

interface JwtPayload {
  sub: string
  username: string
  email: string
  role?: Role
  exp?: number
  iat?: number
}

/** JWT 토큰에서 사용자 정보를 복원합니다. 만료/오류 시 null. */
function userFromToken(token: string): User | null {
  try {
    const payload = jwtDecode<JwtPayload>(token)
    if (payload.exp && payload.exp * 1000 < Date.now()) return null
    return {
      id: payload.sub,
      username: payload.username,
      email: payload.email,
      role: resolveRole(payload.username, payload.role), // 토큰에 role 없으면 username 으로 추정(하이브리드)
      createdAt: '',
    }
  } catch {
    return null
  }
}

interface AuthState {
  token: string | null
  user: User | null
  /** 로그인/회원가입 성공 시 호출. 토큰을 저장하고 사용자 상태를 갱신합니다. */
  setAuth: (token: string, user?: User) => void
  /** 서버 권위 사용자(역할 포함)로 동기화. /auth/me hydrate 용 — 토큰은 유지. */
  setUser: (user: User) => void
  /**
   * /auth/me 동기화 완료 여부. 부팅 시 토큰이 있으면 false(검증 대기), 없으면 true.
   * 권한 기반 가드(MenuGuard 등)는 이 값이 true 가 될 때까지 role 판단을 보류해
   * 비동기 hydrate 완료 전 잘못된 리다이렉트가 일어나지 않게 한다.
   */
  hydrated: boolean
  /** hydrate 종료 표시(성공/실패 무관) — 무한 대기 방지. */
  setHydrated: () => void
  logout: () => void
}

// 새로고침 시 localStorage 의 토큰으로 세션을 복원합니다.
const storedToken = localStorage.getItem(TOKEN_KEY)
const restoredUser = storedToken ? userFromToken(storedToken) : null
if (storedToken && !restoredUser) localStorage.removeItem(TOKEN_KEY)

export const useAuthStore = create<AuthState>((set) => ({
  token: restoredUser ? storedToken : null,
  user: restoredUser,
  // 복원된 세션이 있으면 /auth/me 로 권위 동기화가 필요 → 아직 미완료(false).
  hydrated: !restoredUser,
  setAuth: (token, user) => {
    localStorage.setItem(TOKEN_KEY, token)
    // 로그인/회원가입 응답의 user 는 서버 권위(role 포함)이므로 hydrate 완료로 본다.
    set({ token, user: user ?? userFromToken(token), hydrated: true })
  },
  setUser: (user) => set({ user, hydrated: true }),
  setHydrated: () => set({ hydrated: true }),
  logout: () => {
    localStorage.removeItem(TOKEN_KEY)
    set({ token: null, user: null, hydrated: true })
  },
}))
