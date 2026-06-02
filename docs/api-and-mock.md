# 더미(Mock) → 실제 API 전환

현재는 모든 `/api` 요청을 MSW 가 가로채 더미 데이터로 응답합니다. 실제 백엔드가 준비되면:

1. `.env` 에서 `VITE_USE_MOCK=false` 로 변경 (MSW 워커가 시작되지 않음)
2. `VITE_API_BASE_URL` 을 실제 백엔드 주소로 설정 (예: `https://api.example.com` 또는 `/api`)
3. 같은 오리진의 `/api` 라면 `vite.config.ts` 의 `server.proxy` 또는 `nginx.conf` 의 `location /api/` 프록시를 사용

> API 계약(요청/응답 형태)은 `src/mocks/handlers.ts` 와 `src/api/*.api.ts` 가 동일한 엔드포인트를 사용하므로,
> 백엔드는 다음 엔드포인트만 맞추면 됩니다.

## API 엔드포인트

| 메서드 | 경로 | 설명 |
| --- | --- | --- |
| POST | `/auth/login` | `{username, password}` → `{token, user}` |
| POST | `/auth/register` | `{username, email, password}` → `{token, user}` |
| GET | `/auth/me` | (Bearer) → `user` |
| GET | `/users/:id` | → `UserProfile` (공개 프로필 + `postCount`/`commentCount`) |
| GET | `/categories` | → `Category[]` |
| POST | `/categories` | (Bearer, **admin**) `{name, slug}` → `category` (중복 slug → 409) |
| DELETE | `/categories/:id` | (Bearer, **admin**) → 204 (게시글 있는 카테고리 → 409) |
| GET | `/posts?page&pageSize&search&categoryId` | → `{items, total, page, pageSize, totalPages}` |
| GET | `/posts/:id` | → `post` |
| POST | `/posts` | (Bearer) `{title, content, categoryId}` → `post` |
| PUT | `/posts/:id` | (Bearer, 작성자 또는 admin) `{title, content, categoryId}` → `post` |
| DELETE | `/posts/:id` | (Bearer, 작성자 또는 admin) → 204 |
| GET | `/posts/:id/comments` | → `Comment[]` (평면 목록, 작성순; `parentId` 로 2단계 트리 구성) |
| POST | `/posts/:id/comments` | (Bearer) `{content, parentId?}` → `comment` |
| PUT | `/comments/:id` | (Bearer, 작성자 또는 admin) `{content}` → `comment` |
| DELETE | `/comments/:id` | (Bearer, 작성자 또는 admin) → 204 (최상위 댓글 삭제 시 대댓글 cascade) |

## 권한 모델

- `User.role` 은 `'user' | 'admin'`. JWT payload 의 `role` 로 전달되어 클라이언트(authStore)가 복원합니다.
- **수정/삭제**: 게시글·댓글은 **작성자 본인 또는 admin** 만 가능 (서버 핸들러가 강제, UI 는 보조 가드).
- **카테고리 관리**: admin 전용.
- 더미 시드 계정: `admin / admin1234` (관리자), `user / user1234` (일반).

## 도메인 타입

요청/응답 형태의 단일 출처는 `src/types/index.ts` 입니다 (`Category`, `Comment`, `UserProfile`, `Role` 등).
백엔드는 이 타입과 위 엔드포인트만 맞추면 더미 → 실서버 전환이 코드 변경 없이 됩니다.
