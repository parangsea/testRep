// 골든 태스크 — 현재 React 앱의 건강/회귀 검증 항목.
// 각 태스크: run() 으로 측정값을 얻고, scorer 로 채점한다.
// 새 버그를 고칠 때마다 여기에 회귀 케이스를 추가한다 (디버깅 워크플로 5단계).

import * as probes from '../probes.mjs'
import { boolPass, countZero, maxValue } from '../scorers.mjs'

export const tasks = [
  {
    id: 'docs-links-intact',
    difficulty: 'easy',
    describe: '문서 내 상대경로 링크가 모두 유효한가',
    run: async () => probes.findBrokenLinks(),
    scorer: countZero('broken links'),
  },
  {
    id: 'app-entry-present',
    difficulty: 'easy',
    describe: '앱 엔트리 파일이 존재하는가',
    run: async () => probes.filesPresent(['src/main.tsx', 'src/App.tsx', 'index.html']),
    scorer: boolPass('entry files'),
  },
  {
    id: 'vitest-isolated-from-e2e',
    difficulty: 'normal',
    describe: 'vitest 설정이 Playwright e2e 스펙을 제외하는가 (회귀 가드)',
    run: async () => probes.viteExcludesE2e(),
    scorer: boolPass('vitest excludes e2e'),
  },
  {
    id: 'initial-bundle-budget',
    difficulty: 'normal',
    describe: '초기 진입 청크 gzip 크기가 예산(50KB) 이하인가 (dist 실측)',
    // 정적 metrics.json 이 아니라 실제 빌드 산출물을 측정한다. dist 부재 시 throw → 러너가 명시적 실패로 처리.
    run: async () => probes.measureInitialChunkGzipKb(),
    scorer: maxValue(50, 'initial chunk gzip KB'),
  },
]
