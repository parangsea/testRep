# testRep

React + TypeScript + Vite 기반 게시판/로그인 데모. 백엔드 API 가 아직 없으므로 **MSW(Mock Service Worker)** 로
더미 데이터를 제공하며, 환경변수 한 줄로 실제 백엔드로 전환할 수 있도록 설계되어 있습니다.

## 빠른 시작

```bash
npm install
npm run msw:init      # public/mockServiceWorker.js 생성 (최초 1회)
npm run dev           # http://localhost:5173
```

> 더미 로그인 계정 — 아이디 `admin` / 비밀번호 `admin1234`

## 문서

자세한 내용은 [`docs/`](./docs) 디렉토리를 참고하세요.

- [시작하기](./docs/getting-started.md) — 설치, 실행, 스크립트 목록
- [아키텍처](./docs/architecture.md) — 기술 스택, 기능, 프로젝트 구조, 번들 최적화
- [API & 목 전환](./docs/api-and-mock.md) — 더미 → 실제 백엔드 전환, API 엔드포인트 계약
- [배포](./docs/deployment.md) — nginx 배포 가이드

### 레퍼런스

- [하네스 엔지니어링](./docs/harness-engineering/README.md) — LLM 에이전트 하네스 설계 레퍼런스 (컨텍스트·도구·오케스트레이션·메모리·안전)
