import { Page, Locator } from '@playwright/test';

/**
 * AI 기반 UI 요소 탐색 유틸리티
 * 자연어 설명을 기반으로 페이지에서 요소를 찾습니다
 */

/**
 * 자연어 설명으로 요소를 찾는 AI 기반 로케이터
 * @param page - Playwright 페이지 객체
 * @param description - 찾을 요소에 대한 자연어 설명 (예: "로그인 버튼", "이메일 입력 필드")
 * @param options - 추가 옵션
 */
export async function findElementByAI(
  page: Page,
  description: string,
  options?: {
    role?: string;
    name?: string;
    exact?: boolean;
    timeout?: number;
  }
): Promise<Locator | null> {
  const timeout = options?.timeout || 5000;

  try {
    // 1단계: 시맨틱 역할 기반 탐색 (ARIA 역할)
    if (options?.role) {
      const roleLocator = page.getByRole(options.role as any, {
        name: options.name || new RegExp(description, 'i'),
        exact: options.exact || false,
      });
      if (await roleLocator.count() > 0) {
        return roleLocator.first();
      }
    }

    // 2단계: 텍스트 기반 탐색
    const textPatterns = generateTextPatterns(description);
    for (const pattern of textPatterns) {
      try {
        const textLocator = page.getByText(pattern, { exact: options?.exact || false });
        if (await textLocator.count({ timeout: 1000 }) > 0) {
          return textLocator.first();
        }
      } catch (e) {
        // 계속 시도
      }
    }

    // 3단계: 레이블 기반 탐색
    for (const pattern of textPatterns) {
      try {
        const labelLocator = page.getByLabel(pattern, { exact: options?.exact || false });
        if (await labelLocator.count({ timeout: 1000 }) > 0) {
          return labelLocator.first();
        }
      } catch (e) {
        // 계속 시도
      }
    }

    // 4단계: 플레이스홀더 기반 탐색
    const placeholderLocator = page.locator(`[placeholder*="${description}" i]`);
    if (await placeholderLocator.count({ timeout: 1000 }) > 0) {
      return placeholderLocator.first();
    }

    // 5단계: name 속성 기반 탐색
    const nameLocator = page.locator(`[name*="${description}" i]`);
    if (await nameLocator.count({ timeout: 1000 }) > 0) {
      return nameLocator.first();
    }

    // 6단계: id 기반 탐색
    const idLocator = page.locator(`#${description.toLowerCase().replace(/\s+/g, '-')}, [id*="${description}" i]`);
    if (await idLocator.count({ timeout: 1000 }) > 0) {
      return idLocator.first();
    }

    // 7단계: title/aria-label 기반 탐색
    const ariaLocator = page.locator(`[title*="${description}" i], [aria-label*="${description}" i]`);
    if (await ariaLocator.count({ timeout: 1000 }) > 0) {
      return ariaLocator.first();
    }

    // 8단계: 구조적 탐색 (button, input, a 등)
    const structuralPatterns = generateStructuralPatterns(description);
    for (const pattern of structuralPatterns) {
      try {
        const structLocator = page.locator(pattern);
        if (await structLocator.count({ timeout: 1000 }) > 0) {
          return structLocator.first();
        }
      } catch (e) {
        // 계속 시도
      }
    }

    return null;
  } catch (error) {
    console.warn(`AI Locator 실패 (${description}):`, error);
    return null;
  }
}

/**
 * 설명에서 텍스트 패턴 생성
 */
function generateTextPatterns(description: string): string[] {
  const patterns: string[] = [description];
  
  // 한국어 변형
  const koreanMappings: { [key: string]: string[] } = {
    '로그인': ['Login', 'Sign In', '로그인', '입장'],
    '로그아웃': ['Logout', 'Sign Out', '로그아웃', '나가기'],
    '생성': ['Create', 'Add', 'New', '생성', '추가', '만들기'],
    '수정': ['Edit', 'Update', 'Modify', '수정', '편집', '변경'],
    '삭제': ['Delete', 'Remove', '삭제', '제거', '지우기'],
    '저장': ['Save', 'Submit', '저장', '제출', '확인'],
    '취소': ['Cancel', '취소', '닫기'],
    '이메일': ['Email', 'E-mail', '이메일', '메일'],
    '비밀번호': ['Password', '비밀번호', '패스워드'],
    '이름': ['Name', '이름', '성함'],
    '회원': ['Member', 'User', '회원', '사용자'],
    '관리자': ['Admin', 'Administrator', '관리자'],
  };

  // 매핑된 키워드 찾기 및 변형 생성
  for (const [key, values] of Object.entries(koreanMappings)) {
    if (description.includes(key)) {
      for (const value of values) {
        patterns.push(description.replace(key, value));
        patterns.push(value);
      }
    }
  }

  return patterns;
}

/**
 * 구조적 셀렉터 패턴 생성
 */
function generateStructuralPatterns(description: string): string[] {
  const lower = description.toLowerCase();
  const patterns: string[] = [];

  // 버튼 관련
  if (lower.includes('버튼') || lower.includes('button') || 
      lower.includes('생성') || lower.includes('저장') || 
      lower.includes('삭제') || lower.includes('취소')) {
    patterns.push(`button:has-text("${description}")`);
    patterns.push(`button:has-text("${generateTextPatterns(description)[0]}")`);
    patterns.push(`[role="button"]:has-text("${description}")`);
    patterns.push(`input[type="submit"][value*="${description}" i]`);
  }

  // 입력 필드 관련
  if (lower.includes('입력') || lower.includes('필드') || 
      lower.includes('input') || lower.includes('이메일') || 
      lower.includes('비밀번호') || lower.includes('email') || 
      lower.includes('password')) {
    patterns.push(`input[type="text"]`);
    patterns.push(`input[type="email"]`);
    patterns.push(`input[type="password"]`);
    patterns.push(`input[name*="${description}" i]`);
    patterns.push(`textarea[name*="${description}" i]`);
  }

  // 링크 관련
  if (lower.includes('링크') || lower.includes('메뉴') || 
      lower.includes('link') || lower.includes('menu')) {
    patterns.push(`a:has-text("${description}")`);
    patterns.push(`a[href*="${description}" i]`);
    patterns.push(`nav a:has-text("${description}")`);
  }

  // 테이블/목록 관련
  if (lower.includes('테이블') || lower.includes('목록') || 
      lower.includes('리스트') || lower.includes('table') || 
      lower.includes('list')) {
    patterns.push('table');
    patterns.push('.table');
    patterns.push('[role="table"]');
    patterns.push('tbody tr');
  }

  return patterns;
}

/**
 * 여러 요소 중 가장 적합한 요소 찾기 (가중치 기반)
 */
export async function findBestMatch(
  page: Page,
  description: string,
  candidates: Locator[]
): Promise<Locator | null> {
  if (candidates.length === 0) return null;
  if (candidates.length === 1) return candidates[0];

  // 가시성과 상호작용 가능 여부로 필터링
  const visibleCandidates: Array<{ locator: Locator; score: number }> = [];
  
  for (const locator of candidates) {
    try {
      const isVisible = await locator.isVisible({ timeout: 1000 });
      if (isVisible) {
        const isEnabled = await locator.isEnabled().catch(() => true);
        let score = isEnabled ? 10 : 5;
        
        // 텍스트 매칭 점수 추가
        const text = await locator.textContent().catch(() => '');
        if (text && description.toLowerCase().includes(text.toLowerCase().substring(0, 5))) {
          score += 5;
        }
        
        visibleCandidates.push({ locator, score });
      }
    } catch (e) {
      // 무시하고 계속
    }
  }

  if (visibleCandidates.length === 0) {
    return candidates[0]; // 가시성이 없어도 첫 번째 반환
  }

  // 점수가 높은 순으로 정렬
  visibleCandidates.sort((a, b) => b.score - a.score);
  return visibleCandidates[0].locator;
}

/**
 * 안전한 클릭 - 요소를 찾고 클릭 (재시도 포함)
 */
export async function safeClick(
  page: Page,
  description: string,
  options?: {
    role?: string;
    timeout?: number;
    retries?: number;
  }
): Promise<void> {
  const retries = options?.retries || 3;
  const timeout = options?.timeout || 5000;

  for (let i = 0; i < retries; i++) {
    try {
      const element = await findElementByAI(page, description, {
        role: options?.role,
        timeout,
      });

      if (element) {
        await element.click({ timeout });
        return;
      }
    } catch (error) {
      if (i === retries - 1) {
        throw new Error(`요소를 찾거나 클릭할 수 없습니다: ${description}`);
      }
      await page.waitForTimeout(1000);
    }
  }

  throw new Error(`요소를 찾을 수 없습니다: ${description}`);
}

/**
 * 안전한 입력 - 요소를 찾고 입력
 */
export async function safeFill(
  page: Page,
  description: string,
  value: string,
  options?: {
    timeout?: number;
    clear?: boolean;
  }
): Promise<void> {
  const timeout = options?.timeout || 5000;
  const clear = options?.clear !== false;

  const element = await findElementByAI(page, description, { timeout });

  if (!element) {
    throw new Error(`입력 필드를 찾을 수 없습니다: ${description}`);
  }

  if (clear) {
    await element.clear();
  }

  await element.fill(value, { timeout });
}

/**
 * 요소 존재 확인
 */
export async function elementExists(
  page: Page,
  description: string,
  options?: { timeout?: number }
): Promise<boolean> {
  const element = await findElementByAI(page, description, {
    timeout: options?.timeout || 3000,
  });
  return element !== null && (await element?.isVisible().catch(() => false));
}

