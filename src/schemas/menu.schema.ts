import { z } from 'zod'

/** 관리자 메뉴 생성/수정 입력. path 는 라우트 경로라 형식을 제한한다. */
export const menuSchema = z.object({
  label: z.string().trim().min(1, '메뉴 이름을 입력하세요.').max(30, '이름은 30자 이내여야 합니다.'),
  path: z
    .string()
    .trim()
    .min(1, '경로를 입력하세요.')
    .max(100, '경로는 100자 이내여야 합니다.')
    .regex(/^\/[a-zA-Z0-9/_-]*$/, '경로는 /로 시작하고 영문·숫자·/_-만 사용할 수 있습니다.'),
  icon: z.string().trim().max(40).optional().or(z.literal('')),
  access: z.enum(['public', 'auth', 'admin']),
  // 순서는 폼에서 직접 입력하지 않고 재정렬(위/아래) 시에만 전달된다. 1..N 불변식 → 최소 1.
  order: z.coerce.number().int().min(1).optional(),
})
export type MenuFormValues = z.infer<typeof menuSchema>
