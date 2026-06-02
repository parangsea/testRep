# harness/ — 디버깅 가능한 하네스 툴킷

현재 앱을 대상으로 한 **관측(trace) + 지속적 검증(eval)** 의 최소 참조 구현입니다.
설계 배경은 [docs/harness-engineering/09-debugging-system.md](../docs/harness-engineering/09-debugging-system.md) 를 참고하세요.

## 격리 원칙 (앱 빌드와 충돌하지 않음)

- 모든 파일은 **의존성 없는 `.mjs`** — `node` 로 직접 실행, 빌드 불필요
- 앱의 `tsc -b`(`src`만), vitest(`src/**`만), eslint(`**/*.{ts,tsx}`만) **어디에도 포함되지 않음**
- 따라서 하네스 변경이 앱 빌드/테스트를 깨뜨리지 않는다

## 구조

```
harness/
├── trace/                 # P1: 관측
│   ├── schema.mjs         #   이벤트 스키마 + 팩토리(검증 포함)
│   ├── collector.mjs      #   append-only JSONL 수집기
│   └── timeline.mjs       #   타임라인 + 요약 렌더러 (CLI)
├── eval/                  # P3: 지속적 검증
│   ├── probes.mjs         #   앱 상태 측정 (링크 무결성, 파일 존재, 설정, 번들 gzip 실측)
│   ├── scorers.mjs        #   채점기 (boolPass / countZero / maxValue)
│   ├── tasks/
│   │   └── app-health.task.mjs   # 골든 태스크 (회귀 가드)
│   ├── metrics.json       #   참고용 스냅샷 (게이트는 dist 실측 사용)
│   ├── baseline.json      #   회귀 비교 기준 (생성물)
│   ├── guard-baseline.mjs #   baseline 오염(회귀 세탁) 가드
│   └── runner.mjs         #   실행·채점·게이트 (CLI)
├── review/                # ②: 교차 모델 적대 리뷰
│   └── cross-review.mjs   #   uncommitted diff → codex(GPT-5.5) → JSON 판정 게이트
└── .traces/               # 실행 산출물(gitignore) — replay 대상
```

## 강제 지점 (수동 실행 의존 ❌ → 자동 강제 ✅)

게이트는 더 이상 "기억해서 돌리기"에 의존하지 않는다:

- **CI** (`.github/workflows/harness.yml`): push/PR 마다 빌드 → eval 회귀 → baseline 무결성 가드.
- **pre-push 훅** (`.githooks/pre-push`): push 전 로컬에서 ①eval+baseline ②codex 교차리뷰까지 강제.
  `npm install`(=`prepare`)이 `git config core.hooksPath .githooks` 로 자동 활성화. 우회는 `--no-verify`(지양).
- **npm 스크립트**: `npm run verify` / `guard:baseline` / `cross-review:gate` / `harness`(빌드+eval+가드).

## 사용법

### Eval 실행 (회귀 게이트)

```bash
npm run build                                  # 번들 예산 프로브가 dist 실측 → 빌드 선행 필수
node harness/eval/runner.mjs                   # 실행 + baseline 비교, 회귀 시 exit 1
node harness/eval/runner.mjs --update-baseline # 현재 결과를 baseline 으로 저장
node harness/eval/guard-baseline.mjs           # baseline 이 src/채점로직과 함께 바뀌면 exit 1
```

> ⚠️ `--update-baseline` 은 회귀를 "정상값"으로 세탁할 수 있다. baseline 갱신은 **src/채점 변경과 분리된 별도 커밋**으로,
> 사람 검토를 거쳐라. `guard-baseline.mjs` 가 동시 변경을 CI/훅에서 차단한다.

### 교차 리뷰 (②, codex)

```bash
node harness/review/cross-review.mjs           # uncommitted diff → codex 적대 리뷰
node harness/review/cross-review.mjs --gate    # high/critical 또는 리뷰 실패 시 exit 1
node harness/review/cross-review.mjs --dry-run # diff 만 수집 (codex 호출 안 함)
```

codex 는 JSON 코드블록(`{"findings":[...],"clean":bool}`)으로 판정을 돌려주며, 파싱 실패 시 산문 정규식으로 폴백한다.
`.env*` 는 비밀 유출 방지를 위해 리뷰 대상에서 제외된다.

### Trace 타임라인 보기

```bash
node harness/trace/timeline.mjs                       # 기본: harness/.traces/eval.jsonl
node harness/trace/timeline.mjs harness/.traces/eval.jsonl
```

## 골든 태스크 (현재 앱 기준)

| 태스크 | 검증 내용 |
| --- | --- |
| `docs-links-intact` | 모든 문서의 상대경로 링크가 유효한가 |
| `app-entry-present` | `src/main.tsx`, `src/App.tsx`, `index.html` 존재 |
| `vitest-isolated-from-e2e` | vitest 가 Playwright e2e 스펙을 제외하는가 (세션에서 고친 버그의 회귀 가드) |
| `initial-bundle-budget` | 초기 진입 청크 gzip ≤ 50KB (`dist/assets/index-*.js` 실측, dist 없으면 실패) |

> 새 버그를 고칠 때마다 `tasks/app-health.task.mjs` 에 회귀 케이스를 추가하세요.
> 그래야 같은 버그가 다시 새지 않습니다.

## 번들 측정 (실측)

`initial-bundle-budget` 는 `metrics.json` 정적값이 아니라 `npm run build` 산출물
(`dist/assets/index-*.js`)의 gzip 을 매 실행 직접 측정한다. 따라서 실제 빌드 없이는 통과할 수 없다.
`metrics.json` 은 참고용 스냅샷으로만 남는다. 번들이 의도적으로 커졌다면 `--update-baseline` 으로
기준선을 다시 잡되, **baseline 단독 커밋**으로 분리하라(`guard-baseline.mjs` 가 동시 변경을 차단).

## CI 게이트

`.github/workflows/harness.yml` 가 push/PR 마다 강제한다:

```yaml
- run: npm run build                              # 번들 실측을 위한 빌드
- run: node harness/eval/runner.mjs               # 회귀 시 exit 1 → 머지 차단
- run: node harness/eval/guard-baseline.mjs ...   # baseline 오염 시 exit 1
```

> ② codex 교차리뷰는 외부 CLI·인증·비밀을 요구해 CI 에 두지 않고 **pre-push 훅**에서 강제한다.
