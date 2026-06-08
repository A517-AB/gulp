import { setupWorker } from 'msw/browser'
import { handlers } from './handlers'

export const worker = setupWorker(...handlers)

export async function startMock(): Promise<void> {
  await worker.start({ onUnhandledRequest: 'bypass' })
  console.log('[msw] mock worker started — unhandled requests bypass to network')
}

export function stopMock(): void {
  worker.stop()
  console.log('[msw] mock worker stopped')
}
