import { Page, Locator } from '@playwright/test';

/**
 * OpenAI API를 활용한 고급 AI 요소 탐색
 * OpenAI API 키가 설정된 경우 사용할 수 있습니다
 */

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
    console.warn('OpenAI API 키가 설정되지 않았습니다. 기본 AI 로케이터를 사용합니다.');
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
    console.warn(`OpenAI Locator 실패 (${description}):`, error);
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
  const { findElementByAI } = await import('./ai-locator');
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

