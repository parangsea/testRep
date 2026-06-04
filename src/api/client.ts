import axios from 'axios'
import { API_BASE_URL } from '../config'
import { useAuthStore } from '../store/authStore'

// Content-Type 은 지정하지 않는다 — axios 가 본문 종류에 맞게 자동 설정한다.
// (객체 → application/json, FormData → multipart/form-data + boundary). 고정 JSON 헤더를
// 두면 FormData 가 JSON 으로 직렬화되어 파일 업로드가 깨진다.
export const apiClient = axios.create({
  baseURL: API_BASE_URL,
})

// 요청마다 인증 토큰을 Authorization 헤더로 첨부합니다.
apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// 401 응답이면 세션을 정리합니다.
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().logout()
    }
    return Promise.reject(error)
  },
)
