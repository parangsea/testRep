import { create } from 'zustand'
import { jwtDecode } from 'jwt-decode'
import type { User } from '../types'

const TOKEN_KEY = 'auth_token'

interface JwtPayload {
  sub: string
  username: string
  email: string
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
  logout: () => void
}

// 새로고침 시 localStorage 의 토큰으로 세션을 복원합니다.
const storedToken = localStorage.getItem(TOKEN_KEY)
const restoredUser = storedToken ? userFromToken(storedToken) : null
if (storedToken && !restoredUser) localStorage.removeItem(TOKEN_KEY)

export const useAuthStore = create<AuthState>((set) => ({
  token: restoredUser ? storedToken : null,
  user: restoredUser,
  setAuth: (token, user) => {
    localStorage.setItem(TOKEN_KEY, token)
    set({ token, user: user ?? userFromToken(token) })
  },
  logout: () => {
    localStorage.removeItem(TOKEN_KEY)
    set({ token: null, user: null })
  },
}))
