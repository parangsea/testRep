import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { attachmentsApi } from '../api/attachments.api'

export const attachmentKeys = {
  list: (postId: string) => ['attachments', 'list', postId] as const,
}

export function useAttachmentsQuery(postId: string | undefined) {
  return useQuery({
    queryKey: attachmentKeys.list(postId ?? ''),
    queryFn: () => attachmentsApi.list(postId as string),
    enabled: Boolean(postId),
  })
}

export function useUploadAttachment(postId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (file: File) => attachmentsApi.upload(postId, file),
    onSuccess: () => qc.invalidateQueries({ queryKey: attachmentKeys.list(postId) }),
  })
}

export function useDeleteAttachment(postId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => attachmentsApi.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: attachmentKeys.list(postId) }),
  })
}
