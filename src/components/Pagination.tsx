import clsx from 'clsx'
import styles from './Pagination.module.css'

interface PaginationProps {
  page: number
  totalPages: number
  onChange: (page: number) => void
}

/** 최대 5개 페이지 번호를 현재 페이지 주변으로 표시하는 페이지네이션. */
export default function Pagination({ page, totalPages, onChange }: PaginationProps) {
  if (totalPages <= 1) return null

  const windowSize = 5
  let start = Math.max(1, page - Math.floor(windowSize / 2))
  const end = Math.min(totalPages, start + windowSize - 1)
  start = Math.max(1, end - windowSize + 1)
  const pages = Array.from({ length: end - start + 1 }, (_, i) => start + i)

  return (
    <nav className={styles.pagination} aria-label="페이지 네비게이션">
      <button className={styles.btn} disabled={page <= 1} onClick={() => onChange(page - 1)}>
        이전
      </button>
      {pages.map((p) => (
        <button
          key={p}
          className={clsx(styles.btn, p === page && styles.active)}
          aria-current={p === page ? 'page' : undefined}
          onClick={() => onChange(p)}
        >
          {p}
        </button>
      ))}
      <button
        className={styles.btn}
        disabled={page >= totalPages}
        onClick={() => onChange(page + 1)}
      >
        다음
      </button>
    </nav>
  )
}
