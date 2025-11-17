import { Page, Locator } from '@playwright/test';
import { BasePage } from './base-page';

/**
 * 로그인 페이지의 페이지 객체 모델
 */
export class LoginPage extends BasePage {
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly loginButton: Locator;
  readonly errorMessage: Locator;

  constructor(page: Page) {
    super(page);
    // 이메일, 아이디, 사용자명 필드 모두 찾기
    this.emailInput = page.locator('input[type="email"], input[name="email"], input[name="username"], input[name="user_id"], input[name="login"], input[name="account"], input[id*="email" i], input[id*="username" i], input[id*="user" i]').first();
    this.passwordInput = page.locator('input[type="password"], input[name="password"]');
    this.loginButton = page.locator('button[type="submit"]:has-text("Login"), button:has-text("Sign In"), input[type="submit"]');
    this.errorMessage = page.locator('.alert-danger, .error, .text-danger').first();
  }

  /**
   * 이메일 또는 아이디 필드에 입력합니다
   */
  async fillEmail(emailOrUsername: string): Promise<void> {
    await this.emailInput.fill(emailOrUsername);
  }

  /**
   * 비밀번호 필드에 입력합니다
   */
  async fillPassword(password: string): Promise<void> {
    await this.passwordInput.fill(password);
  }

  /**
   * 로그인 버튼을 클릭합니다
   */
  async clickLoginButton(): Promise<void> {
    await this.loginButton.click();
  }

  /**
   * 완전한 로그인 플로우를 수행합니다
   */
  async login(email: string, password: string): Promise<void> {
    await this.fillEmail(email);
    await this.fillPassword(password);
    await this.clickLoginButton();
  }

  /**
   * 에러 메시지가 표시되는지 확인합니다
   */
  async isErrorMessageVisible(): Promise<boolean> {
    return await this.errorMessage.isVisible();
  }

  /**
   * 에러 메시지 텍스트를 가져옵니다
   */
  async getErrorMessage(): Promise<string> {
    return await this.errorMessage.textContent() || '';
  }
}

