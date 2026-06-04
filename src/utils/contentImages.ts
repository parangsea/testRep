/**
 * content HTML 안에 인라인으로 삽입된 `<img>` 들의 src 집합을 반환한다.
 * 부분 문자열 검사가 아니라 실제 img 요소의 src 만 본다(오탐 방지).
 */
export function inlineImageSrcs(html: string): Set<string> {
  if (typeof DOMParser === 'undefined') return new Set()
  const doc = new DOMParser().parseFromString(html, 'text/html')
  return new Set(
    Array.from(doc.querySelectorAll('img'))
      .map((img) => img.getAttribute('src'))
      .filter((src): src is string => Boolean(src)),
  )
}

/**
 * html 안의 문자열을 map(기존 → 새 값)에 따라 치환한다.
 * 작성 모드 인라인 이미지에서 임시 blob URL 을 업로드 후 실제 url 로 바꾸는 데 쓴다.
 */
export function rewriteImageSrcs(html: string, map: Map<string, string>): string {
  let out = html
  for (const [from, to] of map) out = out.split(from).join(to)
  return out
}

/**
 * content HTML 에서 src 가 `blob:` 인 img 를 제거한다.
 * 작성 모드 인라인 이미지 업로드가 실패했을 때, 다른 세션에서 표시 불가능한 임시 blob URL 이
 * 게시글 본문에 그대로 저장되는 것을 막는다.
 */
export function stripBlobImages(html: string): string {
  if (typeof DOMParser === 'undefined') return html
  const doc = new DOMParser().parseFromString(html, 'text/html')
  doc.querySelectorAll('img[src^="blob:"]').forEach((img) => img.remove())
  return doc.body.innerHTML
}
