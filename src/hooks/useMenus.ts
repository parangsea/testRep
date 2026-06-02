import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { menusApi } from '../api/menus.api'
import type { MenuInput } from '../types'

export const menuKeys = {
  all: ['menus'] as const,
}

/**
 * 전체 메뉴 목록(+access). 노출 권한 필터링은 소비 측(Navbar 의 canAccess)이,
 * 라우트 보호는 MenuGuard 가 access 로 수행한다. 데이터는 사용자 무관이라 단일 키로 캐시한다.
 */
export function useMenusQuery() {
  return useQuery({
    queryKey: menuKeys.all,
    queryFn: () => menusApi.list(),
  })
}

export function useCreateMenu() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: MenuInput) => menusApi.create(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: menuKeys.all }),
  })
}

export function useUpdateMenu() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: MenuInput }) => menusApi.update(id, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: menuKeys.all }),
  })
}

export function useDeleteMenu() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => menusApi.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: menuKeys.all }),
  })
}

export function useReorderMenus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (orderedIds: string[]) => menusApi.reorder(orderedIds),
    onSuccess: () => qc.invalidateQueries({ queryKey: menuKeys.all }),
  })
}
