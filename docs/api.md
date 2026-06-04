# API 연동

모든 `/api` 요청은 Vite 개발 프록시를 통해 실제 백엔드(Spring Boot `testBoot`)로 전달됩니다.

## 연동 구성

- `src/api/client.ts` — axios 인스턴스. base URL = `VITE_API_BASE_URL`(기본 `/api`), 요청마다 Bearer 토큰을 자동 첨부하고 401 응답 시 세션을 정리합니다.
- `.env`
  - `VITE_API_BASE_URL` — API base URL. 프록시를 쓰므로 보통 same-origin `/api`.
  - `VITE_PROXY_TARGET` — dev 프록시가 `/api` 요청을 전달할 실제 백엔드 주소.
- `vite.config.ts` — `server.proxy['/api']` 가 `VITE_PROXY_TARGET` 으로 중계합니다. 백엔드 CORS 필터가 dev Origin(`localhost:5173`)을 거부하므로, 프록시가 `Origin`/`Referer` 헤더를 제거해 비-CORS(same-origin) 요청처럼 보이게 합니다.

> **프로덕션**: 빌드 산출물에는 Vite dev 프록시가 없습니다. 배포 시에는 백엔드를 same-origin 으로 두거나, 리버스 프록시(`nginx.conf` 의 `/api`) 또는 서버 측 CORS 허용을 구성해야 합니다.

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
| GET | `/posts/:postId/attachments` | → `Attachment[]` (게시글 첨부 이미지 목록) |
| POST | `/posts/:postId/attachments` | (Bearer) `multipart/form-data` field=`file` (이미지 전용) → `Attachment` |
| GET | `/attachments/:id` | → 이미지 바이트 (공개, 원본 Content-Type) |
| DELETE | `/attachments/:id` | (Bearer, 업로더 또는 admin) → 204 |

## 권한 모델

- `User.role` 은 `'user' | 'admin'`. JWT payload 의 `role` 로 전달되어 클라이언트(`authStore`)가 복원하고, `/auth/me` 로 서버 권위 값과 동기화합니다.
- **수정/삭제**: 게시글·댓글은 **작성자 본인 또는 admin** 만 가능 (서버가 강제, UI 는 보조 가드).
- **카테고리·메뉴 관리**: admin 전용.
- 백엔드 시드 계정: `admin / admin1234` (관리자), `user / user1234` (일반).

## 이미지 첨부

게시글에 이미지를 첨부합니다(현재 게시글 전용, 댓글 첨부는 백엔드 확장 대기).

- **업로드**: `multipart/form-data` 로 `file` 필드에 이미지 1개. 서버가 이미지 여부를 검증(비이미지/SVG 거부).
- **표시**: 응답의 `url`(예: `/api/attachments/1`)은 인증 불필요 공개 경로 → `<img src={url}>` 로 바로 표시.
- **첨부 모델**: 본문 HTML 과 별개인 "첨부 목록"(갤러리). 상세 페이지에서 갤러리로 렌더한다.
- **수정**: 추가 업로드 / `DELETE /attachments/:id`. 교체는 삭제 후 재업로드(첨부 PUT 없음).

> ⚠️ **본문 인라인 이미지 제한**: 백엔드가 게시글 `content` 의 `<img src>` 를 sanitize 로 제거하므로, 현재는 본문 안에 인라인으로 이미지를 넣을 수 없다(갤러리 첨부만 가능). 인라인을 지원하려면 백엔드가 content 의 `/api/attachments/...` 이미지 src 를 허용해야 한다.

## 도메인 타입

요청/응답 형태의 단일 출처는 `src/types/index.ts` 입니다 (`Category`, `Comment`, `MenuItem`, `UserProfile`, `Attachment`, `Role` 등).
프런트의 `src/api/*.api.ts` 는 이 타입과 위 엔드포인트 계약을 그대로 사용합니다.
