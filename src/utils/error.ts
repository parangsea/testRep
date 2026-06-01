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
