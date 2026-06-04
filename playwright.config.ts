import { defineConfig, devices } from '@playwright/test'

// https://playwright.dev/docs/test-configuration
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  // dev 서버를 자동 기동한다. 앱은 Vite 프록시를 통해 실제 백엔드(testBoot)로 요청하므로
  // e2e 는 "실서버 데이터"를 대상으로 검증한다.
  // 공유 백엔드를 오염시키지 않도록 시나리오는 읽기/로그인 위주로 한정한다(쓰기 없음).
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})
