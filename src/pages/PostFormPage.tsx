import { useEffect } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate, useParams } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { toast } from 'react-toastify'
import ReactQuill from 'react-quill'
import 'react-quill/dist/quill.snow.css'
import { postSchema, type PostFormValues } from '../schemas/post.schema'
import { useCreatePost, usePostQuery, useUpdatePost } from '../hooks/usePosts'
import { useCategoriesQuery } from '../hooks/useCategories'
import { getErrorMessage } from '../utils/error'
import styles from './PostFormPage.module.css'

export default function PostFormPage() {
  const { id } = useParams<{ id: string }>()
  const isEdit = Boolean(id)
  const navigate = useNavigate()

  const { data: existing } = usePostQuery(id)
  const { data: categories } = useCategoriesQuery()
  const createMutation = useCreatePost()
  const updateMutation = useUpdatePost(id ?? '')

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<PostFormValues>({
    resolver: zodResolver(postSchema),
    defaultValues: { title: '', content: '', categoryId: '' },
  })

  // 카테고리 조회가 끝났는데 0건이면 글을 쓸 수 없다(필수 필드인데 선택지가 없음).
  const noCategories = categories !== undefined && categories.length === 0

  // 수정 모드: 기존 게시글을 불러오면 폼에 채웁니다.
  useEffect(() => {
    if (existing)
      reset({ title: existing.title, content: existing.content, categoryId: existing.categoryId })
  }, [existing, reset])

  const onSubmit = async (values: PostFormValues) => {
    try {
      if (isEdit) {
        await updateMutation.mutateAsync(values)
        toast.success('수정되었습니다.')
        navigate(`/posts/${id}`)
      } else {
        const created = await createMutation.mutateAsync(values)
        toast.success('등록되었습니다.')
        navigate(`/posts/${created.id}`)
      }
    } catch (e) {
      toast.error(getErrorMessage(e))
    }
  }

  return (
    <section className={`card ${styles.formCard}`}>
      <Helmet>
        <title>{isEdit ? '게시글 수정' : '게시글 작성'} | testRep 게시판</title>
      </Helmet>
      <h1 className={styles.title}>{isEdit ? '게시글 수정' : '게시글 작성'}</h1>

      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <div className="field">
          <label htmlFor="categoryId">게시판</label>
          <select id="categoryId" {...register('categoryId')} disabled={noCategories}>
            <option value="">카테고리 선택</option>
            {categories?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          {noCategories && (
            <span className="error-text">
              등록된 카테고리가 없습니다. 관리자가 카테고리를 먼저 추가해야 글을 쓸 수 있습니다.
            </span>
          )}
          {errors.categoryId && <span className="error-text">{errors.categoryId.message}</span>}
        </div>

        <div className="field">
          <label htmlFor="title">제목</label>
          <input id="title" type="text" {...register('title')} />
          {errors.title && <span className="error-text">{errors.title.message}</span>}
        </div>

        <div className="field">
          <label>내용</label>
          <Controller
            control={control}
            name="content"
            render={({ field }) => (
              <ReactQuill theme="snow" value={field.value} onChange={field.onChange} />
            )}
          />
          {errors.content && <span className="error-text">{errors.content.message}</span>}
        </div>

        <div className={styles.actions}>
          <button type="button" className="btn btn-secondary" onClick={() => navigate(-1)}>
            취소
          </button>
          <button type="submit" className="btn" disabled={isSubmitting || noCategories}>
            {isEdit ? '수정' : '등록'}
          </button>
        </div>
      </form>
    </section>
  )
}
