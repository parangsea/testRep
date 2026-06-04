import { Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import styles from './NotFoundPage.module.css'

export default function NotFoundPage() {
  return (
    <section className="page-center">
      <Helmet>
        <title>404 | testRep 게시판</title>
      </Helmet>
      <div className={styles.body}>
        <h1 className={styles.code}>404</h1>
        <p className="muted">페이지를 찾을 수 없습니다.</p>
        <Link to="/posts" className="btn">
          게시판으로
        </Link>
      </div>
    </section>
  )
}
