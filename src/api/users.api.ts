import { apiClient } from './client'
import type { UserProfile } from '../types'

export const usersApi = {
  async getProfile(id: string): Promise<UserProfile> {
    const { data } = await apiClient.get<UserProfile>(`/users/${id}`)
    return data
  },
}
