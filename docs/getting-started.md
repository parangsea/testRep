# 시작하기

## 빠른 시작

```bash
npm install
npm run dev           # http://localhost:5173
```

앱은 `/api` 요청을 Vite 프록시를 통해 실제 백엔드로 보냅니다. `.env` 에서 대상을 설정하세요.

```bash
# .env
VITE_API_BASE_URL=/api
VITE_PROXY_TARGET=http://<백엔드 주소>     # 예: http://minoservers.iptime.org/testboot
```

> 테스트 계정 — 아이디 `admin` / 비밀번호 `admin1234`

자세한 연동 구성은 [API 연동](./api.md) 을 참고하세요.

## 스크립트

| 명령 | 설명 |
| --- | --- |
| `npm run dev` | 개발 서버 (실서버 프록시) |
| `npm run build` | 타입체크(`tsc -b`) 후 프로덕션 빌드 → `dist/` |
| `npm run preview` | 빌드 산출물 미리보기 |
| `npm run lint` | ESLint 검사 |
| `npm run format` | Prettier 포맷팅 |
| `npm run test` | Vitest 단위 테스트 |
| `npm run test:e2e` | Playwright E2E 테스트 (실서버 대상) |
