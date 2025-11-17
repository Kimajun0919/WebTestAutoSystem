import { Page, expect } from '@playwright/test';
import { LoginPage } from './page-objects/login-page';

/**
 * 일반 사용자로 로그인하는 헬퍼 함수
 * @param page - Playwright 페이지 객체
 * @param emailOrUsername - 사용자 이메일 또는 아이디 (기본값: 환경 변수)
 * @param password - 사용자 비밀번호 (기본값: 환경 변수)
 */
export async function loginAsUser(
  page: Page,
  emailOrUsername?: string,
  password?: string
): Promise<void> {
  // 환경 변수에서 가져오거나 파라미터로 받은 값 사용 (기본값 없음)
  const userEmailOrUsername = emailOrUsername || process.env.USER_EMAIL;
  const userPassword = password || process.env.USER_PASSWORD;
  
  if (!userEmailOrUsername || !userPassword) {
    throw new Error('USER_EMAIL(아이디 또는 이메일)과 USER_PASSWORD가 설정되지 않았습니다. 웹 대시보드에서 환경 변수를 입력하세요.');
  }
  
  const loginPage = new LoginPage(page);

  await loginPage.goto('/login');
  await loginPage.fillEmail(userEmailOrUsername);
  await loginPage.fillPassword(userPassword);
  await loginPage.clickLoginButton();
  
  // 대시보드로 리다이렉션될 때까지 대기
  await expect(page).toHaveURL(/.*\/dashboard/);
}

/**
 * 관리자로 로그인하는 헬퍼 함수
 * @param page - Playwright 페이지 객체
 * @param emailOrUsername - 관리자 이메일 또는 아이디 (기본값: 환경 변수)
 * @param password - 관리자 비밀번호 (기본값: 환경 변수)
 */
export async function loginAsAdmin(
  page: Page,
  emailOrUsername?: string,
  password?: string
): Promise<void> {
  // 환경 변수에서 가져오거나 파라미터로 받은 값 사용 (기본값 없음)
  const adminEmailOrUsername = emailOrUsername || process.env.ADMIN_EMAIL;
  const adminPassword = password || process.env.ADMIN_PASSWORD;
  
  if (!adminEmailOrUsername || !adminPassword) {
    throw new Error('ADMIN_EMAIL(아이디 또는 이메일)과 ADMIN_PASSWORD가 설정되지 않았습니다. 웹 대시보드에서 환경 변수를 입력하세요.');
  }
  
  const loginPage = new LoginPage(page);

  await loginPage.goto('/admin/login');
  await loginPage.fillEmail(adminEmailOrUsername);
  await loginPage.fillPassword(adminPassword);
  await loginPage.clickLoginButton();
  
  // 관리자 회원 페이지로 리다이렉션될 때까지 대기
  await expect(page).toHaveURL(/.*\/admin\/members/);
}

