import { Link, NavLink, useNavigate } from 'react-router-dom'
import { LogIn, LogOut, PenSquare, UserPlus } from 'lucide-react'
import clsx from 'clsx'
import { toast } from 'react-toastify'
import { useAuthStore } from '../store/authStore'
import { IS_MOCK } from '../config'
import styles from './Navbar.module.css'

export default function Navbar() {
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const navigate = useNavigate()

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
          <NavLink
            to="/posts"
            className={({ isActive }) => clsx(styles.link, isActive && styles.active)}
          >
            게시판
          </NavLink>

          {user ? (
            <>
              <Link to="/posts/new" className="btn">
                <PenSquare size={16} /> 글쓰기
              </Link>
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
