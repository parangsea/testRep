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

> 실제 백엔드로 전환하는 방법은 [api-and-mock.md](./api-and-mock.md) 를 참고하세요.
