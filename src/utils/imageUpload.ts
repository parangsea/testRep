// 클라이언트 이미지 업로드 1차 방어. 서버가 매직바이트 등으로 최종 검증하지만,
// UX 차원에서 타입·크기·개수를 미리 거른다(서버 한도보다 보수적으로).

export const IMAGE_UPLOAD_LIMITS = {
  /** UX 한도 — 서버(50MB)보다 낮게 둔다. */
  maxBytes: 10 * 1024 * 1024,
  /** 글당 첨부 총합 개수. */
  maxCount: 10,
  allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/bmp'] as const,
}

export type ImageRejectReason = 'invalid_type' | 'too_large' | 'too_many'

export interface ImageValidation {
  accepted: File[]
  rejected: { file: File; reason: ImageRejectReason }[]
}

type Limits = typeof IMAGE_UPLOAD_LIMITS

/**
 * 파일들을 한도에 따라 검증해 accepted/rejected 로 나눈다(부분 허용).
 * @param currentCount 이미 첨부된 개수(총합 한도 적용용).
 */
export function validateImageFiles(
  files: readonly File[],
  currentCount = 0,
  limits: Limits = IMAGE_UPLOAD_LIMITS,
): ImageValidation {
  const accepted: File[] = []
  const rejected: ImageValidation['rejected'] = []
  let count = currentCount
  for (const file of files) {
    if (!(limits.allowedTypes as readonly string[]).includes(file.type)) {
      rejected.push({ file, reason: 'invalid_type' })
    } else if (file.size > limits.maxBytes) {
      rejected.push({ file, reason: 'too_large' })
    } else if (count >= limits.maxCount) {
      rejected.push({ file, reason: 'too_many' })
    } else {
      accepted.push(file)
      count++
    }
  }
  return { accepted, rejected }
}

/** 거부 사유들을 사용자 안내 문구 하나로 합친다. */
export function describeRejections(
  rejected: ImageValidation['rejected'],
  limits: Limits = IMAGE_UPLOAD_LIMITS,
): string {
  const reasons = new Set(rejected.map((r) => r.reason))
  const msgs: string[] = []
  if (reasons.has('invalid_type')) msgs.push('이미지 파일(JPG/PNG/GIF/BMP)만 첨부할 수 있습니다.')
  if (reasons.has('too_large'))
    msgs.push(`파일 크기는 ${Math.round(limits.maxBytes / 1024 / 1024)}MB 이하여야 합니다.`)
  if (reasons.has('too_many')) msgs.push(`이미지는 최대 ${limits.maxCount}개까지 첨부할 수 있습니다.`)
  return msgs.join(' ')
}
