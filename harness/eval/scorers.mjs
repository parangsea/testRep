// 채점기 — 프로브 결과를 { pass, score, detail, metric? } 로 채점한다.
// 결정적 채점 우선 (자동·재현 가능). LLM-judge 같은 주관 채점은 보조.

/** 불리언 true 면 통과. */
export function boolPass(label) {
  return (value) => ({
    pass: value === true,
    score: value === true ? 1 : 0,
    detail: `${label}: ${value === true ? 'OK' : 'FAIL'}`,
  })
}

/** 배열 길이(또는 수)가 0이면 통과. (예: 깨진 링크 0건) */
export function countZero(label) {
  return (value) => {
    let n
    if (Array.isArray(value)) n = value.length
    else if (typeof value === 'number' && Number.isFinite(value)) n = value
    else {
      // null/undefined/'' 같은 비정상 값을 0으로 오인하면 프로브 실패가 "0건"으로 은폐된다 → 명시적 실패.
      return {
        pass: false,
        score: 0,
        detail: `${label}: 유효하지 않은 결과(${value === null ? 'null' : typeof value})`,
      }
    }
    return { pass: n === 0, score: n === 0 ? 1 : 0, detail: `${label}: ${n}건` }
  }
}

/** 숫자 메트릭이 임계값 이하면 통과. (예: 번들 gzip 예산) metric 필드로 값 노출 → 회귀 비교에 사용. */
export function maxValue(threshold, label) {
  return (value) => {
    const v = Number(value)
    if (!Number.isFinite(v)) {
      // NaN/Infinity 를 metric 으로 저장하면 JSON 에서 null 이 되어 회귀 비교가 무력화된다.
      // 따라서 metric 을 달지 않고 명시적으로 실패 처리한다.
      return { pass: false, score: 0, detail: `${label}: 유효하지 않은 값(${value})` }
    }
    return {
      pass: v <= threshold,
      score: v <= threshold ? 1 : 0,
      detail: `${label}: ${v} (예산 ${threshold})`,
      metric: v,
    }
  }
}
