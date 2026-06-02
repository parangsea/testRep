import { apiClient } from './client'
import type { MenuItem, MenuInput } from '../types'

export const menusApi = {
  async list(): Promise<MenuItem[]> {
    const { data } = await apiClient.get<MenuItem[]>('/menus')
    return data
  },
  async create(input: MenuInput): Promise<MenuItem> {
    const { data } = await apiClient.post<MenuItem>('/menus', input)
    return data
  },
  async update(id: string, input: MenuInput): Promise<MenuItem> {
    const { data } = await apiClient.put<MenuItem>(`/menus/${id}`, input)
    return data
  },
  async remove(id: string): Promise<void> {
    await apiClient.delete(`/menus/${id}`)
  },
  /** 주어진 id 순서대로 메뉴 순서를 원자적으로 재배치한다. */
  async reorder(orderedIds: string[]): Promise<MenuItem[]> {
    const { data } = await apiClient.put<MenuItem[]>('/menus/reorder', { orderedIds })
    return data
  },
}
