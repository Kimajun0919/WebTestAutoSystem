/**
 * 셀렉터 상수 정의
 * 공통적으로 사용되는 셀렉터를 중앙에서 관리합니다.
 */

export const Selectors = {
  // 공통 요소
  COMMON: {
    PAGE_TITLE: 'h1, h2, .page-title',
    LOADING_SPINNER: '.spinner, .loading, [role="status"]',
    ALERT_SUCCESS: '.alert-success, .success, .text-success, [role="alert"]:has-text("success")',
    ALERT_ERROR: '.alert-danger, .error, .text-danger, .invalid-feedback, [role="alert"]:has-text("error")',
    MODAL: '.modal, [role="dialog"], .modal-dialog',
    MODAL_BACKDROP: '.modal-backdrop, .modal-backdrop.show',
    BUTTON_PRIMARY: '.btn-primary, button[type="submit"]',
    BUTTON_SECONDARY: '.btn-secondary, button[type="button"]',
    FORM: 'form',
  },

  // 로그인 관련
  LOGIN: {
    EMAIL_INPUT: 'input[name="email"], input[type="email"], input[placeholder*="email" i]',
    PASSWORD_INPUT: 'input[name="password"], input[type="password"]',
    LOGIN_BUTTON: 'button:has-text("Login"), button:has-text("로그인"), button[type="submit"]',
    LOGOUT_BUTTON: 'button:has-text("Logout"), button:has-text("로그아웃"), a:has-text("Logout")',
  },

  // 대시보드 관련
  DASHBOARD: {
    MEMBERS_MENU: 'a:has-text("Members"), a:has-text("회원"), nav a[href*="members"]',
    PROFILE_MENU: 'a:has-text("Profile"), a:has-text("프로필"), nav a[href*="profile"]',
    SETTINGS_MENU: 'a:has-text("Settings"), a:has-text("설정"), nav a[href*="settings"]',
  },

  // 관리자 회원 관리
  ADMIN_MEMBERS: {
    CREATE_BUTTON: 'button:has-text("Create"), a:has-text("Create"), button:has-text("Add Member"), a:has-text("Add")',
    MEMBERS_TABLE: 'table, .table, .members-list, .data-table',
    EDIT_BUTTON: 'button:has-text("Edit"), a:has-text("Edit"), [title="Edit"]',
    DELETE_BUTTON: 'button:has-text("Delete"), a:has-text("Delete"), [title="Delete"]',
    SEARCH_INPUT: 'input[type="search"], input[placeholder*="Search"], input[name="search"]',
    MODAL_CONFIRM: '.modal button:has-text("Confirm"), .modal button:has-text("Delete"), .modal button:has-text("Yes")',
    MODAL_CANCEL: '.modal button:has-text("Cancel"), .modal button:has-text("No")',
  },

  // 폼 관련
  FORM: {
    NAME_INPUT: 'input[name="name"], input[placeholder*="name" i]',
    EMAIL_INPUT: 'input[name="email"], input[type="email"]',
    PHONE_INPUT: 'input[name="phone"], input[type="tel"], input[placeholder*="phone" i]',
    SUBMIT_BUTTON: 'button[type="submit"], form button:has-text("Save"), form button:has-text("Create")',
    CANCEL_BUTTON: 'button:has-text("Cancel"), a:has-text("Cancel")',
  },
} as const;

/**
 * URL 패턴 정의
 */
export const UrlPatterns = {
  LOGIN: /.*\/login/,
  ADMIN_LOGIN: /.*\/admin\/login/,
  DASHBOARD: /.*\/dashboard/,
  ADMIN_MEMBERS: /.*\/admin\/members/,
  PROFILE: /.*\/profile/,
  SETTINGS: /.*\/settings/,
  MEMBERS: /.*\/members/,
} as const;

