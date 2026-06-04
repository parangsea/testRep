/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** 더미(mock) 모드 토글. 'false' 이면 실제 백엔드 사용 */
  readonly VITE_USE_MOCK: string
  /** API base URL (axios + MSW 공통) */
  readonly VITE_API_BASE_URL: string
  /**
   * dev 전용 — 백엔드가 role 을 내려주기 전(하이브리드 단계)까지 admin 으로 취급할
   * username 목록(쉼표 구분). 비어 있으면 username 만으로는 누구도 admin 이 되지 않는다.
   */
  readonly VITE_ADMIN_USERNAMES?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
