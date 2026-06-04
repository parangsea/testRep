# 배포 (nginx)

```bash
npm run build         # dist/ 생성
# dist/ 내용을 nginx root(예: /usr/share/nginx/html)로 복사
# nginx.conf 를 /etc/nginx/conf.d/default.conf 로 배치 후 reload
```

`nginx.conf` 는 다음을 포함합니다.

- SPA 라우팅 폴백 (`try_files ... /index.html`)
- 정적 자산 캐싱
- gzip 압축
- `/api` 백엔드 프록시 예시 (주석)

> API 연동(프록시) 구성은 [api.md](./api.md) 를 참고하세요.
