// Trace 수집기 — append-only JSONL 저장소.
// 한 줄 = 한 이벤트. 어떤 하네스 코드든 emit() 으로 인과 사슬을 기록한다.

import { appendFileSync, mkdirSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'
import { makeEvent } from './schema.mjs'

export class TraceCollector {
  /**
   * @param {string} filePath 출력 JSONL 경로
   * @param {{truncate?: boolean}} [opts] truncate=true 면 이번 실행분만 남기도록 파일을 비운다
   */
  constructor(filePath, { truncate = false } = {}) {
    this.filePath = filePath
    mkdirSync(dirname(filePath), { recursive: true })
    if (truncate) writeFileSync(filePath, '', 'utf8')
  }

  /**
   * 이벤트를 검증·기록하고, 기록된 이벤트를 반환한다.
   * @param {Parameters<typeof makeEvent>[0]} event
   */
  emit(event) {
    const e = makeEvent(event)
    appendFileSync(this.filePath, JSON.stringify(e) + '\n', 'utf8')
    return e
  }
}
