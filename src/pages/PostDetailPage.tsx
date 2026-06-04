import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { toast } from 'react-toastify'
import DOMPurify from 'dompurify'
import { useDeletePost, usePostQuery } from '../hooks/usePosts'
import { useAttachmentsQuery } from '../hooks/useAttachments'
import { inlineImageSrcs } from '../utils/contentImages'
import { useAuthStore } from '../store/authStore'
import { formatDate } from '../utils/format'
import { getErrorMessage } from '../utils/error'
import CommentSection from '../components/CommentSection'
import UserProfileModal from '../components/UserProfileModal'
import styles from './PostDetailPage.module.css'

export default function PostDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const { data: post, isLoading, isError, error } = usePostQuery(id)
  const { data: attachments } = useAttachmentsQuery(id)
  const deleteMutation = useDeletePost()
  // 작성자(글/댓글) 이름 클릭 시 띄우는 유저 정보 모달 — 페이지에서 단일 관리.
  const [profileUserId, setProfileUserId] = useState<string | null>(null)

  if (isLoading) return <p className="muted">불러오는 중...</p>
  if (isError || !post) {
    return <p className="error-text">{getErrorMessage(error, '게시글을 찾을 수 없습니다.')}</p>
  }

  // 작성자 본인 또는 관리자면 수정/삭제 가능(서버 권한과 일치).
  const canManage = Boolean(user && (user.id === post.authorId || user.role === 'admin'))
  // 본문에 인라인으로 삽입된 이미지는 갤러리에서 제외한다(중복 표시 방지).
  const inlineSrcs = inlineImageSrcs(post.content)
  const galleryAttachments = (attachments ?? []).filter((a) => !inlineSrcs.has(a.url))

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

      <div className={styles.categoryRow}>
        <Link to={`/posts?category=${post.categoryId}`} className={styles.category}>
          {post.categoryName}
        </Link>
      </div>
      <h1 className={styles.title}>{post.title}</h1>
      <div className={styles.meta}>
        <button
          type="button"
          className={styles.authorBtn}
          onClick={() => setProfileUserId(post.authorId)}
        >
          {post.authorName}
        </button>
        <span>{formatDate(post.createdAt)}</span>
      </div>

      {/*
        post.content 는 react-quill 이 생성한 HTML 입니다.
        저장형 XSS 방지를 위해 렌더 직전 DOMPurify 로 정화합니다(백엔드 sanitize 와 이중 방어).
      */}
      <div
        className={`${styles.content} ql-snow`}
        dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(post.content) }}
      />

      {galleryAttachments.length > 0 && (
        <div className={styles.gallery}>
          {galleryAttachments.map((a) => (
            <a
              key={a.id}
              className={styles.galleryItem}
              href={a.url}
              target="_blank"
              rel="noreferrer"
            >
              <img
                className={styles.galleryImg}
                src={a.url}
                alt={a.originalFilename}
                loading="lazy"
              />
            </a>
          ))}
        </div>
      )}

      <div className={styles.actions}>
        <Link to="/posts" className="btn btn-secondary">
          목록
        </Link>
        {canManage && (
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

      <CommentSection postId={post.id} onAuthorClick={setProfileUserId} />

      <UserProfileModal userId={profileUserId} onClose={() => setProfileUserId(null)} />
    </article>
  )
}
