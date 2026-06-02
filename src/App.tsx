import { lazy } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import MenuGuard from './components/MenuGuard'
import { useHydrateSession } from './hooks/useHydrateSession'

// 라우트 단위 코드 스플리팅: 각 페이지를 별도 청크로 분리해 초기 번들을 줄인다.
// 특히 PostFormPage 는 무거운 react-quill 에디터를 끌고 오므로 글쓰기/수정 시에만 로드된다.
const LoginPage = lazy(() => import('./pages/LoginPage'))
const RegisterPage = lazy(() => import('./pages/RegisterPage'))
const BoardListPage = lazy(() => import('./pages/BoardListPage'))
const PostDetailPage = lazy(() => import('./pages/PostDetailPage'))
const PostFormPage = lazy(() => import('./pages/PostFormPage'))
const AdminCategoriesPage = lazy(() => import('./pages/AdminCategoriesPage'))
const AdminMenusPage = lazy(() => import('./pages/AdminMenusPage'))
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'))

export default function App() {
  useHydrateSession() // 부팅 시 토큰이 있으면 서버 권위 사용자(역할)로 동기화

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Navigate to="/posts" replace />} />

        {/* 공개 라우트 */}
        <Route path="login" element={<LoginPage />} />
        <Route path="register" element={<RegisterPage />} />
        <Route path="posts" element={<BoardListPage />} />
        <Route path="posts/:id" element={<PostDetailPage />} />

        {/* 인증 필요 라우트 — 메뉴 테이블 access 기반(메뉴에 없으면 fallback=auth). */}
        <Route element={<MenuGuard fallback="auth" />}>
          <Route path="posts/new" element={<PostFormPage />} />
          <Route path="posts/:id/edit" element={<PostFormPage />} />
        </Route>

        {/* 관리자 라우트 — 메뉴 테이블 access 기반(메뉴에 없으면 fallback=admin). */}
        <Route element={<MenuGuard fallback="admin" />}>
          <Route path="admin/categories" element={<AdminCategoriesPage />} />
          <Route path="admin/menus" element={<AdminMenusPage />} />
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}
