import { expect, test, type Page } from '@playwright/test'

// 더미(MSW) 모드 기준. Playwright 는 테스트마다 새 컨텍스트(빈 localStorage)를 주므로
// db.ts 가 매 테스트 새로 시드된다 → 결정적. dev 서버는 webServer 가 자동 기동.

async function login(page: Page, username: string, password: string) {
  await page.goto('/login')
  await page.getByLabel('아이디').fill(username)
  await page.getByLabel('비밀번호').fill(password)
  await page.getByRole('button', { name: '로그인' }).click()
  // 로그인 완료 = Navbar 에 로그아웃 버튼 노출
  await expect(page.getByRole('banner').getByRole('button', { name: '로그아웃' })).toBeVisible()
}

test('카테고리(게시판 종류) 탭으로 필터링한다', async ({ page }) => {
  await page.goto('/posts')
  await page.getByRole('button', { name: '공지사항' }).click()
  // URL 에 category 필터가 반영되고, 목록의 게시판 배지는 모두 공지사항이어야 한다.
  await expect(page).toHaveURL(/category=/)
  const tags = page.locator('tbody tr td:nth-child(2)')
  await expect(tags.first()).toHaveText('공지사항')
  const count = await tags.count()
  for (let i = 0; i < count; i++) {
    await expect(tags.nth(i)).toHaveText('공지사항')
  }
})

test('로그인 후 댓글을 작성하면 목록에 보인다', async ({ page }) => {
  await login(page, 'admin', 'admin1234')
  await page.goto('/posts/p-1')

  const unique = 'E2E 테스트 댓글 확인용'
  await page.getByPlaceholder('댓글을 입력하세요').first().fill(unique)
  await page.getByRole('button', { name: '댓글 등록' }).click()

  await expect(page.getByText(unique)).toBeVisible()
})

test('작성자 이름 클릭 시 유저 정보 모달이 뜬다', async ({ page }) => {
  await page.goto('/posts/p-1')
  // 게시글 메타의 작성자(admin) 버튼 클릭
  await page.getByRole('article').getByRole('button', { name: 'admin' }).first().click()
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  await expect(dialog.getByText('관리자')).toBeVisible()
})

test('관리자는 동적 메뉴(카테고리 관리)로 접근할 수 있다', async ({ page }) => {
  await login(page, 'admin', 'admin1234')
  // 메뉴 테이블 기반 동적 네비 — 관리자에게만 보이는 '카테고리 관리' 메뉴
  await page.getByRole('banner').getByRole('link', { name: '카테고리 관리' }).click()
  await expect(page).toHaveURL(/\/admin\/categories$/)
  await expect(page.getByRole('heading', { name: '카테고리 관리' })).toBeVisible()
})

test('일반 유저 네비에는 관리자 메뉴가 보이지 않는다', async ({ page }) => {
  await login(page, 'user', 'user1234')
  const banner = page.getByRole('banner')
  // exact: 브랜드 링크 "testRep 게시판" 과의 substring 충돌을 피한다.
  await expect(banner.getByRole('link', { name: '게시판', exact: true })).toBeVisible()
  await expect(banner.getByRole('link', { name: '글쓰기', exact: true })).toBeVisible()
  await expect(banner.getByRole('link', { name: '카테고리 관리' })).toHaveCount(0)
  await expect(banner.getByRole('link', { name: '메뉴 관리' })).toHaveCount(0)
})

test('관리자가 메뉴를 추가하면 네비에 동적으로 나타난다', async ({ page }) => {
  await login(page, 'admin', 'admin1234')
  await page.goto('/admin/menus')
  await expect(page.getByRole('heading', { name: '메뉴 관리' })).toBeVisible()

  await page.getByLabel('이름').fill('공지보기')
  await page.getByLabel('경로').fill('/posts')
  await page.getByLabel('접근 권한').selectOption('public')
  await page.getByRole('button', { name: '추가' }).click()

  // 새 메뉴가 네비에 즉시 반영된다(메뉴 테이블 → 동적 네비)
  await expect(page.getByRole('banner').getByRole('link', { name: '공지보기' })).toBeVisible()
})

test('보호 라우트 접근 후 로그인하면 원래 경로로 복귀한다', async ({ page }) => {
  // 미로그인 상태로 글쓰기(/posts/new) 접근 → 로그인으로 유도
  await page.goto('/posts/new')
  await expect(page).toHaveURL(/\/login$/)
  // 로그인하면 원래 가려던 /posts/new 로 복귀해야 한다(redirect-after-login 계약)
  await page.getByLabel('아이디').fill('user')
  await page.getByLabel('비밀번호').fill('user1234')
  await page.getByRole('button', { name: '로그인' }).click()
  await expect(page).toHaveURL(/\/posts\/new$/)
})

test('일반 유저는 카테고리 관리에 접근하면 게시판으로 돌아간다', async ({ page }) => {
  await login(page, 'user', 'user1234')
  await page.goto('/admin/categories')
  // AdminRoute 가 비관리자를 /posts 로 돌려보낸다.
  await expect(page).toHaveURL(/\/posts$/)
  await expect(page.getByRole('heading', { name: '게시판' })).toBeVisible()
})
