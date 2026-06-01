/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // 실제 백엔드 연동 시 사용할 개발 프록시.
    // VITE_USE_MOCK=false 일 때 /api 요청을 아래 target 으로 전달합니다.
    // (더미 모드에서는 MSW 가 네트워크 레벨에서 가로채므로 프록시는 사용되지 않습니다.)
    proxy: {
      '/api': {
        target: process.env.VITE_PROXY_TARGET || 'http://localhost:8080',
        changeOrigin: true,
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
})
