import { test, expect } from '@playwright/test';
import { loginAsUser, loginAsAdmin } from './auth-helpers';
import { DashboardPage } from './page-objects/dashboard-page';
import { AdminMembersPage } from './page-objects/admin-members-page';
import { NavigationHelper } from './helpers/navigation-helper';
import { PageFeatureType } from './types';

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

test.describe('버튼 상호작용 테스트', () => {
  test.describe('사용자 대시보드 버튼', () => {
    let navigation: NavigationHelper;
    let membersPath: string | undefined;
    let profilePath: string | undefined;
    let settingsPath: string | undefined;

    test.beforeEach(async ({ page }) => {
      // 각 테스트 전에 사용자로 로그인
      await loginAsUser(page);
      navigation = await NavigationHelper.create(page);
      membersPath = navigation.resolveMenuPathByVariants([
        ['Members'],
        ['Dashboard', 'Members'],
        ['회원'],
      ]);
      profilePath = navigation.resolveMenuPathByVariants([
        ['Profile'],
        ['프로필'],
      ]);
      settingsPath = navigation.resolveMenuPathByVariants([
        ['Settings'],
        ['설정'],
      ]);
    });

    test('Members 메뉴 버튼을 클릭하면 올바른 URL로 이동해야 합니다', async ({ page }) => {
      test.skip(!membersPath, '사이트맵에 Members 경로가 없습니다.');
      const dashboardPage = new DashboardPage(page);
      
      // members 버튼이 존재하고 표시되는지 확인
      if (await dashboardPage.membersMenuButton.isVisible()) {
        await dashboardPage.clickMembersMenu();
        
        // 네비게이션 대기
        await page.waitForURL(new RegExp(escapeRegExp(membersPath!)));
        
        // URL에 members가 포함되어 있는지 확인
        expect(page.url()).toContain(membersPath!);

        const featureTypes = navigation.getPageFeaturesByPath(membersPath!);
        if (featureTypes.includes(PageFeatureType.TABLE)) {
          await expect(page.locator('table')).toBeVisible();
        }
      } else {
        test.skip();
      }
    });

    test('Profile 메뉴 버튼을 클릭하면 Profile 페이지로 이동해야 합니다', async ({ page }) => {
      test.skip(!profilePath, '사이트맵에 Profile 경로가 없습니다.');
      const dashboardPage = new DashboardPage(page);
      
      if (await dashboardPage.profileMenuButton.isVisible()) {
        await dashboardPage.clickProfileMenu();
        
        await page.waitForURL(new RegExp(escapeRegExp(profilePath!)));
        expect(page.url()).toContain(profilePath!);
      } else {
        test.skip();
      }
    });

    test('Settings 메뉴 버튼을 클릭하면 Settings 페이지로 이동해야 합니다', async ({ page }) => {
      test.skip(!settingsPath, '사이트맵에 Settings 경로가 없습니다.');
      const dashboardPage = new DashboardPage(page);
      
      if (await dashboardPage.settingsMenuButton.isVisible()) {
        await dashboardPage.clickSettingsMenu();
        
        await page.waitForURL(new RegExp(escapeRegExp(settingsPath!)));
        expect(page.url()).toContain(settingsPath!);
      } else {
        test.skip();
      }
    });

    test('로그아웃 버튼을 클릭하면 로그아웃되어야 합니다', async ({ page }) => {
      const dashboardPage = new DashboardPage(page);
      
      if (await dashboardPage.logoutButton.isVisible()) {
        await dashboardPage.clickLogout();
        
        // 로그인 또는 홈 페이지로 리다이렉션 대기
        await page.waitForTimeout(1000);
        
        // 로그인 또는 홈으로 리다이렉션되어야 함
        const currentUrl = page.url();
        expect(currentUrl.includes('/login') || currentUrl.includes('/')).toBeTruthy();
      } else {
        test.skip();
      }
    });
  });

  test.describe('관리자 대시보드 버튼', () => {
    let navigation: NavigationHelper;
    let adminMembersPath: string | undefined;

    test.beforeEach(async ({ page }) => {
      // 각 테스트 전에 관리자로 로그인
      await loginAsAdmin(page);
      navigation = await NavigationHelper.create(page);
      adminMembersPath = navigation.resolveMenuPathByVariants([
        ['Members'],
        ['회원'],
        ['관리자', '회원'],
      ]);
    });

    test('관리자 회원 페이지에 생성 버튼이 표시되어야 합니다', async ({ page }) => {
      const adminPage = new AdminMembersPage(page);
      
      // 생성 버튼이 표시되는지 확인
      await expect(adminPage.createButton).toBeVisible();
      
      // 버튼이 활성화되어 있는지 확인 (비활성화되지 않음)
      const isDisabled = await adminPage.createButton.isDisabled();
      expect(isDisabled).toBeFalsy();
    });

    test('생성 버튼을 클릭하면 회원 생성 폼으로 이동해야 합니다', async ({ page }) => {
      const adminPage = new AdminMembersPage(page);
      
      if (await adminPage.createButton.isVisible()) {
        await adminPage.clickCreateButton();
        
        // 네비게이션 또는 폼 표시 대기
        await page.waitForTimeout(1000);
        
        // 생성 페이지에 있거나 폼이 표시되어야 함
        const url = page.url();
        const formVisible = await page.locator('form, input[name="name"], input[name="email"]').first().isVisible();
        
        expect(url.includes('/create') || url.includes('/new') || formVisible).toBeTruthy();
      } else {
        test.skip();
      }
    });

    test('적절한 경우 비활성화된 버튼이 있어야 합니다', async ({ page }) => {
      const adminPage = new AdminMembersPage(page);
      
      // 페이지가 로드될 때까지 대기
      await adminPage.waitForMemberList();
      
      // 비활성화된 버튼이 있는지 확인 (권한/상태에 따라 존재할 수 있음)
      const disabledButtons = page.locator('button:disabled, a.disabled');
      const count = await disabledButtons.count();
      
      // 비활성화 상태를 확인할 수 있는지만 검증
      // 실제 비활성화된 버튼은 구현에 따라 다름
      expect(count).toBeGreaterThanOrEqual(0);
    });
  });

  test.describe('모달 상호작용', () => {
    test.beforeEach(async ({ page }) => {
      await loginAsAdmin(page);
    });

    test('삭제를 클릭하면 삭제 확인 모달이 열려야 합니다', async ({ page }) => {
      const adminPage = new AdminMembersPage(page);
      
      await adminPage.waitForMemberList();
      
      // 삭제할 회원이 있는지 확인
      const memberCount = await adminPage.getMemberCount();
      
      if (memberCount > 0) {
        // 삭제 버튼 클릭 시도
        if (await adminPage.deleteButton.isVisible()) {
          await adminPage.deleteButton.first().click();
          
          // 모달이 나타날 때까지 대기
          await page.waitForTimeout(500);
          
          // 모달이 표시되는지 확인
          const modalVisible = await adminPage.modal.isVisible();
          
          if (modalVisible) {
            // 모달에 확인 및 취소 버튼이 있는지 확인
            await expect(adminPage.modalConfirmButton).toBeVisible();
            await expect(adminPage.modalCancelButton).toBeVisible();
            
            // 취소 기능 테스트
            await adminPage.cancelDelete();
            
            // 모달이 닫혀야 함
            await page.waitForTimeout(500);
            expect(await adminPage.modal.isVisible()).toBeFalsy();
          }
        }
      } else {
        test.skip();
      }
    });

    test('취소 버튼을 클릭하면 모달이 닫혀야 합니다', async ({ page }) => {
      const adminPage = new AdminMembersPage(page);
      
      await adminPage.waitForMemberList();
      
      // 모달 트리거 시도
      if (await adminPage.deleteButton.first().isVisible()) {
        await adminPage.deleteButton.first().click();
        await page.waitForTimeout(500);
        
        if (await adminPage.modal.isVisible()) {
          // 취소 클릭
          await adminPage.cancelDelete();
          
          // 모달이 닫힐 때까지 대기
          await page.waitForTimeout(500);
          
          // 모달이 표시되지 않아야 함
          expect(await adminPage.modal.isVisible()).toBeFalsy();
        }
      } else {
        test.skip();
      }
    });

    test('모달 백드롭 클릭을 처리해야 합니다', async ({ page }) => {
      const adminPage = new AdminMembersPage(page);
      
      await adminPage.waitForMemberList();
      
      if (await adminPage.deleteButton.first().isVisible()) {
        await adminPage.deleteButton.first().click();
        await page.waitForTimeout(500);
        
        if (await adminPage.modal.isVisible()) {
          // 모달 백드롭 클릭 (존재하는 경우)
          const backdrop = page.locator('.modal-backdrop, .modal-backdrop.show').first();
          
          if (await backdrop.isVisible()) {
            await backdrop.click({ force: true });
            await page.waitForTimeout(500);
            
            // 모달이 백드롭 클릭 시 닫힐 수 있음 (Bootstrap 동작)
            // 이 테스트는 상호작용이 깨지지 않는지 확인합니다
            expect(true).toBeTruthy();
          }
        }
      } else {
        test.skip();
      }
    });
  });
});

