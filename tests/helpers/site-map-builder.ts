import { Page, Locator } from '@playwright/test';
import {
  MenuNode,
  PageFeature,
  PageFeatureType,
  PageMetadata,
  SiteMap,
  SiteMapBuilderOptions,
  SiteSectionType,
} from '../types';
import { waitForNetworkIdle } from './wait-helpers';
import { logger } from './logger';
import { Selectors } from '../constants/selectors';

/**
 * 사이트 맵을 생성하는 빌더
 * - 헤더/사이드바/메인 메뉴를 스캔하여 구조를 파악
 * - 페이지의 주요 UI 구성 요소(폼, 테이블 등)를 탐지
 * - 필요 시 메뉴를 재귀적으로 순회하여 페이지 메타데이터 수집
 */
export class SiteMapBuilder {
  private readonly options: SiteMapBuilderOptions;
  private readonly visitedUrls = new Set<string>();
  private cachedSections?: Partial<Record<SiteSectionType, MenuNode[]>>;

  constructor(
    private readonly page: Page,
    options?: SiteMapBuilderOptions
  ) {
    this.options = {
      maxDepth: 1,
      includeFeatures: true,
      followSameOriginOnly: true,
      ...options,
    };
  }

  /**
   * 현재 페이지 기준으로 사이트 맵을 생성합니다.
   */
  async build(): Promise<SiteMap> {
    await waitForNetworkIdle(this.page);

    const baseUrl = this.getOrigin(this.page.url());
    const sections = await this.scanAllSections();
    const pages: PageMetadata[] = [];

    if (this.options.includeFeatures !== false) {
      pages.push(await this.capturePageMetadata());
    }

    const siteMap: SiteMap = {
      baseUrl,
      capturedAt: new Date().toISOString(),
      sections,
      pages,
    };

    logger.info('사이트 맵 생성 완료', {
      baseUrl,
      sections: Object.keys(sections).length,
      pages: pages.length,
    });

    return siteMap;
  }

  /**
   * 메뉴를 순회하며 페이지 메타데이터를 수집합니다.
   * @param depth 순회할 최대 깊이
   */
  async crawlMenus(depth: number = this.options.maxDepth || 1): Promise<PageMetadata[]> {
    const sections = this.cachedSections || (await this.scanAllSections());
    const queue: Array<{ node: MenuNode; depth: number }> = [];
    const results: PageMetadata[] = [];

    Object.values(sections).forEach((nodes) => {
      nodes?.forEach((node) => queue.push({ node, depth: 1 }));
    });

    while (queue.length > 0) {
      const { node, depth: currentDepth } = queue.shift()!;

      if (!node.path || this.visitedUrls.has(node.path)) {
        continue;
      }

      const absoluteUrl = this.toAbsoluteUrl(node.path);
      if (!absoluteUrl) continue;

      if (this.options.followSameOriginOnly && !absoluteUrl.startsWith(this.getOrigin(this.page.url()))) {
        logger.debug('다른 오리진 URL 건너뜀', { url: absoluteUrl });
        continue;
      }

      try {
        logger.info('메뉴 페이지 탐색', { label: node.label, url: absoluteUrl });
        await this.page.goto(absoluteUrl, { waitUntil: 'domcontentloaded' });
        await waitForNetworkIdle(this.page);

        this.visitedUrls.add(node.path);
        const metadata = await this.capturePageMetadata(node.section);
        results.push(metadata);
      } catch (error) {
        logger.warn('메뉴 페이지 탐색 실패', {
          label: node.label,
          url: absoluteUrl,
          error: error instanceof Error ? error.message : String(error),
        });
      }

      if (node.children && node.children.length > 0 && currentDepth < depth) {
        node.children.forEach((child) => {
          queue.push({ node: child, depth: currentDepth + 1 });
        });
      }
    }

    logger.info('메뉴 순회 완료', { pages: results.length });
    return results;
  }

  /**
   * 헤더/사이드바/메인 등 모든 섹션의 메뉴를 스캔합니다.
   */
  private async scanAllSections(): Promise<Partial<Record<SiteSectionType, MenuNode[]>>> {
    if (this.cachedSections) {
      return this.cachedSections;
    }

    const includeSections =
      this.options.includeSections ||
      [SiteSectionType.HEADER, SiteSectionType.SIDEBAR, SiteSectionType.MAIN];

    const sections: Partial<Record<SiteSectionType, MenuNode[]>> = {};

    for (const section of includeSections) {
      sections[section] = await this.scanSection(section);
    }

    this.cachedSections = sections;
    return sections;
  }

  /**
   * 섹션 별 메뉴 스캔
   */
  private async scanSection(section: SiteSectionType): Promise<MenuNode[]> {
    const selectors = this.getSectionSelectors(section);
    const menuNodes: MenuNode[] = [];
    const seen = new Set<string>();

    for (const selector of selectors) {
      const container = this.page.locator(selector).first();

      if (!(await container.isVisible().catch(() => false))) {
        continue;
      }

      const nodes = await this.extractMenuNodes(container, section);
      for (const node of nodes) {
        const key = `${node.label}-${node.path}`;
        if (!seen.has(key)) {
          seen.add(key);
          menuNodes.push(node);
        }
      }
    }

    return menuNodes;
  }

  /**
   * 컨테이너에서 메뉴 노드를 추출합니다.
   */
  private async extractMenuNodes(
    container: Locator,
    section: SiteSectionType,
    level: number = 0
  ): Promise<MenuNode[]> {
    const nodes: MenuNode[] = [];
    const listItems = container.locator('li');

    if ((await listItems.count()) > 0) {
      for (let i = 0; i < (await listItems.count()); i++) {
        const item = listItems.nth(i);
        const trigger = item.locator('> a, > button, > [role="menuitem"]').first();

        if (!(await trigger.isVisible().catch(() => false))) {
          continue;
        }

        const label = (await trigger.innerText().catch(() => '')).trim() || (await trigger.getAttribute('aria-label')) || '';
        if (!label) continue;

        const href = await trigger.getAttribute('href');
        const path = this.normalizePath(href);

        const node: MenuNode = {
          id: `${section}-${level}-${i}-${label}`.replace(/\s+/g, '-').toLowerCase(),
          label,
          href: href || undefined,
          path,
          section,
          level,
        };

        // 하위 메뉴 탐색
        const childContainer = item.locator('ul, ol, .submenu, .dropdown-menu').first();
        if (await childContainer.isVisible().catch(() => false)) {
          node.children = await this.extractMenuNodes(childContainer, section, level + 1);
        }

        nodes.push(node);
      }

      return nodes;
    }

    // 리스트 기반 구조가 아닌 경우 직접 앵커를 수집
    const anchors = container.locator('a, button, [role="menuitem"]');
    const count = await anchors.count();

    for (let i = 0; i < count; i++) {
      const anchor = anchors.nth(i);
      const label = (await anchor.innerText().catch(() => '')).trim() || (await anchor.getAttribute('aria-label')) || '';
      if (!label) continue;

      const href = await anchor.getAttribute('href');
      const path = this.normalizePath(href);

      nodes.push({
        id: `${section}-${level}-${i}-${label}`.replace(/\s+/g, '-').toLowerCase(),
        label,
        href: href || undefined,
        path,
        section,
        level,
      });
    }

    return nodes;
  }

  /**
   * 현재 페이지의 메타데이터를 캡처합니다.
   */
  private async capturePageMetadata(section?: SiteSectionType): Promise<PageMetadata> {
    const features = this.options.includeFeatures === false ? [] : await this.detectFeatures();

    let title: string | undefined;
    try {
      title = (await this.page.locator(Selectors.COMMON.PAGE_TITLE).first().textContent())
        ?.trim();
    } catch {
      title = await this.page.title().catch(() => undefined);
    }

    const metadata: PageMetadata = {
      url: this.page.url(),
      title,
      section,
      features,
      capturedAt: new Date().toISOString(),
    };

    return metadata;
  }

  /**
   * 페이지의 주요 UI 구성 요소를 탐지합니다.
   */
  private async detectFeatures(): Promise<PageFeature[]> {
    const features: PageFeature[] = [];

    const addFeature = async (selector: string, type: PageFeatureType, description?: string) => {
      const locator = this.page.locator(selector).first();
      if (await locator.isVisible().catch(() => false)) {
        features.push({ type, selector, description });
      }
    };

    await addFeature(Selectors.ADMIN_MEMBERS.MEMBERS_TABLE, PageFeatureType.TABLE, '회원 테이블');
    await addFeature('form', PageFeatureType.FORM, '폼');
    await addFeature(Selectors.ADMIN_MEMBERS.SEARCH_INPUT, PageFeatureType.SEARCH, '검색');
    await addFeature('.filter, [data-filter]', PageFeatureType.FILTER, '필터');
    await addFeature('.modal, [role="dialog"]', PageFeatureType.MODAL, '모달');
    await addFeature('.card, .panel, .widget', PageFeatureType.CARD, '카드');
    await addFeature('.chart, canvas, [data-chart]', PageFeatureType.CHART, '차트');
    await addFeature('.stats, .kpi, .summary', PageFeatureType.STATS, '통계');
    await addFeature('.btn-group, .button-group', PageFeatureType.BUTTON_GROUP, '버튼 그룹');

    return features;
  }

  /**
   * 섹션별로 우선 탐색할 셀렉터 리스트를 반환합니다.
   */
  private getSectionSelectors(section: SiteSectionType): string[] {
    switch (section) {
      case SiteSectionType.HEADER:
        return ['header nav', 'header', '.navbar', '[role="navigation"]', 'nav'];
      case SiteSectionType.SIDEBAR:
        return ['aside', '.sidebar', '[data-sidebar]', '[role="menu"]'];
      case SiteSectionType.FOOTER:
        return ['footer nav', 'footer', '.footer-nav'];
      case SiteSectionType.MAIN:
      default:
        return ['main nav', 'main', '.main-nav', '.content-nav'];
    }
  }

  /**
   * 상대 경로를 정규화합니다.
   */
  private normalizePath(href: string | null): string | undefined {
    if (!href || href === '#') {
      return undefined;
    }

    try {
      if (href.startsWith('http')) {
        return new URL(href).pathname;
      }

      return href.startsWith('/') ? href : `/${href}`;
    } catch {
      return undefined;
    }
  }

  /**
   * 절대 URL로 변환합니다.
   */
  private toAbsoluteUrl(path?: string): string | undefined {
    if (!path) return undefined;

    if (path.startsWith('http')) {
      return path;
    }

    const origin = this.getOrigin(this.page.url());
    return `${origin}${path}`;
  }

  /**
   * URL의 Origin 반환
   */
  private getOrigin(url: string): string {
    try {
      const parsed = new URL(url);
      return `${parsed.protocol}//${parsed.host}`;
    } catch {
      return url;
    }
  }
}


