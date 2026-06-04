/// <reference types="vitest/config" />
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // .env 의 VITE_PROXY_TARGET 을 읽어 실제 백엔드로 프록시한다.
  // (vite.config 에서는 import.meta.env 를 못 쓰므로 loadEnv 로 직접 로드한다.)
  const env = loadEnv(mode, process.cwd(), '')
  const proxyTarget = env.VITE_PROXY_TARGET || 'http://localhost:8080'

  return {
    plugins: [react()],
    server: {
      port: 5173,
      // 하이브리드 연동: VITE_USE_MOCK=true 라도 MSW 가 passthrough 한 /api 요청
      // (auth·posts)은 이 프록시를 통해 실제 백엔드로 전달된다.
      // (더미 도메인은 MSW 가 네트워크 레벨에서 먼저 응답하므로 프록시까지 오지 않는다.)
      proxy: {
        '/api': {
          target: proxyTarget,
          changeOrigin: true,
          // 백엔드 CORS 필터가 dev Origin(localhost:5173)을 거부(403 Invalid CORS request)한다.
          // 프록시가 이미 same-origin 으로 중계하므로 Origin/Referer 를 떼어 비-CORS 요청처럼 보이게 한다.
          configure: (proxy) => {
            proxy.on('proxyReq', (proxyReq) => {
              proxyReq.removeHeader('origin')
              proxyReq.removeHeader('referer')
            })
          },
        },
      },
    },
    build: {
      outDir: 'dist',
      sourcemap: false,
      rollupOptions: {
        output: {
          // 안정적으로 캐시되는 vendor 청크를 분리해 초기 로드와 캐시 효율을 개선한다.
          manualChunks: {
            'react-vendor': ['react', 'react-dom', 'react-router-dom'],
            query: ['@tanstack/react-query', 'axios'],
            form: ['react-hook-form', '@hookform/resolvers', 'zod'],
          },
        },
      },
    },
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: './src/test/setup.ts',
      css: true,
      // 유닛/컴포넌트 테스트는 src 안에서만 수집한다.
      // e2e/ 의 Playwright 스펙은 playwright test 가 따로 실행하므로 제외한다.
      include: ['src/**/*.{test,spec}.{ts,tsx}'],
      exclude: ['node_modules', 'dist', 'e2e/**'],
    },
  }
})
