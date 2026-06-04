import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { postsApi } from '../api/posts.api'
import type { PostInput, PostQuery } from '../types'

export const postKeys = {
  all: ['posts'] as const,
  list: (query: PostQuery) => ['posts', 'list', query] as const,
  detail: (id: string) => ['posts', 'detail', id] as const,
}

export function usePostsQuery(query: PostQuery) {
  return useQuery({
    queryKey: postKeys.list(query),
    queryFn: () => postsApi.list(query),
  })
}

export function usePostQuery(id: string | undefined) {
  return useQuery({
    queryKey: postKeys.detail(id ?? ''),
    queryFn: () => postsApi.get(id as string),
    enabled: Boolean(id),
  })
}

// 글 작성/수정은 mutation + 첨부 직접 업로드가 섞인 다단계 흐름이라(PostFormPage.onSubmit)
// 화면에서 통합 처리한다 → 전역 에러 토스트는 opt-out(이중 토스트 방지).
export function useCreatePost() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: PostInput) => postsApi.create(input),
    meta: { suppressGlobalErrorToast: true },
    onSuccess: () => qc.invalidateQueries({ queryKey: postKeys.all }),
  })
}

export function useUpdatePost(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: PostInput) => postsApi.update(id, input),
    meta: { suppressGlobalErrorToast: true },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: postKeys.all })
      qc.invalidateQueries({ queryKey: postKeys.detail(id) })
    },
  })
}

export function useDeletePost() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => postsApi.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: postKeys.all }),
  })
}
