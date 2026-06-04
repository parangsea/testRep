import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Helmet } from 'react-helmet-async'
import { toast } from 'react-toastify'
import { ChevronDown, ChevronUp, Pencil, Trash2, X } from 'lucide-react'
import {
  useCreateMenu,
  useDeleteMenu,
  useMenusQuery,
  useReorderMenus,
  useUpdateMenu,
} from '../hooks/useMenus'
import { menuSchema, type MenuFormValues } from '../schemas/menu.schema'
import { menuIconNames } from '../components/menuIcons'
import { getErrorMessage } from '../utils/error'
import type { MenuItem } from '../types'
import styles from './AdminMenusPage.module.css'

const ACCESS_LABEL: Record<MenuItem['access'], string> = {
  public: '공개',
  auth: '로그인',
  admin: '관리자',
}

export default function AdminMenusPage() {
  const { data: menus, isLoading, isError, error } = useMenusQuery()
  const createMutation = useCreateMenu()
  const updateMutation = useUpdateMenu()
  const deleteMutation = useDeleteMenu()
  const reorderMutation = useReorderMenus()
  const [editingId, setEditingId] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<MenuFormValues>({
    resolver: zodResolver(menuSchema),
    defaultValues: { label: '', path: '', access: 'public', icon: '' },
  })

  const editing = menus?.find((m) => m.id === editingId) ?? null
  useEffect(() => {
    if (editing) reset({ label: editing.label, path: editing.path, access: editing.access, icon: editing.icon ?? '' })
  }, [editing, reset])

  const resetForm = () => {
    setEditingId(null)
    reset({ label: '', path: '', access: 'public', icon: '' })
  }

  const onSubmit = handleSubmit(async (values) => {
    try {
      if (editingId) {
        await updateMutation.mutateAsync({ id: editingId, input: values })
        toast.success('메뉴가 수정되었습니다.')
      } else {
        await createMutation.mutateAsync(values)
        toast.success('메뉴가 추가되었습니다.')
      }
      resetForm()
    } catch {
      // 에러 토스트는 전역(queryClient MutationCache.onError)에서 처리한다.
    }
  })

  const onDelete = async (m: MenuItem) => {
    if (!window.confirm(`'${m.label}' 메뉴를 삭제하시겠습니까?`)) return
    try {
      await deleteMutation.mutateAsync(m.id)
      if (editingId === m.id) resetForm()
      toast.success('메뉴가 삭제되었습니다.')
    } catch {
      // 에러 토스트는 전역(queryClient MutationCache.onError)에서 처리한다.
    }
  }

  // 인접 메뉴와 위치를 바꿔 순서를 옮긴다. 단일 reorder 요청으로 원자적으로 적용한다.
  const move = async (index: number, dir: -1 | 1) => {
    if (!menus) return
    const target = index + dir
    if (target < 0 || target >= menus.length) return
    const ids = menus.map((m) => m.id)
    ;[ids[index], ids[target]] = [ids[target], ids[index]]
    try {
      await reorderMutation.mutateAsync(ids)
    } catch {
      // 에러 토스트는 전역(queryClient MutationCache.onError)에서 처리한다.
    }
  }

  return (
    <section>
      <Helmet>
        <title>메뉴 관리 | testRep</title>
      </Helmet>
      <h1 className={styles.title}>메뉴 관리</h1>
      <p className="muted">네비게이션 메뉴(메뉴 테이블)를 추가·수정·삭제·정렬합니다. (관리자 전용)</p>

      <form className={`card ${styles.form}`} onSubmit={onSubmit}>
        <div className={styles.formRow}>
          <div className="field">
            <label htmlFor="label">이름</label>
            <input id="label" type="text" placeholder="예: 게시판" {...register('label')} />
            {errors.label && <span className="error-text">{errors.label.message}</span>}
          </div>
          <div className="field">
            <label htmlFor="path">경로</label>
            <input id="path" type="text" placeholder="예: /posts" {...register('path')} />
            {errors.path && <span className="error-text">{errors.path.message}</span>}
          </div>
        </div>
        <div className={styles.formRow}>
          <div className="field">
            <label htmlFor="access">접근 권한</label>
            <select id="access" {...register('access')}>
              <option value="public">공개</option>
              <option value="auth">로그인</option>
              <option value="admin">관리자</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="icon">아이콘</label>
            <select id="icon" {...register('icon')}>
              <option value="">(없음)</option>
              {menuIconNames.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className={styles.formActions}>
          {editingId && (
            <button type="button" className="btn btn-secondary" onClick={resetForm}>
              <X size={15} /> 취소
            </button>
          )}
          <button type="submit" className="btn" disabled={isSubmitting}>
            {editingId ? '수정' : '추가'}
          </button>
        </div>
      </form>

      {isLoading && <p className="muted">불러오는 중...</p>}
      {isError && <p className="error-text">{getErrorMessage(error)}</p>}

      <ul className={styles.list}>
        {menus?.map((m, i) => (
          <li key={m.id} className={`card ${styles.row}`}>
            <div className={styles.info}>
              <span className={styles.name}>{m.label}</span>
              <span className="muted">{m.path}</span>
              <span className={styles[`access_${m.access}`]}>{ACCESS_LABEL[m.access]}</span>
            </div>
            <div className={styles.rowActions}>
              <button
                type="button"
                className={styles.iconBtn}
                onClick={() => move(i, -1)}
                disabled={i === 0 || reorderMutation.isPending}
                aria-label="위로"
              >
                <ChevronUp size={16} />
              </button>
              <button
                type="button"
                className={styles.iconBtn}
                onClick={() => move(i, 1)}
                disabled={i === menus.length - 1 || reorderMutation.isPending}
                aria-label="아래로"
              >
                <ChevronDown size={16} />
              </button>
              <button type="button" className="btn btn-secondary" onClick={() => setEditingId(m.id)}>
                <Pencil size={14} /> 수정
              </button>
              <button
                type="button"
                className="btn btn-danger"
                onClick={() => onDelete(m)}
                disabled={deleteMutation.isPending}
              >
                <Trash2 size={14} /> 삭제
              </button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}
