import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { toast } from 'react-toastify'
import { loginSchema, type LoginFormValues } from '../schemas/auth.schema'
import { useLogin } from '../hooks/useAuth'
import { getErrorMessage } from '../utils/error'
import { IS_MOCK } from '../config'
import styles from './AuthPage.module.css'

interface LocationState {
  from?: { pathname?: string }
}

export default function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as LocationState | null)?.from?.pathname ?? '/posts'
  const loginMutation = useLogin()

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: '', password: '' },
  })

  const onSubmit = async (values: LoginFormValues) => {
    try {
      await loginMutation.mutateAsync(values)
      toast.success('로그인되었습니다.')
      navigate(from, { replace: true })
    } catch (e) {
      toast.error(getErrorMessage(e))
    }
  }

  return (
    <section className={`card ${styles.authCard}`}>
      <Helmet>
        <title>로그인 | testRep 게시판</title>
      </Helmet>
      <h1 className={styles.title}>로그인</h1>

      {IS_MOCK && (
        <p className={styles.hint}>
          더미 계정 — 아이디 <b>admin</b> / 비밀번호 <b>admin1234</b>
        </p>
      )}

      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <div className="field">
          <label htmlFor="username">아이디</label>
          <input id="username" type="text" autoComplete="username" {...register('username')} />
          {errors.username && <span className="error-text">{errors.username.message}</span>}
        </div>
        <div className="field">
          <label htmlFor="password">비밀번호</label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            {...register('password')}
          />
          {errors.password && <span className="error-text">{errors.password.message}</span>}
        </div>
        <button type="submit" className="btn" style={{ width: '100%' }} disabled={isSubmitting}>
          로그인
        </button>
      </form>

      <p className={styles.foot}>
        계정이 없으신가요? <Link to="/register">회원가입</Link>
      </p>
    </section>
  )
}
