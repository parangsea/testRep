import { apiClient } from './client'
import type { Paginated, Post, PostInput, PostQuery } from '../types'

// 실제 백엔드(testBoot)의 게시글 응답에는 카테고리 필드가 없다(하이브리드 연동 단계).
type RawPost = Omit<Post, 'categoryId' | 'categoryName'> &
  Partial<Pick<Post, 'categoryId' | 'categoryName'>>

/**
 * 실서버 게시글 응답을 프런트 계약(Post.categoryId/categoryName 포함)으로 보정한다.
 * 표시용 categoryName 은 제목의 "[말머리]" 접두사에서 추출하고, 없으면 '일반'.
 * 백엔드가 카테고리를 내려주면 그 값이 그대로 유지된다(보정 무시).
 */
function normalizePost(raw: RawPost): Post {
  // 실서버 응답을 신뢰하지 않고 방어적으로 보정한다(title 누락/형 불일치 대비).
  const prefix = typeof raw.title === 'string' ? /^\[(.+?)\]/.exec(raw.title) : null
  return {
    ...raw,
    categoryId: raw.categoryId ?? '',
    categoryName: raw.categoryName ?? (prefix ? prefix[1] : '일반'),
  }
}

export const postsApi = {
  async list(query: PostQuery): Promise<Paginated<Post>> {
    const { data } = await apiClient.get<Paginated<RawPost>>('/posts', { params: query })
    // 백엔드가 빈 결과를 items 누락/null 로 줄 수 있어 배열 보장 후 보정한다.
    const items = Array.isArray(data.items) ? data.items : []
    return { ...data, items: items.map(normalizePost) }
  },
  async get(id: string): Promise<Post> {
    const { data } = await apiClient.get<RawPost>(`/posts/${id}`)
    return normalizePost(data)
  },
  async create(input: PostInput): Promise<Post> {
    const { data } = await apiClient.post<RawPost>('/posts', input)
    return normalizePost(data)
  },
  async update(id: string, input: PostInput): Promise<Post> {
    const { data } = await apiClient.put<RawPost>(`/posts/${id}`, input)
    return normalizePost(data)
  },
  async remove(id: string): Promise<void> {
    await apiClient.delete(`/posts/${id}`)
  },
}
