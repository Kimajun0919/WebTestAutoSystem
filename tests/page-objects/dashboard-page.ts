import { Page, Locator } from '@playwright/test';
import { BasePage } from './base-page';

/**
 * 사용자 대시보드 페이지의 페이지 객체 모델
 */
export class DashboardPage extends BasePage {
  readonly pageTitle: Locator;
  readonly membersMenuButton: Locator;
  readonly profileMenuButton: Locator;
  readonly settingsMenuButton: Locator;
  readonly logoutButton: Locator;

  constructor(page: Page) {
    super(page);
    // 실제 Laravel/Blade 템플릿 구조에 맞게 셀렉터를 조정하세요
    this.pageTitle = page.locator('h1, h2, .page-title').first();
    this.membersMenuButton = page.locator('a:has-text("Members"), nav a[href*="members"]').first();
    this.profileMenuButton = page.locator('a:has-text("Profile"), nav a[href*="profile"]').first();
    this.settingsMenuButton = page.locator('a:has-text("Settings"), nav a[href*="settings"]').first();
    this.logoutButton = page.locator('button:has-text("Logout"), a:has-text("Logout"), form[action*="logout"] button').first();
  }

  /**
   * Members 메뉴 버튼을 클릭합니다
   */
  async clickMembersMenu(): Promise<void> {
    await this.membersMenuButton.click();
  }

  /**
   * Profile 메뉴 버튼을 클릭합니다
   */
  async clickProfileMenu(): Promise<void> {
    await this.profileMenuButton.click();
  }

  /**
   * Settings 메뉴 버튼을 클릭합니다
   */
  async clickSettingsMenu(): Promise<void> {
    await this.settingsMenuButton.click();
  }

  /**
   * 로그아웃 버튼을 클릭합니다
   */
  async clickLogout(): Promise<void> {
    await this.logoutButton.click();
  }

  /**
   * 페이지 제목 텍스트를 가져옵니다
   */
  async getPageTitle(): Promise<string> {
    return await this.pageTitle.textContent() || '';
  }
}

