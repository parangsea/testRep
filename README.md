# testRep

React + TypeScript + Vite 기반 게시판/로그인 데모. 실제 백엔드(Spring Boot `testBoot`)와 연동되며,
모든 `/api` 요청은 Vite 개발 프록시를 통해 백엔드로 전달됩니다.

## 빠른 시작

```bash
npm install
npm run dev           # http://localhost:5173
```

`.env` 에서 백엔드 프록시 대상(`VITE_PROXY_TARGET`)을 설정합니다. (자세한 내용은 [API 연동](./docs/api.md) 참고)

> 테스트 계정 — 아이디 `admin` / 비밀번호 `admin1234`

## 문서

자세한 내용은 [`docs/`](./docs) 디렉토리를 참고하세요.

- [시작하기](./docs/getting-started.md) — 설치, 실행, 스크립트 목록
- [아키텍처](./docs/architecture.md) — 기술 스택, 기능, 프로젝트 구조, 번들 최적화
- [API 연동](./docs/api.md) — 프록시 구성, API 엔드포인트 계약, 권한 모델
- [배포](./docs/deployment.md) — nginx 배포 가이드

### 레퍼런스

- [하네스 엔지니어링](./docs/harness-engineering/README.md) — LLM 에이전트 하네스 설계 레퍼런스 (컨텍스트·도구·오케스트레이션·메모리·안전)
