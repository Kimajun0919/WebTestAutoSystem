/**
 * 공통 타입 정의
 */

import { Page } from '@playwright/test';

/**
 * 사용자 역할
 */
export enum UserRole {
  USER = 'user',
  ADMIN = 'admin',
}

/**
 * 로그인 자격증명
 */
export interface LoginCredentials {
  email: string;
  password: string;
}

/**
 * 회원 데이터
 */
export interface MemberData {
  name: string;
  email: string;
  phone?: string;
  [key: string]: any;
}

/**
 * 테스트 컨텍스트
 */
export interface TestContext {
  page: Page;
  role?: UserRole;
  credentials?: LoginCredentials;
}

/**
 * 페이지 객체 인터페이스
 */
export interface IPageObject {
  readonly page: Page;
  goto(path: string): Promise<void>;
  waitForLoad(): Promise<void>;
}

/**
 * AI 로케이터 옵션
 */
export interface AILocatorOptions {
  role?: string;
  name?: string;
  exact?: boolean;
  timeout?: number;
  useOpenAI?: boolean;
  apiKey?: string;
}

/**
 * 안전한 액션 옵션
 */
export interface SafeActionOptions {
  timeout?: number;
  retries?: number;
  waitFor?: 'visible' | 'attached' | 'hidden';
}

/**
 * 폼 데이터
 */
export interface FormData {
  [fieldName: string]: string | number | boolean;
}

/**
 * 테스트 결과
 */
export interface TestResult {
  passed: boolean;
  duration: number;
  error?: string;
  screenshot?: string;
  video?: string;
}

/** 사이트 섹션 유형 */
export enum SiteSectionType {
  HEADER = 'header',
  SIDEBAR = 'sidebar',
  FOOTER = 'footer',
  MAIN = 'main',
}

/** 페이지 기능 유형 */
export enum PageFeatureType {
  FORM = 'form',
  TABLE = 'table',
  LIST = 'list',
  MODAL = 'modal',
  CARD = 'card',
  CHART = 'chart',
  STATS = 'stats',
  FILTER = 'filter',
  SEARCH = 'search',
  BUTTON_GROUP = 'button-group',
}

/** 페이지 기능 메타데이터 */
export interface PageFeature {
  type: PageFeatureType;
  selector: string;
  description?: string;
}

/** 메뉴 노드 */
export interface MenuNode {
  id: string;
  label: string;
  href?: string;
  path?: string;
  section: SiteSectionType;
  level: number;
  children?: MenuNode[];
  features?: PageFeature[];
}

/** 페이지 메타데이터 */
export interface PageMetadata {
  url: string;
  title?: string;
  section?: SiteSectionType;
  features: PageFeature[];
  capturedAt: string;
}

/** 사이트 맵 구조 */
export interface SiteMap {
  baseUrl: string;
  capturedAt: string;
  sections: Partial<Record<SiteSectionType, MenuNode[]>>;
  pages: PageMetadata[];
}

/** 사이트 맵 빌더 옵션 */
export interface SiteMapBuilderOptions {
  maxDepth?: number;
  includeFeatures?: boolean;
  includeSections?: SiteSectionType[];
  followSameOriginOnly?: boolean;
}

