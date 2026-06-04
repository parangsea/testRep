# CLAUDE.md

React + TypeScript + Vite 기반 게시판/로그인 앱. 실제 백엔드(Spring Boot `testBoot`)와 연동되며,
모든 `/api` 요청은 Vite 개발 프록시를 통해 백엔드로 전달됩니다.

## 주요 명령

- `npm run dev` — 개발 서버 (http://localhost:5173, `/api` → 실서버 프록시)
- `npm run build` — `tsc -b` 후 Vite 프로덕션 빌드 → `dist/`
- `npm run lint` — ESLint
- `npm test` — Vitest 단위/컴포넌트 테스트
- `npm run test:e2e` — Playwright E2E (실서버 대상, 읽기/로그인 위주)

## 연동 구성

- 백엔드 프록시 대상은 `.env` 의 `VITE_PROXY_TARGET`, base URL 은 `VITE_API_BASE_URL`(기본 `/api`).
- 백엔드 CORS 가 dev Origin 을 거부하므로 `vite.config.ts` 프록시가 `Origin`/`Referer` 헤더를 제거한다.
- 자세한 엔드포인트 계약·권한 모델은 `docs/api.md` 참고. 도메인 타입 단일 출처는 `src/types/index.ts`.

## E2E 자동 실행 (중요)

**UI·라우팅·API 연동에 영향을 주는 코드를 수정했다면, 작업 완료를 보고하기 전에
`npm run test:e2e` 를 실행하고 그 결과를 보고한다.**

- 대상 변경: `src/` 의 pages·components·api·hooks·store·router, `vite.config.ts`, `.env`(프록시) 등.
- e2e 는 실제 백엔드(홈 서버) 대상이며 **읽기/로그인만** 검증한다(쓰기 없음 → 공유 백엔드 오염 없음).
- 실패 시 **"코드 버그" 인지 "백엔드 다운/네트워크" 인지 구분**해서 보고한다.
- docs·주석·하네스 설정만 바꾼 경우는 **제외**(불필요한 e2e 실행 금지).
- 새 환경에서 브라우저 미설치면 `npx playwright install chromium` 선행.
