import { Page, expect } from '@playwright/test';
import { MenuNode, PageFeatureType, SiteMap } from '../types';
import { SiteMapStore } from './site-map-store';
import { waitForNetworkIdle } from './wait-helpers';

interface NavigateOptions {
  expectUrl?: RegExp | string;
  waitForSelector?: string;
}

/**
 * 사이트맵 기반 내비게이션 헬퍼
 * - 사전에 수집된 메뉴 트리를 이용해 경로를 탐색
 * - 페이지 기능 메타데이터를 활용해 검증
 */
export class NavigationHelper {
  private static siteMapCache: SiteMap | null = null;

  private constructor(
    private readonly page: Page,
    private readonly siteMap: SiteMap
  ) {}

  /**
   * NavigationHelper 인스턴스를 생성합니다.
   */
  static async create(page: Page): Promise<NavigationHelper> {
    const siteMap = await NavigationHelper.loadSiteMap();
    return new NavigationHelper(page, siteMap);
  }

  /**
   * 메뉴 경로를 따라 이동합니다.
   * @param labels 메뉴 라벨 배열 (예: ['Dashboard', 'Members'])
   */
  async gotoMenuPath(labels: string[], options?: NavigateOptions): Promise<void> {
    const node = this.findNodeByLabels(labels);

    if (!node?.path) {
      throw new Error(`메뉴 경로를 찾을 수 없습니다: ${labels.join(' > ')}`);
    }

    const absoluteUrl = this.makeAbsoluteUrl(node.path);
    await this.page.goto(absoluteUrl, { waitUntil: 'domcontentloaded' });
    await waitForNetworkIdle(this.page);

    if (options?.expectUrl) {
      await expect(this.page).toHaveURL(options.expectUrl);
    }

    if (options?.waitForSelector) {
      await this.page.locator(options.waitForSelector).waitFor({ state: 'visible' });
    }
  }

  /**
   * 메뉴 경로에 해당하는 URL을 반환합니다.
   */
  resolveMenuPath(labels: string[]): string | undefined {
    const node = this.findNodeByLabels(labels);
    return node?.path;
  }

  /**
   * 여러 후보 라벨 경로 중 첫 번째로 일치하는 경로를 반환합니다.
   */
  resolveMenuPathByVariants(labelVariants: string[][]): string | undefined {
    for (const labels of labelVariants) {
      const path = this.resolveMenuPath(labels);
      if (path) {
        return path;
      }
    }
    return undefined;
  }

  /**
   * 특정 경로의 페이지 기능 메타데이터를 반환합니다.
   */
  getPageFeaturesByPath(path: string): PageFeatureType[] {
    const metadata = this.siteMap.pages.find((pageMeta) => pageMeta.url.includes(path));
    return metadata?.features.map((feature) => feature.type) || [];
  }

  /**
   * 특정 기능이 있는지 확인합니다.
   */
  hasFeature(path: string, feature: PageFeatureType): boolean {
    return this.getPageFeaturesByPath(path).includes(feature);
  }

  /**
   * 사이트맵 전체를 반환합니다.
   */
  getSiteMap(): SiteMap {
    return this.siteMap;
  }

  /**
   * 메뉴 노드 찾기
   */
  private findNodeByLabels(labels: string[]): MenuNode | undefined {
    if (labels.length === 0) return undefined;

    const rootNodes = this.getRootNodes();
    return this.findNodeRecursive(rootNodes, labels, 0);
  }

  private findNodeRecursive(nodes: MenuNode[] = [], labels: string[], depth: number): MenuNode | undefined {
    for (const node of nodes) {
      if (this.labelMatches(node.label, labels[depth])) {
        if (depth === labels.length - 1) {
          return node;
        }

        if (node.children) {
          const childResult = this.findNodeRecursive(node.children, labels, depth + 1);
          if (childResult) {
            return childResult;
          }
        }
      }
    }

    return undefined;
  }

  private getRootNodes(): MenuNode[] {
    const sections = Object.values(this.siteMap.sections || {});
    return sections.flatMap((nodes) => nodes || []);
  }

  private labelMatches(nodeLabel: string, targetLabel: string): boolean {
    return nodeLabel.trim().toLowerCase() === targetLabel.trim().toLowerCase();
  }

  private makeAbsoluteUrl(path: string): string {
    if (path.startsWith('http')) {
      return path;
    }
    return `${this.siteMap.baseUrl.replace(/\/$/, '')}${path}`;
  }

  private static async loadSiteMap(): Promise<SiteMap> {
    if (NavigationHelper.siteMapCache) {
      return NavigationHelper.siteMapCache;
    }

    const siteMap = await SiteMapStore.load();

    if (!siteMap) {
      throw new Error('사이트맵이 생성되지 않았습니다. 테스트 실행 전에 globalSetup을 통해 사이트 구조를 생성하세요.');
    }

    NavigationHelper.siteMapCache = siteMap;
    return siteMap;
  }
}


