import { Link, useNavigate, useParams } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { toast } from 'react-toastify'
import { useDeletePost, usePostQuery } from '../hooks/usePosts'
import { useAuthStore } from '../store/authStore'
import { formatDate } from '../utils/format'
import { getErrorMessage } from '../utils/error'
import styles from './PostDetailPage.module.css'

export default function PostDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const { data: post, isLoading, isError, error } = usePostQuery(id)
  const deleteMutation = useDeletePost()

  if (isLoading) return <p className="muted">불러오는 중...</p>
  if (isError || !post) {
    return <p className="error-text">{getErrorMessage(error, '게시글을 찾을 수 없습니다.')}</p>
  }

  const isAuthor = user?.id === post.authorId

  const onDelete = async () => {
    if (!window.confirm('정말 삭제하시겠습니까?')) return
    try {
      await deleteMutation.mutateAsync(post.id)
      toast.success('삭제되었습니다.')
      navigate('/posts')
    } catch (e) {
      toast.error(getErrorMessage(e))
    }
  }

  return (
    <article className={`card ${styles.detail}`}>
      <Helmet>
        <title>{post.title} | testRep 게시판</title>
      </Helmet>

      <h1 className={styles.title}>{post.title}</h1>
      <div className={styles.meta}>
        <span>{post.authorName}</span>
        <span>{formatDate(post.createdAt)}</span>
      </div>

      {/*
        post.content 는 react-quill 이 생성한 HTML 입니다.
        더미/신뢰 가능한 소스만 다루므로 그대로 렌더링하지만,
        실제 사용자 입력을 다룰 때는 DOMPurify 등으로 sanitize 하세요.
      */}
      <div
        className={`${styles.content} ql-snow`}
        dangerouslySetInnerHTML={{ __html: post.content }}
      />

      <div className={styles.actions}>
        <Link to="/posts" className="btn btn-secondary">
          목록
        </Link>
        {isAuthor && (
          <>
            <Link to={`/posts/${post.id}/edit`} className="btn">
              수정
            </Link>
            <button
              type="button"
              className="btn btn-danger"
              onClick={onDelete}
              disabled={deleteMutation.isPending}
            >
              삭제
            </button>
          </>
        )}
      </div>
    </article>
  )
}
