import { z } from 'zod'

/** 관리자 카테고리 생성 입력. slug 은 URL/필터 식별자라 형식을 제한한다. */
export const categorySchema = z.object({
  name: z.string().trim().min(1, '이름을 입력하세요.').max(30, '이름은 30자 이내여야 합니다.'),
  slug: z
    .string()
    .trim()
    .min(1, 'slug을 입력하세요.')
    .max(30, 'slug은 30자 이내여야 합니다.')
    .regex(/^[a-z0-9-]+$/, 'slug은 영소문자·숫자·하이픈만 사용할 수 있습니다.'),
})
export type CategoryFormValues = z.infer<typeof categorySchema>
