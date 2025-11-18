/**
 * 테스트 설정 관리
 * 환경별 설정과 테스트 옵션을 중앙에서 관리합니다.
 */

export interface TestConfig {
  baseURL: string;
  timeout: {
    navigation: number;
    action: number;
    assertion: number;
  };
  retries: {
    count: number;
    mode: 'retry' | 'reuse';
  };
  screenshots: {
    enabled: boolean;
    mode: 'only-on-failure' | 'on' | 'off';
    path: string;
  };
  videos: {
    enabled: boolean;
    mode: 'retain-on-failure' | 'on' | 'off';
    path: string;
  };
  trace: {
    enabled: boolean;
    mode: 'on-first-retry' | 'on' | 'off';
  };
}

/**
 * 환경별 설정
 */
export const getTestConfig = (): TestConfig => {
  const isCI = !!process.env.CI;
  const baseURL = process.env.BASE_URL || 'http://localhost:8000';

  return {
    baseURL,
    timeout: {
      navigation: 30000,
      action: 10000,
      assertion: 5000,
    },
    retries: {
      count: isCI ? 2 : 0,
      mode: 'retry',
    },
    screenshots: {
      enabled: true,
      mode: 'only-on-failure',
      path: 'test-results/screenshots',
    },
    videos: {
      enabled: true,
      mode: 'retain-on-failure',
      path: 'test-results/videos',
    },
    trace: {
      enabled: true,
      mode: 'on-first-retry',
    },
  };
};

/**
 * 환경 변수 검증
 */
export const validateEnvVars = (): void => {
  const required = ['BASE_URL'];
  const missing: string[] = [];

  for (const key of required) {
    if (!process.env[key]) {
      missing.push(key);
    }
  }

  if (missing.length > 0) {
    throw new Error(
      `필수 환경 변수가 설정되지 않았습니다: ${missing.join(', ')}\n` +
      '웹 대시보드에서 환경 변수를 입력하세요.'
    );
  }
};

/**
 * 테스트 태그 정의
 */
export enum TestTag {
  SMOKE = '@smoke',
  REGRESSION = '@regression',
  CRITICAL = '@critical',
  SLOW = '@slow',
  FAST = '@fast',
  UI = '@ui',
  API = '@api',
  AUTH = '@auth',
  CRUD = '@crud',
}

/**
 * 테스트 그룹 정의
 */
export enum TestGroup {
  LOGIN = 'login',
  BUTTONS = 'buttons',
  CRUD = 'crud',
  AI = 'ai',
  DASHBOARD = 'dashboard',
  ADMIN = 'admin',
}

