import { apiClient } from './client'
import { resolveRole } from '../utils/role'
import type { AuthResponse, LoginPayload, RegisterPayload, Role, User } from '../types'

// 실제 백엔드(testBoot)의 사용자 응답에는 role 이 없다(하이브리드 연동 단계).
type RawUser = Omit<User, 'role'> & { role?: Role }
interface RawAuthResponse {
  token: string
  user: RawUser
}

/** 실서버 사용자 응답을 프런트 계약(User.role 포함)으로 보정한다. */
function normalizeUser(raw: RawUser): User {
  return { ...raw, role: resolveRole(raw.username, raw.role) }
}

export const authApi = {
  async login(payload: LoginPayload): Promise<AuthResponse> {
    const { data } = await apiClient.post<RawAuthResponse>('/auth/login', payload)
    return { token: data.token, user: normalizeUser(data.user) }
  },
  async register(payload: RegisterPayload): Promise<AuthResponse> {
    const { data } = await apiClient.post<RawAuthResponse>('/auth/register', payload)
    return { token: data.token, user: normalizeUser(data.user) }
  },
  async me(): Promise<User> {
    const { data } = await apiClient.get<RawUser>('/auth/me')
    return normalizeUser(data)
  },
}
