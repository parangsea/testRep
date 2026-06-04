import { apiClient } from './client'
import type { Attachment } from '../types'

export const attachmentsApi = {
  async list(postId: string): Promise<Attachment[]> {
    const { data } = await apiClient.get<Attachment[]>(`/posts/${postId}/attachments`)
    return data
  },
  /** 게시글에 이미지 1개 업로드. multipart/form-data, field 이름은 `file`. */
  async upload(postId: string, file: File): Promise<Attachment> {
    const form = new FormData()
    form.append('file', file)
    // FormData 를 그대로 넘기면 axios/브라우저가 multipart/form-data + boundary 를 자동 설정한다.
    const { data } = await apiClient.post<Attachment>(`/posts/${postId}/attachments`, form)
    return data
  },
  async remove(id: string): Promise<void> {
    await apiClient.delete(`/attachments/${id}`)
  },
}
