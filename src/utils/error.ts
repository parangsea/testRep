import axios from 'axios'

/** axios 에러/일반 에러에서 사용자에게 보여줄 메시지를 추출합니다. */
export function getErrorMessage(err: unknown, fallback = '오류가 발생했습니다.'): string {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data as { message?: string } | undefined
    return data?.message ?? err.message ?? fallback
  }
  if (err instanceof Error) return err.message
  return fallback
}

/** HTTP 상태코드 추출(axios 에러가 아니거나 응답이 없으면 undefined). */
export function getHttpStatus(err: unknown): number | undefined {
  return axios.isAxiosError(err) ? err.response?.status : undefined
}

// 서버가 메시지를 주지 않을 때(네트워크/게이트웨이 등) 쓰는 상태코드별 기본 문구.
const STATUS_FALLBACK: Record<number, string> = {
  401: '로그인이 필요합니다.',
  403: '권한이 없습니다.',
  404: '대상을 찾을 수 없습니다.',
  500: '서버 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.',
}

/**
 * mutation 실패 시 보여줄 메시지. 우선순위: override(meta) → 서버 메시지 → 상태코드 기본 문구 → 일반 fallback.
 * 전역 에러 토스트(queryClient MutationCache)에서 사용.
 */
export function getMutationErrorMessage(err: unknown, override?: string): string {
  if (override) return override
  if (axios.isAxiosError(err)) {
    const serverMsg = (err.response?.data as { message?: string } | undefined)?.message
    if (serverMsg) return serverMsg
    const status = getHttpStatus(err)
    if (status && STATUS_FALLBACK[status]) return STATUS_FALLBACK[status]
  }
  return getErrorMessage(err)
}
