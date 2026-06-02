import { useQuery } from '@tanstack/react-query'
import { usersApi } from '../api/users.api'

export const userKeys = {
  profile: (id: string) => ['users', 'profile', id] as const,
}

/** 유저 공개 프로필(+통계). 모달 등에서 필요할 때만 켜지도록 enabled 로 제어. */
export function useUserProfileQuery(id: string | null | undefined, enabled = true) {
  return useQuery({
    queryKey: userKeys.profile(id ?? ''),
    queryFn: () => usersApi.getProfile(id as string),
    enabled: Boolean(id) && enabled,
  })
}
