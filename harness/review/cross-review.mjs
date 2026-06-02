// 교차 모델 리뷰 (cross-model review) — 2중 검증의 ② 단계.
// 커밋 안 된 코드 변경의 diff 를 수집해 GPT-5.5(Codex)에게 stdin 으로 먹여
// 적대적 리뷰를 받고, 지적사항을 심각도별로 정리해 저장한다.
//
// 왜 stdin 인가: codex 가 스스로 파일을 읽으려 하면 읽기전용 샌드박스 정책에
// 막힌다(셸 실행 차단). diff 를 직접 주면 셸 없이 온전히 리뷰한다.
//
// 사용:
//   node harness/review/cross-review.mjs              # 변경 수집 → GPT-5.5 리뷰 → 정리 저장
//   node harness/review/cross-review.mjs --dry-run    # diff 만 수집/미리보기 (codex 호출 안 함)
//   node harness/review/cross-review.mjs --gate       # high/critical 발견 시 exit 1 (CI 게이트)
//   node harness/review/cross-review.mjs src vite.config.ts   # 대상 경로 직접 지정

import { execSync, spawnSync } from 'node:child_process'
import { writeFileSync, mkdirSync, realpathSync } from 'node:fs'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { dirname, join } from 'node:path'

const HERE = dirname(fileURLToPath(import.meta.url))
const REVIEWS_DIR = join(HERE, '..', '.reviews')

const CODE_RE = /\.(mjs|cjs|js|jsx|ts|tsx|css|json)$/
const EXCLUDE_RE = /(^|\/)(node_modules|dist|\.git|\.omc)\//

function isReviewable(p) {
  return (
    CODE_RE.test(p) &&
    !EXCLUDE_RE.test(p) &&
    !p.includes('harness/.traces') &&
    !p.includes('harness/.reviews') &&
    !p.endsWith('package-lock.json') &&
    !p.endsWith('baseline.json')
  )
}

/**
 * git 을 인자 "배열" 로 실행한다 (shell 미사용).
 * → 경로에 따옴표·공백·쉘 메타문자가 있어도 명령 주입/오동작이 불가능하다.
 * diff --no-index 등은 차이가 있으면 exit 1 이지만 정상이므로 stdout 을 그대로 쓴다.
 */
function git(args) {
  const r = spawnSync('git', args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
  if (r.error) throw new Error(`git 실행 실패 (미설치 등): ${r.error.message}`)
  // diff --no-index 는 차이가 있으면 status 1 (정상). status>1(예: 128=bad pathspec/HEAD없음)은 실패로 본다.
  // 실패를 조용히 "변경 없음" 으로 오판하면 리뷰 게이트가 무력화되므로 명시적으로 던진다.
  if (r.status != null && r.status > 1) {
    throw new Error(`git ${args.join(' ')} 실패 (status ${r.status}): ${(r.stderr || '').trim()}`)
  }
  return r.stdout || ''
}

/** 커밋 안 된 코드 변경(추적 수정 + 신규 파일)을 하나의 diff 문자열로 모은다. git 상태는 건드리지 않는다. */
function collectDiff(paths) {
  const pathArgs = paths.length ? ['--', ...paths] : []
  const trackedChanged = git(['diff', 'HEAD', '--name-only', ...pathArgs])
    .split('\n')
    .filter(Boolean)
    .filter(isReviewable)
  const untracked = git(['ls-files', '--others', '--exclude-standard', ...pathArgs])
    .split('\n')
    .filter(Boolean)
    .filter(isReviewable)

  let diff = ''
  if (trackedChanged.length) {
    diff += git(['diff', 'HEAD', '--', ...trackedChanged])
  }
  if (untracked.length) {
    // 신규 파일을 "추가" diff 로 만든다. /dev/null 은 Windows 네이티브에서 불안정하므로
    // 빈 임시파일(gitignore된 .reviews 안)과 비교한다. git 인덱스는 건드리지 않는다.
    const empty = join(REVIEWS_DIR, '.empty')
    writeFileSync(empty, '', 'utf8')
    for (const f of untracked) {
      diff += git(['diff', '--no-index', '--', empty, f])
    }
  }
  return { diff, files: [...trackedChanged, ...untracked] }
}

const INSTRUCTION = [
  '다음 git diff 를 적대적 관점에서 코드 리뷰하라.',
  '작성자는 정상 동작한다고 주장하지만, 다른 관점에서 결함이 있을 수 있다.',
  '셸 명령을 실행하지 말고 제공된 diff 만 근거로 분석하라.',
  '찾을 것: 숨은 버그, 엣지케이스(빈 배열·누락 필드·0건·NaN), 잘못된 가정,',
  '크로스플랫폼(Windows 경로/줄바꿈/realpath) 문제, 결정성 위반, 경쟁조건, 회귀 위험.',
  '각 지적은 다음 형식으로: [심각도 critical/high/medium/low] 파일:라인 — 근거.',
  '실질적 결함이 없으면 정확히 "문제 없음" 이라고 답하라.',
].join('\n')

function extractFindings(out) {
  const findings = []
  const seen = new Set()
  for (const line of out.split('\n')) {
    const m = line.match(/^\s*\[(critical|high|medium|low)\]/i)
    if (m && !seen.has(line.trim())) {
      seen.add(line.trim())
      findings.push({ severity: m[1].toLowerCase(), text: line.trim() })
    }
  }
  return findings
}

/**
 * 게이트 판정(순수 함수 — 단위 테스트 가능).
 * 리뷰 도구 자체 실패 / 결과 불명확 / high·critical 존재 중 하나라도 있으면 차단한다.
 * 특히 codex 가 실패했는데도 "지적 없음"으로 exit 0 되던 문제를 막는다.
 */
export function decideGate({ reviewFailed, ambiguous, counts }) {
  if (reviewFailed) return { fail: true, reason: '리뷰 도구 자체 실패' }
  if (ambiguous) return { fail: true, reason: '리뷰 결과 불명확(파싱 실패)' }
  if ((counts.critical || 0) + (counts.high || 0) > 0) {
    return { fail: true, reason: 'high/critical 지적 존재' }
  }
  return { fail: false, reason: '' }
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

// ── 실행 (직접 실행 시에만; import 시 부수효과 없음) ──────────────────────────
if (isMain(import.meta.url)) {
  const argv = process.argv.slice(2)
  const dryRun = argv.includes('--dry-run')
  const gate = argv.includes('--gate')
  const paths = argv.filter((a) => !a.startsWith('--'))

  mkdirSync(REVIEWS_DIR, { recursive: true })

  const { diff, files } = collectDiff(paths)
  if (!diff.trim()) {
    console.log('리뷰할 코드 변경이 없습니다 (커밋 안 된 코드 파일 없음).')
    process.exit(0)
  }

  console.log(`리뷰 대상 파일 ${files.length}개, diff ${diff.split('\n').length}줄`)
  for (const f of files) console.log(`  · ${f}`)

  writeFileSync(join(REVIEWS_DIR, 'last-input.diff'), diff, 'utf8')

  if (dryRun) {
    console.log('\n--dry-run: diff 만 수집했습니다 (codex 호출 안 함).')
    console.log(`입력 저장 → ${join(REVIEWS_DIR, 'last-input.diff')}`)
    process.exit(0)
  }

  console.log('\nGPT-5.5(Codex)에 리뷰 요청 중... (무료 플랜은 수 분 소요될 수 있음)')

  const input = `${INSTRUCTION}\n\n=== 리뷰 대상 git diff ===\n\n${diff}`
  let out
  let reviewFailed = false
  try {
    // `codex exec -` : 지시문을 stdin 에서 읽는다 → 명령행 인용/인코딩 문제 회피.
    out = execSync('codex exec -', {
      input,
      encoding: 'utf8',
      timeout: 600000,
      maxBuffer: 64 * 1024 * 1024,
    })
  } catch (e) {
    // 리뷰 도구(codex) 자체 실패 → "지적 없음"을 신뢰할 수 없으므로 게이트에서 실패 처리한다.
    reviewFailed = true
    out = (e.stdout ? e.stdout.toString() : '') + `\n[cross-review 경고] codex 비정상 종료: ${e.message || e}`
  }

  const reviewPath = join(REVIEWS_DIR, 'last-review.md')
  writeFileSync(reviewPath, out, 'utf8')

  const findings = extractFindings(out)
  const counts = { critical: 0, high: 0, medium: 0, low: 0 }
  for (const f of findings) counts[f.severity]++
  const clean = /문제\s*없음|no\s+(discrete|actionable)?\s*issues/i.test(out)
  const ambiguous = !reviewFailed && findings.length === 0 && !clean

  console.log('\n=== GPT-5.5 교차 리뷰 결과 ===')
  if (!findings.length) {
    console.log(clean ? '  ✅ 문제 없음 (GPT-5.5 판정)' : '  (심각도 태그가 달린 지적을 찾지 못함 — 원문 확인 필요)')
  } else {
    for (const sev of ['critical', 'high', 'medium', 'low']) {
      for (const f of findings.filter((x) => x.severity === sev)) console.log(`  ${f.text}`)
    }
    console.log(
      `\n  요약: critical ${counts.critical}, high ${counts.high}, medium ${counts.medium}, low ${counts.low}`
    )
  }
  if (reviewFailed) {
    console.log('\n  ⚠️ 리뷰 도구(codex)가 비정상 종료 — 결과를 신뢰할 수 없습니다 (원문 확인 필요).')
  }
  console.log(`  전체 원문 → ${reviewPath}`)

  if (gate) {
    const decision = decideGate({ reviewFailed, ambiguous, counts })
    if (decision.fail) {
      console.log(`\n  ❌ 게이트 실패 (${decision.reason})`)
      process.exit(1)
    }
    console.log('\n  ✅ 게이트 통과 (high/critical 없음)')
  }
  process.exit(0)
}
