import { expect, test } from '@playwright/test'

// 더미(MSW) 모드 기준 시나리오. dev 서버는 playwright.config 의 webServer 가 자동 기동합니다.
test('게시판 진입 후 로그인하면 글쓰기 버튼이 보인다', async ({ page }) => {
  await page.goto('/posts')
  await expect(page.getByRole('heading', { name: '게시판' })).toBeVisible()

  await page.getByRole('link', { name: '로그인' }).click()
  await page.getByLabel('아이디').fill('admin')
  await page.getByLabel('비밀번호').fill('admin1234')
  await page.getByRole('button', { name: '로그인' }).click()

  // 로그인 후 글쓰기 링크는 Navbar(banner)와 게시판 본문 양쪽에 노출되므로
  // strict mode 충돌을 피하기 위해 Navbar 범위로 한정해 검증한다.
  await expect(
    page.getByRole('banner').getByRole('link', { name: '글쓰기' })
  ).toBeVisible()
})

test('게시글 상세로 이동할 수 있다', async ({ page }) => {
  await page.goto('/posts')
  await page.getByRole('link', { name: '샘플 게시글 23' }).click()
  await expect(page.getByRole('heading', { name: '샘플 게시글 23' })).toBeVisible()
})
