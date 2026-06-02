import { Link, NavLink, useNavigate } from 'react-router-dom'
import { LogIn, LogOut, UserPlus } from 'lucide-react'
import clsx from 'clsx'
import { toast } from 'react-toastify'
import { useAuthStore } from '../store/authStore'
import { useMenusQuery } from '../hooks/useMenus'
import { canAccess } from '../utils/menuAccess'
import { menuIcons } from './menuIcons'
import { IS_MOCK } from '../config'
import type { MenuItem } from '../types'
import styles from './Navbar.module.css'

// /menus 조회 실패·빈 응답 시에도 최소한의 진입 경로(게시판)는 유지하기 위한 기본 메뉴.
const FALLBACK_MENUS: MenuItem[] = [
  { id: 'fallback-board', label: '게시판', path: '/posts', icon: 'List', order: 1, access: 'public' },
]

export default function Navbar() {
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const navigate = useNavigate()
  // 메뉴 테이블 → 동적 네비. 노출 권한은 클라이언트에서 canAccess 로 필터링한다.
  const { data: menus } = useMenusQuery()
  // 메뉴 조회 실패/빈 배열이면 기본 메뉴로 폴백 — 네비게이션이 완전히 비는 회귀를 막는다.
  const source = menus && menus.length > 0 ? menus : FALLBACK_MENUS
  const visibleMenus = source.filter((m) => canAccess(m.access, user))

  const onLogout = () => {
    logout()
    toast.info('로그아웃되었습니다.')
    navigate('/posts')
  }

  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <Link to="/posts" className={styles.brand}>
          testRep 게시판
        </Link>
        {IS_MOCK && <span className={styles.badge}>DUMMY</span>}

        <nav className={styles.nav}>
          {visibleMenus?.map((m) => {
            const Icon = m.icon ? menuIcons[m.icon] : undefined
            return (
              <NavLink
                key={m.id}
                to={m.path}
                className={({ isActive }) => clsx(styles.link, isActive && styles.active)}
              >
                {Icon && <Icon size={16} />} {m.label}
              </NavLink>
            )
          })}

          {user ? (
            <>
              <span className={styles.user}>{user.username} 님</span>
              <button type="button" className="btn btn-secondary" onClick={onLogout}>
                <LogOut size={16} /> 로그아웃
              </button>
            </>
          ) : (
            <>
              <NavLink
                to="/login"
                className={({ isActive }) => clsx(styles.link, isActive && styles.active)}
              >
                <LogIn size={16} /> 로그인
              </NavLink>
              <NavLink
                to="/register"
                className={({ isActive }) => clsx(styles.link, isActive && styles.active)}
              >
                <UserPlus size={16} /> 회원가입
              </NavLink>
            </>
          )}
        </nav>
      </div>
    </header>
  )
}
