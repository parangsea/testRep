import { describe, expect, it } from 'vitest'
import { inlineImageSrcs, rewriteImageSrcs, stripBlobImages } from './contentImages'

describe('inlineImageSrcs', () => {
  it('본문의 img src 만 추출한다', () => {
    const html = '<p>hi</p><img src="/api/attachments/5"><img src="/api/attachments/6">'
    expect(inlineImageSrcs(html)).toEqual(new Set(['/api/attachments/5', '/api/attachments/6']))
  })

  it('img 가 아닌 곳에 같은 문자열이 있어도 매칭하지 않는다', () => {
    // 링크 텍스트/속성에 url 이 들어가도 인라인 이미지로 보지 않는다(부분문자열 오탐 방지).
    const html = '<a href="/api/attachments/5">/api/attachments/5</a>'
    expect(inlineImageSrcs(html).has('/api/attachments/5')).toBe(false)
  })

  it('이미지가 없으면 빈 집합', () => {
    expect(inlineImageSrcs('<p>본문만 있음</p>').size).toBe(0)
  })
})

describe('rewriteImageSrcs', () => {
  it('blob URL 을 실제 url 로 치환한다', () => {
    const html = '<p>a</p><img src="blob:xyz"><img src="blob:abc">'
    const map = new Map([
      ['blob:xyz', '/api/attachments/1'],
      ['blob:abc', '/api/attachments/2'],
    ])
    expect(rewriteImageSrcs(html, map)).toBe(
      '<p>a</p><img src="/api/attachments/1"><img src="/api/attachments/2">',
    )
  })

  it('map 이 비면 원본을 그대로 반환', () => {
    const html = '<p>변경 없음</p>'
    expect(rewriteImageSrcs(html, new Map())).toBe(html)
  })
})

describe('stripBlobImages', () => {
  it('blob: img 만 제거하고 나머지는 유지한다', () => {
    const out = stripBlobImages('<p>a</p><img src="blob:x"><img src="/api/attachments/1">')
    expect(out).not.toContain('blob:')
    expect(out).toContain('/api/attachments/1')
    expect(out).toContain('<p>a</p>')
  })

  it('blob 이미지가 없으면 내용을 유지한다', () => {
    expect(stripBlobImages('<p>hi</p>')).toContain('hi')
  })
})
