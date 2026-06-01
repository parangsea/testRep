import { z } from 'zod'

export const loginSchema = z.object({
  username: z.string().min(1, '아이디를 입력하세요.'),
  password: z.string().min(1, '비밀번호를 입력하세요.'),
})
export type LoginFormValues = z.infer<typeof loginSchema>

export const registerSchema = z
  .object({
    username: z.string().min(3, '아이디는 3자 이상이어야 합니다.'),
    email: z.string().email('올바른 이메일 형식이 아닙니다.'),
    password: z.string().min(6, '비밀번호는 6자 이상이어야 합니다.'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: '비밀번호가 일치하지 않습니다.',
    path: ['confirmPassword'],
  })
export type RegisterFormValues = z.infer<typeof registerSchema>
