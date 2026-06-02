import { z } from 'zod'

/** 댓글/대댓글 입력. 댓글은 평문(plain text)이라 HTML 검사는 불필요하다. */
export const commentSchema = z.object({
  content: z
    .string()
    .trim()
    .min(1, '댓글을 입력하세요.')
    .max(1000, '댓글은 1000자 이내여야 합니다.'),
})
export type CommentFormValues = z.infer<typeof commentSchema>
