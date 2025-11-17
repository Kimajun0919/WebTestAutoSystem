import { Page, Locator } from '@playwright/test';
import { BasePage } from './base-page';

/**
 * 관리자 회원 관리 페이지의 페이지 객체 모델
 */
export class AdminMembersPage extends BasePage {
  readonly pageTitle: Locator;
  readonly createButton: Locator;
  readonly membersTable: Locator;
  readonly editButton: Locator;
  readonly deleteButton: Locator;
  readonly searchInput: Locator;
  readonly modal: Locator;
  readonly modalConfirmButton: Locator;
  readonly modalCancelButton: Locator;

  constructor(page: Page) {
    super(page);
    this.pageTitle = page.locator('h1, h2, .page-title').first();
    this.createButton = page.locator('button:has-text("Create"), a:has-text("Create"), button:has-text("Add Member"), a:has-text("Add")').first();
    this.membersTable = page.locator('table, .table, .members-list, .data-table').first();
    this.editButton = page.locator('button:has-text("Edit"), a:has-text("Edit"), [title="Edit"]').first();
    this.deleteButton = page.locator('button:has-text("Delete"), a:has-text("Delete"), [title="Delete"]').first();
    this.searchInput = page.locator('input[type="search"], input[placeholder*="Search"], input[name="search"]');
    this.modal = page.locator('.modal, [role="dialog"], .modal-dialog').first();
    this.modalConfirmButton = page.locator('.modal button:has-text("Confirm"), .modal button:has-text("Delete"), .modal button:has-text("Yes")').first();
    this.modalCancelButton = page.locator('.modal button:has-text("Cancel"), .modal button:has-text("No")').first();
  }

  /**
   * 새 회원 생성 버튼을 클릭합니다
   */
  async clickCreateButton(): Promise<void> {
    await this.createButton.click();
  }

  /**
   * 회원 생성 폼을 작성합니다
   * 실제 폼 구조에 맞게 필드 이름을 조정하세요
   */
  async fillMemberForm(data: {
    name?: string;
    email?: string;
    phone?: string;
    [key: string]: any;
  }): Promise<void> {
    for (const [key, value] of Object.entries(data)) {
      const field = this.page.locator(`input[name="${key}"], textarea[name="${key}"], select[name="${key}"]`).first();
      if (await field.isVisible()) {
        await field.fill(String(value));
      }
    }
  }

  /**
   * 회원 폼을 제출합니다
   */
  async submitForm(): Promise<void> {
    await this.page.locator('button[type="submit"], form button:has-text("Save"), form button:has-text("Create")').first().click();
  }

  /**
   * 회원이 테이블/목록에 존재하는지 확인합니다
   */
  async memberExists(searchText: string): Promise<boolean> {
    const memberRow = this.page.locator(`text="${searchText}"`).first();
    return await memberRow.isVisible();
  }

  /**
   * 특정 회원의 편집 버튼을 클릭합니다
   * @param memberIdentifier - 회원을 식별하는 텍스트 (이름, 이메일 등)
   */
  async clickEditForMember(memberIdentifier: string): Promise<void> {
    const memberRow = this.page.locator(`text="${memberIdentifier}"`).locator('..').first();
    const editBtn = memberRow.locator('button:has-text("Edit"), a:has-text("Edit"), [title="Edit"]').first();
    await editBtn.click();
  }

  /**
   * 특정 회원의 삭제 버튼을 클릭합니다
   * @param memberIdentifier - 회원을 식별하는 텍스트 (이름, 이메일 등)
   */
  async clickDeleteForMember(memberIdentifier: string): Promise<void> {
    const memberRow = this.page.locator(`text="${memberIdentifier}"`).locator('..').first();
    const deleteBtn = memberRow.locator('button:has-text("Delete"), a:has-text("Delete"), [title="Delete"]').first();
    await deleteBtn.click();
  }

  /**
   * 모달에서 삭제를 확인합니다
   */
  async confirmDelete(): Promise<void> {
    if (await this.modal.isVisible()) {
      await this.modalConfirmButton.click();
    }
  }

  /**
   * 모달에서 삭제를 취소합니다
   */
  async cancelDelete(): Promise<void> {
    if (await this.modal.isVisible()) {
      await this.modalCancelButton.click();
    }
  }

  /**
   * 페이지에서 회원 수를 가져옵니다
   */
  async getMemberCount(): Promise<number> {
    const rows = this.page.locator('tbody tr, .member-item, .list-item');
    return await rows.count();
  }

  /**
   * 회원을 검색합니다
   */
  async searchMember(searchTerm: string): Promise<void> {
    if (await this.searchInput.isVisible()) {
      await this.searchInput.fill(searchTerm);
      await this.page.keyboard.press('Enter');
    }
  }

  /**
   * 회원 목록이 로드될 때까지 대기합니다
   */
  async waitForMemberList(): Promise<void> {
    await this.membersTable.waitFor({ state: 'visible' });
  }
}

