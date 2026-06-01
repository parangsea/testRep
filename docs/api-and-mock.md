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
| GET | `/posts?page&pageSize&search` | → `{items, total, page, pageSize, totalPages}` |
| GET | `/posts/:id` | → `post` |
| POST | `/posts` | (Bearer) `{title, content}` → `post` |
| PUT | `/posts/:id` | (Bearer) `{title, content}` → `post` |
| DELETE | `/posts/:id` | (Bearer) → 204 |
