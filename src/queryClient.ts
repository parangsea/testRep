import { MutationCache, QueryClient } from '@tanstack/react-query'
import { toast } from 'react-toastify'
import { getMutationErrorMessage } from './utils/error'

// mutation meta 타입 보강은 src/types/react-query.d.ts 참조.
export const queryClient = new QueryClient({
  // 모든 mutation 실패의 단일 진입점 — 컴포넌트마다 try/catch 토스트를 중복하지 않는다.
  // query(읽기)는 각 화면이 인라인으로 표시하므로 여기서 다루지 않는다.
  mutationCache: new MutationCache({
    onError: (error, _variables, _context, mutation) => {
      // 빈 catch 로 삼켜지는 원인 추적용 — 개발 환경에서만 남긴다(토스트는 사용자 알림 전용).
      if (import.meta.env.DEV) console.error('[mutation error]', mutation.options.mutationKey, error)
      if (mutation.meta?.suppressGlobalErrorToast) return
      toast.error(getMutationErrorMessage(error, mutation.meta?.errorMessage))
    },
  }),
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 30_000,
    },
  },
})
