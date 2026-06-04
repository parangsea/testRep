// Eval 러너 — 골든 태스크를 실행·채점하고, baseline 대비 회귀를 게이트한다.
// 실행하면서 trace(P1)도 함께 남겨 P1+P3 을 통합한다.
//
// 사용:
//   node harness/eval/runner.mjs                  # 실행 + baseline 회귀 비교 (회귀 시 exit 1)
//   node harness/eval/runner.mjs --update-baseline  # 현재 결과를 baseline 으로 저장
//
// 결정성: 타임스탬프는 env HARNESS_TS 로 주입 (없으면 0). 코드 내부에서 Date.now() 미사용.

import { readFileSync, writeFileSync, existsSync, realpathSync } from 'node:fs'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { dirname, join } from 'node:path'
import { tasks as defaultTasks } from './tasks/app-health.task.mjs'
import { TraceCollector } from '../trace/collector.mjs'

const HERE = dirname(fileURLToPath(import.meta.url))

/** 태스크들을 실행·채점한다. collector 가 있으면 verify 이벤트를 trace 에 남긴다. */
export async function runEval({ tasks = defaultTasks, collector = null, now = 0 } = {}) {
  const results = []
  let turn = 0
  for (const t of tasks) {
    let scored
    try {
      const value = await t.run()
      scored = t.scorer(value)
    } catch (err) {
      scored = { pass: false, score: 0, detail: `error: ${err?.message ?? err}` }
    }
    if (collector) {
      collector.emit({
        runId: 'eval',
        turn: turn++,
        phase: 'verify',
        ts: now,
        decision: `task ${t.id}: ${t.describe}`,
        verify: {
          taskId: t.id,
          difficulty: t.difficulty,
          pass: scored.pass,
          score: scored.score,
          detail: scored.detail,
          ...(scored.metric != null && { metric: scored.metric }),
        },
      })
    }
    results.push({ id: t.id, difficulty: t.difficulty, ...scored })
  }
  return aggregate(results)
}

/** 결과 배열을 집계 통계로. */
export function aggregate(results) {
  const n = results.length
  const passed = results.filter((r) => r.pass).length
  const metrics = {}
  for (const r of results) if (r.metric != null) metrics[r.id] = r.metric
  return {
    n,
    passed,
    successRate: n ? +(passed / n).toFixed(4) : 0,
    avgScore: n
      ? +(results.reduce((a, r) => a + (Number.isFinite(r.score) ? r.score : 0), 0) / n).toFixed(4)
      : 0,
    metrics,
    results: results.map((r) => ({ id: r.id, pass: r.pass, ...(r.metric != null && { metric: r.metric }) })),
  }
}

/**
 * 예산(ceiling)형 메트릭 — scorer 의 maxValue(임계값)로 "한도 이하"만 보장하면 되는 값.
 * 이런 메트릭은 "직전 빌드보다 커지면 회귀"라는 래칫(아래 metricRegress)에서 제외한다.
 *  - 래칫은 예산(예: 50KB)의 의미와 모순된다: 한도 한참 아래여도 1바이트 증가가 회귀가 되어,
 *    기능 추가 때마다 baseline 을 올리는 의식이 강제된다.
 *  - 진짜 비대화(한도 초과)는 해당 태스크 scorer 의 pass=false → regressedTasks 로 이미 차단된다.
 */
const BUDGET_METRICS = new Set(['initial-bundle-budget'])

/** 현재 결과를 baseline 과 비교해 회귀 여부를 판정. */
export function compareBaseline(current, baseline) {
  const deltas = {
    successRate: +(current.successRate - baseline.successRate).toFixed(4),
    passed: current.passed - baseline.passed,
  }
  const baseIds = new Set((baseline.results || []).map((r) => r.id))
  const basePass = new Map((baseline.results || []).map((r) => [r.id, r.pass]))
  const regressedTasks = current.results
    .filter((r) => basePass.get(r.id) === true && r.pass === false)
    .map((r) => r.id)
  // baseline 에 없던 새 태스크가 실패하면 그것도 회귀로 취급한다 (지속적 검증: 새 실패는 게이트 차단).
  const newFailures = current.results
    .filter((r) => !baseIds.has(r.id) && r.pass === false)
    .map((r) => r.id)
  const metricRegress = []
  for (const [k, v] of Object.entries(current.metrics || {})) {
    if (BUDGET_METRICS.has(k)) continue // 예산형: ceiling(scorer)이 진짜 게이트 — 래칫에서 제외
    const bv = baseline.metrics?.[k]
    if (typeof bv === 'number' && v > bv) metricRegress.push({ id: k, from: bv, to: v })
  }
  return {
    deltas,
    regressedTasks,
    newFailures,
    metricRegress,
    regressed:
      regressedTasks.length > 0 ||
      newFailures.length > 0 ||
      metricRegress.length > 0 ||
      current.successRate < baseline.successRate,
  }
}

function isMain(metaUrl) {
  if (!process.argv[1]) return false
  try {
    return realpathSync(fileURLToPath(metaUrl)) === realpathSync(process.argv[1])
  } catch {
    // realpath 실패(심볼릭/권한/경로 차이) 시 file URL 비교로 폴백
    try {
      return metaUrl === pathToFileURL(process.argv[1]).href
    } catch {
      return false
    }
  }
}

if (isMain(import.meta.url)) {
  const update = process.argv.includes('--update-baseline')
  const now = Number(process.env.HARNESS_TS || 0)
  const tracePath = join(HERE, '..', '.traces', 'eval.jsonl')
  const collector = new TraceCollector(tracePath, { truncate: true })

  const current = await runEval({ collector, now })

  console.log('\n하네스 Eval — 현재 앱 건강/회귀 검증\n')
  for (const r of current.results) {
    const detail = current.metrics[r.id] != null ? `  (metric=${current.metrics[r.id]})` : ''
    console.log(`  ${r.pass ? '✅' : '❌'} ${r.id}${detail}`)
  }
  console.log(
    `\n  성공률 ${(current.successRate * 100).toFixed(1)}% (${current.passed}/${current.n}), 평균점수 ${current.avgScore}`
  )
  console.log(`  trace → ${tracePath}`)

  const baselinePath = join(HERE, 'baseline.json')

  if (update) {
    writeFileSync(baselinePath, JSON.stringify(current, null, 2) + '\n', 'utf8')
    console.log(`\n  baseline 갱신됨 → ${baselinePath}`)
    process.exit(0)
  }

  if (!existsSync(baselinePath)) {
    console.log('\n  baseline 없음 — `node harness/eval/runner.mjs --update-baseline` 로 생성하세요.')
    process.exit(0)
  }

  const baseline = JSON.parse(readFileSync(baselinePath, 'utf8'))
  const cmp = compareBaseline(current, baseline)
  const sign = cmp.deltas.successRate >= 0 ? '+' : ''
  console.log(`\n  회귀 비교: 성공률 Δ${sign}${cmp.deltas.successRate}`)
  if (cmp.regressed) {
    if (cmp.regressedTasks.length) console.log(`  ⚠️ 회귀 태스크: ${cmp.regressedTasks.join(', ')}`)
    if (cmp.newFailures && cmp.newFailures.length)
      console.log(`  ⚠️ 새 실패 태스크: ${cmp.newFailures.join(', ')}`)
    for (const m of cmp.metricRegress) console.log(`  ⚠️ 메트릭 악화: ${m.id} ${m.from} → ${m.to}`)
    console.log('\n  ❌ 게이트 실패 (회귀 감지)')
    process.exit(1)
  }
  console.log('\n  ✅ 게이트 통과 (회귀 없음)')
  process.exit(0)
}
