import { promises as fs } from 'fs';
import path from 'path';
import { SiteMap } from '../types';

const DEFAULT_SITE_MAP_PATH = path.join(process.cwd(), 'tests', 'fixtures', 'site-map.json');

/**
 * SiteMap 저장 및 로드 유틸리티
 */
export class SiteMapStore {
  private static cache: SiteMap | null = null;

  constructor(private readonly filePath: string = DEFAULT_SITE_MAP_PATH) {}

  /**
   * 사이트맵을 저장합니다.
   */
  async save(siteMap: SiteMap): Promise<void> {
    await fs.mkdir(path.dirname(this.filePath), { recursive: true });
    await fs.writeFile(this.filePath, JSON.stringify(siteMap, null, 2), 'utf-8');
    SiteMapStore.cache = siteMap;
  }

  /**
   * 사이트맵을 로드합니다.
   */
  async load(): Promise<SiteMap | null> {
    if (SiteMapStore.cache) {
      return SiteMapStore.cache;
    }

    try {
      const data = await fs.readFile(this.filePath, 'utf-8');
      const siteMap = JSON.parse(data) as SiteMap;
      SiteMapStore.cache = siteMap;
      return siteMap;
    } catch (error) {
      return null;
    }
  }

  /**
   * 사이트맵이 존재하는지 확인합니다.
   */
  async exists(): Promise<boolean> {
    try {
      await fs.access(this.filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 캐시 초기화
   */
  static clearCache(): void {
    SiteMapStore.cache = null;
  }

  /**
   * 정적 로드 헬퍼
   */
  static async load(filePath?: string): Promise<SiteMap | null> {
    const store = new SiteMapStore(filePath);
    return store.load();
  }

  /**
   * 정적 저장 헬퍼
   */
  static async save(siteMap: SiteMap, filePath?: string): Promise<void> {
    const store = new SiteMapStore(filePath);
    await store.save(siteMap);
  }
}


