import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link, useNavigate } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { toast } from 'react-toastify'
import { registerSchema, type RegisterFormValues } from '../schemas/auth.schema'
import { useRegister } from '../hooks/useAuth'
import styles from './AuthPage.module.css'

export default function RegisterPage() {
  const navigate = useNavigate()
  const registerMutation = useRegister()

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { username: '', email: '', password: '', confirmPassword: '' },
  })

  const onSubmit = async (values: RegisterFormValues) => {
    try {
      await registerMutation.mutateAsync({
        username: values.username,
        email: values.email,
        password: values.password,
      })
      toast.success('회원가입이 완료되었습니다.')
      navigate('/posts', { replace: true })
    } catch {
      // 에러 토스트는 전역(queryClient MutationCache.onError)에서 처리한다.
    }
  }

  return (
    <section className={`card ${styles.authCard}`}>
      <Helmet>
        <title>회원가입 | testRep 게시판</title>
      </Helmet>
      <h1 className={styles.title}>회원가입</h1>

      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <div className="field">
          <label htmlFor="username">아이디</label>
          <input id="username" type="text" autoComplete="username" {...register('username')} />
          {errors.username && <span className="error-text">{errors.username.message}</span>}
        </div>
        <div className="field">
          <label htmlFor="email">이메일</label>
          <input id="email" type="email" autoComplete="email" {...register('email')} />
          {errors.email && <span className="error-text">{errors.email.message}</span>}
        </div>
        <div className="field">
          <label htmlFor="password">비밀번호</label>
          <input
            id="password"
            type="password"
            autoComplete="new-password"
            {...register('password')}
          />
          {errors.password && <span className="error-text">{errors.password.message}</span>}
        </div>
        <div className="field">
          <label htmlFor="confirmPassword">비밀번호 확인</label>
          <input
            id="confirmPassword"
            type="password"
            autoComplete="new-password"
            {...register('confirmPassword')}
          />
          {errors.confirmPassword && (
            <span className="error-text">{errors.confirmPassword.message}</span>
          )}
        </div>
        <button type="submit" className={`btn ${styles.submitBtn}`} disabled={isSubmitting}>
          회원가입
        </button>
      </form>

      <p className={styles.foot}>
        이미 계정이 있으신가요? <Link to="/login">로그인</Link>
      </p>
    </section>
  )
}
