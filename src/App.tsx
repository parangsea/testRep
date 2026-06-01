import { lazy } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import ProtectedRoute from './components/ProtectedRoute'

// 라우트 단위 코드 스플리팅: 각 페이지를 별도 청크로 분리해 초기 번들을 줄인다.
// 특히 PostFormPage 는 무거운 react-quill 에디터를 끌고 오므로 글쓰기/수정 시에만 로드된다.
const LoginPage = lazy(() => import('./pages/LoginPage'))
const RegisterPage = lazy(() => import('./pages/RegisterPage'))
const BoardListPage = lazy(() => import('./pages/BoardListPage'))
const PostDetailPage = lazy(() => import('./pages/PostDetailPage'))
const PostFormPage = lazy(() => import('./pages/PostFormPage'))
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'))

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Navigate to="/posts" replace />} />

        {/* 공개 라우트 */}
        <Route path="login" element={<LoginPage />} />
        <Route path="register" element={<RegisterPage />} />
        <Route path="posts" element={<BoardListPage />} />
        <Route path="posts/:id" element={<PostDetailPage />} />

        {/* 인증 필요 라우트 (글쓰기/수정) */}
        <Route element={<ProtectedRoute />}>
          <Route path="posts/new" element={<PostFormPage />} />
          <Route path="posts/:id/edit" element={<PostFormPage />} />
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}
