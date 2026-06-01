import { apiClient } from './client'
import type { Paginated, Post, PostInput, PostQuery } from '../types'

export const postsApi = {
  async list(query: PostQuery): Promise<Paginated<Post>> {
    const { data } = await apiClient.get<Paginated<Post>>('/posts', { params: query })
    return data
  },
  async get(id: string): Promise<Post> {
    const { data } = await apiClient.get<Post>(`/posts/${id}`)
    return data
  },
  async create(input: PostInput): Promise<Post> {
    const { data } = await apiClient.post<Post>('/posts', input)
    return data
  },
  async update(id: string, input: PostInput): Promise<Post> {
    const { data } = await apiClient.put<Post>(`/posts/${id}`, input)
    return data
  },
  async remove(id: string): Promise<void> {
    await apiClient.delete(`/posts/${id}`)
  },
}
