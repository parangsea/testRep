import { setupWorker } from 'msw/browser'
import { handlers } from './handlers'

// 브라우저(dev/preview)에서 네트워크 요청을 가로채는 MSW 워커.
export const worker = setupWorker(...handlers)
