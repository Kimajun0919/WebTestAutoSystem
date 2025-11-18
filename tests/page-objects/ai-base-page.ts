import { Page, Locator } from '@playwright/test';
import { findElementByAI, safeClick, safeFill, elementExists, findBestMatch, findElementHybrid } from '../helpers/ai-locator';
import { BasePage } from './base-page';
import { logger } from '../helpers/logger';

/**
 * AI 기반 페이지 객체의 기본 클래스
 * 자연어 기반 요소 탐색 기능을 제공합니다
 */
export class AIBasePage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  /**
   * AI 기반으로 요소 찾기 (하이브리드 방식: 기본 AI + OpenAI)
   * @param description - 요소에 대한 자연어 설명
   * @param options - 추가 옵션
   */
  async findElement(
    description: string,
    options?: {
      role?: string;
      name?: string;
      exact?: boolean;
      timeout?: number;
      useOpenAI?: boolean;
      apiKey?: string;
    }
  ): Promise<Locator | null> {
    // 하이브리드 방식 사용 (기본 AI 먼저, 실패 시 OpenAI)
    return await findElementHybrid(this.page, description, {
      useOpenAI: options?.useOpenAI,
      apiKey: options?.apiKey,
      timeout: options?.timeout,
    });
  }

  /**
   * AI 기반으로 요소 클릭
   * @param description - 클릭할 요소에 대한 자연어 설명
   */
  async clickByDescription(description: string, options?: { role?: string; timeout?: number }): Promise<void> {
    await safeClick(this.page, description, options);
  }

  /**
   * AI 기반으로 입력 필드에 값 입력
   * @param description - 입력 필드에 대한 자연어 설명
   * @param value - 입력할 값
   */
  async fillByDescription(
    description: string,
    value: string,
    options?: { timeout?: number; clear?: boolean }
  ): Promise<void> {
    await safeFill(this.page, description, value, options);
  }

  /**
   * AI 기반으로 요소 존재 확인
   * @param description - 확인할 요소에 대한 자연어 설명
   */
  async existsByDescription(description: string, timeout?: number): Promise<boolean> {
    return await elementExists(this.page, description, { timeout });
  }

  /**
   * 여러 후보 중 최적의 요소 찾기
   */
  async findBestElement(description: string, candidates: Locator[]): Promise<Locator | null> {
    return await findBestMatch(this.page, description, candidates);
  }

  /**
   * 자연어 기반 폼 작성
   * @param formData - 필드 설명과 값의 맵핑
   * 
   * 예시:
   * await page.fillFormByAI({
   *   '이메일': 'user@example.com',
   *   '비밀번호': 'password123',
   *   '이름': '홍길동'
   * });
   */
  async fillFormByAI(formData: { [description: string]: string }): Promise<void> {
    for (const [description, value] of Object.entries(formData)) {
      try {
        await this.fillByDescription(description, value);
        await this.page.waitForTimeout(200); // 입력 간 짧은 대기
      } catch (error) {
        logger.warn(`폼 필드 입력 실패 (${description})`, { error: error instanceof Error ? error.message : String(error) });
        throw error;
      }
    }
  }

  /**
   * 자연어 기반 폼 제출
   * 제출 버튼을 자동으로 찾아 클릭합니다
   */
  async submitFormByAI(options?: { buttonText?: string }): Promise<void> {
    const buttonText = options?.buttonText || '저장';
    
    // 여러 가능한 제출 버튼 텍스트 시도
    const submitOptions = [buttonText, '제출', 'Submit', 'Save', '저장', '확인', '생성', 'Create'];
    
    for (const text of submitOptions) {
      try {
        await this.clickByDescription(text, { role: 'button' });
        return;
      } catch (error) {
        // 다음 옵션 시도
        continue;
      }
    }
    
    // submit 타입 버튼 찾기
    const submitButton = this.page.locator('button[type="submit"], input[type="submit"]').first();
    if (await submitButton.isVisible()) {
      await submitButton.click();
      return;
    }
    
    throw new Error('폼 제출 버튼을 찾을 수 없습니다');
  }

  /**
   * 자연어 기반 모달 처리
   */
  async handleModalByAI(action: 'confirm' | 'cancel', description?: string): Promise<void> {
    const actionText = action === 'confirm' 
      ? ['확인', 'Confirm', 'Yes', '예', 'OK', 'Delete', '삭제']
      : ['취소', 'Cancel', 'No', '아니오'];

    // 모달이 표시될 때까지 대기
    await this.page.waitForTimeout(500);
    
    const modal = this.page.locator('.modal, [role="dialog"], .modal-dialog').first();
    if (!(await modal.isVisible())) {
      throw new Error('모달이 표시되지 않았습니다');
    }

    // 설명이 제공된 경우 해당 설명으로 찾기
    if (description) {
      try {
        await this.clickByDescription(description);
        return;
      } catch (error) {
        // 설명 실패 시 기본 동작으로 폴백
      }
    }

    // 액션 텍스트로 버튼 찾기
    for (const text of actionText) {
      try {
        const button = modal.locator(`button:has-text("${text}"), a:has-text("${text}")`).first();
        if (await button.isVisible()) {
          await button.click();
          return;
        }
      } catch (error) {
        continue;
      }
    }

    throw new Error(`모달 ${action} 버튼을 찾을 수 없습니다`);
  }
}

