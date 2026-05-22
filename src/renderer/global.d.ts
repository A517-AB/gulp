import type { DesktopBridge } from '../shared/bridge'

export {}

declare global {
  interface Window {
    lastBridge?: DesktopBridge
  }
}