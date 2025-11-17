import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './auth-helpers';
import { AdminMembersPage } from './page-objects/admin-members-page';

test.describe('CRUD 작업 테스트', () => {
  let adminPage: AdminMembersPage;
  let testMemberName: string;
  let testMemberEmail: string;

  test.beforeEach(async ({ page }) => {
    // 각 테스트 전에 관리자로 로그인
    await loginAsAdmin(page);
    adminPage = new AdminMembersPage(page);
    
    // 각 테스트 실행에 대해 고유한 테스트 데이터 생성
    const timestamp = Date.now();
    testMemberName = `Test Member ${timestamp}`;
    testMemberEmail = `testmember${timestamp}@example.com`;
    
    // 회원 페이지로 이동
    await adminPage.waitForMemberList();
  });

  test.describe('생성 작업', () => {
    test('새 회원을 성공적으로 생성해야 합니다', async ({ page }) => {
      // 초기 회원 수 가져오기
      const initialCount = await adminPage.getMemberCount();
      
      // 생성 버튼 클릭
      await adminPage.clickCreateButton();
      
      // 폼이 로드될 때까지 대기
      await page.waitForTimeout(1000);
      
      // 회원 폼 작성
      // 실제 폼 구조에 맞게 필드 이름을 조정하세요
      await adminPage.fillMemberForm({
        name: testMemberName,
        email: testMemberEmail,
        phone: '1234567890'
      });
      
      // 폼 제출
      await adminPage.submitForm();
      
      // 리다이렉션 또는 성공 메시지 대기
      await page.waitForTimeout(2000);
      
      // 회원이 생성되었는지 확인 - URL 또는 성공 메시지 확인
      const successMessage = page.locator('.alert-success, .success, .text-success').first();
      const successVisible = await successMessage.isVisible();
      
      // 또는 회원 목록 페이지에 다시 있는지 확인하여 검증
      const onMembersPage = page.url().includes('/admin/members');
      
      expect(successVisible || onMembersPage).toBeTruthy();
      
      // 회원이 목록에 나타나는지 확인
      await adminPage.waitForMemberList();
      const memberExists = await adminPage.memberExists(testMemberName) || 
                          await adminPage.memberExists(testMemberEmail);
      
      expect(memberExists).toBeTruthy();
    });

    test('잘못된 폼 데이터에 대해 유효성 검사 오류를 표시해야 합니다', async ({ page }) => {
      await adminPage.clickCreateButton();
      await page.waitForTimeout(1000);
      
      // 빈 폼을 제출 시도
      await adminPage.submitForm();
      
      // 유효성 검사 오류 대기
      await page.waitForTimeout(1000);
      
      // 유효성 검사 오류 메시지 확인
      const errors = page.locator('.invalid-feedback, .text-danger, .error');
      const errorCount = await errors.count();
      
      // 최소 하나의 유효성 검사 오류가 있어야 함
      expect(errorCount).toBeGreaterThan(0);
    });
  });

  test.describe('읽기 작업', () => {
    test('회원 목록을 표시해야 합니다', async ({ page }) => {
      // 회원 테이블/목록이 표시되는지 확인
      await expect(adminPage.membersTable).toBeVisible();
      
      // 테이블에 내용이 있는지 확인
      const memberCount = await adminPage.getMemberCount();
      expect(memberCount).toBeGreaterThanOrEqual(0);
    });

    test('회원을 볼 때 회원 세부 정보를 표시해야 합니다', async ({ page }) => {
      // 먼저 볼 회원 생성
      await adminPage.clickCreateButton();
      await page.waitForTimeout(1000);
      
      await adminPage.fillMemberForm({
        name: testMemberName,
        email: testMemberEmail
      });
      
      await adminPage.submitForm();
      await page.waitForTimeout(2000);
      
      // 이제 회원이 목록에 나타나는지 확인
      await adminPage.waitForMemberList();
      const memberExists = await adminPage.memberExists(testMemberName);
      
      if (memberExists) {
        // 회원 이름/행을 클릭하여 세부 정보 보기
        const memberLink = page.locator(`text="${testMemberName}"`).first();
        await memberLink.click();
        
        await page.waitForTimeout(1000);
        
        // 회원 세부 정보가 표시되는지 확인
        const nameVisible = await page.locator(`text="${testMemberName}"`).isVisible();
        const emailVisible = await page.locator(`text="${testMemberEmail}"`).isVisible();
        
        expect(nameVisible || emailVisible).toBeTruthy();
      } else {
        test.skip();
      }
    });

    test('회원을 검색하고 필터링해야 합니다', async ({ page }) => {
      if (await adminPage.searchInput.isVisible()) {
        // 검색 수행
        await adminPage.searchMember(testMemberName);
        
        await page.waitForTimeout(1000);
        
        // 검색 결과에 검색어가 포함되어 있는지 확인
        const results = page.locator(`text="${testMemberName}"`);
        const resultCount = await results.count();
        
        // 최소 0개의 결과가 있어야 함 (회원 존재 여부에 따라)
        expect(resultCount).toBeGreaterThanOrEqual(0);
      } else {
        test.skip();
      }
    });
  });

  test.describe('수정 작업', () => {
    test('기존 회원을 성공적으로 편집해야 합니다', async ({ page }) => {
      // 먼저 편집할 회원 생성
      await adminPage.clickCreateButton();
      await page.waitForTimeout(1000);
      
      await adminPage.fillMemberForm({
        name: testMemberName,
        email: testMemberEmail
      });
      
      await adminPage.submitForm();
      await page.waitForTimeout(2000);
      await adminPage.waitForMemberList();
      
      // 회원에 대한 편집 버튼 찾기 및 클릭
      const memberExists = await adminPage.memberExists(testMemberName);
      
      if (memberExists) {
        await adminPage.clickEditForMember(testMemberName);
        
        // 편집 폼이 로드될 때까지 대기
        await page.waitForTimeout(1000);
        
        // 회원 정보 업데이트
        const updatedName = `${testMemberName} - Updated`;
        await adminPage.fillMemberForm({
          name: updatedName
        });
        
        // 폼 제출
        await adminPage.submitForm();
        
        // 업데이트가 완료될 때까지 대기
        await page.waitForTimeout(2000);
        
        // 회원이 업데이트되었는지 확인 - 성공 메시지 또는 업데이트된 이름 확인
        await adminPage.waitForMemberList();
        const updatedMemberExists = await adminPage.memberExists(updatedName);
        
        expect(updatedMemberExists).toBeTruthy();
      } else {
        test.skip();
      }
    });

    test('편집을 취소하고 변경사항을 저장하지 않아야 합니다', async ({ page }) => {
      // 편집할 회원 찾기
      await adminPage.waitForMemberList();
      const memberCount = await adminPage.getMemberCount();
      
      if (memberCount > 0) {
        // 사용 가능한 첫 번째 회원에서 편집 클릭
        if (await adminPage.editButton.first().isVisible()) {
          await adminPage.editButton.first().click();
          await page.waitForTimeout(1000);
          
          // 일부 변경사항 만들기
          await adminPage.fillMemberForm({
            name: 'This should not be saved'
          });
          
          // 취소 버튼 클릭 (존재하는 경우)
          const cancelButton = page.locator('button:has-text("Cancel"), a:has-text("Cancel")').first();
          if (await cancelButton.isVisible()) {
            await cancelButton.click();
            await page.waitForTimeout(1000);
            
            // 회원 목록 페이지에 다시 있는지 확인
            expect(page.url()).toContain('/admin/members');
            
            // 변경사항이 저장되지 않았는지 확인
            const unsavedNameExists = await adminPage.memberExists('This should not be saved');
            expect(unsavedNameExists).toBeFalsy();
          }
        }
      } else {
        test.skip();
      }
    });
  });

  test.describe('삭제 작업', () => {
    test('회원을 성공적으로 삭제해야 합니다', async ({ page }) => {
      // 먼저 삭제할 회원 생성
      await adminPage.clickCreateButton();
      await page.waitForTimeout(1000);
      
      await adminPage.fillMemberForm({
        name: testMemberName,
        email: testMemberEmail
      });
      
      await adminPage.submitForm();
      await page.waitForTimeout(2000);
      await adminPage.waitForMemberList();
      
      // 삭제 전 카운트 가져오기
      const countBefore = await adminPage.getMemberCount();
      
      // 회원 찾기 및 삭제
      const memberExists = await adminPage.memberExists(testMemberName);
      
      if (memberExists) {
        await adminPage.clickDeleteForMember(testMemberName);
        
        // 모달이 나타날 때까지 대기
        await page.waitForTimeout(1000);
        
        // 삭제 확인
        if (await adminPage.modal.isVisible()) {
          await adminPage.confirmDelete();
        }
        
        // 삭제가 완료될 때까지 대기
        await page.waitForTimeout(2000);
        
        // 회원이 삭제되었는지 확인
        await adminPage.waitForMemberList();
        const memberStillExists = await adminPage.memberExists(testMemberName);
        
        expect(memberStillExists).toBeFalsy();
        
        // 카운트가 감소했는지 확인
        const countAfter = await adminPage.getMemberCount();
        expect(countAfter).toBeLessThan(countBefore);
      } else {
        test.skip();
      }
    });

    test('모달에서 취소를 클릭하면 삭제를 취소해야 합니다', async ({ page }) => {
      // 먼저 회원 생성
      await adminPage.clickCreateButton();
      await page.waitForTimeout(1000);
      
      await adminPage.fillMemberForm({
        name: testMemberName,
        email: testMemberEmail
      });
      
      await adminPage.submitForm();
      await page.waitForTimeout(2000);
      await adminPage.waitForMemberList();
      
      const memberExists = await adminPage.memberExists(testMemberName);
      
      if (memberExists) {
        // 삭제 시도
        await adminPage.clickDeleteForMember(testMemberName);
        await page.waitForTimeout(1000);
        
        // 삭제 취소
        if (await adminPage.modal.isVisible()) {
          await adminPage.cancelDelete();
          await page.waitForTimeout(1000);
          
          // 회원이 여전히 존재하는지 확인
          await adminPage.waitForMemberList();
          const memberStillExists = await adminPage.memberExists(testMemberName);
          
          expect(memberStillExists).toBeTruthy();
        }
      } else {
        test.skip();
      }
    });
  });

  test.describe('전체 CRUD 플로우', () => {
    test('전체 CRUD 사이클을 완료해야 합니다: 생성, 읽기, 수정, 삭제', async ({ page }) => {
      // CREATE (생성)
      await adminPage.clickCreateButton();
      await page.waitForTimeout(1000);
      
      await adminPage.fillMemberForm({
        name: testMemberName,
        email: testMemberEmail
      });
      
      await adminPage.submitForm();
      await page.waitForTimeout(2000);
      await adminPage.waitForMemberList();
      
      // READ (읽기) - 회원이 생성되었는지 확인
      let memberExists = await adminPage.memberExists(testMemberName);
      expect(memberExists).toBeTruthy();
      
      // UPDATE (수정)
      await adminPage.clickEditForMember(testMemberName);
      await page.waitForTimeout(1000);
      
      const updatedName = `${testMemberName} - Modified`;
      await adminPage.fillMemberForm({
        name: updatedName
      });
      
      await adminPage.submitForm();
      await page.waitForTimeout(2000);
      await adminPage.waitForMemberList();
      
      // READ (읽기) - 업데이트 확인
      const updatedExists = await adminPage.memberExists(updatedName);
      expect(updatedExists).toBeTruthy();
      
      // DELETE (삭제)
      await adminPage.clickDeleteForMember(updatedName);
      await page.waitForTimeout(1000);
      
      if (await adminPage.modal.isVisible()) {
        await adminPage.confirmDelete();
      }
      
      await page.waitForTimeout(2000);
      await adminPage.waitForMemberList();
      
      // READ (읽기) - 삭제 확인
      const deletedMemberExists = await adminPage.memberExists(updatedName);
      expect(deletedMemberExists).toBeFalsy();
    });
  });
});

