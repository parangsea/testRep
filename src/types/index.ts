// ──────────────────────────────────────────────────────────────────────────
// 도메인 타입 = 프런트/백엔드 공통 "계약". 실제 백엔드 응답과 동일한 모양을
// 여기서 단일 정의한다. 이 타입이 곧 프런트가 기대하는 API 스펙이다.
// ──────────────────────────────────────────────────────────────────────────

/** 사용자 권한. admin 은 모든 게시글/댓글 관리 + 카테고리 관리 권한을 가진다. */
export type Role = 'user' | 'admin'

export interface User {
  id: string
  username: string
  email: string
  role: Role
  createdAt: string
}

/** 유저 정보 모달용 — 공개 프로필 + 활동 통계. (비밀번호 등 민감정보 미포함) */
export interface UserProfile extends User {
  postCount: number
  commentCount: number
}

export interface AuthResponse {
  token: string
  user: User
}

export interface LoginPayload {
  username: string
  password: string
}

export interface RegisterPayload {
  username: string
  email: string
  password: string
}

// ----- 게시판 카테고리(게시판 종류) -----

export interface Category {
  id: string
  /** URL/필터에 쓰는 식별자 (영소문자/숫자/하이픈). */
  slug: string
  name: string
  /** 노출 순서 (오름차순). */
  order: number
}

export interface CategoryInput {
  slug: string
  name: string
}

// ----- 게시글 -----

export interface Post {
  id: string
  title: string
  /** HTML 문자열 (react-quill 에디터 출력). 렌더링 시 DOMPurify 로 정화한다. */
  content: string
  authorId: string
  authorName: string
  /** 소속 카테고리. categoryName 은 비정규화(작성자 이름과 동일한 패턴) — 목록 표시 최적화. */
  categoryId: string
  categoryName: string
  createdAt: string
  updatedAt: string
}

export interface PostInput {
  title: string
  content: string
  categoryId: string
}

export interface PostQuery {
  page?: number
  pageSize?: number
  search?: string
  /** 특정 카테고리만 필터링. 미지정 시 전체. */
  categoryId?: string
}

// ----- 댓글 / 대댓글 -----

export interface Comment {
  id: string
  postId: string
  /** null = 최상위 댓글, 값 = 대댓글(부모 댓글 id). 2단계 스레드. */
  parentId: string | null
  authorId: string
  authorName: string
  content: string
  createdAt: string
  updatedAt: string
}

export interface CommentInput {
  content: string
  /** 대댓글이면 부모 댓글 id, 최상위면 생략/null. */
  parentId?: string | null
}

// ----- 동적 메뉴 (메뉴 테이블 + 권한) -----

/** 메뉴 접근 권한. public=누구나, auth=로그인 사용자, admin=관리자. */
export type MenuAccess = 'public' | 'auth' | 'admin'

export interface MenuItem {
  id: string
  label: string
  /** 라우트 경로 (예: /posts, /admin/menus). */
  path: string
  /** lucide 아이콘 이름 (Navbar 가 컴포넌트로 매핑). 없으면 아이콘 없이 표시. */
  icon?: string
  /** 노출/정렬 순서 (오름차순). */
  order: number
  access: MenuAccess
}

export interface MenuInput {
  label: string
  path: string
  icon?: string
  access: MenuAccess
  order?: number
}

// ----- 첨부 이미지 -----

/** 게시글 이미지 첨부. 백엔드 AttachmentResponse 와 동일한 계약. */
export interface Attachment {
  id: string
  postId: string
  uploaderId: string
  /** 업로드 당시 원본 파일명. */
  originalFilename: string
  /** MIME 타입 (예: image/jpeg). 현재 래스터 이미지만 허용. */
  mediaType: string
  width: number
  height: number
  byteSize: number
  /** 공개 다운로드 경로 (예: /api/attachments/1). 인증 없이 <img src> 로 표시 가능. */
  url: string
  createdAt: string
}

export interface Paginated<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}
