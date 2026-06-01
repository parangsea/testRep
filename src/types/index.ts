export interface User {
  id: string
  username: string
  email: string
  createdAt: string
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

export interface Post {
  id: string
  title: string
  /** HTML 문자열 (react-quill 에디터 출력). 렌더링 시 신뢰할 수 있는 소스만 허용해야 합니다. */
  content: string
  authorId: string
  authorName: string
  createdAt: string
  updatedAt: string
}

export interface PostInput {
  title: string
  content: string
}

export interface PostQuery {
  page?: number
  pageSize?: number
  search?: string
}

export interface Paginated<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}
