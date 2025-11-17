import { Page, expect } from '@playwright/test';
import { LoginPage } from './page-objects/login-page';

/**
 * 일반 사용자로 로그인하는 헬퍼 함수
 * @param page - Playwright 페이지 객체
 * @param email - 사용자 이메일 (기본값: 환경 변수)
 * @param password - 사용자 비밀번호 (기본값: 환경 변수)
 */
export async function loginAsUser(
  page: Page,
  email?: string,
  password?: string
): Promise<void> {
  const userEmail = email || process.env.USER_EMAIL || 'user@example.com';
  const userPassword = password || process.env.USER_PASSWORD || 'password123';
  const loginPage = new LoginPage(page);

  await loginPage.goto('/login');
  await loginPage.fillEmail(userEmail);
  await loginPage.fillPassword(userPassword);
  await loginPage.clickLoginButton();
  
  // 대시보드로 리다이렉션될 때까지 대기
  await expect(page).toHaveURL(/.*\/dashboard/);
}

/**
 * 관리자로 로그인하는 헬퍼 함수
 * @param page - Playwright 페이지 객체
 * @param email - 관리자 이메일 (기본값: 환경 변수)
 * @param password - 관리자 비밀번호 (기본값: 환경 변수)
 */
export async function loginAsAdmin(
  page: Page,
  email?: string,
  password?: string
): Promise<void> {
  const adminEmail = email || process.env.ADMIN_EMAIL || 'admin@example.com';
  const adminPassword = password || process.env.ADMIN_PASSWORD || 'admin123';
  const loginPage = new LoginPage(page);

  await loginPage.goto('/admin/login');
  await loginPage.fillEmail(adminEmail);
  await loginPage.fillPassword(adminPassword);
  await loginPage.clickLoginButton();
  
  // 관리자 회원 페이지로 리다이렉션될 때까지 대기
  await expect(page).toHaveURL(/.*\/admin\/members/);
}

