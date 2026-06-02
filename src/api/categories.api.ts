import { apiClient } from './client'
import type { Category, CategoryInput } from '../types'

export const categoriesApi = {
  async list(): Promise<Category[]> {
    const { data } = await apiClient.get<Category[]>('/categories')
    return data
  },
  async create(input: CategoryInput): Promise<Category> {
    const { data } = await apiClient.post<Category>('/categories', input)
    return data
  },
  async remove(id: string): Promise<void> {
    await apiClient.delete(`/categories/${id}`)
  },
}
