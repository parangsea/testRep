import { expect, test, type Page } from '@playwright/test'

// 실제 백엔드 "쓰기 경로" e2e — 글 작성 / 이미지 첨부(갤러리) / 삭제.
// 공유 백엔드를 오염시키지 않도록 각 테스트는 생성한 글을 finally 에서 반드시 삭제(자기정리)한다.
//
// 참고: 본문 인라인 이미지(1c)는 백엔드가 content 의 <img src> 를 sanitize 로 제거하므로
// 현재는 동작하지 않는다(백엔드가 /api/attachments URL 을 허용해야 함). 그래서 e2e 도 갤러리만 검증한다.

// 업로드용 1x1 PNG.
const PNG_1x1 = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64',
)

async function login(page: Page) {
  await page.goto('/login')
  await page.getByLabel('아이디').fill('admin')
  await page.getByLabel('비밀번호').fill('admin1234')
  await page.getByRole('button', { name: '로그인' }).click()
  await expect(page.getByRole('banner').getByRole('button', { name: '로그아웃' })).toBeVisible()
}

/** 로그인 후 localStorage 에 저장된 실서버 토큰. 자기정리(삭제 API)에 사용. */
async function authToken(page: Page): Promise<string> {
  return (await page.evaluate(() => localStorage.getItem('auth_token'))) ?? ''
}

/** 자기정리: 생성한 글을 삭제(첨부도 서버에서 함께 정리). dev 프록시 경유로 호출. */
async function deletePost(page: Page, postId: string, token: string) {
  await page.request.delete(`http://localhost:5173/api/posts/${postId}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
}

function postIdFromUrl(page: Page): string {
  const m = page.url().match(/\/posts\/(\d+)/)
  if (!m) throw new Error(`상세 URL 에서 post id 를 찾지 못함: ${page.url()}`)
  return m[1]
}

/** 새 글 폼에 카테고리/제목/본문을 채운다(이미지는 호출 측에서 추가). */
async function fillNewPost(page: Page, title: string) {
  await page.goto('/posts/new')
  await page.selectOption('#categoryId', { label: '공지사항' })
  await page.fill('#title', title)
  await page.locator('.ql-editor').click()
  await page.keyboard.type('e2e 자동 테스트 본문입니다.')
}

test('로그인 후 글을 작성하고 삭제한다 (쓰기 CRUD)', async ({ page }) => {
  await login(page)
  const token = await authToken(page)
  const title = `[E2E] 글쓰기 ${Date.now()}`
  await fillNewPost(page, title)
  await page.getByRole('button', { name: '등록' }).click()
  await page.waitForURL(/\/posts\/\d+$/)
  const id = postIdFromUrl(page)
  try {
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(title)
  } finally {
    await deletePost(page, id, token)
  }
})

test('글 작성 시 이미지를 첨부하면 상세 갤러리에 보인다', async ({ page }) => {
  await login(page)
  const token = await authToken(page)
  const title = `[E2E] 갤러리첨부 ${Date.now()}`
  await fillNewPost(page, title)
  await page.setInputFiles('#images', { name: 'e2e.png', mimeType: 'image/png', buffer: PNG_1x1 })
  await page.getByRole('button', { name: '등록' }).click()
  await page.waitForURL(/\/posts\/\d+$/)
  const id = postIdFromUrl(page)
  try {
    // 업로드 → 첨부 목록 → 갤러리 렌더까지의 프론트 경로를 검증.
    await expect(page.locator('img[src^="/api/attachments/"]')).toHaveCount(1)
  } finally {
    await deletePost(page, id, token)
  }
})
