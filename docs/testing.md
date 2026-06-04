# 테스트 & 검증 전략

프런트엔드 코드를 수정할 때 **단위 테스트(Vitest)** 와 **E2E(Playwright)** 검증이 필수입니다.
아래 계층이 CI와 로컬 pre-push 훅에서 자동으로 강제됩니다 (수동 실행 의존 ❌).

## 검증 계층

| 계층 | 도구 | 대상 | 명령 |
| --- | --- | --- | --- |
| 정적 | ESLint | 코드 스타일/오류 | `npm run lint` |
| 단위/컴포넌트 | **Vitest** + Testing Library (jsdom) | 순수 로직·스키마·컴포넌트 | `npm test` |
| 타입/빌드 | `tsc -b` + Vite | 타입 안정성·번들 | `npm run build` |
| 회귀 게이트 | 하네스 eval | 앱 건강·번들 예산 회귀 | `node harness/eval/runner.mjs` |
| E2E | **Playwright** (chromium) | 실제 브라우저 사용자 시나리오 | `npm run test:e2e` |
| 교차검증 | codex(GPT-5.5) | 적대적 코드 리뷰 | `npm run cross-review:gate` |

## 단위 테스트 (Vitest)

- 위치: `src/**/*.{test,spec}.{ts,tsx}` (Playwright e2e 와 분리 — `vite.config.ts` 의 `test.exclude`).
- 순수 로직은 함수로 추출해 테스트한다(예: `src/utils/commentTree.ts` ↔ `commentTree.test.ts`).
- 스키마는 `safeParse` 로 정상/비정상 케이스를 검증한다(예: `comment.schema.test.ts`).
- 컴포넌트는 Testing Library 로 렌더/상호작용을 검증한다(예: `Modal.test.tsx`).
- 네트워크 의존을 피해 결정적으로 유지한다(플레이키 테스트는 "필수 게이트"의 신뢰를 무너뜨림).

```bash
npm test            # 1회 실행 (CI/훅)
npm run test:watch  # 워치 모드 (개발)
```

## E2E 테스트 (Playwright)

- 위치: `e2e/*.spec.ts`. `playwright.config.ts` 의 `webServer` 가 `npm run dev` 를 자동 기동하며, 앱은 Vite 프록시를 통해 **실제 백엔드**로 요청한다.
- 공유 백엔드를 오염시키지 않도록, 쓰기(글 작성·이미지 첨부) 시나리오는 **생성한 글을 테스트 끝(finally)에서 반드시 삭제(자기정리)**한다.
- 접근성 우선 셀렉터(`getByRole`/`getByLabel`)와 자동 재시도(`expect`)로 견고하게 작성한다. 실서버 응답 지연(refetch) 구간은 단언 자동 대기로 흡수한다.
- 커버: 게시판 목록/상세·카테고리 필터(`board.spec.ts`), 로그인 성공·실패(`auth.spec.ts`), 글 작성/삭제·이미지 첨부(`post-write.spec.ts`).

```bash
npm run test:e2e    # chromium e2e (브라우저 미설치 시: npx playwright install chromium)
```

## 강제 지점

- **CI** (`.github/workflows/harness.yml`): `gate` 잡(lint→test→build→eval→baseline). (E2E 는 실서버 의존이라 CI 에선 제외 — 로컬 `npm run test:e2e` 로 실행)
- **pre-push 훅** (`.githooks/pre-push`): vitest → build → eval → baseline → codex 교차리뷰.
- **단일 명령**: `npm run harness` (lint + test + build + eval + baseline 가드).

자세한 API 계약은 [api.md](./api.md), 하네스 상세는 [../harness/README.md](../harness/README.md) 참고.
