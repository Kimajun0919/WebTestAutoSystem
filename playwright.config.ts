import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright 테스트 설정
 * 자세한 내용: https://playwright.dev/docs/test-configuration
 * 
 * 주의: 환경 변수는 웹 대시보드에서만 입력받습니다.
 * .env 파일은 사용하지 않습니다.
 */
export default defineConfig({
  testDir: './tests',
  /* 테스트 파일들을 병렬로 실행합니다 */
  fullyParallel: true,
  /* CI에서 test.only가 실수로 남아있으면 빌드를 실패시킵니다 */
  forbidOnly: !!process.env.CI,
  /* CI에서만 재시도합니다 */
  retries: process.env.CI ? 2 : 0,
  /* CI에서는 병렬 테스트를 선택적으로 비활성화합니다 */
  workers: process.env.CI ? 1 : undefined,
  /* 사용할 리포터. 자세한 내용: https://playwright.dev/docs/test-reporters */
  reporter: 'html',
  /* 아래의 모든 프로젝트에 대한 공유 설정. 자세한 내용: https://playwright.dev/docs/api/class-testoptions */
  use: {
    /* `await page.goto('/')`와 같은 액션에서 사용할 기본 URL */
    /* 주의: BASE_URL은 웹 대시보드에서 필수로 입력해야 합니다 */
    baseURL: process.env.BASE_URL,
    /* 실패한 테스트를 재시도할 때 트레이스를 수집합니다. 자세한 내용: https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',
    /* 실패 시 스크린샷을 찍습니다 */
    screenshot: 'only-on-failure',
    /* 실패 시 비디오를 저장합니다 */
    video: 'retain-on-failure',
  },

  /* 주요 브라우저에 대한 프로젝트 설정 */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },

    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },

    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },

    /* 모바일 뷰포트 테스트 */
    // {
    //   name: 'Mobile Chrome',
    //   use: { ...devices['Pixel 5'] },
    // },
    // {
    //   name: 'Mobile Safari',
    //   use: { ...devices['iPhone 12'] },
    // },
  ],

  /* 테스트 시작 전 로컬 개발 서버 실행 */
  // webServer: {
  //   command: 'npm run start',
  //   url: 'http://127.0.0.1:3000',
  //   reuseExistingServer: !process.env.CI,
  // },
});

