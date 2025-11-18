import { chromium, FullConfig } from '@playwright/test';
import { loginAsUser, loginAsAdmin } from './auth-helpers';
import { SiteMapBuilder } from './helpers/site-map-builder';
import { SiteMapStore } from './helpers/site-map-store';
import { SiteMap, SiteSectionType } from './types';
import { logger } from './helpers/logger';

/**
 * 두 사이트맵을 병합합니다.
 */
function mergeSiteMaps(target: SiteMap, source: SiteMap): SiteMap {
  const merged: SiteMap = {
    baseUrl: target.baseUrl,
    capturedAt: source.capturedAt,
    sections: { ...target.sections },
    pages: [...target.pages],
  };

  for (const [sectionKey, nodes] of Object.entries(source.sections)) {
    const section = sectionKey as SiteSectionType;
    const existing = merged.sections[section] || [];
    const combined = [...existing];

    nodes?.forEach((node) => {
      const exists = combined.some(
        (item) => item.label === node.label && item.path === node.path
      );
      if (!exists) {
        combined.push(node);
      }
    });

    merged.sections[section] = combined;
  }

  source.pages.forEach((page) => {
    const exists = merged.pages.some((existingPage) => existingPage.url === page.url);
    if (!exists) {
      merged.pages.push(page);
    }
  });

  return merged;
}

export default async function globalSetup(config: FullConfig) {
  const baseUrl = process.env.BASE_URL;
  if (!baseUrl) {
    throw new Error('BASE_URL이 설정되지 않았습니다. 웹 대시보드에서 환경 변수를 입력하세요.');
  }

  SiteMapStore.clearCache();

  const browser = await chromium.launch();
  const page = await browser.newPage();
  const store = new SiteMapStore();

  const builder = new SiteMapBuilder(page, {
    includeSections: [SiteSectionType.HEADER, SiteSectionType.SIDEBAR, SiteSectionType.MAIN],
    maxDepth: 2,
  });

  logger.info('사이트맵 생성 시작');
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
  let siteMap = await builder.build();
  const publicPages = await builder.crawlMenus(2);
  siteMap.pages.push(...publicPages);

  // 사용자 역할로 탐색
  const userEmail = process.env.USER_EMAIL;
  const userPassword = process.env.USER_PASSWORD;

  if (userEmail && userPassword) {
    try {
      logger.info('일반 사용자로 로그인하여 사이트맵 확장');
      await loginAsUser(page, userEmail, userPassword);
      const userBuilder = new SiteMapBuilder(page, {
        includeSections: [SiteSectionType.HEADER, SiteSectionType.SIDEBAR, SiteSectionType.MAIN],
        maxDepth: 2,
      });
      const userMap = await userBuilder.build();
      const userPages = await userBuilder.crawlMenus(2);
      userMap.pages.push(...userPages);
      siteMap = mergeSiteMaps(siteMap, userMap);
    } catch (error) {
      logger.warn('사용자 로그인 기반 사이트맵 생성 실패', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  // 관리자 역할로 탐색
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (adminEmail && adminPassword) {
    try {
      logger.info('관리자로 로그인하여 사이트맵 확장');
      await loginAsAdmin(page, adminEmail, adminPassword);
      const adminBuilder = new SiteMapBuilder(page, {
        includeSections: [SiteSectionType.HEADER, SiteSectionType.SIDEBAR, SiteSectionType.MAIN],
        maxDepth: 2,
      });
      const adminMap = await adminBuilder.build();
      const adminPages = await adminBuilder.crawlMenus(2);
      adminMap.pages.push(...adminPages);
      siteMap = mergeSiteMaps(siteMap, adminMap);
    } catch (error) {
      logger.warn('관리자 로그인 기반 사이트맵 생성 실패', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  await store.save(siteMap);
  logger.info('사이트맵 저장 완료');

  await browser.close();
}


