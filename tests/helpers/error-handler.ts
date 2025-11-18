/**
 * 에러 핸들링 유틸리티
 * 테스트 중 발생하는 에러를 일관되게 처리합니다.
 */

import { Page } from '@playwright/test';
import { logger } from './logger';

/**
 * 커스텀 테스트 에러
 */
export class TestError extends Error {
  constructor(
    message: string,
    public readonly code?: string,
    public readonly context?: Record<string, any>
  ) {
    super(message);
    this.name = 'TestError';
  }
}

/**
 * 에러 타입 정의
 */
export enum ErrorType {
  ELEMENT_NOT_FOUND = 'ELEMENT_NOT_FOUND',
  TIMEOUT = 'TIMEOUT',
  NAVIGATION_FAILED = 'NAVIGATION_FAILED',
  ASSERTION_FAILED = 'ASSERTION_FAILED',
  NETWORK_ERROR = 'NETWORK_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
}

/**
 * 에러 메시지 생성
 */
export const createErrorMessage = (
  type: ErrorType,
  details: string,
  context?: Record<string, any>
): string => {
  const messages: Record<ErrorType, string> = {
    [ErrorType.ELEMENT_NOT_FOUND]: `요소를 찾을 수 없습니다: ${details}`,
    [ErrorType.TIMEOUT]: `타임아웃이 발생했습니다: ${details}`,
    [ErrorType.NAVIGATION_FAILED]: `네비게이션이 실패했습니다: ${details}`,
    [ErrorType.ASSERTION_FAILED]: `어설션이 실패했습니다: ${details}`,
    [ErrorType.NETWORK_ERROR]: `네트워크 오류가 발생했습니다: ${details}`,
    [ErrorType.VALIDATION_ERROR]: `유효성 검사 오류: ${details}`,
  };

  let message = messages[type] || details;

  if (context) {
    const contextStr = Object.entries(context)
      .map(([key, value]) => `${key}: ${value}`)
      .join(', ');
    message += ` (${contextStr})`;
  }

  return message;
};

/**
 * 에러 처리 및 로깅
 */
export const handleError = (
  error: Error | TestError,
  page?: Page,
  takeScreenshot: boolean = true
): void => {
  logger.error('테스트 에러 발생', {
    message: error.message,
    name: error.name,
    stack: error.stack,
    code: error instanceof TestError ? error.code : undefined,
    context: error instanceof TestError ? error.context : undefined,
  });

  // 스크린샷 촬영 (선택사항)
  if (page && takeScreenshot) {
    page.screenshot({ path: `test-results/errors/${Date.now()}.png` }).catch(() => {
      // 스크린샷 실패는 무시
    });
  }
};

/**
 * 안전한 실행 래퍼
 */
export const safeExecute = async <T>(
  fn: () => Promise<T>,
  errorMessage: string,
  context?: Record<string, any>
): Promise<T> => {
  try {
    return await fn();
  } catch (error) {
    const testError = new TestError(
      errorMessage,
      ErrorType.ASSERTION_FAILED,
      context
    );
    handleError(testError);
    throw testError;
  }
};

/**
 * 재시도 로직이 포함된 실행
 */
export const executeWithRetry = async <T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000,
  errorMessage?: string
): Promise<T> => {
  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      logger.warn(`재시도 ${attempt}/${maxRetries}`, {
        error: error instanceof Error ? error.message : String(error),
      });

      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  const message = errorMessage || `최대 재시도 횟수(${maxRetries})를 초과했습니다`;
  throw new TestError(message, ErrorType.TIMEOUT, { lastError: lastError?.message });
};

