import { Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'

export default function NotFoundPage() {
  return (
    <section className="page-center">
      <Helmet>
        <title>404 | testRep 게시판</title>
      </Helmet>
      <div style={{ textAlign: 'center' }}>
        <h1 style={{ fontSize: 48, margin: 0 }}>404</h1>
        <p className="muted">페이지를 찾을 수 없습니다.</p>
        <Link to="/posts" className="btn">
          게시판으로
        </Link>
      </div>
    </section>
  )
}
