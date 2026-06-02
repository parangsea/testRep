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
│   ├── probes.mjs         #   앱 상태 측정 (링크 무결성, 파일 존재, 설정, 메트릭)
│   ├── scorers.mjs        #   채점기 (boolPass / countZero / maxValue)
│   ├── tasks/
│   │   └── app-health.task.mjs   # 골든 태스크 (회귀 가드)
│   ├── metrics.json       #   메트릭 스냅샷 (예: 초기 청크 gzip KB)
│   ├── baseline.json      #   회귀 비교 기준 (생성물)
│   └── runner.mjs         #   실행·채점·게이트 (CLI)
└── .traces/               # 실행 산출물(gitignore) — replay 대상
```

## 사용법

### Eval 실행 (회귀 게이트)

```bash
node harness/eval/runner.mjs                   # 실행 + baseline 비교, 회귀 시 exit 1
node harness/eval/runner.mjs --update-baseline # 현재 결과를 baseline 으로 저장
```

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
| `initial-bundle-budget` | 초기 진입 청크 gzip ≤ 50KB |

> 새 버그를 고칠 때마다 `tasks/app-health.task.mjs` 에 회귀 케이스를 추가하세요.
> 그래야 같은 버그가 다시 새지 않습니다.

## 메트릭 갱신

`metrics.json` 의 `initialChunkGzipKb` 는 실제 빌드 산출물 기준입니다.
번들이 바뀌면 `npm run build` 의 `dist/assets/index-*.js` gzip 크기로 갱신한 뒤
`--update-baseline` 로 기준선을 다시 잡으세요.

## CI 게이트 예시

```yaml
# .github/workflows/harness.yml (예시)
- run: node harness/eval/runner.mjs   # 회귀 시 exit 1 → 머지 차단
```
