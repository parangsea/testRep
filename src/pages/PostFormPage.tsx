import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate, useParams } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { toast } from 'react-toastify'
import { useQueryClient } from '@tanstack/react-query'
import ReactQuill, { Quill } from 'react-quill'
import 'react-quill/dist/quill.snow.css'

// Quill 은 기본적으로 이미지 src 의 blob: URL 을 제거한다. 작성 모드 인라인 미리보기(업로드 전
// 임시 blob)를 본문에 유지하려면 blob: 를 허용해야 한다. (제출 시 실제 첨부 url 로 치환됨)
const ImageFormat = Quill.import('formats/image')
const baseImageSanitize = ImageFormat.sanitize
ImageFormat.sanitize = (url: string) =>
  typeof url === 'string' && url.startsWith('blob:') ? url : baseImageSanitize(url)
import { postSchema, type PostFormValues } from '../schemas/post.schema'
import { useCreatePost, usePostQuery, useUpdatePost } from '../hooks/usePosts'
import { postsApi } from '../api/posts.api'
import { useCategoriesQuery } from '../hooks/useCategories'
import { attachmentKeys, useAttachmentsQuery, useDeleteAttachment } from '../hooks/useAttachments'
import { attachmentsApi } from '../api/attachments.api'
import { inlineImageSrcs, rewriteImageSrcs, stripBlobImages } from '../utils/contentImages'
import { getErrorMessage } from '../utils/error'
import styles from './PostFormPage.module.css'

// 에디터 툴바 — 기본 서식.
// 본문 인라인 이미지 버튼('image')은 비활성: 백엔드가 게시글 content 의 <img src> 를
// sanitize 로 제거해 인라인이 동작하지 않기 때문이다(이미지는 아래 "이미지 첨부" 갤러리로 올린다).
// 인라인 핸들러/업로드 로직(insertInlineImage·resolveInlineForCreate 등)은 그대로 두었으므로,
// 백엔드가 인라인 src 를 허용하면 이 배열에 'image' 만 다시 넣으면 즉시 동작한다.
const TOOLBAR = [
  [{ header: [1, 2, 3, false] }],
  ['bold', 'italic', 'underline', 'strike'],
  [{ list: 'ordered' }, { list: 'bullet' }],
  ['link'],
  ['clean'],
]

/** 갤러리: 선택했지만 아직 업로드하지 않은 이미지(미리보기 blob URL 포함). */
interface PendingImage {
  file: File
  url: string
}
/** 인라인(작성 모드): 본문에 blob 으로 미리 삽입해두고 제출 시 업로드/치환할 이미지. */
interface PendingInline {
  blobUrl: string
  file: File
}

export default function PostFormPage() {
  const { id } = useParams<{ id: string }>()
  const isEdit = Boolean(id)
  const navigate = useNavigate()
  const qc = useQueryClient()
  const quillRef = useRef<ReactQuill>(null)

  const { data: existing } = usePostQuery(id)
  const { data: categories } = useCategoriesQuery()
  const { data: existingAttachments } = useAttachmentsQuery(isEdit ? id : undefined)
  const createMutation = useCreatePost()
  const updateMutation = useUpdatePost(id ?? '')
  const deleteAttachment = useDeleteAttachment(id ?? '')

  // 갤러리(파일 선택)·인라인(에디터 삽입) 미업로드 이미지.
  const [pending, setPending] = useState<PendingImage[]>([])
  const inlinePendingRef = useRef<PendingInline[]>([])
  // 언마운트 시 남은 blob URL 정리(최신 값을 ref 로 추적).
  const pendingRef = useRef(pending)
  pendingRef.current = pending
  useEffect(
    () => () => {
      pendingRef.current.forEach((p) => URL.revokeObjectURL(p.url))
      inlinePendingRef.current.forEach((p) => URL.revokeObjectURL(p.blobUrl))
    },
    [],
  )

  const {
    register,
    control,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<PostFormValues>({
    resolver: zodResolver(postSchema),
    defaultValues: { title: '', content: '', categoryId: '' },
  })

  const noCategories = categories !== undefined && categories.length === 0

  useEffect(() => {
    if (existing)
      reset({ title: existing.title, content: existing.content, categoryId: existing.categoryId })
  }, [existing, reset])

  // 폼 갤러리에는 "본문 인라인으로 쓰이지 않은" 첨부만 노출한다(인라인은 에디터에서 관리 → 중복 방지).
  const content = watch('content')
  const inlineSet = useMemo(() => inlineImageSrcs(content ?? ''), [content])
  const galleryExisting = (existingAttachments ?? []).filter((a) => !inlineSet.has(a.url))

  // 에디터 이미지 버튼 → 파일 선택 → (수정 모드)즉시 업로드 / (작성 모드)blob 삽입 후 제출 시 업로드.
  const insertInlineImage = useCallback(() => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.onchange = async () => {
      const file = input.files?.[0]
      if (!file) return
      if (!file.type.startsWith('image/')) {
        toast.info('이미지 파일만 첨부할 수 있습니다.')
        return
      }
      const editor = quillRef.current?.getEditor()
      if (!editor) return
      const range = editor.getSelection(true)
      const index = range ? range.index : editor.getLength()
      if (isEdit && id) {
        try {
          const att = await attachmentsApi.upload(id, file)
          editor.insertEmbed(index, 'image', att.url)
          editor.setSelection(index + 1, 0)
          qc.invalidateQueries({ queryKey: attachmentKeys.list(id) })
        } catch (e) {
          toast.error(getErrorMessage(e))
        }
      } else {
        const blobUrl = URL.createObjectURL(file)
        inlinePendingRef.current.push({ blobUrl, file })
        editor.insertEmbed(index, 'image', blobUrl)
        editor.setSelection(index + 1, 0)
      }
      // 프로그램적으로 삽입한 이미지를 폼 값에 확실히 반영한다(react-quill 의 api-source 변경이
      // onChange 로 전파되지 않는 경우 대비 — 이게 없으면 제출 본문에 이미지가 누락된다).
      setValue('content', editor.root.innerHTML, { shouldValidate: true, shouldDirty: true })
    }
    input.click()
  }, [isEdit, id, qc, setValue])

  const modules = useMemo(
    () => ({ toolbar: { container: TOOLBAR, handlers: { image: insertInlineImage } } }),
    [insertInlineImage],
  )

  const onPickFiles = (e: ChangeEvent<HTMLInputElement>) => {
    const picked = Array.from(e.target.files ?? [])
    const images = picked.filter((f) => f.type.startsWith('image/'))
    if (images.length < picked.length) toast.info('이미지 파일만 첨부할 수 있습니다.')
    if (images.length)
      setPending((prev) => [
        ...prev,
        ...images.map((file) => ({ file, url: URL.createObjectURL(file) })),
      ])
    e.target.value = ''
  }

  const removePending = (idx: number) =>
    setPending((prev) => {
      const next = [...prev]
      const [removed] = next.splice(idx, 1)
      if (removed) URL.revokeObjectURL(removed.url)
      return next
    })

  const onDeleteExisting = async (attachmentId: string) => {
    try {
      await deleteAttachment.mutateAsync(attachmentId)
    } catch (e) {
      toast.error(getErrorMessage(e))
    }
  }

  /** 갤러리 미업로드 이미지를 대상 글에 업로드. 실패 개수 반환(부분 실패 허용). */
  const uploadPendingGallery = async (postId: string): Promise<number> => {
    let failed = 0
    for (const { file } of pending) {
      try {
        await attachmentsApi.upload(postId, file)
      } catch {
        failed++
      }
    }
    if (pending.length) qc.invalidateQueries({ queryKey: attachmentKeys.list(postId) })
    return failed
  }

  /**
   * 작성 모드 인라인 이미지: 본문에 남은 blob 들을 업로드해 실제 url 로 치환한 본문과 실패 개수를 반환.
   * 업로드 실패해 blob 으로 남은 img 는 다른 세션에서 표시 불가하므로 본문에서 제거한다(깨진 저장 방지).
   */
  const resolveInlineForCreate = async (
    postId: string,
    html: string,
  ): Promise<{ html: string; failed: number }> => {
    const remaining = inlinePendingRef.current.filter((p) => html.includes(p.blobUrl))
    if (!remaining.length) return { html, failed: 0 }
    const map = new Map<string, string>()
    let failed = 0
    for (const p of remaining) {
      try {
        const att = await attachmentsApi.upload(postId, p.file)
        map.set(p.blobUrl, att.url)
      } catch {
        failed++
      }
    }
    let out = rewriteImageSrcs(html, map)
    if (out.includes('blob:')) out = stripBlobImages(out)
    return { html: out, failed }
  }

  const onSubmit = async (values: PostFormValues) => {
    try {
      let postId: string
      if (isEdit) {
        // 수정 모드: 인라인은 이미 실제 url 로 삽입돼 있어 그대로 저장된다.
        await updateMutation.mutateAsync(values)
        postId = id!
      } else {
        // 작성 모드: 글 생성 → 인라인 이미지 업로드/치환. blob URL 이 저장되지 않도록 정리해 다시 저장.
        postId = (await createMutation.mutateAsync(values)).id
        const { html: fixedContent, failed: inlineFailed } = await resolveInlineForCreate(
          postId,
          values.content,
        )
        if (fixedContent !== values.content)
          await postsApi.update(postId, { ...values, content: fixedContent })
        if (inlineFailed > 0) toast.warn(`본문 이미지 ${inlineFailed}개 업로드에 실패했습니다.`)
      }
      const failed = await uploadPendingGallery(postId)

      pending.forEach((p) => URL.revokeObjectURL(p.url))
      inlinePendingRef.current.forEach((p) => URL.revokeObjectURL(p.blobUrl))
      inlinePendingRef.current = []
      setPending([])

      if (failed > 0) toast.warn(`이미지 ${failed}개 업로드에 실패했습니다.`)
      toast.success(isEdit ? '수정되었습니다.' : '등록되었습니다.')
      navigate(`/posts/${postId}`)
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
              <ReactQuill
                ref={quillRef}
                theme="snow"
                modules={modules}
                value={field.value}
                onChange={field.onChange}
              />
            )}
          />
          {errors.content && <span className="error-text">{errors.content.message}</span>}
        </div>

        <div className="field">
          <label htmlFor="images">이미지 첨부 (갤러리)</label>
          <input id="images" type="file" accept="image/*" multiple onChange={onPickFiles} />
          <p className={styles.hint}>이미지 파일만 첨부할 수 있습니다.</p>

          {galleryExisting.length > 0 && (
            <div className={styles.thumbs}>
              {galleryExisting.map((a) => (
                <div key={a.id} className={styles.thumb}>
                  <img className={styles.thumbImg} src={a.url} alt={a.originalFilename} />
                  <button
                    type="button"
                    className={styles.thumbRemove}
                    onClick={() => onDeleteExisting(a.id)}
                    aria-label="첨부 삭제"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}

          {pending.length > 0 && (
            <div className={styles.thumbs}>
              {pending.map((p, i) => (
                <div key={p.url} className={`${styles.thumb} ${styles.thumbPending}`}>
                  <img className={styles.thumbImg} src={p.url} alt={p.file.name} />
                  <button
                    type="button"
                    className={styles.thumbRemove}
                    onClick={() => removePending(i)}
                    aria-label="제거"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
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
