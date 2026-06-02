import { describe, expect, it } from 'vitest'
import { categorySchema } from './category.schema'

describe('categorySchema', () => {
  it('정상 입력을 통과시킨다', () => {
    expect(categorySchema.safeParse({ name: '공지사항', slug: 'notice' }).success).toBe(true)
    expect(categorySchema.safeParse({ name: 'Q&A', slug: 'qna-2' }).success).toBe(true)
  })

  it('대문자/공백/특수문자가 든 slug 을 거부한다', () => {
    expect(categorySchema.safeParse({ name: '공지', slug: 'Notice' }).success).toBe(false)
    expect(categorySchema.safeParse({ name: '공지', slug: 'free board' }).success).toBe(false)
    expect(categorySchema.safeParse({ name: '공지', slug: 'qna!' }).success).toBe(false)
  })

  it('빈 이름/slug 을 거부한다', () => {
    expect(categorySchema.safeParse({ name: '', slug: 'notice' }).success).toBe(false)
    expect(categorySchema.safeParse({ name: '공지', slug: '' }).success).toBe(false)
  })
})
