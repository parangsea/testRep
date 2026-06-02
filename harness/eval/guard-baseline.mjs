// baseline 오염 가드 — 회귀 "세탁"을 막는다.
//
// 위협 모델: 회귀 게이트(runner.mjs)는 baseline.json 대비 비교한다. 그런데 baseline 은
// git 추적 파일이고 `--update-baseline` 로 자유롭게 덮어쓸 수 있다. 따라서 실패하는 게이트를
// "고치는" 가장 쉬운 길이 재베이스라인이며, 이때 src/채점로직 변경과 baseline 변경이 같은
// 변경 묶음에 섞이면 회귀가 새 정상값으로 세탁된다.
//
// 이 가드는 base ref 대비 변경 파일을 보고, baseline.json 이 (a) 앱 소스(src/),
// (b) 채점/측정 로직(probes·scorers·tasks), 또는 (c) 게이트 실행 경로
// (package.json·CI workflow·.githooks·runner·guard 자체)와 "함께" 수정되면 실패시킨다.
// → baseline 갱신은 별도 커밋 + 사람 검토를 강제한다.
//
// 사용:
//   node harness/eval/guard-baseline.mjs            # HEAD~1 대비
//   node harness/eval/guard-baseline.mjs origin/master
//
// 셸 미사용(execFileSync 인자배열)이라 ref 에 메타문자가 있어도 주입 불가.

import { execFileSync, spawnSync } from 'node:child_process'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { realpathSync } from 'node:fs'

function changedFiles(ref) {
  // ref..HEAD 의 "커밋된" 변경만 본다. ref 와 워킹트리를 비교하면 미커밋 변경이 섞여
  // 결과가 워킹트리 상태에 의존(비결정)하고 오탐이 난다 — 세탁 가드는 커밋/푸시되는 내용 기준이어야 한다.
  // --name-only: 변경된 경로만. 실패 시 던진다(호출 측에서 fail-closed 처리).
  try {
    const out = execFileSync('git', ['diff', '--name-only', ref, 'HEAD', '--'], { encoding: 'utf8' })
    return out.split('\n').map((s) => s.trim()).filter(Boolean)
  } catch (e) {
    throw new Error(`git diff ${ref} HEAD 실패: ${(e.stderr || e.message || '').toString().trim()}`)
  }
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

  let files
  try {
    files = changedFiles(baseRef)
  } catch (e) {
    // ref 는 있는데 diff 가 실패 → 비정상. fail-closed.
    console.error(`❌ git diff ${baseRef} 실패 — 비교 불능을 통과로 처리하지 않음(fail-closed): ${e.message}`)
    process.exit(1)
  }
  const { baselineTouched, risky, laundering } = detectLaundering(files)

  const baseLabel = `${mode} ${baseRef.slice(0, 12)}`
  if (laundering) {
    console.error(`❌ baseline 오염 위험: ${BASELINE} 이(가) 아래 변경과 같은 묶음에서 수정됨 (기준 ${baseLabel})`)
    for (const f of risky) console.error(`     · ${f}`)
    console.error('   → 회귀 세탁 가능. baseline 갱신은 별도 커밋으로 분리하고 사람 검토를 받으세요.')
    process.exit(1)
  }

  console.log(
    baselineTouched
      ? `✅ baseline 무결성 가드 통과 (baseline 단독 변경, 기준 ${baseLabel})`
      : `✅ baseline 무결성 가드 통과 (baseline 변경 없음, 기준 ${baseLabel})`
  )
  process.exit(0)
}
