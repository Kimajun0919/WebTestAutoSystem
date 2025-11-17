import { Page } from '@playwright/test';
import { AIBasePage } from './ai-base-page';

/**
 * AI 기반 로그인 페이지 객체
 * 자연어 설명을 사용하여 다양한 로그인 페이지 구조에 적응합니다
 */
export class AILoginPage extends AIBasePage {
  constructor(page: Page) {
    super(page);
  }

  /**
   * AI 기반 로그인 수행
   * @param email - 이메일 주소
   * @param password - 비밀번호
   */
  async login(email: string, password: string): Promise<void> {
    // 다양한 이메일 필드 설명 시도
    const emailDescriptions = ['이메일', 'Email', 'E-mail', '사용자', 'User', '아이디', 'ID', 'Username'];
    let emailFilled = false;
    
    for (const desc of emailDescriptions) {
      try {
        await this.fillByDescription(desc, email);
        emailFilled = true;
        break;
      } catch (error) {
        continue;
      }
    }

    if (!emailFilled) {
      // input[type="email"] 직접 찾기
      const emailInput = this.page.locator('input[type="email"], input[name*="email" i], input[name*="user" i]').first();
      if (await emailInput.isVisible()) {
        await emailInput.fill(email);
      } else {
        throw new Error('이메일 입력 필드를 찾을 수 없습니다');
      }
    }

    // 비밀번호 필드 입력
    const passwordDescriptions = ['비밀번호', 'Password', '패스워드', 'PWD'];
    let passwordFilled = false;
    
    for (const desc of passwordDescriptions) {
      try {
        await this.fillByDescription(desc, password);
        passwordFilled = true;
        break;
      } catch (error) {
        continue;
      }
    }

    if (!passwordFilled) {
      // input[type="password"] 직접 찾기
      const passwordInput = this.page.locator('input[type="password"], input[name*="password" i], input[name*="pwd" i]').first();
      if (await passwordInput.isVisible()) {
        await passwordInput.fill(password);
      } else {
        throw new Error('비밀번호 입력 필드를 찾을 수 없습니다');
      }
    }

    // 로그인 버튼 클릭
    const loginButtonDescriptions = ['로그인', 'Login', 'Sign In', '입장', '확인', 'Submit'];
    let loginClicked = false;
    
    for (const desc of loginButtonDescriptions) {
      try {
        await this.clickByDescription(desc, { role: 'button' });
        loginClicked = true;
        break;
      } catch (error) {
        continue;
      }
    }

    if (!loginClicked) {
      // submit 버튼 찾기
      const submitButton = this.page.locator('button[type="submit"], input[type="submit"], form button').first();
      if (await submitButton.isVisible()) {
        await submitButton.click();
      } else {
        throw new Error('로그인 버튼을 찾을 수 없습니다');
      }
    }
  }

  /**
   * 에러 메시지 확인
   */
  async hasError(): Promise<boolean> {
    const errorDescriptions = [
      '에러',
      '오류',
      'Error',
      '잘못',
      '틀림',
      '실패',
      'Failure',
      'Invalid',
      '유효하지 않음'
    ];

    // 에러 메시지가 표시되는지 확인
    for (const desc of errorDescriptions) {
      if (await this.existsByDescription(desc)) {
        return true;
      }
    }

    // 일반적인 에러 클래스 확인
    const errorElements = this.page.locator('.error, .alert-danger, .text-danger, .invalid-feedback, [role="alert"]');
    const count = await errorElements.count();
    return count > 0;
  }

  /**
   * 에러 메시지 텍스트 가져오기
   */
  async getErrorMessage(): Promise<string> {
    const errorElements = this.page.locator('.error, .alert-danger, .text-danger, .invalid-feedback, [role="alert"]');
    const count = await errorElements.count();
    
    if (count > 0) {
      return await errorElements.first().textContent() || '';
    }

    return '';
  }
}

