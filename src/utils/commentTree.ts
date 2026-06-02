import type { Comment } from '../types'

export interface CommentTree {
  /** 최상위 댓글 (parentId === null). */
  topLevel: Comment[]
  /** 부모 댓글 id → 그 대댓글 목록. */
  repliesByParent: Map<string, Comment[]>
}

/**
 * 평면 댓글 목록을 2단계 스레드 구조로 변환한다 (순수 함수 — 단위 테스트 대상).
 * 입력 순서를 보존하므로 호출 측이 작성순으로 정렬해 넘기면 그 순서가 유지된다.
 */
export function buildCommentTree(comments: Comment[]): CommentTree {
  const ids = new Set(comments.map((c) => c.id))
  const repliesByParent = new Map<string, Comment[]>()
  const topLevel: Comment[] = []
  for (const c of comments) {
    // 부모가 있고 그 부모가 목록에 실제로 존재할 때만 대댓글로 묶는다.
    // 부모가 없거나(최상위) 부모가 누락/삭제된 "고아" 댓글은 최상위로 승격해 화면에서 사라지지 않게 한다.
    if (c.parentId && ids.has(c.parentId)) {
      const arr = repliesByParent.get(c.parentId) ?? []
      arr.push(c)
      repliesByParent.set(c.parentId, arr)
    } else {
      topLevel.push(c)
    }
  }
  return { topLevel, repliesByParent }
}
