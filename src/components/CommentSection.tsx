import { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'react-toastify'
import { CornerDownRight, MessageSquare } from 'lucide-react'
import {
  useCommentsQuery,
  useCreateComment,
  useDeleteComment,
  useUpdateComment,
} from '../hooks/useComments'
import { useAuthStore } from '../store/authStore'
import { commentSchema, type CommentFormValues } from '../schemas/comment.schema'
import { formatDate } from '../utils/format'
import { getErrorMessage } from '../utils/error'
import { buildCommentTree } from '../utils/commentTree'
import type { Comment } from '../types'
import styles from './CommentSection.module.css'

interface CommentSectionProps {
  postId: string
  /** 작성자 이름 클릭 시 호출 — 부모가 유저 정보 모달을 띄운다. */
  onAuthorClick: (userId: string) => void
}

/** 한 게시글의 댓글/대댓글(2단계) 영역. */
export default function CommentSection({ postId, onAuthorClick }: CommentSectionProps) {
  const user = useAuthStore((s) => s.user)
  const { data: comments, isLoading, isError, error } = useCommentsQuery(postId)
  const createMutation = useCreateComment(postId)

  // parentId 기준으로 최상위 댓글과 대댓글을 묶는다(순수 유틸 — 단위 테스트 대상).
  const { topLevel, repliesByParent } = useMemo(() => buildCommentTree(comments ?? []), [comments])

  const total = comments?.length ?? 0

  return (
    <section className={styles.section}>
      <h2 className={styles.heading}>
        <MessageSquare size={18} /> 댓글 {total}
      </h2>

      {user ? (
        <CommentForm
          submitLabel="댓글 등록"
          submitting={createMutation.isPending}
          onSubmit={async (content) => {
            await createMutation.mutateAsync({ content })
          }}
        />
      ) : (
        <p className="muted">댓글을 작성하려면 로그인하세요.</p>
      )}

      {isLoading && <p className="muted">댓글을 불러오는 중...</p>}
      {isError && <p className="error-text">{getErrorMessage(error)}</p>}

      {comments && total === 0 && <p className={`muted ${styles.empty}`}>첫 댓글을 남겨보세요.</p>}

      <ul className={styles.list}>
        {topLevel.map((c) => (
          <li key={c.id}>
            <CommentItem
              postId={postId}
              comment={c}
              isReplyable
              onAuthorClick={onAuthorClick}
            />
            {(repliesByParent.get(c.id) ?? []).length > 0 && (
              <ul className={styles.replies}>
                {(repliesByParent.get(c.id) ?? []).map((r) => (
                  <li key={r.id}>
                    <CommentItem
                      postId={postId}
                      comment={r}
                      isReplyable={false}
                      onAuthorClick={onAuthorClick}
                    />
                  </li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ul>
    </section>
  )
}

interface CommentItemProps {
  postId: string
  comment: Comment
  /** 최상위 댓글만 대댓글을 달 수 있다(2단계 유지). */
  isReplyable: boolean
  onAuthorClick: (userId: string) => void
}

function CommentItem({ postId, comment, isReplyable, onAuthorClick }: CommentItemProps) {
  const user = useAuthStore((s) => s.user)
  const updateMutation = useUpdateComment(postId)
  const deleteMutation = useDeleteComment(postId)
  const createMutation = useCreateComment(postId)
  const [editing, setEditing] = useState(false)
  const [replying, setReplying] = useState(false)

  const canModify = Boolean(user && (user.id === comment.authorId || user.role === 'admin'))
  const edited = comment.updatedAt !== comment.createdAt

  const onDelete = async () => {
    if (!window.confirm('댓글을 삭제하시겠습니까?')) return
    try {
      await deleteMutation.mutateAsync(comment.id)
      toast.success('댓글이 삭제되었습니다.')
    } catch (e) {
      toast.error(getErrorMessage(e))
    }
  }

  return (
    <div className={styles.item}>
      <div className={styles.meta}>
        <button type="button" className={styles.author} onClick={() => onAuthorClick(comment.authorId)}>
          {comment.authorName}
        </button>
        <span className="muted">{formatDate(comment.createdAt)}</span>
        {edited && <span className={`muted ${styles.editedTag}`}>(수정됨)</span>}
      </div>

      {editing ? (
        <CommentForm
          submitLabel="수정"
          initialValue={comment.content}
          submitting={updateMutation.isPending}
          onCancel={() => setEditing(false)}
          onSubmit={async (content) => {
            await updateMutation.mutateAsync({ id: comment.id, content })
            setEditing(false)
            toast.success('댓글이 수정되었습니다.')
          }}
        />
      ) : (
        <p className={styles.content}>{comment.content}</p>
      )}

      {!editing && (
        <div className={styles.actions}>
          {isReplyable && user && (
            <button type="button" className={styles.actionBtn} onClick={() => setReplying((v) => !v)}>
              <CornerDownRight size={13} /> 답글
            </button>
          )}
          {canModify && (
            <>
              <button type="button" className={styles.actionBtn} onClick={() => setEditing(true)}>
                수정
              </button>
              <button
                type="button"
                className={`${styles.actionBtn} ${styles.danger}`}
                onClick={onDelete}
                disabled={deleteMutation.isPending}
              >
                삭제
              </button>
            </>
          )}
        </div>
      )}

      {replying && (
        <div className={styles.replyForm}>
          <CommentForm
            submitLabel="답글 등록"
            placeholder="답글을 입력하세요"
            submitting={createMutation.isPending}
            onCancel={() => setReplying(false)}
            onSubmit={async (content) => {
              await createMutation.mutateAsync({ content, parentId: comment.id })
              setReplying(false)
            }}
          />
        </div>
      )}
    </div>
  )
}

interface CommentFormProps {
  submitLabel: string
  submitting: boolean
  initialValue?: string
  placeholder?: string
  onSubmit: (content: string) => Promise<void>
  onCancel?: () => void
}

function CommentForm({
  submitLabel,
  submitting,
  initialValue = '',
  placeholder = '댓글을 입력하세요',
  onSubmit,
  onCancel,
}: CommentFormProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CommentFormValues>({
    resolver: zodResolver(commentSchema),
    defaultValues: { content: initialValue },
  })

  const submit = handleSubmit(async (values) => {
    try {
      await onSubmit(values.content.trim())
      reset({ content: '' })
    } catch (e) {
      toast.error(getErrorMessage(e))
    }
  })

  return (
    <form className={styles.form} onSubmit={submit}>
      <textarea rows={3} placeholder={placeholder} {...register('content')} />
      {errors.content && <span className="error-text">{errors.content.message}</span>}
      <div className={styles.formActions}>
        {onCancel && (
          <button type="button" className="btn btn-secondary" onClick={onCancel}>
            취소
          </button>
        )}
        <button type="submit" className="btn" disabled={submitting}>
          {submitLabel}
        </button>
      </div>
    </form>
  )
}
