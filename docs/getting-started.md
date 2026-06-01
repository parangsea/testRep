# 시작하기

## 빠른 시작

```bash
npm install
npm run msw:init      # public/mockServiceWorker.js 생성 (최초 1회)
npm run dev           # http://localhost:5173
```

> 더미 로그인 계정 — 아이디 `admin` / 비밀번호 `admin1234`

## 스크립트

| 명령 | 설명 |
| --- | --- |
| `npm run dev` | 개발 서버 (더미 모드) |
| `npm run build` | 타입체크(`tsc -b`) 후 프로덕션 빌드 → `dist/` |
| `npm run preview` | 빌드 산출물 미리보기 |
| `npm run lint` | ESLint 검사 |
| `npm run format` | Prettier 포맷팅 |
| `npm run test` | Vitest 단위 테스트 |
| `npm run test:e2e` | Playwright E2E 테스트 |
| `npm run msw:init` | MSW 워커 스크립트 생성 |
