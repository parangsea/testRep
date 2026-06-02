import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { useMenusQuery } from '../hooks/useMenus'
import { canAccess } from '../utils/menuAccess'
import type { MenuAccess } from '../types'

/**
 * 메뉴 테이블의 access 로 라우트 접근을 동적으로 통제하는 가드.
 * 현재 경로와 일치하는 메뉴가 있으면 그 메뉴의 access 를, 없으면 `fallback` 을 적용한다.
 * → 관리자가 메뉴 관리에서 access 를 바꾸면 코드 변경 없이 라우트 보호 수준도 바뀐다.
 *
 * 동적 경로(예: /posts/:id/edit)는 메뉴에 없으므로 fallback 으로 보호한다.
 * role 미확정(구 토큰 + /auth/me hydrate 진행 중)일 때는 잘못 쫓겨나지 않도록 판단을 보류한다.
 *
 * 주의: 이 가드는 UI/네비게이션 레벨의 편의 보호다. 실제 데이터/행위 인가는 서버 핸들러의
 * role 검사가 단일 권위로 담당한다(클라이언트 가드는 보안 경계가 아니다).
 */
export default function MenuGuard({ fallback = 'public' }: { fallback?: MenuAccess }) {
  const { pathname } = useLocation()
  const user = useAuthStore((s) => s.user)
  const hydrated = useAuthStore((s) => s.hydrated)
  const { data: menus, isLoading } = useMenusQuery()

  // 메뉴 데이터 로딩 중에는 fallback 으로 성급히 판정하지 않고, 실제 access 가 도착할 때까지 대기한다.
  if (isLoading) return <p className="route-fallback">불러오는 중...</p>

  // fallback 은 라우트의 "최소 보호 수준"(하한, 항상 보장). 메뉴 조회가 성공하면 메뉴 access 로 권한을
  // 상향만 적용한다(하향 불가). 메뉴 조회 실패 시에는 메뉴 정보를 알 수 없어 fallback 만 적용된다.
  // 즉 메뉴로 "강화한" 권한은 조회 실패 시 fallback 까지 완화될 수 있다 — 실제 데이터/행위 인가는
  // 서버 핸들러 role 검사가 단일 권위로 보장하므로(클라 가드는 UX 레벨) 이 완화는 보안 경계가 아니다.
  const RANK: Record<MenuAccess, number> = { public: 0, auth: 1, admin: 2 }
  const menu = menus?.find((m) => m.path === pathname)
  const declared = menu?.access ?? fallback
  const access: MenuAccess = RANK[declared] >= RANK[fallback] ? declared : fallback

  if (canAccess(access, user)) return <Outlet />
  // 접근 불가: 미로그인 → 로그인, 로그인했지만 권한 부족 → (hydrate 대기 후) 게시판으로.
  // LoginPage 는 location.state.from.pathname 을 읽어 로그인 후 원래 경로로 복귀하므로 객체로 넘긴다.
  if (!user) return <Navigate to="/login" replace state={{ from: { pathname } }} />
  if (!hydrated) return <p className="route-fallback">권한 확인 중...</p>
  return <Navigate to="/posts" replace />
}
