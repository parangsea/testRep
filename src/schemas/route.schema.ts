import { z } from 'zod'

// URL 원시값 — 양의 정수 문자열만 허용한다(0·음수·소수·지수표기·공백·leading zero 거부).
// "한 번 틀리면 이상한 요청이 나가는" 라우팅/검색 경계라 엄격히 본다.
const positiveIntString = z.string().regex(/^[1-9]\d*$/)

/**
 * 라우트의 post id 검증(탐지). 유효한 양의 정수 문자열이면 그대로, 아니면 null.
 * 반응(404 렌더 / redirect 등)은 호출부가 결정한다.
 */
export function parsePostId(value: string | undefined): string | null {
  return positiveIntString.safeParse(value).success ? (value as string) : null
}

/** 검색 page 파라미터 → 1 이상 정수. 형식이 잘못되거나 안전한 정수 범위를 벗어나면 fallback(기본 1). */
export function parsePageParam(value: string | null | undefined, fallback = 1): number {
  const parsed = positiveIntString.safeParse(value ?? '')
  if (!parsed.success) return fallback
  const n = Number(parsed.data)
  // 초장수 문자열은 Number 변환 시 정밀도가 깨질 수 있어(unsafe integer) fallback 으로 막는다.
  return Number.isSafeInteger(n) ? n : fallback
}
