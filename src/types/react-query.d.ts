import '@tanstack/react-query'

// mutation 의 meta 타입 보강 — 전역 에러 토스트 opt-out / 커스텀 메시지를 타입 안전하게 쓴다.
// (queryClient 의 MutationCache.onError 에서 참조 — TanStack 권장대로 선언파일로 분리.)
declare module '@tanstack/react-query' {
  interface Register {
    mutationMeta: {
      /** true 면 전역 에러 토스트를 띄우지 않는다(컴포넌트가 직접 에러를 처리할 때). */
      suppressGlobalErrorToast?: boolean
      /** 전역 토스트에 쓸 커스텀 메시지(서버 메시지보다 우선). */
      errorMessage?: string
    }
  }
}
