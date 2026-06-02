[medium] harness/eval/scorers.mjs:15 — `countZero`가 배열이 아니면 `Number(value)`로 변환하므로 `null`, `''`, `[]` 같은 잘못된/누락된 결과도 `0`으로 취급되어 통과한다. 프로브가 실패해서 `null`을 반환하는 회귀가 “0건”으로 은폐될 수 있다.

[medium] harness/eval/probes.mjs:62 — 저장소 밖 경로 차단이 `relative(root, target)`의 문자열 판정만 사용하고 `realpath`를 보지 않는다. repo 내부의 symlink가 repo 밖 파일을 가리키면 `outsideRoot`는 false이고 `existsSync(target)`는 외부 파일 존재 여부에 의존해 통과/실패가 환경 의존적으로 바뀐다.

[medium] harness/eval/probes.mjs:84 — `viteExcludesE2e`는 실제 `test.exclude`를 파싱하지 않고 파일 전체에서 `exclude: [...]` 안의 `e2e` 문자열만 찾는다. `server.watch.exclude`, 다른 설정의 `exclude`, 또는 `'not-e2e'` 같은 문자열만 있어도 vitest e2e 제외가 설정된 것처럼 오탐할 수 있다.

[medium] harness/review/cross-review.mjs:134 — `codex exec`가 실패해도 catch에서 경고 문자열만 붙이고 계속 진행한다. `--gate` 실행 시 리뷰 도구 자체가 비정상 종료했는데도 high/critical 태그가 없으면 exit 0이 될 수 있어 리뷰 게이트가 무력화된다.
