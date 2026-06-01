// 더미용 JWT 발급/디코드 유틸. (실제 서명 검증은 하지 않습니다 — 오직 mock 용도)

interface MockJwtPayload {
  sub: string
  username: string
  email: string
  iat: number
  exp: number
}

/** UTF-8 안전 base64url 인코딩 (한글 사용자명/이메일 대응). */
function base64UrlEncode(input: string): string {
  const utf8 = encodeURIComponent(input).replace(/%([0-9A-F]{2})/g, (_, p1) =>
    String.fromCharCode(parseInt(p1, 16)),
  )
  return btoa(utf8).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function base64UrlDecode(input: string): string {
  const b64 = input.replace(/-/g, '+').replace(/_/g, '/')
  const decoded = atob(b64)
  const percent = decoded
    .split('')
    .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
    .join('')
  return decodeURIComponent(percent)
}

/** 더미 사용자 정보를 담은 (서명되지 않은) JWT 문자열을 생성합니다. */
export function signMockJwt(user: { id: string; username: string; email: string }): string {
  const header = { alg: 'HS256', typ: 'JWT' }
  const now = Math.floor(Date.now() / 1000)
  const payload: MockJwtPayload = {
    sub: user.id,
    username: user.username,
    email: user.email,
    iat: now,
    exp: now + 60 * 60 * 24 * 7, // 7일
  }
  return [
    base64UrlEncode(JSON.stringify(header)),
    base64UrlEncode(JSON.stringify(payload)),
    'mock-signature',
  ].join('.')
}

/** JWT 에서 sub(사용자 id)를 추출합니다. */
export function subFromToken(token: string): string | null {
  try {
    const payload = JSON.parse(base64UrlDecode(token.split('.')[1])) as MockJwtPayload
    return payload.sub ?? null
  } catch {
    return null
  }
}
