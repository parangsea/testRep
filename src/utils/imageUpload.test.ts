import { describe, expect, it } from 'vitest'
import { IMAGE_UPLOAD_LIMITS, describeRejections, validateImageFiles } from './imageUpload'

const file = (name: string, type: string, bytes = 1): File =>
  new File([new Uint8Array(bytes)], name, { type })

describe('validateImageFiles', () => {
  it('허용 타입·크기·개수 내면 accepted', () => {
    const r = validateImageFiles([file('a.png', 'image/png', 1000)])
    expect(r.accepted).toHaveLength(1)
    expect(r.rejected).toHaveLength(0)
  })

  it('비이미지(SVG)·큰 파일을 사유와 함께 거부', () => {
    const limits = { ...IMAGE_UPLOAD_LIMITS, maxBytes: 10 }
    const r = validateImageFiles(
      [file('c.svg', 'image/svg+xml', 5), file('b.png', 'image/png', 50)],
      0,
      limits,
    )
    expect(r.accepted).toHaveLength(0)
    expect(r.rejected.map((x) => x.reason)).toEqual(['invalid_type', 'too_large'])
  })

  it('currentCount 로 총합 개수 한도를 적용', () => {
    const r = validateImageFiles([file('a.png', 'image/png', 10)], IMAGE_UPLOAD_LIMITS.maxCount)
    expect(r.rejected[0].reason).toBe('too_many')
  })
})

describe('describeRejections', () => {
  it('사유별 안내 문구를 만든다', () => {
    const msg = describeRejections([{ file: file('a', 'image/svg+xml'), reason: 'invalid_type' }])
    expect(msg).toContain('이미지')
  })
})
