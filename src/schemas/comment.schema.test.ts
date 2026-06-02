import { describe, expect, it } from 'vitest'
import { commentSchema } from './comment.schema'

describe('commentSchema', () => {
  it('정상 댓글을 통과시킨다', () => {
    const r = commentSchema.safeParse({ content: '좋은 글이네요' })
    expect(r.success).toBe(true)
  })

  it('공백만 있는 댓글을 거부한다', () => {
    const r = commentSchema.safeParse({ content: '   ' })
    expect(r.success).toBe(false)
  })

  it('1000자를 초과하면 거부한다', () => {
    const r = commentSchema.safeParse({ content: 'a'.repeat(1001) })
    expect(r.success).toBe(false)
  })

  it('앞뒤 공백을 제거(trim)한다', () => {
    const r = commentSchema.parse({ content: '  hi  ' })
    expect(r.content).toBe('hi')
  })
})
