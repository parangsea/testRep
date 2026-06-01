# 아키텍처

## 기술 스택

- **빌드/런타임**: Vite 5, React 18, TypeScript 5
- **라우팅**: react-router-dom v6 (인증 가드 포함)
- **데이터 패칭**: @tanstack/react-query, axios
- **상태 관리**: zustand (인증 세션), jwt-decode
- **폼/검증**: react-hook-form + zod
- **테이블/UI**: @tanstack/react-table, react-quill(에디터), lucide-react(아이콘), clsx, react-toastify, react-helmet-async
- **더미 API**: MSW (네트워크 레벨 인터셉트, localStorage 영속화)
- **테스트**: Vitest + Testing Library(단위), Playwright(E2E)
- **품질**: ESLint(flat config) + Prettier
- **배포**: nginx (`nginx.conf` 제공)

## 기능

- **인증**: 회원가입 / 로그인 / 로그아웃, 토큰(JWT) 기반 세션 복원, 보호 라우트(`ProtectedRoute`)
- **게시판 CRUD**: 목록(페이지네이션 + 검색), 상세, 작성, 수정, 삭제 (작성자 본인만 수정/삭제)

## 프로젝트 구조

```
src/
├── api/            axios 클라이언트 + 엔드포인트 (auth, posts)
├── components/     Layout, Navbar, ProtectedRoute, Pagination
├── config.ts       환경 토글(IS_MOCK), API_BASE_URL, 상수
├── hooks/          react-query 훅 (usePosts, useAuth)
├── mocks/          MSW 더미 레이어 (db, handlers, jwt, browser, server)
├── pages/          Login, Register, BoardList, PostDetail, PostForm, NotFound
├── schemas/        zod 검증 스키마
├── store/          zustand 인증 스토어
├── types/          공용 타입
└── utils/          error, format(dayjs)
```

## 번들 최적화

초기 번들을 줄이기 위해 다음을 적용했습니다.

- **라우트 코드 스플리팅**: 모든 페이지를 `React.lazy`로 지연 로딩 (`src/App.tsx`). 무거운 `react-quill` 에디터를 포함하는 `PostFormPage`는 글쓰기/수정 진입 시에만 로드됩니다. 로딩 중에는 `Layout`의 `Suspense` 폴백이 표시됩니다.
- **vendor 청크 분리**: `vite.config.ts`의 `build.rollupOptions.output.manualChunks`로 `react-vendor`(react/react-dom/react-router), `query`(react-query/axios), `form`(react-hook-form/zod 등)을 분리해 캐시 효율을 높였습니다.
- **MSW 워커 분리**: `src/main.tsx`에서 `IS_MOCK`일 때만 동적 `import()`로 워커를 로드하므로 실제 배포 번들에는 포함되지 않습니다.
