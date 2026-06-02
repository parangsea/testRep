// 프로브 — 현재 앱(저장소)의 건강 상태를 측정하는 순수 함수들.
// 빠르고 결정적(빌드/네트워크 불필요)이어서 이너 루프에서 반복 실행하기 좋다.

import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join, resolve, relative, isAbsolute } from 'node:path'

const HERE = dirname(fileURLToPath(import.meta.url)) // harness/eval
export const REPO_ROOT = resolve(HERE, '..', '..') // 저장소 루트

const SKIP_DIRS = new Set([
  'node_modules',
  'dist',
  '.git',
  '.omc',
  'coverage',
  'playwright-report',
  'test-results',
  '.traces', // 하네스 trace 산출물 (gitignore)
  '.reviews', // 하네스 교차리뷰 출력 — 예시 링크 텍스트 포함 (gitignore)
])

/** 저장소 내 .md 파일 목록 (빌드/의존성 디렉토리 제외). */
export function listMarkdownFiles(root = REPO_ROOT) {
  const out = []
  function walk(dir) {
    // 정렬: readdirSync 순서는 플랫폼/파일시스템마다 다르므로 결정성을 위해 정렬한다.
    for (const name of readdirSync(dir).sort()) {
      if (SKIP_DIRS.has(name)) continue
      const full = join(dir, name)
      if (statSync(full).isDirectory()) walk(full)
      else if (name.endsWith('.md')) out.push(full)
    }
  }
  walk(root)
  return out
}

/** 모든 마크다운 문서의 상대경로 링크 무결성 검사 → 깨진 링크 목록. */
export function findBrokenLinks(root = REPO_ROOT) {
  const broken = []
  const linkRe = /\]\(([^)]+)\)/g
  for (const file of listMarkdownFiles(root)) {
    const text = readFileSync(file, 'utf8')
    let m
    while ((m = linkRe.exec(text))) {
      let link = m[1].trim()
      // CommonMark 대상 추출: <url> 형태이거나, url 뒤에 "title"/'title' 이 붙은 경우 URL 부분만 취한다.
      if (link.startsWith('<')) {
        const gt = link.indexOf('>')
        link = gt === -1 ? link.slice(1) : link.slice(1, gt)
      } else {
        link = link.split(/\s+/)[0]
      }
      if (/^(https?:|mailto:)/i.test(link) || link.startsWith('#')) continue
      // fragment(#...) 와 query(?...) 를 제거한다.
      link = link.split('#')[0].split('?')[0]
      if (!link) continue
      // URL 인코딩된 경로(예: My%20File.md)를 실제 파일명으로 디코딩한다.
      try {
        link = decodeURIComponent(link)
      } catch {
        // 잘못된 % 시퀀스는 원문 그대로 검사
      }
      const target = resolve(dirname(file), link)
      // 대상이 저장소 root 밖이면(상대경로 `../../` 또는 절대경로) 무결성 검사 위반으로 본다.
      // root 밖 파일의 존재 여부에 의존하면 결과가 환경 의존적이 되기 때문이다.
      const rel = relative(root, target)
      const outsideRoot = rel === '' ? false : rel.startsWith('..') || isAbsolute(rel)
      if (outsideRoot || !existsSync(target)) {
        broken.push({ file: relative(root, file), link })
      }
    }
  }
  return broken
}

/** 주어진 (저장소 기준 상대) 경로들이 모두 존재하는가. */
export function filesPresent(paths, root = REPO_ROOT) {
  return paths.every((p) => existsSync(join(root, p)))
}

/** vitest 설정이 e2e 스펙을 제외하는가 (세션에서 고친 버그의 회귀 가드). */
export function viteExcludesE2e(root = REPO_ROOT) {
  const raw = readFileSync(join(root, 'vite.config.ts'), 'utf8')
  // 주석을 제거해 주석 속 'e2e' 로 인한 오탐을 막는다. (URL 의 '//' 는 보존)
  const cfg = raw
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1')
  // test.exclude 배열 안에 e2e 를 가리키는 "문자열 리터럴" 이 있어야 통과시킨다.
  return /exclude\s*:\s*\[[^\]]*['"`][^'"`]*e2e[^'"`]*['"`]/.test(cfg)
}

/** 메트릭 스냅샷(metrics.json)에서 값 조회. (예: 초기 청크 gzip 크기) */
export function readMetric(name) {
  const metrics = JSON.parse(readFileSync(join(HERE, 'metrics.json'), 'utf8'))
  if (!(name in metrics)) throw new Error(`metric not found: ${name}`)
  return metrics[name]
}
