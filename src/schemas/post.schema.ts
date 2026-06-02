import { z } from 'zod'

/** HTML 태그를 제거한 순수 텍스트 길이를 검사합니다 (react-quill 빈 값 '<p><br></p>' 대응). */
const hasText = (html: string) => html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim().length > 0

export const postSchema = z.object({
  title: z.string().min(1, '제목을 입력하세요.').max(200, '제목은 200자 이내여야 합니다.'),
  content: z.string().refine(hasText, '내용을 입력하세요.'),
  categoryId: z.string().min(1, '카테고리를 선택하세요.'),
})
export type PostFormValues = z.infer<typeof postSchema>
