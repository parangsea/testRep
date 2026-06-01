/** 더미(mock) 모드 여부. VITE_USE_MOCK=false 일 때만 실제 백엔드를 사용합니다. */
export const IS_MOCK = import.meta.env.VITE_USE_MOCK !== 'false'

/** API base URL (axios + MSW 공통). */
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api'

/** 게시판 목록 페이지당 게시글 수. */
export const PAGE_SIZE = 10
