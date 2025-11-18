import { Page, Locator } from '@playwright/test';
import { logger } from './logger';

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
        if (await textLocator.first().isVisible({ timeout: 1000 }).catch(() => false)) {
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
        if (await labelLocator.first().isVisible({ timeout: 1000 }).catch(() => false)) {
          return labelLocator.first();
        }
      } catch (e) {
        // 계속 시도
      }
    }

    // 4단계: 플레이스홀더 기반 탐색
    const placeholderLocator = page.locator(`[placeholder*="${description}" i]`);
    if (await placeholderLocator.first().isVisible({ timeout: 1000 }).catch(() => false)) {
      return placeholderLocator.first();
    }

    // 5단계: name 속성 기반 탐색
    const nameLocator = page.locator(`[name*="${description}" i]`);
    if (await nameLocator.first().isVisible({ timeout: 1000 }).catch(() => false)) {
      return nameLocator.first();
    }

    // 6단계: id 기반 탐색
    const idLocator = page.locator(`#${description.toLowerCase().replace(/\s+/g, '-')}, [id*="${description}" i]`);
    if (await idLocator.first().isVisible({ timeout: 1000 }).catch(() => false)) {
      return idLocator.first();
    }

    // 7단계: title/aria-label 기반 탐색
    const ariaLocator = page.locator(`[title*="${description}" i], [aria-label*="${description}" i]`);
    if (await ariaLocator.first().isVisible({ timeout: 1000 }).catch(() => false)) {
      return ariaLocator.first();
    }

    // 8단계: 구조적 탐색 (button, input, a 등)
    const structuralPatterns = generateStructuralPatterns(description);
    for (const pattern of structuralPatterns) {
      try {
        const structLocator = page.locator(pattern);
        if (await structLocator.first().isVisible({ timeout: 1000 }).catch(() => false)) {
          return structLocator.first();
        }
      } catch (e) {
        // 계속 시도
      }
    }

    return null;
  } catch (error) {
    logger.warn(`AI Locator 실패 (${description})`, { error: error instanceof Error ? error.message : String(error) });
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

// ============================================================================
// OpenAI 통합 기능
// ============================================================================

interface OpenAIResponse {
  selector: string;
  strategy: string;
  confidence: number;
  alternatives?: string[];
}

/**
 * OpenAI를 사용하여 페이지 구조를 분석하고 요소 찾기
 * 주의: OpenAI API 키가 환경 변수에 설정되어 있어야 합니다
 */
export async function findElementByOpenAI(
  page: Page,
  description: string,
  options?: {
    apiKey?: string;
    model?: string;
    timeout?: number;
  }
): Promise<Locator | null> {
  const apiKey = options?.apiKey || (typeof process !== 'undefined' ? process.env.OPENAI_API_KEY : undefined);
  
  if (!apiKey) {
    logger.warn('OpenAI API 키가 설정되지 않았습니다. 기본 AI 로케이터를 사용합니다.');
    return null;
  }

  try {
    // 페이지의 HTML 구조 가져오기 (제한된 크기)
    const pageContent = await page.content();
    const simplifiedHTML = simplifyHTML(pageContent, 5000); // 5KB로 제한

    // OpenAI에 프롬프트 전송
    const prompt = createPrompt(description, simplifiedHTML);
    
    // Playwright의 page.evaluate를 통해 fetch 호출하거나
    // Node.js 18+에서는 내장 fetch 사용
    // 그 외에는 node-fetch 필요
    let fetchFunc: typeof fetch;
    if (typeof fetch !== 'undefined') {
      fetchFunc = fetch;
    } else if (typeof global !== 'undefined' && (global as any).fetch) {
      fetchFunc = (global as any).fetch;
    } else {
      // node-fetch 사용 시
      const nodeFetch = await import('node-fetch');
      fetchFunc = nodeFetch.default as any;
    }
    
    const response = await fetchFunc('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: options?.model || 'gpt-4',
        messages: [
          {
            role: 'system',
            content: '당신은 웹 페이지 요소를 찾는 전문가입니다. 사용자의 자연어 설명을 기반으로 가장 적합한 CSS 셀렉터나 Playwright 셀렉터를 제안해야 합니다. JSON 형식으로 응답하세요: {"selector": "셀렉터", "strategy": "전략", "confidence": 0.0-1.0, "alternatives": ["대안1", "대안2"]}'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API 오류: ${response.statusText}`);
    }

    const data = await response.json();
    const result: OpenAIResponse = JSON.parse(data.choices[0].message.content);

    // 제안된 셀렉터로 요소 찾기
    if (result.selector) {
      try {
        const locator = page.locator(result.selector).first();
        if (await locator.isVisible({ timeout: options?.timeout || 3000 })) {
          return locator;
        }
      } catch (e) {
        // 대안 셀렉터 시도
        if (result.alternatives) {
          for (const alt of result.alternatives) {
            try {
              const altLocator = page.locator(alt).first();
              if (await altLocator.isVisible({ timeout: 1000 })) {
                return altLocator;
              }
            } catch (e2) {
              continue;
            }
          }
        }
      }
    }

    return null;
  } catch (error) {
    logger.warn(`OpenAI Locator 실패 (${description})`, { error: error instanceof Error ? error.message : String(error) });
    return null;
  }
}

/**
 * HTML을 단순화하여 토큰 사용량 줄이기
 */
function simplifyHTML(html: string, maxLength: number): string {
  // 스크립트와 스타일 제거
  let simplified = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
  simplified = simplified.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
  
  // 주석 제거
  simplified = simplified.replace(/<!--[\s\S]*?-->/g, '');
  
  // 공백 정리
  simplified = simplified.replace(/\s+/g, ' ').trim();
  
  // 길이 제한
  if (simplified.length > maxLength) {
    simplified = simplified.substring(0, maxLength) + '...';
  }
  
  return simplified;
}

/**
 * OpenAI에 보낼 프롬프트 생성
 */
function createPrompt(description: string, html: string): string {
  return `
다음 HTML 구조에서 "${description}"에 해당하는 요소를 찾아주세요.

요구사항:
1. 가장 적합한 CSS 셀렉터 또는 Playwright 셀렉터를 제안하세요
2. 신뢰도를 0.0-1.0 사이로 평가하세요
3. 대안 셀렉터도 제공하세요
4. Playwright의 시맨틱 셀렉터(getByRole, getByText 등)를 우선적으로 고려하세요

HTML:
${html}

설명: ${description}

JSON 형식으로 응답하세요:
{
  "selector": "가장 적합한 셀렉터",
  "strategy": "사용한 전략 (예: getByRole, CSS selector, getByText 등)",
  "confidence": 0.85,
  "alternatives": ["대안 셀렉터 1", "대안 셀렉터 2"]
}
`;
}

/**
 * 하이브리드 방식: 먼저 기본 AI 로케이터를 시도하고, 실패하면 OpenAI 사용
 */
export async function findElementHybrid(
  page: Page,
  description: string,
  options?: {
    useOpenAI?: boolean;
    apiKey?: string;
    timeout?: number;
  }
): Promise<Locator | null> {
  // 먼저 기본 AI 로케이터 시도
  const basicResult = await findElementByAI(page, description, { timeout: options?.timeout });
  
  if (basicResult && await basicResult.isVisible().catch(() => false)) {
    return basicResult;
  }

  // 기본 로케이터 실패 시 OpenAI 시도
  if (options?.useOpenAI !== false) {
    const openAIResult = await findElementByOpenAI(page, description, options);
    if (openAIResult) {
      return openAIResult;
    }
  }

  return null;
}

