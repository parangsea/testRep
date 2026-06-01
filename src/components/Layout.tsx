import { Suspense } from 'react'
import { Outlet } from 'react-router-dom'
import Navbar from './Navbar'

export default function Layout() {
  return (
    <>
      <Navbar />
      <main className="container">
        {/* lazy 로드되는 페이지 청크를 가져오는 동안 보여줄 폴백 */}
        <Suspense fallback={<div className="route-fallback">불러오는 중…</div>}>
          <Outlet />
        </Suspense>
      </main>
    </>
  )
}
