/**
 * 대기 헬퍼 함수
 * 안정적인 테스트를 위한 다양한 대기 전략을 제공합니다.
 */

import { Page, Locator, expect } from '@playwright/test';

/**
 * 고정 시간 대기 (가능하면 사용하지 않는 것이 좋지만, 필요한 경우)
 * @param ms - 대기할 시간 (밀리초)
 */
export const waitForTimeout = async (ms: number): Promise<void> => {
  // Playwright의 waitForTimeout 대신 더 안정적인 방법 사용
  await new Promise(resolve => setTimeout(resolve, ms));
};

/**
 * 네트워크가 안정될 때까지 대기
 */
export const waitForNetworkIdle = async (
  page: Page,
  timeout: number = 30000
): Promise<void> => {
  await page.waitForLoadState('networkidle', { timeout });
};

/**
 * 요소가 표시될 때까지 대기
 */
export const waitForVisible = async (
  locator: Locator,
  timeout: number = 10000
): Promise<void> => {
  await locator.waitFor({ state: 'visible', timeout });
};

/**
 * 요소가 숨겨질 때까지 대기
 */
export const waitForHidden = async (
  locator: Locator,
  timeout: number = 10000
): Promise<void> => {
  await locator.waitFor({ state: 'hidden', timeout });
};

/**
 * URL이 특정 패턴과 일치할 때까지 대기
 */
export const waitForUrl = async (
  page: Page,
  pattern: string | RegExp,
  timeout: number = 30000
): Promise<void> => {
  await expect(page).toHaveURL(pattern, { timeout });
};

/**
 * 성공 메시지가 나타날 때까지 대기
 */
export const waitForSuccessMessage = async (
  page: Page,
  timeout: number = 5000
): Promise<Locator> => {
  const successMessage = page.locator(
    '.alert-success, .success, .text-success, [role="alert"]:has-text("success")'
  ).first();
  await waitForVisible(successMessage, timeout);
  return successMessage;
};

/**
 * 에러 메시지가 나타날 때까지 대기
 */
export const waitForErrorMessage = async (
  page: Page,
  timeout: number = 5000
): Promise<Locator> => {
  const errorMessage = page.locator(
    '.alert-danger, .error, .text-danger, .invalid-feedback, [role="alert"]:has-text("error")'
  ).first();
  await waitForVisible(errorMessage, timeout);
  return errorMessage;
};

/**
 * 로딩 스피너가 사라질 때까지 대기
 */
export const waitForLoadingToComplete = async (
  page: Page,
  timeout: number = 10000
): Promise<void> => {
  const spinner = page.locator('.spinner, .loading, [role="status"]').first();
  try {
    await waitForHidden(spinner, timeout);
  } catch {
    // 스피너가 없으면 이미 로드된 것으로 간주
  }
};

/**
 * 폼 제출 후 리다이렉션 대기
 */
export const waitForFormSubmission = async (
  page: Page,
  expectedUrlPattern?: RegExp,
  timeout: number = 10000
): Promise<void> => {
  // 네트워크 요청 완료 대기
  await waitForNetworkIdle(page, timeout);

  // URL 패턴이 제공된 경우 대기
  if (expectedUrlPattern) {
    await waitForUrl(page, expectedUrlPattern, timeout);
  }
};

/**
 * 모달이 열릴 때까지 대기
 */
export const waitForModal = async (
  page: Page,
  timeout: number = 5000
): Promise<Locator> => {
  const modal = page.locator('.modal, [role="dialog"], .modal-dialog').first();
  await waitForVisible(modal, timeout);
  return modal;
};

/**
 * 모달이 닫힐 때까지 대기
 */
export const waitForModalClose = async (
  page: Page,
  timeout: number = 5000
): Promise<void> => {
  const modal = page.locator('.modal, [role="dialog"], .modal-dialog').first();
  await waitForHidden(modal, timeout);
};

/**
 * 테이블 행이 로드될 때까지 대기
 */
export const waitForTableRows = async (
  tableLocator: Locator,
  minRows: number = 1,
  timeout: number = 10000
): Promise<void> => {
  await expect(tableLocator.locator('tbody tr, .list-item, .member-item')).toHaveCount(
    { min: minRows },
    { timeout }
  );
};

/**
 * 조건이 충족될 때까지 대기 (폴링)
 */
export const waitForCondition = async (
  condition: () => Promise<boolean>,
  timeout: number = 10000,
  interval: number = 500
): Promise<void> => {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    if (await condition()) {
      return;
    }
    await new Promise(resolve => setTimeout(resolve, interval));
  }

  throw new Error(`조건이 ${timeout}ms 내에 충족되지 않았습니다.`);
};

