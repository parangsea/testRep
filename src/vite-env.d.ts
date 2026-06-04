/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** API base URL (axios) */
  readonly VITE_API_BASE_URL: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
