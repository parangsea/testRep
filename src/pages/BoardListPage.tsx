import { useMemo, useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { Search } from 'lucide-react'
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table'
import { usePostsQuery } from '../hooks/usePosts'
import { useAuthStore } from '../store/authStore'
import Pagination from '../components/Pagination'
import { formatDate } from '../utils/format'
import { getErrorMessage } from '../utils/error'
import { PAGE_SIZE } from '../config'
import type { Post } from '../types'
import styles from './BoardListPage.module.css'

const columnHelper = createColumnHelper<Post>()

export default function BoardListPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const user = useAuthStore((s) => s.user)

  const page = Math.max(1, Number(searchParams.get('page') ?? '1') || 1)
  const search = searchParams.get('q') ?? ''
  const [keyword, setKeyword] = useState(search)

  const { data, isLoading, isError, error } = usePostsQuery({
    page,
    pageSize: PAGE_SIZE,
    search,
  })

  // 서버 페이지네이션이므로 행 번호는 전체 개수 기준으로 역순 계산합니다.
  const columns = useMemo(() => {
    const total = data?.total ?? 0
    return [
      columnHelper.display({
        id: 'no',
        header: '번호',
        cell: ({ row }) => total - ((page - 1) * PAGE_SIZE + row.index),
      }),
      columnHelper.accessor('title', {
        header: '제목',
        cell: ({ row }) => <Link to={`/posts/${row.original.id}`}>{row.original.title}</Link>,
      }),
      columnHelper.accessor('authorName', { header: '작성자' }),
      columnHelper.accessor('createdAt', {
        header: '작성일',
        cell: ({ getValue }) => formatDate(getValue()),
      }),
    ]
  }, [data?.total, page])

  const table = useReactTable({
    data: data?.items ?? [],
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

  const submitSearch = (e: FormEvent) => {
    e.preventDefault()
    const next = new URLSearchParams()
    if (keyword.trim()) next.set('q', keyword.trim())
    next.set('page', '1')
    setSearchParams(next)
  }

  const goPage = (p: number) => {
    const next = new URLSearchParams(searchParams)
    next.set('page', String(p))
    setSearchParams(next)
  }

  return (
    <section>
      <Helmet>
        <title>게시판 | testRep</title>
      </Helmet>

      <div className={styles.toolbar}>
        <h1 className={styles.title}>게시판</h1>
        {user && (
          <Link to="/posts/new" className="btn">
            글쓰기
          </Link>
        )}
      </div>

      <form className={styles.search} onSubmit={submitSearch}>
        <input
          type="text"
          placeholder="제목 / 내용 검색"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
        />
        <button type="submit" className="btn btn-secondary">
          <Search size={16} /> 검색
        </button>
      </form>

      {isLoading && <p className="muted">불러오는 중...</p>}
      {isError && <p className="error-text">{getErrorMessage(error)}</p>}

      {data && (
        <>
          <table className={styles.table}>
            <thead>
              {table.getHeaderGroups().map((hg) => (
                <tr key={hg.id}>
                  {hg.headers.map((header) => (
                    <th key={header.id} className={styles[`col_${header.column.id}`]}>
                      {flexRender(header.column.columnDef.header, header.getContext())}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {table.getRowModel().rows.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} className={styles.empty}>
                    {search ? '검색 결과가 없습니다.' : '게시글이 없습니다.'}
                  </td>
                </tr>
              ) : (
                table.getRowModel().rows.map((row) => (
                  <tr key={row.id}>
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className={styles[`col_${cell.column.id}`]}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>

          <Pagination page={data.page} totalPages={data.totalPages} onChange={goPage} />
          <p className={`muted ${styles.total}`}>총 {data.total}건</p>
        </>
      )}
    </section>
  )
}
