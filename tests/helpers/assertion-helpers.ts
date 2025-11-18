/**
 * 어설션 헬퍼 함수
 * 재사용 가능한 검증 로직을 제공합니다.
 */

import { Page, Locator, expect } from '@playwright/test';
import { UrlPatterns } from '../constants/selectors';

/**
 * URL이 특정 패턴과 일치하는지 확인
 */
export const assertUrlMatches = async (
  page: Page,
  pattern: RegExp | string,
  message?: string
): Promise<void> => {
  await expect(page).toHaveURL(pattern, { timeout: 10000 });
};

/**
 * 성공 메시지가 표시되는지 확인
 */
export const assertSuccessMessage = async (
  page: Page,
  expectedText?: string
): Promise<void> => {
  const successMessage = page.locator(
    '.alert-success, .success, .text-success, [role="alert"]:has-text("success")'
  ).first();

  await expect(successMessage).toBeVisible({ timeout: 5000 });

  if (expectedText) {
    await expect(successMessage).toContainText(expectedText);
  }
};

/**
 * 에러 메시지가 표시되는지 확인
 */
export const assertErrorMessage = async (
  page: Page,
  expectedText?: string
): Promise<void> => {
  const errorMessage = page.locator(
    '.alert-danger, .error, .text-danger, .invalid-feedback, [role="alert"]:has-text("error")'
  ).first();

  await expect(errorMessage).toBeVisible({ timeout: 5000 });

  if (expectedText) {
    await expect(errorMessage).toContainText(expectedText);
  }
};

/**
 * 요소가 표시되고 활성화되어 있는지 확인
 */
export const assertElementVisibleAndEnabled = async (
  locator: Locator
): Promise<void> => {
  await expect(locator).toBeVisible();
  await expect(locator).toBeEnabled();
};

/**
 * 요소가 표시되고 비활성화되어 있는지 확인
 */
export const assertElementVisibleAndDisabled = async (
  locator: Locator
): Promise<void> => {
  await expect(locator).toBeVisible();
  await expect(locator).toBeDisabled();
};

/**
 * 폼 유효성 검사 오류가 표시되는지 확인
 */
export const assertFormValidationErrors = async (
  page: Page,
  minErrors: number = 1
): Promise<void> => {
  const errors = page.locator(
    '.invalid-feedback, .text-danger, .error, input:invalid, textarea:invalid'
  );
  const errorCount = await errors.count();
  expect(errorCount).toBeGreaterThanOrEqual(minErrors);
};

/**
 * 로그인 성공 확인
 */
export const assertLoginSuccess = async (page: Page): Promise<void> => {
  await assertUrlMatches(page, UrlPatterns.DASHBOARD);
  const pageTitle = page.locator('h1, h2, .page-title').first();
  await expect(pageTitle).toBeVisible();
};

/**
 * 관리자 로그인 성공 확인
 */
export const assertAdminLoginSuccess = async (page: Page): Promise<void> => {
  await assertUrlMatches(page, UrlPatterns.ADMIN_MEMBERS);
  const pageTitle = page.locator('h1, h2, .page-title').first();
  await expect(pageTitle).toBeVisible();
};

/**
 * 로그인 실패 확인
 */
export const assertLoginFailure = async (page: Page): Promise<void> => {
  // 로그인 페이지에 여전히 있거나 에러 메시지가 표시되어야 함
  const onLoginPage = page.url().match(UrlPatterns.LOGIN) !== null;
  const hasError = await page
    .locator('.alert-danger, .error, .text-danger, .invalid-feedback')
    .first()
    .isVisible()
    .catch(() => false);

  expect(onLoginPage || hasError).toBeTruthy();
};

/**
 * 테이블에 데이터가 있는지 확인
 */
export const assertTableHasData = async (
  tableLocator: Locator,
  minRows: number = 1
): Promise<void> => {
  const rows = tableLocator.locator('tbody tr, .list-item, .member-item');
  const count = await rows.count();
  expect(count).toBeGreaterThanOrEqual(minRows);
};

/**
 * 요소가 특정 텍스트를 포함하는지 확인
 */
export const assertElementContainsText = async (
  locator: Locator,
  text: string | RegExp
): Promise<void> => {
  await expect(locator).toContainText(text);
};

/**
 * 모달이 표시되는지 확인
 */
export const assertModalVisible = async (page: Page): Promise<void> => {
  const modal = page.locator('.modal, [role="dialog"], .modal-dialog').first();
  await expect(modal).toBeVisible({ timeout: 5000 });
};

/**
 * 모달이 닫혀있는지 확인
 */
export const assertModalHidden = async (page: Page): Promise<void> => {
  const modal = page.locator('.modal, [role="dialog"], .modal-dialog').first();
  await expect(modal).toBeHidden({ timeout: 5000 });
};

/**
 * 페이지 제목이 특정 텍스트와 일치하는지 확인
 */
export const assertPageTitle = async (
  page: Page,
  expectedTitle: string | RegExp
): Promise<void> => {
  const title = page.locator('h1, h2, .page-title').first();
  await expect(title).toContainText(expectedTitle);
};

