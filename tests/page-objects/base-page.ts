import { Page, Locator } from '@playwright/test';

/**
 * 공통 기능을 제공하는 기본 페이지 객체 클래스
 * 모든 페이지 객체는 이 클래스를 확장해야 합니다
 */
export class BasePage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  /**
   * 특정 경로로 이동합니다
   * @param path - 이동할 경로 (기본 URL에 상대적)
   */
  async goto(path: string): Promise<void> {
    await this.page.goto(path);
  }

  /**
   * 현재 URL을 가져옵니다
   */
  getCurrentUrl(): string {
    return this.page.url();
  }

  /**
   * 페이지가 로드될 때까지 대기합니다
   * @param timeout - 타임아웃 (밀리초)
   */
  async waitForLoad(timeout?: number): Promise<void> {
    await this.page.waitForLoadState('networkidle', { timeout });
  }

  /**
   * 스크린샷을 찍습니다
   * @param name - 스크린샷 파일 이름
   */
  async screenshot(name: string): Promise<void> {
    await this.page.screenshot({ path: `screenshots/${name}.png` });
  }
}

