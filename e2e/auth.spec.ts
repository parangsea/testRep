import { expect, test, type Page } from '@playwright/test'

// 실제 백엔드(testBoot) 시드 계정으로 로그인 검증. 인증 상태만 확인하고 데이터는 만들지 않는다.
// Playwright 는 테스트마다 새 컨텍스트(빈 storage)를 주므로 세션이 서로 섞이지 않는다.
async function login(page: Page, username: string, password: string) {
  await page.goto('/login')
  await page.getByLabel('아이디').fill(username)
  await page.getByLabel('비밀번호').fill(password)
  // Navbar 의 '로그인' 은 링크라 폼 제출 버튼만 매칭된다.
  await page.getByRole('button', { name: '로그인' }).click()
}

test('관리자 계정으로 로그인하면 네비에 사용자/로그아웃이 노출된다', async ({ page }) => {
  await login(page, 'admin', 'admin1234')
  const nav = page.getByRole('banner')
  await expect(nav.getByRole('button', { name: '로그아웃' })).toBeVisible()
  await expect(nav).toContainText('admin')
})

test('잘못된 비밀번호로는 로그인되지 않는다', async ({ page }) => {
  await login(page, 'admin', 'wrong-password')
  // 로그인 실패 → 여전히 로그인 페이지, 네비에는 '로그인' 링크가 남아있다.
  await expect(page).toHaveURL(/\/login/)
  await expect(page.getByRole('banner').getByRole('link', { name: '로그인' })).toBeVisible()
})
