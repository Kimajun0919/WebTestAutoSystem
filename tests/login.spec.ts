import { test, expect } from '@playwright/test';
import { loginAsUser, loginAsAdmin } from './auth-helpers';
import { LoginPage } from './page-objects/login-page';

test.describe('로그인 테스트', () => {
  test.describe('사용자 로그인', () => {
    test('사용자로 성공적으로 로그인하고 대시보드로 리다이렉션되어야 합니다', async ({ page }) => {
      // 헬퍼 함수를 사용하여 로그인
      await loginAsUser(page);

      // 대시보드로 리다이렉션 확인
      await expect(page).toHaveURL(/.*\/dashboard/);
      
      // 대시보드 콘텐츠를 확인하여 사용자가 로그인되었는지 확인
      const pageTitle = page.locator('h1, h2, .page-title').first();
      await expect(pageTitle).toBeVisible();
    });

    test('잘못된 자격증명으로 로그인이 실패해야 합니다', async ({ page }) => {
      const loginPage = new LoginPage(page);
      
      await loginPage.goto('/login');
      await loginPage.login('invalid@example.com', 'wrongpassword');
      
      // 에러 메시지가 나타날 때까지 잠시 대기
      await page.waitForTimeout(1000);
      
      // 에러 메시지가 표시되는지 확인 (일반적인 Laravel 유효성 검사 패턴)
      const errorVisible = await loginPage.isErrorMessageVisible() || 
                          await page.locator('.invalid-feedback, .text-danger, .alert-danger').isVisible();
      
      expect(errorVisible).toBeTruthy();
      
      // 로그인 페이지에 여전히 있는지 확인
      await expect(page).toHaveURL(/.*\/login/);
    });

    test('빈 필드에 대한 유효성 검사 오류를 표시해야 합니다', async ({ page }) => {
      const loginPage = new LoginPage(page);
      
      await loginPage.goto('/login');
      
      // 필드를 채우지 않고 제출 시도
      await loginPage.clickLoginButton();
      
      // 유효성 검사 오류 대기
      await page.waitForTimeout(500);
      
      // HTML5 유효성 검사 또는 Laravel 유효성 검사 오류 확인
      const emailRequired = await page.locator('input[name="email"]').evaluate(
        (el: HTMLInputElement) => {
          const input = el as HTMLInputElement;
          return !input.validity.valid;
        }
      );
      
      expect(emailRequired).toBeTruthy();
    });
  });

  test.describe('관리자 로그인', () => {
    test('관리자로 성공적으로 로그인하고 관리자 회원 페이지로 리다이렉션되어야 합니다', async ({ page }) => {
      // 헬퍼 함수를 사용하여 로그인
      await loginAsAdmin(page);

      // 관리자 회원 페이지로 리다이렉션 확인
      await expect(page).toHaveURL(/.*\/admin\/members/);
      
      // 관리자 페이지 콘텐츠를 확인하여 관리자가 로그인되었는지 확인
      const pageTitle = page.locator('h1, h2, .page-title').first();
      await expect(pageTitle).toBeVisible();
    });

    test('사용자 자격증명으로 관리자 로그인이 실패해야 합니다', async ({ page }) => {
      const loginPage = new LoginPage(page);
      
      // 관리자 로그인에서 사용자 자격증명 사용 시도
      await loginPage.goto('/admin/login');
      
      const userEmail = process.env.USER_EMAIL;
      const userPassword = process.env.USER_PASSWORD;
      
      // 환경 변수가 없으면 테스트 실패
      if (!userEmail || !userPassword) {
        throw new Error('USER_EMAIL과 USER_PASSWORD가 설정되지 않았습니다. 웹 대시보드에서 환경 변수를 입력하세요.');
      }
      
      await loginPage.login(userEmail, userPassword);
      
      // 에러 메시지 대기
      await page.waitForTimeout(1000);
      
      // 에러를 표시하거나 로그인 페이지로 리다이렉션되어야 함
      const errorVisible = await loginPage.isErrorMessageVisible() || 
                          await page.locator('.invalid-feedback, .text-danger, .alert-danger').isVisible();
      
      // 에러 메시지 또는 로그인 페이지에 여전히 있음
      expect(errorVisible || page.url().includes('/admin/login')).toBeTruthy();
    });
  });

  test.describe('로그인 폼 UI', () => {
    test('로그인 폼 요소가 올바르게 표시되어야 합니다', async ({ page }) => {
      const loginPage = new LoginPage(page);
      
      await loginPage.goto('/login');
      
      // 폼 요소가 표시되는지 확인
      await expect(loginPage.emailInput).toBeVisible();
      await expect(loginPage.passwordInput).toBeVisible();
      await expect(loginPage.loginButton).toBeVisible();
      
      // 입력 타입 확인
      const emailType = await loginPage.emailInput.getAttribute('type');
      const passwordType = await loginPage.passwordInput.getAttribute('type');
      
      expect(emailType).toBe('email');
      expect(passwordType).toBe('password');
    });

    test('비밀번호 입력이 마스킹되어야 합니다', async ({ page }) => {
      const loginPage = new LoginPage(page);
      
      await loginPage.goto('/login');
      await loginPage.fillPassword('testpassword123');
      
      // 비밀번호가 마스킹되어 있어야 함 (type="password")
      const inputType = await loginPage.passwordInput.getAttribute('type');
      expect(inputType).toBe('password');
      
      // 비밀번호 값이 일반 텍스트로 표시되지 않아야 함
      const value = await loginPage.passwordInput.inputValue();
      expect(value).toBe('testpassword123'); // 값은 있지만 UI에서는 마스킹됨
    });
  });
});

