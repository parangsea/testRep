import { setupServer } from 'msw/node'
import { handlers } from './handlers'

// Node 환경(vitest 등)에서 사용하는 MSW 서버.
export const server = setupServer(...handlers)
