import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Helmet } from 'react-helmet-async'
import { toast } from 'react-toastify'
import { Trash2 } from 'lucide-react'
import {
  useCategoriesQuery,
  useCreateCategory,
  useDeleteCategory,
} from '../hooks/useCategories'
import { categorySchema, type CategoryFormValues } from '../schemas/category.schema'
import { getErrorMessage } from '../utils/error'
import styles from './AdminCategoriesPage.module.css'

export default function AdminCategoriesPage() {
  const { data: categories, isLoading, isError, error } = useCategoriesQuery()
  const createMutation = useCreateCategory()
  const deleteMutation = useDeleteCategory()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CategoryFormValues>({
    resolver: zodResolver(categorySchema),
    defaultValues: { name: '', slug: '' },
  })

  const onCreate = handleSubmit(async (values) => {
    try {
      await createMutation.mutateAsync(values)
      toast.success('카테고리가 추가되었습니다.')
      reset({ name: '', slug: '' })
    } catch {
      // 에러 토스트는 전역(queryClient MutationCache.onError)에서 처리한다.
    }
  })

  const onDelete = async (id: string, name: string) => {
    if (!window.confirm(`'${name}' 카테고리를 삭제하시겠습니까?`)) return
    try {
      await deleteMutation.mutateAsync(id)
      toast.success('카테고리가 삭제되었습니다.')
    } catch {
      // 에러 토스트는 전역(queryClient MutationCache.onError)에서 처리한다.
    }
  }

  return (
    <section>
      <Helmet>
        <title>카테고리 관리 | testRep</title>
      </Helmet>
      <h1 className={styles.title}>카테고리 관리</h1>
      <p className="muted">게시판 종류(카테고리)를 추가/삭제합니다. (관리자 전용)</p>

      <form className={`card ${styles.form}`} onSubmit={onCreate}>
        <div className="field">
          <label htmlFor="name">이름</label>
          <input id="name" type="text" placeholder="예: 공지사항" {...register('name')} />
          {errors.name && <span className="error-text">{errors.name.message}</span>}
        </div>
        <div className="field">
          <label htmlFor="slug">slug</label>
          <input id="slug" type="text" placeholder="예: notice" {...register('slug')} />
          {errors.slug && <span className="error-text">{errors.slug.message}</span>}
        </div>
        <button type="submit" className="btn" disabled={isSubmitting || createMutation.isPending}>
          추가
        </button>
      </form>

      {isLoading && <p className="muted">불러오는 중...</p>}
      {isError && <p className="error-text">{getErrorMessage(error)}</p>}

      <ul className={styles.list}>
        {categories?.map((c) => (
          <li key={c.id} className={`card ${styles.row}`}>
            <div>
              <span className={styles.name}>{c.name}</span>
              <span className="muted"> /{c.slug}</span>
            </div>
            <button
              type="button"
              className="btn btn-danger"
              onClick={() => onDelete(c.id, c.name)}
              disabled={deleteMutation.isPending}
            >
              <Trash2 size={15} /> 삭제
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}
