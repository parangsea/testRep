import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { categoriesApi } from '../api/categories.api'
import { postKeys } from './usePosts'
import type { CategoryInput } from '../types'

export const categoryKeys = {
  all: ['categories'] as const,
}

export function useCategoriesQuery() {
  return useQuery({
    queryKey: categoryKeys.all,
    queryFn: () => categoriesApi.list(),
    staleTime: 5 * 60 * 1000, // 카테고리는 자주 바뀌지 않으므로 캐시를 오래 유지
  })
}

/** 카테고리 변경은 게시글 목록(카테고리 필터/표시)에도 영향을 주므로 posts 캐시도 함께 무효화한다. */
function invalidateCategoryAndPosts(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: categoryKeys.all })
  qc.invalidateQueries({ queryKey: postKeys.all })
}

export function useCreateCategory() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: CategoryInput) => categoriesApi.create(input),
    onSuccess: () => invalidateCategoryAndPosts(qc),
  })
}

export function useDeleteCategory() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => categoriesApi.remove(id),
    onSuccess: () => invalidateCategoryAndPosts(qc),
  })
}
