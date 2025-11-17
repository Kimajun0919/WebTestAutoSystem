import { test, expect } from '@playwright/test';
import { AILoginPage } from './page-objects/ai-login-page';

/**
 * AI 기반 로그인 테스트
 * 자연어 기반 요소 탐색을 사용하여 다양한 사이트 구조에 적응합니다
 */
test.describe('AI 기반 로그인 테스트', () => {
  test.describe('사용자 로그인', () => {
    test('AI를 사용하여 사용자 로그인 성공', async ({ page }) => {
      const loginPage = new AILoginPage(page);
      
      await loginPage.goto('/login');
      
      const userEmail = process.env.USER_EMAIL || 'user@example.com';
      const userPassword = process.env.USER_PASSWORD || 'password123';
      
      // AI 기반 로그인 수행
      await loginPage.login(userEmail, userPassword);
      
      // 대시보드로 리다이렉션 확인
      await expect(page).toHaveURL(/.*\/dashboard/, { timeout: 5000 });
      
      // 대시보드 콘텐츠 확인
      const pageTitle = page.locator('h1, h2, .page-title').first();
      await expect(pageTitle).toBeVisible({ timeout: 3000 });
    });

    test('AI를 사용하여 잘못된 자격증명으로 로그인 실패 확인', async ({ page }) => {
      const loginPage = new AILoginPage(page);
      
      await loginPage.goto('/login');
      
      // 잘못된 자격증명으로 로그인 시도
      await loginPage.login('invalid@example.com', 'wrongpassword');
      
      // 에러 메시지가 표시되는지 확인
      await page.waitForTimeout(1000);
      const hasError = await loginPage.hasError();
      
      expect(hasError).toBeTruthy();
      
      // 로그인 페이지에 여전히 있는지 확인
      await expect(page).toHaveURL(/.*\/login/);
    });
  });

  test.describe('관리자 로그인', () => {
    test('AI를 사용하여 관리자 로그인 성공', async ({ page }) => {
      const loginPage = new AILoginPage(page);
      
      await loginPage.goto('/admin/login');
      
      const adminEmail = process.env.ADMIN_EMAIL || 'admin@example.com';
      const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
      
      // AI 기반 로그인 수행
      await loginPage.login(adminEmail, adminPassword);
      
      // 관리자 페이지로 리다이렉션 확인
      await expect(page).toHaveURL(/.*\/admin/, { timeout: 5000 });
    });
  });

  test.describe('AI 요소 탐색 테스트', () => {
    test('자연어 설명으로 요소 찾기', async ({ page }) => {
      const loginPage = new AILoginPage(page);
      
      await loginPage.goto('/login');
      
      // 자연어로 요소 찾기
      const emailField = await loginPage.findElement('이메일 입력');
      expect(emailField).not.toBeNull();
      
      const passwordField = await loginPage.findElement('비밀번호 입력');
      expect(passwordField).not.toBeNull();
      
      const loginButton = await loginPage.findElement('로그인 버튼');
      expect(loginButton).not.toBeNull();
    });

    test('자연어 설명으로 직접 입력하기', async ({ page }) => {
      const loginPage = new AILoginPage(page);
      
      await loginPage.goto('/login');
      
      // 자연어 설명으로 직접 입력
      await loginPage.fillByDescription('이메일', 'test@example.com');
      await loginPage.fillByDescription('비밀번호', 'test123');
      
      // 입력된 값 확인
      const emailValue = await page.locator('input[type="email"], input[name*="email" i]').first().inputValue();
      expect(emailValue).toBe('test@example.com');
    });

    test('자연어 설명으로 버튼 클릭하기', async ({ page }) => {
      const loginPage = new AILoginPage(page);
      
      await loginPage.goto('/login');
      
      // 폼 작성
      await loginPage.fillByDescription('이메일', 'test@example.com');
      await loginPage.fillByDescription('비밀번호', 'test123');
      
      // 자연어로 버튼 클릭
      await loginPage.clickByDescription('로그인');
      
      // 로그인 시도 확인
      await page.waitForTimeout(1000);
      // 성공 또는 에러 페이지로 이동했는지 확인
      const currentUrl = page.url();
      expect(currentUrl).not.toContain('/login'); // 로그인 페이지가 아니어야 함
    });
  });
});

