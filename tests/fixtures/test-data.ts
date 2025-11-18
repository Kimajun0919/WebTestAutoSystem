/**
 * 테스트 데이터 팩토리
 * 일관된 테스트 데이터를 생성합니다.
 */

import { MemberData } from '../types';

/**
 * 고유한 타임스탬프 기반 ID 생성
 */
export const generateUniqueId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

/**
 * 고유한 이메일 생성
 */
export const generateUniqueEmail = (prefix: string = 'test'): string => {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `${prefix}-${timestamp}-${random}@example.com`;
};

/**
 * 고유한 이름 생성
 */
export const generateUniqueName = (prefix: string = 'Test'): string => {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 6);
  return `${prefix} ${timestamp} ${random}`;
};

/**
 * 회원 데이터 팩토리
 */
export class MemberDataFactory {
  /**
   * 기본 회원 데이터 생성
   */
  static create(overrides?: Partial<MemberData>): MemberData {
    return {
      name: generateUniqueName('Member'),
      email: generateUniqueEmail('member'),
      phone: '010-1234-5678',
      ...overrides,
    };
  }

  /**
   * 최소 필수 필드만 포함한 회원 데이터
   */
  static createMinimal(overrides?: Partial<MemberData>): MemberData {
    return {
      name: generateUniqueName('Member'),
      email: generateUniqueEmail('member'),
      ...overrides,
    };
  }

  /**
   * 유효하지 않은 회원 데이터 생성 (유효성 검사 테스트용)
   */
  static createInvalid(): Partial<MemberData> {
    return {
      name: '',
      email: 'invalid-email',
      phone: 'invalid-phone',
    };
  }

  /**
   * 긴 데이터 생성 (길이 제한 테스트용)
   */
  static createLongData(): MemberData {
    const longString = 'a'.repeat(1000);
    return {
      name: longString,
      email: `${longString}@example.com`,
      phone: '1'.repeat(50),
    };
  }
}

/**
 * 로그인 자격증명 팩토리
 */
export class CredentialsFactory {
  /**
   * 환경 변수에서 자격증명 가져오기
   */
  static getUserCredentials() {
    const email = process.env.USER_EMAIL;
    const password = process.env.USER_PASSWORD;

    if (!email || !password) {
      throw new Error(
        'USER_EMAIL과 USER_PASSWORD가 설정되지 않았습니다. 웹 대시보드에서 환경 변수를 입력하세요.'
      );
    }

    return { email, password };
  }

  /**
   * 관리자 자격증명 가져오기
   */
  static getAdminCredentials() {
    const email = process.env.ADMIN_EMAIL;
    const password = process.env.ADMIN_PASSWORD;

    if (!email || !password) {
      throw new Error(
        'ADMIN_EMAIL과 ADMIN_PASSWORD가 설정되지 않았습니다. 웹 대시보드에서 환경 변수를 입력하세요.'
      );
    }

    return { email, password };
  }

  /**
   * 잘못된 자격증명 생성
   */
  static createInvalid() {
    return {
      email: 'invalid@example.com',
      password: 'wrongpassword',
    };
  }
}

