# Playwright 테스트 스위트 가이드

이 프로젝트는 Laravel 10.x 애플리케이션을 위한 Playwright 기반 E2E 테스트 스위트입니다. **AI 기반 자연어 UI 탐색** 기능을 포함하여 다양한 사이트 구조에 자동으로 적응합니다.

## 📁 프로젝트 구조

```
WebTestAutoSystem/
├── playwright.config.ts          # Playwright 설정 파일
├── package.json                  # Node.js 의존성 및 스크립트
├── tsconfig.json                 # TypeScript 설정
├── .env.example                  # 환경 변수 템플릿
├── .gitignore                    # Git 제외 파일 목록
└── tests/
    ├── auth-helpers.ts           # 로그인 헬퍼 함수
    ├── login.spec.ts             # 로그인 테스트
    ├── buttons.spec.ts           # 버튼 상호작용 테스트
    ├── crud.spec.ts              # CRUD 작업 테스트
    ├── ai-login.spec.ts          # AI 기반 로그인 테스트
    ├── utils/                    # 유틸리티 함수
    │   ├── ai-locator.ts         # AI 기반 요소 탐색
    │   └── openai-locator.ts     # OpenAI 통합
    └── page-objects/             # 페이지 객체 패턴 구현
        ├── base-page.ts          # 기본 페이지 클래스
        ├── ai-base-page.ts       # AI 기반 페이지 클래스
        ├── login-page.ts         # 로그인 페이지
        ├── ai-login-page.ts      # AI 기반 로그인 페이지
        ├── dashboard-page.ts     # 사용자 대시보드 페이지
        └── admin-members-page.ts # 관리자 회원 관리 페이지
```

## 🚀 설치 방법

### 1. Node.js 및 npm 설치 확인

```bash
node --version
npm --version
```

### 2. 의존성 설치

```bash
npm install
```

또는 Playwright와 TypeScript를 직접 설치:

```bash
npm install --save-dev @playwright/test typescript dotenv @types/node
npm install openai  # OpenAI 통합 사용 시 (선택사항)
```

### 3. Playwright 브라우저 설치

```bash
npx playwright install
```

특정 브라우저만 설치:

```bash
npx playwright install chromium
npx playwright install firefox
npx playwright install webkit
```

### 4. 환경 변수 설정

`.env.example` 파일을 `.env`로 복사하고 실제 값으로 수정:

```bash
cp .env.example .env
```

`.env` 파일 수정:

```env
BASE_URL=http://localhost:8000
USER_EMAIL=user@example.com
USER_PASSWORD=password123
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=admin123

# OpenAI API Key (선택사항 - 고급 AI 요소 탐색을 위해)
# OPENAI_API_KEY=sk-your-openai-api-key-here
```

## 🧪 테스트 실행

### 모든 테스트 실행

```bash
npm test
# 또는
npx playwright test
```

### 헤드리스 모드 (기본값 - 브라우저 UI 없이)

```bash
npm test
```

### 헤디드 모드 (브라우저 UI와 함께 - 디버깅용)

```bash
npm run test:headed
# 또는
npx playwright test --headed
```

### 특정 테스트 파일 실행

```bash
# 로그인 테스트만
npm run test:login

# 버튼 테스트만
npm run test:buttons

# CRUD 테스트만
npm run test:crud

# AI 기반 로그인 테스트
npx playwright test tests/ai-login.spec.ts
```

### 특정 브라우저로 실행

```bash
npm run test:chromium
npm run test:firefox
npm run test:webkit
```

### 디버그 모드 (단계별 실행)

```bash
npm run test:debug
# 또는
npx playwright test --debug
```

### UI 모드 (인터랙티브 테스트 실행)

```bash
npm run test:ui
# 또는
npx playwright test --ui
```

### 테스트 리포트 보기

```bash
npm run report
# 또는
npx playwright show-report
```

## 📝 테스트 파일 설명

### 1. `login.spec.ts` - 로그인 테스트

- ✅ 사용자 로그인 성공 및 대시보드 리다이렉션 확인
- ✅ 잘못된 자격증명으로 로그인 실패 확인
- ✅ 빈 필드 유효성 검사 확인
- ✅ 관리자 로그인 성공 및 관리 페이지 리다이렉션 확인
- ✅ 관리자 페이지에서 사용자 자격증명 거부 확인
- ✅ 로그인 폼 UI 요소 확인
- ✅ 비밀번호 마스킹 확인

### 2. `buttons.spec.ts` - 버튼 상호작용 테스트

**사용자 대시보드:**
- ✅ 메뉴 버튼들이 올바른 URL로 이동하는지 확인
- ✅ 로그아웃 버튼 동작 확인

**관리자 대시보드:**
- ✅ 생성 버튼 표시 및 활성화 상태 확인
- ✅ 생성 버튼 클릭 시 폼 페이지로 이동 확인
- ✅ 비활성화된 버튼 상태 확인

**모달 상호작용:**
- ✅ 삭제 확인 모달 열기 확인
- ✅ 모달 취소 버튼 동작 확인
- ✅ 모달 백드롭 클릭 처리 확인

### 3. `crud.spec.ts` - CRUD 작업 테스트

**Create (생성):**
- ✅ 새 회원 생성 성공 확인
- ✅ 생성 후 목록에 표시되는지 확인
- ✅ 잘못된 데이터 유효성 검사 확인

**Read (읽기):**
- ✅ 회원 목록 표시 확인
- ✅ 회원 상세 정보 표시 확인
- ✅ 검색 및 필터 기능 확인

**Update (수정):**
- ✅ 회원 정보 수정 성공 확인
- ✅ 수정 취소 시 변경사항 미저장 확인

**Delete (삭제):**
- ✅ 회원 삭제 성공 확인
- ✅ 삭제 취소 시 회원 유지 확인

**전체 CRUD 플로우:**
- ✅ 생성 → 읽기 → 수정 → 삭제 전체 사이클 테스트

### 4. `ai-login.spec.ts` - AI 기반 로그인 테스트

- ✅ AI 기반 자연어 로그인
- ✅ 다양한 사이트 구조 자동 적응
- ✅ 자연어 요소 탐색 테스트

## 🏗️ 페이지 객체 패턴

페이지 객체 패턴을 사용하여 코드 재사용성과 유지보수성을 향상시켰습니다.

### BasePage (`base-page.ts`)
- 모든 페이지 객체의 기본 클래스
- 공통 메서드 제공 (goto, screenshot 등)

### AIBasePage (`ai-base-page.ts`) ⭐ **신규**
- AI 기반 페이지 객체의 기본 클래스
- 자연어 기반 요소 탐색 기능 제공
- 폼 작성, 모달 처리 등 편의 메서드 포함

### LoginPage (`login-page.ts`)
- 로그인 페이지의 모든 요소와 메서드 캡슐화
- 이메일/비밀번호 입력, 로그인 버튼 클릭 등

### AILoginPage (`ai-login-page.ts`) ⭐ **신규**
- AI 기반 로그인 페이지
- 다양한 로그인 폼 구조에 자동 적응

### DashboardPage (`dashboard-page.ts`)
- 사용자 대시보드 페이지 요소
- 메뉴 버튼, 로그아웃 버튼 등

### AdminMembersPage (`admin-members-page.ts`)
- 관리자 회원 관리 페이지
- CRUD 작업을 위한 모든 메서드 포함

## 🤖 AI 기반 UI 탐색 (신규 기능)

각 사이트마다 구조가 다를 수 있으므로, **AI 기반 자연어 UI 탐색** 기능을 추가했습니다. 이를 통해 다양한 사이트 구조에 자동으로 적응할 수 있습니다.

### AI 기능 특징

- ✅ **자연어 기반 요소 탐색**: "로그인 버튼", "이메일 입력" 등 자연어로 요소 찾기
- ✅ **자동 구조 인식**: 다양한 클래스명, ID 패턴, 한국어/영어 혼용 자동 처리
- ✅ **스마트 폴백**: 여러 전략을 순차적으로 시도하여 요소 찾기 성공률 극대화
- ✅ **OpenAI 통합 (선택사항)**: 더 정확한 탐색을 위한 OpenAI API 지원

### 빠른 시작

```typescript
import { AILoginPage } from './page-objects/ai-login-page';

// 자연어로 로그인
const loginPage = new AILoginPage(page);
await loginPage.login('user@example.com', 'password123');
```

```typescript
import { AIBasePage } from './page-objects/ai-base-page';

class MyPage extends AIBasePage {
  async performAction() {
    // 자연어로 요소 클릭
    await this.clickByDescription('생성 버튼');
    
    // 자연어로 입력
    await this.fillByDescription('이메일', 'test@example.com');
    
    // 자연어로 폼 작성
    await this.fillFormByAI({
      '이름': '홍길동',
      '이메일': 'hong@example.com',
      '전화번호': '010-1234-5678'
    });
    
    // 자연어로 폼 제출
    await this.submitFormByAI();
  }
}
```

### 지원되는 자연어 패턴

| 한국어 | 영어 변형 |
|--------|----------|
| 로그인 | Login, Sign In |
| 로그아웃 | Logout, Sign Out |
| 생성 | Create, Add, New |
| 수정 | Edit, Update, Modify |
| 삭제 | Delete, Remove |
| 저장 | Save, Submit |
| 취소 | Cancel |
| 이메일 | Email, E-mail |
| 비밀번호 | Password |

### 요소 탐색 전략 (8단계 폴백)

1. ARIA 역할 기반 탐색 (`getByRole`)
2. 텍스트 기반 탐색 (`getByText`)
3. 레이블 기반 탐색 (`getByLabel`)
4. 플레이스홀더 탐색
5. name 속성 탐색
6. id 기반 탐색
7. title/aria-label 탐색
8. 구조적 패턴 매칭

### OpenAI 통합 (선택사항)

OpenAI API를 사용하면 더 정확한 요소 탐색이 가능합니다:

```typescript
// .env에 OPENAI_API_KEY 설정 후
const element = await page.findElement('복잡한 버튼', {
  useOpenAI: true,
  apiKey: process.env.OPENAI_API_KEY
});
```

## 🔧 설정 파일 설명

### `playwright.config.ts`

주요 설정:
- `baseURL`: 기본 URL (환경 변수 또는 기본값)
- `testDir`: 테스트 파일 위치 (`./tests`)
- `retries`: CI에서 실패 시 재시도 횟수
- `workers`: 병렬 실행 워커 수
- `reporter`: 테스트 리포트 형식 (HTML)
- `use`: 공통 설정 (스크린샷, 비디오, 트레이스 등)
- `projects`: 테스트할 브라우저 목록

### `tsconfig.json`

TypeScript 컴파일러 설정:
- ES2020 타겟
- strict 모드 활성화
- Playwright 타입 지원

## 🔍 테스트 작성 팁

### 1. 기본 셀렉터 사용

```typescript
// Bootstrap 클래스
page.locator('.btn-primary')
page.locator('.modal')

// Laravel 폼 필드
page.locator('input[name="email"]')
page.locator('form[action="/admin/members"]')

// 텍스트 기반
page.locator('button:has-text("Login")')
page.locator('a:has-text("Members")')
```

### 2. AI 기반 자연어 셀렉터 (권장)

```typescript
// 자연어로 요소 찾기
await page.clickByDescription('로그인 버튼');
await page.fillByDescription('이메일', 'user@example.com');

// AIBasePage 사용
const page = new AIBasePage(pageInstance);
await page.fillFormByAI({
  '이름': '홍길동',
  '이메일': 'hong@example.com'
});
await page.submitFormByAI();
```

### 3. 대기 전략

```typescript
// URL 변경 대기
await expect(page).toHaveURL(/.*\/dashboard/);

// 요소 표시 대기
await expect(element).toBeVisible();

// 네트워크 요청 완료 대기
await page.waitForLoadState('networkidle');
```

### 4. 환경 변수 사용

```typescript
const email = process.env.USER_EMAIL || 'default@example.com';
```

## 🐛 문제 해결

### 브라우저가 열리지 않는 경우

```bash
npx playwright install
```

### 테스트가 느린 경우

`playwright.config.ts`에서 `workers` 수를 조정:

```typescript
workers: 4  // 병렬 실행 워커 수 증가
```

### Laravel 앱이 실행되지 않는 경우

Laravel 개발 서버를 먼저 실행:

```bash
php artisan serve
```

그 다음 테스트 실행:

```bash
npm test
```

또는 Playwright 설정에서 자동 시작 설정:

```typescript
webServer: {
  command: 'php artisan serve',
  url: 'http://127.0.0.1:8000',
  reuseExistingServer: !process.env.CI,
}
```

### AI 요소 탐색 실패 시

1. 더 구체적인 설명 사용: "로그인" → "메인 메뉴의 로그인 버튼"
2. 타임아웃 증가: `{ timeout: 10000 }`
3. 요소 로드 대기 추가: `await page.waitForLoadState('networkidle')`
4. OpenAI 사용 (더 정확한 탐색)

### OpenAI 오류 발생 시

1. API 키 확인
2. 네트워크 연결 확인
3. `useOpenAI: false`로 설정하여 기본 AI만 사용

## 📊 테스트 리포트

테스트 실행 후 HTML 리포트가 생성됩니다:

```bash
npm run report
```

이 명령어로 브라우저에서 상세한 테스트 결과를 확인할 수 있습니다.

## 🎯 CI/CD 통합

GitHub Actions 예시:

```yaml
name: Playwright Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - name: Install dependencies
        run: npm ci
      - name: Install Playwright
        run: npx playwright install --with-deps
      - name: Run tests
        run: npm test
        env:
          BASE_URL: ${{ secrets.BASE_URL }}
          USER_EMAIL: ${{ secrets.USER_EMAIL }}
          USER_PASSWORD: ${{ secrets.USER_PASSWORD }}
          ADMIN_EMAIL: ${{ secrets.ADMIN_EMAIL }}
          ADMIN_PASSWORD: ${{ secrets.ADMIN_PASSWORD }}
      - uses: actions/upload-artifact@v3
        if: always()
        with:
          name: playwright-report
          path: playwright-report/
```

## 📚 추가 리소스

- [Playwright 공식 문서](https://playwright.dev/)
- [Playwright TypeScript 가이드](https://playwright.dev/docs/intro)
- [Page Object Model 패턴](https://playwright.dev/docs/pom)

## ⚠️ 주의사항

1. **셀렉터 맞춤**: 실제 Laravel/Blade 템플릿 구조에 맞게 셀렉터를 수정해야 합니다. AI 기반 탐색을 사용하면 자동으로 적응합니다.
2. **환경 변수**: `.env` 파일에 실제 자격증명을 설정해야 합니다.
3. **테스트 데이터**: CRUD 테스트는 실제 데이터베이스에 영향을 줄 수 있으므로, 테스트 환경을 사용하거나 테스트 후 정리를 고려하세요.
4. **타이밍**: 네트워크 지연에 따라 `waitForTimeout` 값을 조정해야 할 수 있습니다.
5. **AI 탐색**: AI 기반 탐색은 다양한 사이트 구조에 적응하지만, 매우 특수한 구조의 경우 수동 셀렉터 조정이 필요할 수 있습니다.

---

**문의사항이 있으시면 이슈를 등록해 주세요!**
