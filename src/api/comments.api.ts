import { apiClient } from './client'
import type { Comment, CommentInput } from '../types'

export const commentsApi = {
  async list(postId: string): Promise<Comment[]> {
    const { data } = await apiClient.get<Comment[]>(`/posts/${postId}/comments`)
    return data
  },
  async create(postId: string, input: CommentInput): Promise<Comment> {
    const { data } = await apiClient.post<Comment>(`/posts/${postId}/comments`, input)
    return data
  },
  async update(id: string, content: string): Promise<Comment> {
    const { data } = await apiClient.put<Comment>(`/comments/${id}`, { content })
    return data
  },
  async remove(id: string): Promise<void> {
    await apiClient.delete(`/comments/${id}`)
  },
}
