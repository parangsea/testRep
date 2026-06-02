import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { commentsApi } from '../api/comments.api'
import type { CommentInput } from '../types'

export const commentKeys = {
  all: ['comments'] as const,
  list: (postId: string) => ['comments', 'list', postId] as const,
}

export function useCommentsQuery(postId: string | undefined) {
  return useQuery({
    queryKey: commentKeys.list(postId ?? ''),
    queryFn: () => commentsApi.list(postId as string),
    enabled: Boolean(postId),
  })
}

export function useCreateComment(postId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: CommentInput) => commentsApi.create(postId, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: commentKeys.list(postId) }),
  })
}

export function useUpdateComment(postId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, content }: { id: string; content: string }) =>
      commentsApi.update(id, content),
    onSuccess: () => qc.invalidateQueries({ queryKey: commentKeys.list(postId) }),
  })
}

export function useDeleteComment(postId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => commentsApi.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: commentKeys.list(postId) }),
  })
}
