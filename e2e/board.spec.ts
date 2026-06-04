import { expect, test } from '@playwright/test'

// 실제 백엔드(testBoot) 대상 e2e — 읽기 위주 시나리오로 공유 백엔드를 오염시키지 않는다.
// 앱은 Vite 프록시를 통해 실서버로 요청하므로(.env VITE_PROXY_TARGET), 실 데이터를 검증한다.

test('게시판 목록에 게시글이 표시된다', async ({ page }) => {
  await page.goto('/posts')
  await expect(page.getByRole('heading', { name: '게시판' })).toBeVisible()
  // 최소 한 개의 게시글 제목 링크가 보인다 (실서버 시드 데이터).
  await expect(page.locator('tbody tr td a').first()).toBeVisible()
})

test('게시글을 클릭하면 상세 페이지로 이동한다', async ({ page }) => {
  await page.goto('/posts')
  const firstLink = page.locator('tbody tr td a').first()
  const title = (await firstLink.textContent())?.trim() ?? ''
  await firstLink.click()
  // 실서버 게시글 id 는 숫자다 (더미는 'p-1' 형식이었음).
  await expect(page).toHaveURL(/\/posts\/\d+$/)
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(title)
})

test('카테고리 탭으로 게시판 종류를 필터링한다', async ({ page }) => {
  await page.goto('/posts')
  await page.getByRole('button', { name: '공지사항' }).click()
  // URL 에 카테고리 필터가 반영된다.
  await expect(page).toHaveURL(/category=/)
  // 실서버 refetch 가 끝나 필터 결과가 렌더될 때까지 대기 (첫 배지가 공지사항이 될 때까지 auto-retry).
  const tags = page.locator('tbody tr td:nth-child(2)')
  await expect(tags.first()).toHaveText('공지사항')
  // 그 시점의 모든 행 배지가 공지사항이어야 한다.
  const count = await tags.count()
  for (let i = 0; i < count; i++) {
    await expect(tags.nth(i)).toHaveText('공지사항')
  }
})
