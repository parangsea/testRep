/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** 더미(mock) 모드 토글. 'false' 이면 실제 백엔드 사용 */
  readonly VITE_USE_MOCK: string
  /** API base URL (axios + MSW 공통) */
  readonly VITE_API_BASE_URL: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
