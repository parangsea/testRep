import { describe, expect, it } from 'vitest'
import { buildCommentTree } from './commentTree'
import type { Comment } from '../types'

function makeComment(id: string, parentId: string | null): Comment {
  return {
    id,
    postId: 'p-1',
    parentId,
    authorId: 'u-1',
    authorName: 'tester',
    content: `c-${id}`,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  }
}

describe('buildCommentTree', () => {
  it('최상위 댓글과 대댓글을 분리한다', () => {
    const { topLevel, repliesByParent } = buildCommentTree([
      makeComment('1', null),
      makeComment('2', '1'),
      makeComment('3', null),
    ])
    expect(topLevel.map((c) => c.id)).toEqual(['1', '3'])
    expect(repliesByParent.get('1')?.map((c) => c.id)).toEqual(['2'])
    expect(repliesByParent.has('3')).toBe(false)
  })

  it('한 부모의 여러 대댓글을 입력 순서대로 묶는다', () => {
    const { repliesByParent } = buildCommentTree([
      makeComment('1', null),
      makeComment('2', '1'),
      makeComment('3', '1'),
    ])
    expect(repliesByParent.get('1')?.map((c) => c.id)).toEqual(['2', '3'])
  })

  it('빈 목록은 빈 트리를 반환한다', () => {
    const { topLevel, repliesByParent } = buildCommentTree([])
    expect(topLevel).toEqual([])
    expect(repliesByParent.size).toBe(0)
  })

  it('부모가 없는 고아 대댓글은 최상위로 승격되어 사라지지 않는다', () => {
    const { topLevel, repliesByParent } = buildCommentTree([
      makeComment('1', null),
      makeComment('orphan', 'missing-parent'), // 부모가 목록에 없음
    ])
    expect(topLevel.map((c) => c.id)).toEqual(['1', 'orphan'])
    expect(repliesByParent.has('missing-parent')).toBe(false)
  })
})
