import { useEffect } from 'react'
import { authApi } from '../api/auth.api'
import { useAuthStore } from '../store/authStore'

/**
 * 부팅 시 토큰이 있으면 `/auth/me` 로 서버 권위 사용자(역할 포함)를 동기화한다.
 * 토큰 디코딩 결과는 신뢰의 출발점일 뿐이며, 권한(role) 등은 서버가 최종 권위다.
 * → 구 토큰(role 클레임 없음)으로 인한 관리자 권한 오판/메뉴 누락을 방지한다.
 * 401 이면 apiClient 응답 인터셉터가 세션을 정리(logout)한다.
 */
/** axios 에러에서 HTTP 상태코드를 안전하게 추출. */
function statusOf(err: unknown): number | undefined {
  return (err as { response?: { status?: number } } | undefined)?.response?.status
}

export function useHydrateSession() {
  const token = useAuthStore((s) => s.token)
  const setUser = useAuthStore((s) => s.setUser)
  const setHydrated = useAuthStore((s) => s.setHydrated)
  const logout = useAuthStore((s) => s.logout)

  useEffect(() => {
    if (!token) return
    let cancelled = false
    authApi
      .me()
      .then((user) => {
        if (!cancelled) setUser(user) // setUser 가 hydrated=true 로 표시
      })
      .catch((err) => {
        if (cancelled) return
        // 401(만료·삭제된 토큰)이면 인터셉터 유무에 의존하지 않고 직접 세션을 정리한다.
        // 그 외(네트워크 오류 등)는 토큰 디코딩 결과를 유지하되 무한 대기를 막는다.
        if (statusOf(err) === 401) logout()
        else setHydrated()
      })
    return () => {
      cancelled = true
    }
  }, [token, setUser, setHydrated, logout])
}
