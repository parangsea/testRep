// baseline 오염 가드 — 회귀 "세탁"을 막는다.
//
// 위협 모델: 회귀 게이트(runner.mjs)는 baseline.json 대비 비교한다. 그런데 baseline 은
// git 추적 파일이고 `--update-baseline` 로 자유롭게 덮어쓸 수 있다. 따라서 실패하는 게이트를
// "고치는" 가장 쉬운 길이 재베이스라인이며, 이때 src/채점로직 변경과 baseline 변경이 같은
// 변경 묶음에 섞이면 회귀가 새 정상값으로 세탁된다.
//
// 이 가드는 base ref..HEAD 의 "각 커밋"을 검사해, 단일 커밋이 baseline.json 과 (a) 앱 소스(src/),
// (b) 채점/측정 로직(probes·scorers·tasks), 또는 (c) 게이트 실행 경로
// (package.json·CI workflow·.githooks·runner·guard 자체)를 "한 커밋에 함께" 수정하면 실패시킨다.
// → baseline 갱신을 별도 커밋으로 분리하면 통과한다(누적 범위가 아닌 커밋 단위라 분리가 실제로 통함).
//   같은 커밋에 섞으면 회귀를 새 정상값으로 세탁하면서 사람 검토를 피할 수 있기 때문이다.
//
// 사용:
//   node harness/eval/guard-baseline.mjs            # HEAD~1 대비
//   node harness/eval/guard-baseline.mjs origin/master
//
// 셸 미사용(execFileSync 인자배열)이라 ref 에 메타문자가 있어도 주입 불가.

import { execFileSync, spawnSync } from 'node:child_process'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { realpathSync } from 'node:fs'

/** baseRef..HEAD 에 새로 추가된 커밋 SHA 목록. 실패 시 던진다(호출 측 fail-closed). */
function commitsInRange(baseRef) {
  try {
    const out = execFileSync('git', ['rev-list', `${baseRef}..HEAD`], { encoding: 'utf8' })
    return out.split('\n').map((s) => s.trim()).filter(Boolean)
  } catch (e) {
    throw new Error(`git rev-list ${baseRef}..HEAD 실패: ${(e.stderr || e.message || '').toString().trim()}`)
  }
}

/** 한 커밋이 변경한 파일 목록(머지 커밋 포함, 셸 미사용). */
function filesInCommit(sha) {
  const out = execFileSync('git', ['diff-tree', '--no-commit-id', '--name-only', '-r', '-m', sha], {
    encoding: 'utf8',
  })
  return out.split('\n').map((s) => s.trim()).filter(Boolean)
}

/** 주어진 ref 가 커밋으로 해석되는가 (없는 ref/얕은 클론 판별). */
function refExists(ref) {
  const r = spawnSync('git', ['rev-parse', '--verify', '--quiet', `${ref}^{commit}`], { encoding: 'utf8' })
  return r.status === 0
}

/** HEAD 에 부모가 있는가 = "초기 커밋이 아닌가". (진짜 초기 커밋만 비교 생략 허용) */
function headHasParent() {
  return refExists('HEAD~1')
}

// 통합(기준) 브랜치 후보 — 새 브랜치/여러 커밋 push 시 "이 브랜치가 도입한 변경 전체"의 기준.
const INTEGRATION_CANDIDATES = ['origin/HEAD', 'origin/master', 'origin/main', 'master', 'main']

/**
 * 비교 기준 ref 를 결정한다. 단일 커밋(HEAD~1)으로 좁히지 않는다 — 그러면 여러 커밋 push 의
 * 앞 커밋에서 일어난 세탁을 놓친다.
 *  1) 명시적 ref(CI: PR base.sha / push before) — all-zero·빈 값 아니고 해석 가능하면 그대로 사용.
 *  2) 아니면 통합 브랜치와의 merge-base — 새 브랜치/다중 커밋/로컬 모두에서 도입된 변경 전체를 포괄.
 *  3) 결정 불가 → null (호출 측 fail-closed, 단 초기 커밋은 예외).
 * @returns {{ref: string|null, mode: string}}
 */
function resolveBaseRef(arg) {
  if (arg && !/^0+$/.test(arg) && refExists(arg)) return { ref: arg, mode: 'explicit' }
  for (const cand of INTEGRATION_CANDIDATES) {
    if (!refExists(cand)) continue
    const r = spawnSync('git', ['merge-base', cand, 'HEAD'], { encoding: 'utf8' })
    if (r.status === 0) {
      const base = r.stdout.trim()
      if (base && refExists(base)) return { ref: base, mode: `merge-base(${cand})` }
    }
  }
  return { ref: null, mode: 'none' }
}

const BASELINE = 'harness/eval/baseline.json'
// "위험" = baseline 과 함께 바뀌면 회귀 세탁이 되는 경로. 측정/채점 로직뿐 아니라
// 게이트 "실행 경로"(스크립트·CI·훅·러너/가드 자체)도 포함한다 — 그것들을 약화시키면서
// 동시에 재베이스라인하면 게이트를 우회할 수 있기 때문이다.
const RISKY_RE =
  /^(src\/|package\.json$|\.github\/workflows\/|\.githooks\/|harness\/eval\/(probes|scorers|runner|guard-baseline)\.mjs$|harness\/eval\/tasks\/|harness\/review\/)/

export function detectLaundering(files) {
  const baselineTouched = files.includes(BASELINE)
  const risky = files.filter((f) => RISKY_RE.test(f))
  return { baselineTouched, risky, laundering: baselineTouched && risky.length > 0 }
}

function isMain(metaUrl) {
  if (!process.argv[1]) return false
  try {
    return realpathSync(fileURLToPath(metaUrl)) === realpathSync(process.argv[1])
  } catch {
    try {
      return metaUrl === pathToFileURL(process.argv[1]).href
    } catch {
      return false
    }
  }
}

// ── CLI (직접 실행 시에만; import 시 부수효과·exit 없음 → detectLaundering 단위 테스트 가능) ──
if (isMain(import.meta.url)) {
  const { ref: baseRef, mode } = resolveBaseRef(process.argv[2])

  // 비교 기준을 결정할 수 없으면: 진짜 초기 커밋(부모 없음)만 통과, 그 외(원격/통합 브랜치 부재,
  // 얕은 클론 등)는 fail-closed — 비교 불능을 통과로 처리하면 가드가 우회된다.
  if (!baseRef) {
    if (!headHasParent()) {
      console.log('⚠️ 초기 커밋 — 세탁할 baseline 이력이 없어 비교 생략(통과)')
      process.exit(0)
    }
    console.error('❌ 비교 기준을 결정할 수 없음 — 통합 브랜치(origin/master 등)를 찾지 못함.')
    console.error('   base ref 를 인자로 명시하세요. 비교 불능을 통과로 처리하지 않는다(fail-closed).')
    process.exit(1)
  }

  let commits
  try {
    commits = commitsInRange(baseRef)
  } catch (e) {
    // ref 는 있는데 rev-list 가 실패 → 비정상. fail-closed.
    console.error(`❌ 커밋 목록 조회 실패 — 비교 불능을 통과로 처리하지 않음(fail-closed): ${e.message}`)
    process.exit(1)
  }

  const baseLabel = `${mode} ${baseRef.slice(0, 12)}`
  if (commits.length === 0) {
    console.log(`✅ baseline 무결성 가드 통과 (새 커밋 없음, 기준 ${baseLabel})`)
    process.exit(0)
  }

  // 각 커밋을 독립적으로 검사 — 한 커밋이 baseline 과 위험 파일을 함께 담았는지.
  const offenders = []
  let anyBaselineTouched = false
  for (const sha of commits) {
    const { baselineTouched, risky, laundering } = detectLaundering(filesInCommit(sha))
    if (baselineTouched) anyBaselineTouched = true
    if (laundering) offenders.push({ sha, risky })
  }

  if (offenders.length) {
    console.error(`❌ baseline 오염 위험: 아래 커밋이 ${BASELINE} 과 위험 변경을 "한 커밋"에 함께 담음 (기준 ${baseLabel})`)
    for (const o of offenders) {
      console.error(`   · 커밋 ${o.sha.slice(0, 12)} — 함께 변경된 위험 파일:`)
      for (const f of o.risky) console.error(`       - ${f}`)
    }
    console.error('   → baseline.json 갱신을 별도 커밋으로 분리하세요(같은 커밋에 src/게이트 변경과 섞지 말 것).')
    process.exit(1)
  }

  console.log(
    anyBaselineTouched
      ? `✅ baseline 무결성 가드 통과 (baseline 이 별도 커밋으로 분리됨, 기준 ${baseLabel})`
      : `✅ baseline 무결성 가드 통과 (baseline 변경 없음, 기준 ${baseLabel})`
  )
  process.exit(0)
}
