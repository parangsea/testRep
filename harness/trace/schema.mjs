// Trace 이벤트 스키마 + 팩토리.
// 순수 데이터, 의존성 없음. 결정성을 위해 타임스탬프(ts)는 호출자가 명시적으로 주입한다
// (모듈 내부에서 Date.now() 를 호출하지 않는다 — 그래야 리플레이가 결정적이다).

/** @typedef {'context_build'|'model_out'|'tool_call'|'verify'|'end'} Phase */

export const PHASES = ['context_build', 'model_out', 'tool_call', 'verify', 'end']

/**
 * 하나의 trace 이벤트를 만든다 (검증 포함).
 * @param {object} e
 * @param {string} e.runId            실행 묶음 식별자
 * @param {number} e.turn             턴 번호 (0부터)
 * @param {Phase}  e.phase            이벤트 단계
 * @param {number} e.ts               타임스탬프 (명시적으로 주입 — 결정성)
 * @param {string} [e.model]          모델 ID
 * @param {{tokens?:number,cacheHit?:number}} [e.input]   컨텍스트 예산/캐시 — 디버깅 핵심
 * @param {{name:string,args?:object,latencyMs?:number,ok?:boolean}} [e.tool]
 * @param {string} [e.decision]       모델이 *왜* 그 행동을 했는가
 * @param {object} [e.verify]         검증 결과(태스크 채점 등)
 * @param {object} [e.end]            종료 사유/요약
 * @param {{seed?:number,harnessVersion?:string,promptHash?:string}} [e.repro]  재현 키
 */
export function makeEvent(e) {
  if (!e || typeof e !== 'object') throw new Error('event object required')
  if (!e.runId) throw new Error('runId required')
  if (!Number.isInteger(e.turn) || e.turn < 0) throw new Error('turn must be a non-negative integer')
  if (!PHASES.includes(e.phase)) throw new Error(`invalid phase: ${e.phase} (expected one of ${PHASES.join(', ')})`)
  if (!Number.isFinite(e.ts)) throw new Error('ts must be a finite number — pass it explicitly for deterministic replay')

  const out = { runId: e.runId, turn: e.turn, phase: e.phase, ts: e.ts }
  if (e.model != null) out.model = e.model
  if (e.input != null) out.input = e.input
  if (e.tool != null) out.tool = e.tool
  if (e.decision != null) out.decision = e.decision
  if (e.verify != null) out.verify = e.verify
  if (e.end != null) out.end = e.end
  if (e.repro != null) out.repro = e.repro
  return out
}
