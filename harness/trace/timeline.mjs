// 타임라인 뷰어 — JSONL trace 를 사람이 읽을 수 있는 타임라인 + 요약으로 렌더한다.
// 사용: node harness/trace/timeline.mjs [trace.jsonl 경로]
//      기본 경로: harness/.traces/eval.jsonl

import { readFileSync, realpathSync } from 'node:fs'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { dirname, join } from 'node:path'

const HERE = dirname(fileURLToPath(import.meta.url))

/** JSONL 텍스트를 이벤트 배열로 파싱 (깨진 줄은 줄번호와 함께 에러). */
export function parseTrace(text) {
  return text
    .split('\n')
    .map((line, i) => ({ line: line.trim(), n: i + 1 }))
    .filter((x) => x.line.length > 0)
    .map((x) => {
      try {
        return JSON.parse(x.line)
      } catch {
        throw new Error(`malformed JSON at line ${x.n}`)
      }
    })
}

/** 이벤트 배열을 요약 통계로 집계. */
export function summarize(events) {
  const turns = new Set()
  let toolCalls = 0
  let toolFailures = 0
  let verifyPass = 0
  let verifyFail = 0
  let tokens = 0
  for (const e of events) {
    turns.add(e.turn)
    if (e.phase === 'tool_call') {
      toolCalls++
      if (e.tool && e.tool.ok === false) toolFailures++
    }
    if (e.phase === 'verify' && e.verify) {
      if (e.verify.pass) verifyPass++
      else verifyFail++
    }
    if (e.input && Number.isFinite(e.input.tokens)) tokens += e.input.tokens
  }
  return {
    events: events.length,
    turns: turns.size,
    toolCalls,
    toolFailures,
    verifyPass,
    verifyFail,
    tokens,
  }
}

/** 이벤트 배열을 타임라인 문자열로 렌더. */
export function renderTimeline(events) {
  const lines = []
  for (const e of events) {
    const head = `  [t${e.turn}] ${e.phase}`
    let detail = ''
    if (e.phase === 'tool_call' && e.tool) {
      detail = `${e.tool.name}${e.tool.ok === false ? ' ✗' : ''}${e.tool.latencyMs != null ? ` (${e.tool.latencyMs}ms)` : ''}`
    } else if (e.phase === 'verify' && e.verify) {
      detail = `${e.verify.pass ? '✅' : '❌'} ${e.verify.taskId ?? ''} — ${e.verify.detail ?? ''}`
    } else if (e.input && e.input.tokens != null) {
      detail = `${e.input.tokens} tok${e.input.cacheHit != null ? `, cache ${Math.round(e.input.cacheHit * 100)}%` : ''}`
    }
    if (e.decision) detail = detail ? `${detail}  ·  ${e.decision}` : e.decision
    lines.push(detail ? `${head}  ${detail}` : head)
  }
  return lines.join('\n')
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
  const path = process.argv[2] || join(HERE, '..', '.traces', 'eval.jsonl')
  let text
  try {
    text = readFileSync(path, 'utf8')
  } catch {
    console.error(`trace 파일을 읽을 수 없음: ${path}`)
    console.error('먼저 `node harness/eval/runner.mjs` 로 trace 를 생성하세요.')
    process.exit(1)
  }
  const events = parseTrace(text)
  const s = summarize(events)
  console.log(`\nTrace 타임라인 — ${path}\n`)
  console.log(renderTimeline(events))
  console.log(
    `\n요약: 이벤트 ${s.events}, 턴 ${s.turns}, 도구호출 ${s.toolCalls}(실패 ${s.toolFailures}), ` +
      `검증 통과 ${s.verifyPass}/${s.verifyPass + s.verifyFail}, 토큰 ${s.tokens}`
  )
}
